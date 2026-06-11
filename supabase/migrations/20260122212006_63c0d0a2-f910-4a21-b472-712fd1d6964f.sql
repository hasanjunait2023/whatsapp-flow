-- Fix function search path for log_first_contact
ALTER FUNCTION public.log_first_contact() SET search_path = public;

-- Fix function search path for log_order_journey_event
ALTER FUNCTION public.log_order_journey_event() SET search_path = public;

-- Fix function search path for log_handoff_journey_event
ALTER FUNCTION public.log_handoff_journey_event() SET search_path = public;