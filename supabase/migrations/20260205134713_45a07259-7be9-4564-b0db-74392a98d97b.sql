-- Team Presence Logs - stores activity snapshots every 5 minutes
CREATE TABLE public.team_presence_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('online', 'away', 'offline')),
  current_page TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hour_of_day INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  date DATE NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_presence_logs_tenant_date ON public.team_presence_logs(tenant_id, date);
CREATE INDEX idx_presence_logs_user_date ON public.team_presence_logs(user_id, date);
CREATE INDEX idx_presence_logs_tenant_user_date ON public.team_presence_logs(tenant_id, user_id, date);

-- Team Work Sessions - daily aggregated summaries
CREATE TABLE public.team_work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_date DATE NOT NULL,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  total_active_minutes INTEGER DEFAULT 0,
  total_away_minutes INTEGER DEFAULT 0,
  break_count INTEGER DEFAULT 0,
  longest_session_minutes INTEGER DEFAULT 0,
  page_activity JSONB DEFAULT '{}',
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  conversations_handled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, user_id, session_date)
);

-- Indexes for work sessions
CREATE INDEX idx_work_sessions_tenant_date ON public.team_work_sessions(tenant_id, session_date);
CREATE INDEX idx_work_sessions_user_date ON public.team_work_sessions(user_id, session_date);

-- Enable RLS
ALTER TABLE public.team_presence_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_work_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_presence_logs
CREATE POLICY "Team members can view their tenant's presence logs"
ON public.team_presence_logs FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Team members can insert their own presence logs"
ON public.team_presence_logs FOR INSERT
WITH CHECK (is_tenant_member(tenant_id) AND auth.uid() = user_id);

-- RLS Policies for team_work_sessions
CREATE POLICY "Team members can view their tenant's work sessions"
ON public.team_work_sessions FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Team members can insert their own work sessions"
ON public.team_work_sessions FOR INSERT
WITH CHECK (is_tenant_member(tenant_id) AND auth.uid() = user_id);

CREATE POLICY "Team members can update their own work sessions"
ON public.team_work_sessions FOR UPDATE
USING (is_tenant_member(tenant_id) AND auth.uid() = user_id);

-- Function to aggregate presence logs into work sessions
CREATE OR REPLACE FUNCTION public.aggregate_daily_work_session(
  p_tenant_id UUID,
  p_user_id UUID,
  p_date DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_logs RECORD;
  v_first_seen TIMESTAMPTZ;
  v_last_seen TIMESTAMPTZ;
  v_active_minutes INTEGER := 0;
  v_away_minutes INTEGER := 0;
  v_break_count INTEGER := 0;
  v_longest_session INTEGER := 0;
  v_current_session INTEGER := 0;
  v_prev_status TEXT := NULL;
  v_page_activity JSONB := '{}';
BEGIN
  -- Get aggregated data from presence logs
  FOR v_logs IN 
    SELECT status, current_page, recorded_at
    FROM team_presence_logs
    WHERE tenant_id = p_tenant_id 
      AND user_id = p_user_id 
      AND date = p_date
    ORDER BY recorded_at ASC
  LOOP
    -- Track first and last seen
    IF v_first_seen IS NULL THEN
      v_first_seen := v_logs.recorded_at;
    END IF;
    v_last_seen := v_logs.recorded_at;
    
    -- Count minutes by status (assuming 5-min intervals)
    IF v_logs.status = 'online' THEN
      v_active_minutes := v_active_minutes + 5;
      v_current_session := v_current_session + 5;
    ELSIF v_logs.status = 'away' THEN
      v_away_minutes := v_away_minutes + 5;
    END IF;
    
    -- Track breaks (transition from online to away/offline)
    IF v_prev_status = 'online' AND v_logs.status IN ('away', 'offline') THEN
      v_break_count := v_break_count + 1;
      IF v_current_session > v_longest_session THEN
        v_longest_session := v_current_session;
      END IF;
      v_current_session := 0;
    END IF;
    
    v_prev_status := v_logs.status;
    
    -- Track page activity
    IF v_logs.current_page IS NOT NULL AND v_logs.status = 'online' THEN
      v_page_activity := v_page_activity || 
        jsonb_build_object(
          v_logs.current_page, 
          COALESCE((v_page_activity->>v_logs.current_page)::INTEGER, 0) + 5
        );
    END IF;
  END LOOP;
  
  -- Final session check
  IF v_current_session > v_longest_session THEN
    v_longest_session := v_current_session;
  END IF;
  
  -- Upsert the work session
  INSERT INTO team_work_sessions (
    tenant_id, user_id, session_date,
    first_seen_at, last_seen_at,
    total_active_minutes, total_away_minutes,
    break_count, longest_session_minutes, page_activity
  ) VALUES (
    p_tenant_id, p_user_id, p_date,
    v_first_seen, v_last_seen,
    v_active_minutes, v_away_minutes,
    v_break_count, v_longest_session, v_page_activity
  )
  ON CONFLICT (tenant_id, user_id, session_date) DO UPDATE SET
    first_seen_at = COALESCE(EXCLUDED.first_seen_at, team_work_sessions.first_seen_at),
    last_seen_at = COALESCE(EXCLUDED.last_seen_at, team_work_sessions.last_seen_at),
    total_active_minutes = EXCLUDED.total_active_minutes,
    total_away_minutes = EXCLUDED.total_away_minutes,
    break_count = EXCLUDED.break_count,
    longest_session_minutes = EXCLUDED.longest_session_minutes,
    page_activity = EXCLUDED.page_activity,
    updated_at = now();
END;
$$;

-- Trigger to update work sessions timestamp
CREATE TRIGGER update_work_sessions_updated_at
BEFORE UPDATE ON public.team_work_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();