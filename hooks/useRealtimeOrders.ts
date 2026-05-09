import { useState, useEffect, useCallback, useRef } from 'react';


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
      
      const { hostingerService } = await import('../services/hostingerService');
      const hData = await hostingerService.getOrders();
      if (hData) {
        const transformed = hData.map(transformOrder);
        const newMap = new Map<string, Order>();
        transformed.forEach(order => newMap.set(order.id!, order));
        ordersMapRef.current = newMap;
        setOrders(transformed);
      }
      setError(null);
    } catch (err: any) {
      console.error('[useRealtimeOrders] Fetch Error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onNewOrderRef = useRef(onNewOrder);
  
  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

  useEffect(() => {
    fetchOrders();

    // Use a short interval for polling as a replacement for realtime
    const interval = setInterval(() => {
      fetchOrders();
    }, 15000); // Poll every 15s

    return () => {
      clearInterval(interval);
    };
  }, [fetchOrders]);

  return { 
    orders, 
    loading, 
    error,
    refresh: fetchOrders
  };
};
