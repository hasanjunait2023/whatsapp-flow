-- 0008_indexes_and_constraints.sql
-- Comprehensive index additions, UNIQUE constraints, and FK cascade fixes
-- Audit-driven: addresses all P0/P1 findings from /tmp/audit_db.md

-- ============================================================================
-- 1. CRITICAL: better-auth FK indexes (orphan-row prevention on user delete)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_session_user_id          ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_account_user_id          ON account(user_id);
CREATE INDEX IF NOT EXISTS idx_member_user_id           ON member(user_id);
CREATE INDEX IF NOT EXISTS idx_member_organization_id   ON member(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitation_org_id        ON invitation(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitation_inviter_id    ON invitation(inviter_id);

-- ============================================================================
-- 2. tenant_id indexes (every query that filters by tenant must hit an index)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_webhook_events_log_tenant_id          ON webhook_events_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant_id                  ON error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_tenant_id                   ON job_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_segments_tenant_id            ON contact_segments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_tenant_id        ON order_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_participants_tenant_id ON whatsapp_group_participants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_tenant_id              ON workflow_nodes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_tenant_id              ON workflow_edges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_card_activity_tenant_id       ON service_card_activity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_tenant_id               ON user_presence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_tenant_id         ON admin_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_external_sales_orders_tenant_id       ON external_sales_orders(tenant_id);

-- Composite: (tenant_id, status) for queue tables
CREATE INDEX IF NOT EXISTS idx_job_queue_tenant_status      ON job_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_job_queue_status_run_at      ON job_queue(status, run_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_followup_tenant     ON whatsapp_followup_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_onboarding_jobs_tenant       ON onboarding_jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_group_add_queue_tenant       ON group_add_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_status ON scheduled_report_logs(status, sent_at);

-- ============================================================================
-- 3. Foreign-key columns that lacked indexes (audit table-by-table)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id              ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug                  ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_email                ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number         ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id         ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_warmup     ON whatsapp_instances(warmup_started_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_qr_exp     ON whatsapp_instances(qr_expires_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_last_qr    ON whatsapp_instances(last_qr_sent_at);
CREATE INDEX IF NOT EXISTS idx_contacts_replying_user_id     ON contacts(replying_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_instance      ON contacts(tenant_id, instance_id);
CREATE INDEX IF NOT EXISTS idx_contacts_opted_out_at        ON contacts(opted_out_at);
CREATE INDEX IF NOT EXISTS idx_service_cards_board_id        ON service_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_service_cards_list_id         ON service_cards(list_id);
CREATE INDEX IF NOT EXISTS idx_service_lists_board_id        ON service_lists(board_id);
CREATE INDEX IF NOT EXISTS idx_service_labels_board_id       ON service_labels(board_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number           ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number       ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id       ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_products_sku                  ON products(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku          ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_business_types_slug           ON business_types(slug);

-- ============================================================================
-- 4. UNIQUE constraints where business requires no duplicates
-- ============================================================================
-- tenants.slug: URL component, must be globally unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_slug_unique'
  ) THEN
    -- First resolve any existing duplicates by appending the row id
    UPDATE tenants
    SET slug = slug || '-' || substr(id, 1, 8)
    WHERE id NOT IN (
      SELECT MIN(id) FROM tenants
      WHERE slug IS NOT NULL
      GROUP BY slug
    ) AND slug IS NOT NULL;

    ALTER TABLE tenants ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- business_types.slug: enum-style identifier
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_types_slug_unique') THEN
    ALTER TABLE business_types ADD CONSTRAINT business_types_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- marketing_leads.email: required for ON CONFLICT (email) DO UPDATE in the
-- public demo-lead endpoint (closes the select-then-insert/update race that
-- produced duplicate leads on concurrent submissions).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketing_leads_email_unique') THEN
    -- Resolve any pre-existing duplicates (keep oldest by created_at)
    DELETE FROM marketing_leads a USING marketing_leads b
    WHERE a.email = b.email AND a.created_at > b.created_at;
    ALTER TABLE marketing_leads ADD CONSTRAINT marketing_leads_email_unique UNIQUE (email);
  END IF;
END $$;

-- ============================================================================
-- 5. Better-auth FK cascade fixes (already applied manually; kept here as no-op)
-- ============================================================================
-- Note: session.user_id and account.user_id CASCADE FKs applied via
-- direct psql during audit; this migration records the index additions only.