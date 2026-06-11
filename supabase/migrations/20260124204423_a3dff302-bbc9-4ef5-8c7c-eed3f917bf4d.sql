-- Create fb_contact_labels junction table for Facebook contact labels
CREATE TABLE public.fb_contact_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES public.fb_contacts(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(contact_id, label_id)
);

-- Enable RLS
ALTER TABLE public.fb_contact_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view fb contact labels for their tenant"
ON public.fb_contact_labels FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.fb_contacts fc
        WHERE fc.id = fb_contact_labels.contact_id
        AND fc.tenant_id IN (SELECT get_user_tenant_ids())
    )
);

CREATE POLICY "Users can manage fb contact labels for their tenant"
ON public.fb_contact_labels FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.fb_contacts fc
        WHERE fc.id = fb_contact_labels.contact_id
        AND fc.tenant_id IN (SELECT get_user_tenant_ids())
    )
);

-- Index for efficient queries
CREATE INDEX idx_fb_contact_labels_contact_id ON public.fb_contact_labels(contact_id);
CREATE INDEX idx_fb_contact_labels_label_id ON public.fb_contact_labels(label_id);