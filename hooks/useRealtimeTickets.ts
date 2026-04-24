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
  const [status, setStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'ERROR'>('CONNECTING');

  const isFromToday = useCallback((createdAt: string) => {
    if (!createdAt) return false;
    
    const now = new Date();
    // Get start of day in Maputo (UTC+2)
    const mzTodayStart = new Date(new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Maputo',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).format(now));
    mzTodayStart.setHours(0, 0, 0, 0);

    const ticketDate = new Date(createdAt);
    return ticketDate >= mzTodayStart;
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await queueService.getTicketsToday();
      
      const newMap = new Map<string, QueueTicket>();
      data.forEach(t => newMap.set(t.id, t));
      ticketsMapRef.current = newMap;
      
      setTickets(Array.from(newMap.values()).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
      setError(null);
    } catch (err: any) {
      console.error('[useRealtimeTickets] Fetch Error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

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
              if (!isFromToday(newTicket.created_at)) {
                if (map.has(newTicket.id)) map.delete(newTicket.id);
              } else {
                map.set(newTicket.id, newTicket);
              }
            } else if (payload.eventType === 'DELETE') {
              map.delete(oldTicket.id);
            }

            ticketsMapRef.current = map;
            return (Array.from(map.values()) as QueueTicket[]).sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      )
      .on('broadcast', { event: 'ticket-calling' }, (payload) => {
        const callingTicket = payload.payload.ticket as QueueTicket;
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
        setTickets((prev) => {
            const map = new Map(ticketsMapRef.current);
            map.set(newTicket.id, newTicket);
            ticketsMapRef.current = map;
            return (Array.from(map.values()) as QueueTicket[]).sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        });
      })
      .subscribe((status) => {
          console.log(`[useRealtimeTickets] Status: ${status}`);
          if (status === 'SUBSCRIBED') setStatus('SUBSCRIBED');
          if (status === 'CLOSED') setStatus('CLOSED');
          if (status === 'CHANNEL_ERROR') setStatus('ERROR');
          if (status === 'TIMED_OUT') {
              setStatus('ERROR');
              // Attempt manual re-fetch on timeout
              fetchTickets();
          }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isFromToday, fetchTickets]);

  return { 
    tickets, 
    loading, 
    error, 
    status,
    refresh: fetchTickets 
  };
};
