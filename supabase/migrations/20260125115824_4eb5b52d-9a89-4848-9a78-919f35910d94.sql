-- Create marketing_leads table for demo request lead capture
CREATE TABLE public.marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  
  -- Lead tracking
  status TEXT DEFAULT 'warm' CHECK (status IN ('warm', 'hot', 'contacted', 'converted', 'lost')),
  source TEXT DEFAULT 'demo_request',
  notes TEXT,
  
  -- Demo access tracking
  demo_accessed_at TIMESTAMP WITH TIME ZONE,
  demo_access_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- Only system admins can manage leads
CREATE POLICY "System admins can manage leads"
ON public.marketing_leads
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.system_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow anonymous insert for demo requests (lead capture)
CREATE POLICY "Anyone can submit demo request"
ON public.marketing_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_marketing_leads_updated_at
BEFORE UPDATE ON public.marketing_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();