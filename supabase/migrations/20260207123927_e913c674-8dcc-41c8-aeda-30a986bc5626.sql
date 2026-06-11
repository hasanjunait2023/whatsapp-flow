-- Batch delete helpers to avoid statement_timeout during large tenant purges

CREATE OR REPLACE FUNCTION public.admin_purge_messages_batch(_tenant_id uuid, _batch_size int DEFAULT 2000)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  WITH del AS (
    SELECT id
    FROM public.messages
    WHERE tenant_id = _tenant_id
    LIMIT _batch_size
  )
  DELETE FROM public.messages m
  USING del d
  WHERE m.id = d.id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_purge_contacts_batch(_tenant_id uuid, _batch_size int DEFAULT 2000)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  WITH del AS (
    SELECT id
    FROM public.contacts
    WHERE tenant_id = _tenant_id
    LIMIT _batch_size
  )
  DELETE FROM public.contacts c
  USING del d
  WHERE c.id = d.id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_purge_orders_batch(_tenant_id uuid, _batch_size int DEFAULT 2000)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  WITH del AS (
    SELECT id
    FROM public.orders
    WHERE tenant_id = _tenant_id
    LIMIT _batch_size
  )
  DELETE FROM public.orders o
  USING del d
  WHERE o.id = d.id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_purge_webhook_events_log_batch(_tenant_id uuid, _batch_size int DEFAULT 5000)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  WITH del AS (
    SELECT id
    FROM public.webhook_events_log
    WHERE tenant_id = _tenant_id
    LIMIT _batch_size
  )
  DELETE FROM public.webhook_events_log w
  USING del d
  WHERE w.id = d.id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_purge_fb_webhook_events_log_batch(_tenant_id uuid, _batch_size int DEFAULT 5000)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  WITH del AS (
    SELECT id
    FROM public.fb_webhook_events_log
    WHERE tenant_id = _tenant_id
    LIMIT _batch_size
  )
  DELETE FROM public.fb_webhook_events_log f
  USING del d
  WHERE f.id = d.id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Lock down execution (only service_role can run)
REVOKE ALL ON FUNCTION public.admin_purge_messages_batch(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purge_messages_batch(uuid, int) TO service_role;

REVOKE ALL ON FUNCTION public.admin_purge_contacts_batch(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purge_contacts_batch(uuid, int) TO service_role;

REVOKE ALL ON FUNCTION public.admin_purge_orders_batch(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purge_orders_batch(uuid, int) TO service_role;

REVOKE ALL ON FUNCTION public.admin_purge_webhook_events_log_batch(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purge_webhook_events_log_batch(uuid, int) TO service_role;

REVOKE ALL ON FUNCTION public.admin_purge_fb_webhook_events_log_batch(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purge_fb_webhook_events_log_batch(uuid, int) TO service_role;
