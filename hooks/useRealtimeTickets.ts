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

    // Setup short polling (every 5 seconds) as fallback/double check
    const intervalId = setInterval(() => {
      fetchTickets(false);
    }, 5000);

    // Setup WebSocket connection
    let socket: WebSocket | null = null;
    let reconnectTimeoutId: any = null;

    const connectWS = () => {
      try {
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect to port 8080 if running under Vite dev port 3000
        const wsHost = window.location.port === '3000' ? 'localhost:8080' : window.location.host;
        const wsUrl = `${wsProto}//${wsHost}/ws`;
        
        console.log('[useRealtimeTickets] Connecting to WebSocket:', wsUrl);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('[useRealtimeTickets] WebSocket connected');
          setStatus('SUBSCRIBED');
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const { event: eventName, data } = payload;
            
            console.log('[useRealtimeTickets] Received WS event:', eventName, data);
            
            if (eventName === 'queue-reset') {
              fetchTickets(false);
              return;
            }

            if (data && data.id) {
              setTickets(() => {
                const map = new Map(ticketsMapRef.current);
                map.set(data.id, data);
                ticketsMapRef.current = map;
                return (Array.from(map.values()) as QueueTicket[]).sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });
              
              // Dispatch local event for local components
              window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
            }
          } catch (err) {
            console.error('[useRealtimeTickets] Error parsing message:', err);
          }
        };

        socket.onclose = () => {
          console.log('[useRealtimeTickets] WebSocket disconnected, reconnecting in 5s...');
          setStatus('CONNECTING');
          reconnectTimeoutId = setTimeout(() => {
            connectWS();
          }, 5000);
        };

        socket.onerror = (err) => {
          console.error('[useRealtimeTickets] WebSocket error, forcing close:', err);
          socket?.close();
        };
      } catch (e) {
        console.error('[useRealtimeTickets] WS initialization failed:', e);
      }
    };

    connectWS();

    // Setup local event listeners for instant UI updates when action occurs on the same device
    const handleTicketCreated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newTicket = customEvent.detail as QueueTicket;
      if (!newTicket || !newTicket.id) return;
      
      setTickets(() => {
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

      setTickets(() => {
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
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      if (socket) {
        // Prevent reconnect loop on unmount
        socket.onclose = null;
        socket.close();
      }
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
