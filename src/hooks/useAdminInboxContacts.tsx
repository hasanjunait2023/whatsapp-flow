import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AdminContact } from "@/hooks/useAdminContacts";

// Hidden phone numbers - won't show in admin inbox but data still saved in DB
const HIDDEN_PHONE_NUMBERS = ["+8801625363540", "8801625363540", "01625363540"];

const toDigits = (value: string) => value.replace(/\D/g, "");

// Central Admin WhatsApp inbox should only show real phone-number threads.
// Exclude non-phone identifiers like Meta lead IDs (e.g. "12345@lid") which can look like Facebook workspace items.
const isValidWhatsAppPhoneNumber = (phone: string | null): phone is string => {
  if (!phone) return false;
  if (phone.includes("@")) return false;
  const digits = toDigits(phone);
  return digits.length >= 8 && digits.length <= 15;
};

const isHiddenPhoneNumber = (phone: string | null): boolean => {
  if (!phone) return false;
  const normalized = phone.replace(/^\+/, "").replace(/\s/g, "");
  return HIDDEN_PHONE_NUMBERS.some(
    (hidden) =>
      normalized.includes(hidden.replace(/^\+/, "")) ||
      hidden.replace(/^\+/, "").includes(normalized)
  );
};

interface UseAdminInboxContactsOptions {
  /** If provided, shows threads only for this WA instance. */
  instanceId?: string | null;
  /** Safety cap to keep the inbox snappy. */
  limit?: number;
}

/**
 * Central Admin Inbox contact list.
 * Shows ONLY threads for the specified WhatsApp instance (connected to Admin Panel).
 * instanceId is REQUIRED - returns empty if not provided.
 */
export function useAdminInboxContacts(options: UseAdminInboxContactsOptions = {}) {
  const { instanceId = null, limit = 200 } = options;

  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchContacts = useCallback(async () => {
    // CRITICAL: Only show conversations for the specific admin WhatsApp instance
    // If no instanceId provided, return empty list (don't show all tenants' data)
    if (!instanceId) {
      setContacts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error: qError } = await supabase
        .from("contact_thread_state")
        .select(
          "contact_id, tenant_id, instance_id, contact_name, contact_phone, contact_avatar_url, last_message_at, last_message_preview, last_message_direction, last_message_type, unread_count, assigned_to, is_archived, is_blocked, needs_handoff, handoff_reason, created_at, updated_at"
        )
        .eq("contact_type", "whatsapp")
        .eq("is_archived", false)
        .eq("instance_id", instanceId)
        .order("last_message_at", { ascending: false })
        .limit(limit);

      if (qError) throw qError;

      const now = new Date().toISOString();
      const mapped: AdminContact[] = (data || [])
        .map((row: any) => {
          const phoneRaw = row.contact_phone as string | null;
          if (!isValidWhatsAppPhoneNumber(phoneRaw)) return null;

          const phoneDigits = toDigits(phoneRaw);
          if (isHiddenPhoneNumber(phoneDigits)) return null;

          let preview: string | null = row.last_message_preview ?? null;
          if (preview && row.last_message_direction === "outbound" && !preview.startsWith("You:")) {
            preview = `You: ${preview}`;
          }

          const contact: AdminContact = {
            id: row.contact_id,
            tenant_id: row.tenant_id,
            instance_id: row.instance_id,
            wa_id: `${phoneDigits}@s.whatsapp.net`,
            phone_number: phoneDigits,
            name: row.contact_name ?? null,
            profile_pic_url: row.contact_avatar_url ?? null,
            is_blocked: !!row.is_blocked,
            is_archived: !!row.is_archived,
            assigned_to: row.assigned_to ?? null,
            last_message_at: row.last_message_at ?? null,
            unread_count: row.unread_count ?? 0,
            needs_handoff: !!row.needs_handoff,
            handoff_reason: row.handoff_reason ?? null,
            handoff_at: null,
            created_at: row.created_at ?? now,
            updated_at: row.updated_at ?? now,
            last_message: preview ?? undefined,
            device_typing_at: null,
          };

          return contact;
        })
        .filter(Boolean) as AdminContact[];

      setContacts(mapped);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [instanceId, limit]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Lightweight realtime: listen for thread changes on the specific instance.
  // If realtime is flaky, we fall back to polling.
  useEffect(() => {
    // No subscription needed if no instanceId
    if (!instanceId) return;

    let isMounted = true;

    // cleanup previous
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`admin-inbox-threads-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_thread_state",
          filter: `instance_id=eq.${instanceId}`,
        } as any,
        () => {
          if (!isMounted) return;
          fetchContacts();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (!fallbackIntervalRef.current) {
            fallbackIntervalRef.current = setInterval(() => {
              if (isMounted) fetchContacts();
            }, 5000);
          }
        } else if (status === "SUBSCRIBED") {
          if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
          }
        }
      });

    return () => {
      isMounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
      channelRef.current = null;
      fallbackIntervalRef.current = null;
    };
  }, [fetchContacts, instanceId]);

  const updateContact = useCallback(async (id: string, updates: Partial<AdminContact>) => {
    const { error } = await supabase.from("contacts").update(updates as any).eq("id", id);
    if (error) throw error;
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase.rpc("mark_thread_as_read", { p_contact_id: id });
    if (error) throw error;

    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
  }, []);

  const requestHandoff = useCallback(async (id: string, reason: string) => {
    const updates = {
      needs_handoff: true,
      handoff_reason: reason,
      handoff_at: new Date().toISOString(),
    };
    await updateContact(id, updates as any);
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, [updateContact]);

  const resolveHandoff = useCallback(async (id: string) => {
    const updates = {
      needs_handoff: false,
      handoff_reason: null,
      handoff_at: null,
    };
    await updateContact(id, updates as any);
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, [updateContact]);

  const deleteContact = useCallback(async (id: string) => {
    await supabase.from("contact_labels").delete().eq("contact_id", id);
    await supabase.from("customer_journey_events").delete().eq("contact_id", id);
    await supabase.from("messages").delete().eq("contact_id", id);

    const { error: contactError } = await supabase.from("contacts").delete().eq("id", id);
    if (contactError) throw contactError;

    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return useMemo(
    () => ({
      contacts,
      loading,
      error,
      refetch: fetchContacts,
      markAsRead,
      requestHandoff,
      resolveHandoff,
      deleteContact,
    }),
    [contacts, loading, error, fetchContacts, markAsRead, requestHandoff, resolveHandoff, deleteContact]
  );
}
