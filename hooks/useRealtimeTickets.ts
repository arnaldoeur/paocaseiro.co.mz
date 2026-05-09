import { useState, useEffect, useCallback, useRef } from 'react';
import { queueService, QueueTicket } from '../services/queue';

/**
 * Hook to manage real-time queue tickets with timezone-aware filtering (UTC+2)
 * Uses short polling and local window events since we migrated away from Supabase.
 */
export const useRealtimeTickets = () => {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const ticketsMapRef = useRef<Map<string, QueueTicket>>(new Map());
  const [status, setStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'ERROR'>('CONNECTING');

  const fetchTickets = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await queueService.getTicketsToday();
      
      const newMap = new Map<string, QueueTicket>();
      data.forEach((t: QueueTicket) => newMap.set(t.id, t));
      ticketsMapRef.current = newMap;
      
      setTickets(Array.from(newMap.values()).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
      setError(null);
      if (isInitial) setStatus('SUBSCRIBED');
    } catch (err: any) {
      console.error('[useRealtimeTickets] Fetch Error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('ERROR');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchTickets(true);

    // Setup short polling (every 5 seconds)
    const intervalId = setInterval(() => {
      fetchTickets(false);
    }, 5000);

    // Setup local event listeners for instant UI updates when action occurs on the same device
    const handleTicketCreated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newTicket = customEvent.detail as QueueTicket;
      if (!newTicket || !newTicket.id) return;
      
      setTickets((prev) => {
        const map = new Map(ticketsMapRef.current);
        map.set(newTicket.id, newTicket);
        ticketsMapRef.current = map;
        return (Array.from(map.values()) as QueueTicket[]).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    };

    const handleTicketCalling = (e: Event) => {
      const customEvent = e as CustomEvent;
      const callingTicket = customEvent.detail as QueueTicket;
      if (!callingTicket || !callingTicket.id) return;

      setTickets((prev) => {
        const map = new Map(ticketsMapRef.current);
        map.set(callingTicket.id, callingTicket);
        ticketsMapRef.current = map;
        return (Array.from(map.values()) as QueueTicket[]).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    };

    window.addEventListener('queue-ticket-created', handleTicketCreated);
    window.addEventListener('queue-ticket-calling', handleTicketCalling);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('queue-ticket-created', handleTicketCreated);
      window.removeEventListener('queue-ticket-calling', handleTicketCalling);
      setStatus('CLOSED');
    };
  }, [fetchTickets]);

  return { 
    tickets, 
    loading, 
    error, 
    status,
    refresh: () => fetchTickets(true) 
  };
};
