-- ponytail: two missing indexes for hot query paths
--   whatsapp_followup_queue: scheduler polls WHERE status='pending' ORDER BY scheduled_for
--   in_app_notifications:    reads are always scoped to (tenant_id, user_id)

CREATE INDEX IF NOT EXISTS idx_followup_queue_status_scheduled
    ON whatsapp_followup_queue (status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_tenant_user
    ON in_app_notifications (tenant_id, user_id);
