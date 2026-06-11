import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/hooks/useProducts';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface ProductShareQueue {
  products: Product[];
  currentIndex: number;
  sending: boolean;
  contactId: string;
  instanceId: string;
}

export function useProductShare() {
  const [queue, setQueue] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const cancelRef = useRef(false);
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();

  const formatProductMessage = (product: Product): string => {
    let message = `📦 *${product.name}*\n\n`;
    
    // Price with discount
    if (product.compare_at_price && product.compare_at_price > product.price) {
      const discount = Math.round((1 - product.price / product.compare_at_price) * 100);
      message += `💰 Price: ৳${product.price.toFixed(2)}\n`;
      message += `~~৳${product.compare_at_price.toFixed(2)}~~ (Save ${discount}%)\n\n`;
    } else {
      message += `💰 Price: ৳${product.price.toFixed(2)}\n\n`;
    }
    
    // Description
    if (product.description) {
      const cleanDesc = product.description.replace(/<[^>]*>/g, '').slice(0, 200);
      message += `📋 ${cleanDesc}${product.description.length > 200 ? '...' : ''}\n\n`;
    }
    
    // Stock info
    if (product.track_inventory && product.stock_quantity !== null) {
      message += `📦 In Stock: ${product.stock_quantity} units\n`;
    }
    
    // SKU
    if (product.sku) {
      message += `🏷️ SKU: ${product.sku}\n`;
    }
    
    // Category
    if (product.category?.name) {
      message += `\n📂 Category: ${product.category.name}\n`;
    }
    
    message += `\n🛒 Reply with "ORDER" to place an order!`;
    
    return message;
  };

  const sendProduct = async (
    product: Product,
    contactId: string,
    instanceId: string
  ): Promise<boolean> => {
    const message = formatProductMessage(product);
    const images = product.images as string[] | null;
    const imageUrl = images?.[0];

    try {
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          contact_id: contactId,
          instance_id: instanceId,
          content: message,
          content_type: imageUrl ? 'image' : 'text',
          media_url: imageUrl || undefined,
        },
      });

      if (error) throw error;

      // Note: Product sharing is a team action, not logged to customer journey
      // The product message is visible in chat history

      return true;
    } catch (error: any) {
      console.error('Failed to send product:', error);
      toast({
        title: 'Failed to send product',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const sendProducts = useCallback(async (
    products: Product[],
    contactId: string,
    instanceId: string
  ) => {
    if (products.length === 0) return;

    setQueue(products);
    setSending(true);
    cancelRef.current = false;
    setCurrentIndex(0);

    for (let i = 0; i < products.length; i++) {
      if (cancelRef.current) {
        toast({
          title: 'Queue cancelled',
          description: `Sent ${i} of ${products.length} products`,
        });
        break;
      }

      setCurrentIndex(i);
      const success = await sendProduct(products[i], contactId, instanceId);
      
      if (!success) {
        // Continue to next product even if one fails
      }

      // Wait 5 seconds before next (except for last)
      if (i < products.length - 1 && !cancelRef.current) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    if (!cancelRef.current) {
      toast({
        title: 'Products sent',
        description: `Successfully sent ${products.length} product${products.length > 1 ? 's' : ''}`,
      });
    }

    setQueue([]);
    setCurrentIndex(0);
    setSending(false);
  }, [currentTenant, toast]);

  const sendCategory = useCallback(async (
    categoryId: string,
    categoryName: string,
    contactId: string,
    instanceId: string
  ) => {
    // Fetch products in category
    const { data: products, error } = await supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .eq('tenant_id', currentTenant?.id || '');

    if (error || !products || products.length === 0) {
      toast({
        title: 'No products found',
        description: 'No active products in this category',
        variant: 'destructive',
      });
      return;
    }

    // Send header message
    await supabase.functions.invoke('send-message', {
      body: {
        contact_id: contactId,
        instance_id: instanceId,
        content: `📂 *${categoryName}*\n\nHere are ${products.length} product${products.length > 1 ? 's' : ''} from this category:`,
        content_type: 'text',
      },
    });

    // Wait 2 seconds then send products
    await new Promise(r => setTimeout(r, 2000));
    await sendProducts(products as Product[], contactId, instanceId);
  }, [currentTenant, sendProducts, toast]);

  const cancelQueue = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return {
    sendProduct,
    sendProducts,
    sendCategory,
    queue,
    currentIndex,
    sending,
    cancelQueue,
  };
}
