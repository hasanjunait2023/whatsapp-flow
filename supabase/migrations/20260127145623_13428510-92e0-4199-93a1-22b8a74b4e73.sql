-- Add DELETE policy for system admins on external_sales_orders
CREATE POLICY "System admins can delete external sales orders"
ON public.external_sales_orders
FOR DELETE
USING (is_system_admin());