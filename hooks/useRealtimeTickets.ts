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

  const isFromToday = useCallback((createdAt: string) => {
    if (!createdAt) return false;
    
    // Get current date string in Mozambique (UTC+2) using Intl to avoid manual offset math
    const mzTodayStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Africa/Maputo' 
    }).format(new Date());

    // Get ticket date string in Mozambique
    const ticketDate = new Date(createdAt);
    const mzTicketDateStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Africa/Maputo' 
    }).format(ticketDate);

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
      // Map common connection errors to more descriptive objects if needed
      const enrichedError = err instanceof Error ? err : new Error(String(err));
      setError(enrichedError);
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
      .on('broadcast', { event: 'ticket-calling' }, (payload) => {
        const callingTicket = payload.payload.ticket as QueueTicket;
        console.log('[useRealtimeTickets] Broadcast calling received:', callingTicket.ticket_number);
        
        setTickets((prev) => {
            const map = new Map(ticketsMapRef.current);
            map.set(callingTicket.id, callingTicket);
            ticketsMapRef.current = map;
            
            return (Array.from(map.values()) as QueueTicket[]).sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        });
      })
      .on('broadcast', { event: 'ticket-created' }, (payload) => {
        const newTicket = payload.payload.ticket as QueueTicket;
        console.log('[useRealtimeTickets] Broadcast created received:', newTicket.ticket_number);
        
        setTickets((prev) => {
            const map = new Map(ticketsMapRef.current);
            map.set(newTicket.id, newTicket);
            ticketsMapRef.current = map;
            
            return (Array.from(map.values()) as QueueTicket[]).sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        });
      })
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
