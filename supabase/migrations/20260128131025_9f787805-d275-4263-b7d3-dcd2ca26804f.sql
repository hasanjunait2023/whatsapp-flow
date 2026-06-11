-- Insert sample support tickets for testing (ticket_number will be auto-generated)
INSERT INTO public.support_tickets (
  ticket_number,
  subject,
  description,
  category,
  priority,
  status
) VALUES 
  ('', 'Cannot connect WhatsApp instance', 'I am trying to connect my WhatsApp number but getting QR code timeout error', 'technical', 'high', 'open'),
  ('', 'Billing question about upgrade', 'I want to upgrade from Basic to Pro plan, how does the prorated billing work?', 'billing', 'medium', 'open'),
  ('', 'Feature request: Export contacts to CSV', 'Would be great to have an option to export all contacts to a CSV file', 'feature_request', 'low', 'in_progress');

-- Insert sample admin tasks for testing
INSERT INTO public.admin_tasks (
  title,
  description,
  status,
  priority
) VALUES 
  ('Review new tenant applications', 'Check and approve pending tenant signup requests', 'in_progress', 'high'),
  ('Update documentation', 'Add new API endpoints to documentation', 'todo', 'medium'),
  ('Fix billing discrepancy', 'Investigate billing issue reported by tenant XYZ', 'done', 'high');