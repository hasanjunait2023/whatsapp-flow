import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { startOfDay, subDays, format, differenceInMinutes } from 'date-fns';

export interface MessageVolumeData {
  date: string;
  sent: number;
  received: number;
}

export interface ResponseTimeData {
  date: string;
  avgMinutes: number;
}

export interface TeamPerformanceData {
  name: string;
  messagesSent: number;
  conversationsHandled: number;
  avgResponseTime: number;
}

export interface AnalyticsSummary {
  totalMessages: number;
  totalContacts: number;
  totalConversations: number;
  avgResponseTime: number;
  activeConversations: number;
  messagesTrend: number; // percentage change
  contactsTrend: number;
  conversationsTrend: number;
}

export function useAnalytics(days: number = 30) {
  const { currentTenant } = useTenant();
  const [messageVolume, setMessageVolume] = useState<MessageVolumeData[]>([]);
  const [responseTimes, setResponseTimes] = useState<ResponseTimeData[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!currentTenant?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const startDate = startOfDay(subDays(new Date(), days));

      // Fetch WhatsApp messages for the period
      const { data: waMessages, error: waMsgError } = await supabase
        .from('messages')
        .select('id, direction, sent_at, contact_id, created_at')
        .eq('tenant_id', currentTenant.id)
        .gte('sent_at', startDate.toISOString())
        .order('sent_at', { ascending: true });

      if (waMsgError) throw waMsgError;

      // Fetch Facebook messages for the period
      const { data: fbMessages } = await supabase
        .from('fb_messages')
        .select('id, direction, sent_at, contact_id, created_at')
        .eq('tenant_id', currentTenant.id)
        .gte('sent_at', startDate.toISOString())
        .order('sent_at', { ascending: true });

      const messages = waMessages || [];

      // Fetch WhatsApp contacts count
      const { count: waContactsCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id);

      // Fetch Facebook contacts count
      const { count: fbContactsCount } = await supabase
        .from('fb_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id);

      const totalContacts = (waContactsCount || 0) + (fbContactsCount || 0);

      // Fetch total conversations (contacts with any message history)
      const { count: waConversationsTotal } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .not('last_message_at', 'is', null);

      const { count: fbConversationsTotal } = await supabase
        .from('fb_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .not('last_message_at', 'is', null);

      const totalConversations = (waConversationsTotal || 0) + (fbConversationsTotal || 0);

      // Fetch active conversations (contacts with messages in last 24 hours)
      const last24h = subDays(new Date(), 1).toISOString();
      const { count: waActiveConversations } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('last_message_at', last24h);

      const { count: fbActiveConversations } = await supabase
        .from('fb_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('last_message_at', last24h);

      const activeConversations = (waActiveConversations || 0) + (fbActiveConversations || 0);

      // Process message volume by date
      const volumeByDate: Record<string, { sent: number; received: number }> = {};
      
      // Initialize all dates in range
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        volumeByDate[date] = { sent: 0, received: 0 };
      }

      messages?.forEach((msg) => {
        const date = format(new Date(msg.sent_at), 'yyyy-MM-dd');
        if (volumeByDate[date]) {
          if (msg.direction === 'outbound') {
            volumeByDate[date].sent++;
          } else {
            volumeByDate[date].received++;
          }
        }
      });

      const volumeData: MessageVolumeData[] = Object.entries(volumeByDate).map(
        ([date, counts]) => ({
          date: format(new Date(date), 'MMM d'),
          sent: counts.sent,
          received: counts.received,
        })
      );

      setMessageVolume(volumeData);

      // Calculate response times (time between inbound and next outbound per contact)
      const responseTimesByDate: Record<string, number[]> = {};
      const messagesByContact: Record<string, typeof messages> = {};

      messages?.forEach((msg) => {
        if (!messagesByContact[msg.contact_id]) {
          messagesByContact[msg.contact_id] = [];
        }
        messagesByContact[msg.contact_id].push(msg);
      });

      Object.values(messagesByContact).forEach((contactMessages) => {
        let lastInbound: Date | null = null;

        contactMessages.forEach((msg) => {
          if (msg.direction === 'inbound') {
            lastInbound = new Date(msg.sent_at);
          } else if (msg.direction === 'outbound' && lastInbound) {
            const responseTime = differenceInMinutes(new Date(msg.sent_at), lastInbound);
            if (responseTime >= 0 && responseTime < 1440) { // Less than 24 hours
              const date = format(new Date(msg.sent_at), 'yyyy-MM-dd');
              if (!responseTimesByDate[date]) {
                responseTimesByDate[date] = [];
              }
              responseTimesByDate[date].push(responseTime);
            }
            lastInbound = null;
          }
        });
      });

      const responseData: ResponseTimeData[] = Object.entries(volumeByDate).map(
        ([date]) => {
          const times = responseTimesByDate[date] || [];
          const avg = times.length > 0 
            ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
            : 0;
          return {
            date: format(new Date(date), 'MMM d'),
            avgMinutes: avg,
          };
        }
      );

      setResponseTimes(responseData);

      // Fetch team performance
      const { data: teamData } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner (
            full_name,
            email
          )
        `)
        .eq('tenant_id', currentTenant.id);

      // Get messages sent by each team member (assigned contacts)
      const { data: assignedContacts } = await supabase
        .from('contacts')
        .select('id, assigned_to')
        .eq('tenant_id', currentTenant.id)
        .not('assigned_to', 'is', null);

      const contactsByAgent: Record<string, string[]> = {};
      assignedContacts?.forEach((contact) => {
        if (contact.assigned_to) {
          if (!contactsByAgent[contact.assigned_to]) {
            contactsByAgent[contact.assigned_to] = [];
          }
          contactsByAgent[contact.assigned_to].push(contact.id);
        }
      });

      const teamPerf: TeamPerformanceData[] = (teamData || []).map((member: any) => {
        const agentContacts = contactsByAgent[member.user_id] || [];
        const agentMessages = messages?.filter(
          (m) => m.direction === 'outbound' && agentContacts.includes(m.contact_id)
        ) || [];

        return {
          name: member.profiles?.full_name || member.profiles?.email || 'Unknown',
          messagesSent: agentMessages.length,
          conversationsHandled: agentContacts.length,
          avgResponseTime: 0, // Would need more complex calculation
        };
      });

      setTeamPerformance(teamPerf.filter((p) => p.conversationsHandled > 0 || p.messagesSent > 0));

      // Calculate summary
      const totalMessagesCount = (messages?.length || 0) + (fbMessages?.length || 0);
      const allResponseTimes = Object.values(responseTimesByDate).flat();
      const avgResponseTime = allResponseTimes.length > 0
        ? Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length)
        : 0;

      // Calculate trends (compare to previous period)
      const previousStart = subDays(startDate, days);
      const { count: previousWaMessages } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('sent_at', previousStart.toISOString())
        .lt('sent_at', startDate.toISOString());

      const { count: previousFbMessages } = await supabase
        .from('fb_messages')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('sent_at', previousStart.toISOString())
        .lt('sent_at', startDate.toISOString());

      const previousMessages = (previousWaMessages || 0) + (previousFbMessages || 0);
      const messagesTrend = previousMessages > 0
        ? Math.round(((totalMessagesCount - previousMessages) / previousMessages) * 100)
        : 0;

      // Calculate conversations trend
      const { count: prevWaConversations } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('last_message_at', previousStart.toISOString())
        .lt('last_message_at', startDate.toISOString());

      const { count: prevFbConversations } = await supabase
        .from('fb_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('last_message_at', previousStart.toISOString())
        .lt('last_message_at', startDate.toISOString());

      const previousConversations = (prevWaConversations || 0) + (prevFbConversations || 0);
      const conversationsTrend = previousConversations > 0
        ? Math.round(((activeConversations - previousConversations) / previousConversations) * 100)
        : 0;

      setSummary({
        totalMessages: totalMessagesCount,
        totalContacts,
        totalConversations,
        avgResponseTime,
        activeConversations,
        messagesTrend,
        contactsTrend: 0, // Would need previous period data
        conversationsTrend,
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    messageVolume,
    responseTimes,
    teamPerformance,
    summary,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
