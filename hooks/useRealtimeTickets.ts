import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { queueService, QueueTicket } from '../services/queue';

/**
 * Hook to manage real-time queue tickets with timezone-aware filtering (UTC+2)
 * and race condition protection.
 */
export const useRealtimeTickets = () => {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Ref to track processed IDs and prevent duplicates or stale state updates
  const ticketsMapRef = useRef<Map<string, QueueTicket>>(new Map());

  // Helper to check if a ticket is from the current Mozambique day (UTC+2)
  const isFromToday = useCallback((createdAt: string) => {
    if (!createdAt) return false;
    
    // Get current time in Mozambique (UTC+2)
    const now = new Date();
    const mzNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    const mzTodayStr = mzNow.toISOString().split('T')[0];

    // Get ticket time in Mozambique
    const ticketDate = new Date(createdAt);
    const mzTicketDate = new Date(ticketDate.getTime() + (2 * 60 * 60 * 1000));
    const mzTicketDateStr = mzTicketDate.toISOString().split('T')[0];

    return mzTicketDateStr === mzTodayStr;
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await queueService.getTicketsToday();
      
      // Initialize the map with fresh data
      const newMap = new Map<string, QueueTicket>();
      data.forEach(t => newMap.set(t.id, t));
      ticketsMapRef.current = newMap;
      
      setTickets(Array.from(newMap.values()).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
      setError(null);
    } catch (err: any) {
      console.error('[useRealtimeTickets] Fetch Error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel('queue-realtime-enhanced')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_tickets' },
        (payload) => {
          const newTicket = payload.new as QueueTicket;
          const oldTicket = payload.old as QueueTicket;

          setTickets((prev) => {
            const map = new Map(ticketsMapRef.current);

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              // Only keep tickets from today (UTC+2)
              if (!isFromToday(newTicket.created_at)) {
                if (map.has(newTicket.id)) map.delete(newTicket.id);
              } else {
                map.set(newTicket.id, newTicket);
              }
            } else if (payload.eventType === 'DELETE') {
              map.delete(oldTicket.id);
            }

            // Sync back to ref
            ticketsMapRef.current = map;

            // Return sorted array
            return (Array.from(map.values()) as QueueTicket[]).sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isFromToday]);

  return { 
    tickets, 
    loading, 
    error, 
    refresh: fetchTickets 
  };
};
