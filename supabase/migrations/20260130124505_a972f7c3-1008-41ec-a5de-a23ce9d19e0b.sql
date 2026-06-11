-- =============================================
-- STOCK MOVEMENTS TABLE - Track every stock change
-- =============================================
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'return', 'damaged', 'transfer')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT CHECK (reason IN ('sale', 'purchase', 'manual_adjustment', 'inventory_count', 'damage', 'return', 'expired', 'transfer', 'other')),
  reference_type TEXT CHECK (reference_type IN ('order', 'manual', 'import', 'sync', 'inventory_count')),
  reference_id UUID,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for stock_movements
CREATE INDEX idx_stock_movements_tenant ON public.stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_reference ON public.stock_movements(reference_type, reference_id);

-- =============================================
-- STOCK ALERTS TABLE - Low stock thresholds
-- =============================================
CREATE TABLE public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock')),
  threshold INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_alerts_tenant ON public.stock_alerts(tenant_id);
CREATE INDEX idx_stock_alerts_product ON public.stock_alerts(product_id);

-- =============================================
-- INVENTORY COUNTS TABLE - Physical audits
-- =============================================
CREATE TABLE public.inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  count_number TEXT NOT NULL,
  count_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_counts_tenant ON public.inventory_counts(tenant_id);
CREATE INDEX idx_inventory_counts_status ON public.inventory_counts(status);

-- =============================================
-- INVENTORY COUNT ITEMS TABLE
-- =============================================
CREATE TABLE public.inventory_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  expected_quantity INTEGER NOT NULL,
  counted_quantity INTEGER,
  notes TEXT,
  counted_at TIMESTAMPTZ,
  counted_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_inventory_count_items_count ON public.inventory_count_items(count_id);
CREATE INDEX idx_inventory_count_items_product ON public.inventory_count_items(product_id);

-- =============================================
-- FUNCTION: Deduct stock for order
-- =============================================
CREATE OR REPLACE FUNCTION public.deduct_product_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_order_id UUID,
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_track_inventory BOOLEAN;
BEGIN
  -- Get current stock and tracking setting
  SELECT stock_quantity, track_inventory INTO v_current_stock, v_track_inventory
  FROM public.products WHERE id = p_product_id;
  
  -- Only proceed if tracking inventory
  IF v_track_inventory THEN
    -- Calculate new stock (don't go below 0)
    v_new_stock := GREATEST(0, v_current_stock - p_quantity);
    
    -- Update product stock
    UPDATE public.products 
    SET stock_quantity = v_new_stock,
        updated_at = now()
    WHERE id = p_product_id;
    
    -- Record movement
    INSERT INTO public.stock_movements (
      tenant_id, product_id, movement_type, quantity,
      previous_quantity, new_quantity, reason,
      reference_type, reference_id, recorded_by
    ) VALUES (
      p_tenant_id, p_product_id, 'out', -p_quantity,
      v_current_stock, v_new_stock, 'sale',
      'order', p_order_id, p_user_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Restore stock for cancelled/returned order
-- =============================================
CREATE OR REPLACE FUNCTION public.restore_stock_for_order(
  p_order_id UUID,
  p_tenant_id UUID,
  p_reason TEXT DEFAULT 'return',
  p_user_id UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_item RECORD;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_track_inventory BOOLEAN;
BEGIN
  -- Loop through order items
  FOR v_item IN 
    SELECT oi.product_id, oi.quantity 
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id AND oi.product_id IS NOT NULL
  LOOP
    -- Get current stock and tracking setting
    SELECT stock_quantity, track_inventory INTO v_current_stock, v_track_inventory
    FROM public.products WHERE id = v_item.product_id;
    
    IF v_track_inventory THEN
      v_new_stock := v_current_stock + v_item.quantity;
      
      -- Update product stock
      UPDATE public.products 
      SET stock_quantity = v_new_stock,
          updated_at = now()
      WHERE id = v_item.product_id;
      
      -- Record movement
      INSERT INTO public.stock_movements (
        tenant_id, product_id, movement_type, quantity,
        previous_quantity, new_quantity, reason,
        reference_type, reference_id, recorded_by
      ) VALUES (
        p_tenant_id, v_item.product_id, 'in', v_item.quantity,
        v_current_stock, v_new_stock, p_reason,
        'order', p_order_id, p_user_id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Manual stock adjustment
-- =============================================
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id UUID,
  p_tenant_id UUID,
  p_adjustment_type TEXT, -- 'add', 'remove', 'set'
  p_quantity INTEGER,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_movement_type TEXT;
  v_movement_qty INTEGER;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO v_current_stock
  FROM public.products WHERE id = p_product_id;
  
  -- Calculate new stock based on adjustment type
  CASE p_adjustment_type
    WHEN 'add' THEN
      v_new_stock := v_current_stock + p_quantity;
      v_movement_type := 'in';
      v_movement_qty := p_quantity;
    WHEN 'remove' THEN
      v_new_stock := GREATEST(0, v_current_stock - p_quantity);
      v_movement_type := 'out';
      v_movement_qty := -p_quantity;
    WHEN 'set' THEN
      v_new_stock := p_quantity;
      IF p_quantity >= v_current_stock THEN
        v_movement_type := 'in';
        v_movement_qty := p_quantity - v_current_stock;
      ELSE
        v_movement_type := 'out';
        v_movement_qty := v_current_stock - p_quantity;
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid adjustment type: %', p_adjustment_type;
  END CASE;
  
  -- Update product stock
  UPDATE public.products 
  SET stock_quantity = v_new_stock,
      updated_at = now()
  WHERE id = p_product_id;
  
  -- Record movement
  INSERT INTO public.stock_movements (
    tenant_id, product_id, movement_type, quantity,
    previous_quantity, new_quantity, reason,
    reference_type, notes, recorded_by
  ) VALUES (
    p_tenant_id, p_product_id, 
    CASE WHEN v_movement_type = 'in' THEN 'in' ELSE 'out' END,
    v_movement_qty,
    v_current_stock, v_new_stock, p_reason,
    'manual', p_notes, p_user_id
  );
  
  RETURN v_new_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Generate inventory count number
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_inventory_count_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_prefix TEXT := 'IC-';
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.inventory_counts
  WHERE tenant_id = p_tenant_id;
  
  RETURN v_prefix || LPAD(v_count::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RLS POLICIES: stock_movements
-- =============================================
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own stock movements" ON public.stock_movements
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Tenants can insert own stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

-- =============================================
-- RLS POLICIES: stock_alerts
-- =============================================
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage own stock alerts" ON public.stock_alerts
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

-- =============================================
-- RLS POLICIES: inventory_counts
-- =============================================
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage own inventory counts" ON public.inventory_counts
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

-- =============================================
-- RLS POLICIES: inventory_count_items
-- =============================================
ALTER TABLE public.inventory_count_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage own inventory count items" ON public.inventory_count_items
  FOR ALL USING (count_id IN (
    SELECT ic.id FROM public.inventory_counts ic
    WHERE ic.tenant_id IN (
      SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));