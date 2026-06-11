import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface AiAgentConfig {
  id: string;
  tenant_id: string;
  is_enabled: boolean;
  system_prompt: string;
  welcome_message: string;
  fallback_message: string;
  tone: 'professional' | 'friendly' | 'casual';
  response_length: 'concise' | 'balanced' | 'detailed';
  language: string;
  max_response_tokens: number;
  temperature: number;
  // Handoff settings
  auto_handoff_enabled: boolean;
  handoff_keywords: string[];
  handoff_after_failures: number;
  handoff_message: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeItem {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const defaultConfig: Partial<AiAgentConfig> = {
  is_enabled: false,
  system_prompt: `You are a helpful customer service assistant for our business. Your role is to:
- Answer customer questions accurately and professionally
- Provide helpful information about our products and services
- Escalate complex issues to human agents when necessary
- Be polite, patient, and empathetic in all interactions`,
  welcome_message: 'Hello! How can I assist you today?',
  fallback_message: "I apologize, but I couldn't understand your request. Let me connect you with a human agent who can better assist you.",
  tone: 'professional',
  response_length: 'balanced',
  language: 'en',
  max_response_tokens: 500,
  temperature: 0.7,
  // Handoff defaults
  auto_handoff_enabled: true,
  handoff_keywords: ['speak to human', 'talk to agent', 'real person', 'customer service', 'manager'],
  handoff_after_failures: 3,
  handoff_message: "I understand you'd like to speak with a human agent. Let me connect you with one of our team members who can better assist you.",
};

export function useAiAgent() {
  const [config, setConfig] = useState<AiAgentConfig | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    if (currentTenant?.id) {
      fetchConfig();
      fetchKnowledgeBase();
    }
  }, [currentTenant?.id]);

  const fetchConfig = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', currentTenant.id)
        .single();

      if (error) throw error;

      const settings = data?.settings as Record<string, unknown> | null;
      const aiConfig = settings?.ai_agent as Record<string, unknown> | undefined;
      
      if (aiConfig) {
        setConfig({
          id: currentTenant.id,
          tenant_id: currentTenant.id,
          ...defaultConfig,
          ...aiConfig,
        } as AiAgentConfig);
      } else {
        setConfig({
          id: currentTenant.id,
          tenant_id: currentTenant.id,
          ...defaultConfig,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as AiAgentConfig);
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
      setConfig({
        id: currentTenant.id,
        tenant_id: currentTenant.id,
        ...defaultConfig,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as AiAgentConfig);
    } finally {
      setLoading(false);
    }
  };

  const fetchKnowledgeBase = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', currentTenant.id)
        .single();

      if (error) throw error;

      const settings = data?.settings as Record<string, unknown> | null;
      const kb = (settings?.knowledge_base as KnowledgeItem[]) || [];
      setKnowledgeBase(kb);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      setKnowledgeBase([]);
    }
  };

  const saveConfig = async (updates: Partial<AiAgentConfig>) => {
    if (!currentTenant?.id || !config) return;

    setSaving(true);
    try {
      const { data: currentData } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', currentTenant.id)
        .single();

      const currentSettings = (currentData?.settings as Record<string, unknown>) || {};
      const newConfig = { ...config, ...updates, updated_at: new Date().toISOString() };

      const { error } = await supabase
        .from('tenants')
        .update({
          settings: {
            ...currentSettings,
            ai_agent: newConfig,
          } as Json,
        })
        .eq('id', currentTenant.id);

      if (error) throw error;

      setConfig(newConfig);
      toast({
        title: 'Settings saved',
        description: 'AI Agent configuration has been updated.',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI Agent configuration.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addKnowledgeItem = async (item: Omit<KnowledgeItem, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    if (!currentTenant?.id) return;

    setSaving(true);
    try {
      const newItem: KnowledgeItem = {
        ...item,
        id: crypto.randomUUID(),
        tenant_id: currentTenant.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: currentData } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', currentTenant.id)
        .single();

      const currentSettings = (currentData?.settings as Record<string, unknown>) || {};
      const currentKb = (currentSettings?.knowledge_base as KnowledgeItem[]) || [];

      const newSettings = {
        ...currentSettings,
        knowledge_base: [...currentKb, newItem],
      };

      const { error } = await supabase
        .from('tenants')
        .update({
          settings: newSettings as unknown as Json,
        })
        .eq('id', currentTenant.id);

      if (error) throw error;

      setKnowledgeBase([...knowledgeBase, newItem]);
      toast({
        title: 'Knowledge added',
        description: 'New knowledge base item has been added.',
      });
    } catch (error) {
      console.error('Error adding knowledge item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add knowledge base item.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateKnowledgeItem = async (id: string, updates: Partial<KnowledgeItem>) => {
    if (!currentTenant?.id) return;

    setSaving(true);
    try {
      const updatedKb = knowledgeBase.map((item) =>
        item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
      );

      const { data: currentData } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', currentTenant.id)
        .single();

      const currentSettings = (currentData?.settings as Record<string, unknown>) || {};

      const newSettings = {
        ...currentSettings,
        knowledge_base: updatedKb,
      };

      const { error } = await supabase
        .from('tenants')
        .update({
          settings: newSettings as unknown as Json,
        })
        .eq('id', currentTenant.id);

      if (error) throw error;

      setKnowledgeBase(updatedKb);
      toast({
        title: 'Knowledge updated',
        description: 'Knowledge base item has been updated.',
      });
    } catch (error) {
      console.error('Error updating knowledge item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update knowledge base item.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteKnowledgeItem = async (id: string) => {
    if (!currentTenant?.id) return;

    setSaving(true);
    try {
      const updatedKb = knowledgeBase.filter((item) => item.id !== id);

      const { data: currentData } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', currentTenant.id)
        .single();

      const currentSettings = (currentData?.settings as Record<string, unknown>) || {};

      const newSettings = {
        ...currentSettings,
        knowledge_base: updatedKb,
      };

      const { error } = await supabase
        .from('tenants')
        .update({
          settings: newSettings as unknown as Json,
        })
        .eq('id', currentTenant.id);

      if (error) throw error;

      setKnowledgeBase(updatedKb);
      toast({
        title: 'Knowledge deleted',
        description: 'Knowledge base item has been removed.',
      });
    } catch (error) {
      console.error('Error deleting knowledge item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete knowledge base item.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    config,
    knowledgeBase,
    loading,
    saving,
    saveConfig,
    addKnowledgeItem,
    updateKnowledgeItem,
    deleteKnowledgeItem,
  };
}
