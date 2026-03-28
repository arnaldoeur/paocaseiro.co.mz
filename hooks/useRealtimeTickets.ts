import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { queueService, QueueTicket } from '../services/queue';

export const useRealtimeTickets = () => {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTickets = async () => {
    try {
      const data = await queueService.getTicketsToday();
      setTickets(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel('queue-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_tickets' },
        (payload) => {
          const newTicket = payload.new as QueueTicket;
          const oldTicket = payload.old as QueueTicket;

          const today = new Date().toISOString().split('T')[0];
          const isFromToday = (dateStr: string) => dateStr.startsWith(today);

          setTickets((prev) => {
            if (payload.eventType === 'INSERT') {
              if (!isFromToday(newTicket.created_at)) return prev;
              return [...prev, newTicket].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            }
            if (payload.eventType === 'UPDATE') {
              if (!isFromToday(newTicket.created_at)) {
                return prev.filter((t) => t.id !== newTicket.id);
              }
              const exists = prev.find(t => t.id === newTicket.id);
              if (!exists) {
                return [...prev, newTicket].sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              }
              return prev.map((t) => (t.id === newTicket.id ? newTicket : t));
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((t) => t.id !== oldTicket.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { tickets, loading, error, refresh: fetchTickets };
};
