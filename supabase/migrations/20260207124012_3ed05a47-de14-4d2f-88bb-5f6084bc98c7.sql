-- Fix linter: set immutable search_path on existing functions
ALTER FUNCTION public.adjust_product_stock(uuid, uuid, text, integer, text, text, uuid) SET search_path = public;
ALTER FUNCTION public.deduct_product_stock(uuid, integer, uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.generate_inventory_count_number(uuid) SET search_path = public;
ALTER FUNCTION public.restore_stock_for_order(uuid, uuid, text, uuid) SET search_path = public;
