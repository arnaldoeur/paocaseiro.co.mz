import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

export interface Order {
    id: string;
    orderId: string;
    short_id?: string;
    date: string;
    status: 'pending' | 'processing' | 'ready' | 'delivering' | 'arrived' | 'completed' | 'cancelled';
    total: number;
    payment_status?: string;
    customer_phone?: string;
    customer?: any;
    items?: any[];
    created_at: string;
    // ... add other relevant fields as needed
}

export const useRealtimeOrders = (onNewOrder?: (order: Order) => void) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const ordersMapRef = useRef<Map<string, Order>>(new Map());

  const transformOrder = (row: any): Order => ({
    ...row,
    id: row.id,
    orderId: row.short_id || row.orderId || row.id?.slice(0, 8),
    date: row.created_at || row.date || new Date().toISOString(),
    total: Number(row.total_amount || row.total || 0),
    amountPaid: Number(row.amount_paid || row.amountPaid || 0),
    balance: Number(row.balance || 0),
    paymentRef: row.payment_ref || row.paymentRef || '',
    payment_method: row.payment_method || '',
    transaction_id: row.transaction_id || '',
    status: row.status || 'pending',
    customer: {
        name: row.customer_name || row.customer?.name || 'Cliente POS',
        phone: row.customer_phone || row.customer?.phone || '',
        type: row.delivery_type || row.customer?.type || 'pickup',
        address: row.customer_address || row.delivery_address || row.customer?.address || '',
        tableZone: row.table_zone || row.customer?.tableZone || '',
        tablePeople: row.table_people || row.customer?.tablePeople || 0,
        notes: row.notes || row.customer?.notes || '',
    },
    items: (row.items || []).map((item: any) => ({
        ...item,
        name: item.product_name || item.name,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 0),
        subtotal: Number(item.subtotal || 0)
    }))
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (fetchError) throw fetchError;

      const transformedData = (data || []).map(transformOrder);
      const newMap = new Map<string, Order>();
      transformedData.forEach(order => newMap.set(order.id!, order));
      ordersMapRef.current = newMap;
      
      setOrders(transformedData);
      setError(null);
    } catch (err: any) {
      console.error('[useRealtimeOrders] Fetch Error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          console.log('[useRealtimeOrders] Change received:', payload.eventType, payload.new?.id);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const orderId = payload.new.id;
            
            const { data: enrichedOrder, error: enrichError } = await supabase
              .from('orders')
              .select('*, items:order_items(*)')
              .eq('id', orderId)
              .single();

            if (!enrichError && enrichedOrder) {
              const transformed = transformOrder(enrichedOrder);
              setOrders((prev) => {
                const map = new Map(ordersMapRef.current);
                const isNew = !map.has(transformed.id!) && payload.eventType === 'INSERT';
                map.set(transformed.id!, transformed);
                ordersMapRef.current = map;
                
                if (isNew && onNewOrder) {
                    onNewOrder(transformed);
                }

                return Array.from(map.values()).sort((a: Order, b: Order) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => {
              const map = new Map(ordersMapRef.current);
              map.delete(payload.old.id);
              ordersMapRef.current = map;
              
              return Array.from(map.values()).sort((a: Order, b: Order) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, onNewOrder]);

  return { 
    orders, 
    loading, 
    error,
    refresh: fetchOrders
  };
};
