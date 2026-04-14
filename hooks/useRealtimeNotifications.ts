import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

export interface SystemLog {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    category: string;
    user_id?: string;
    created_at: string;
    is_read: boolean;
}

export const useRealtimeNotifications = (limit: number = 50) => {
  const [notifications, setNotifications] = useState<SystemLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const notificationsMapRef = useRef<Map<string, SystemLog>>(new Map());

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;

      const newMap = new Map<string, SystemLog>();
      data?.forEach(log => newMap.set(log.id, log));
      notificationsMapRef.current = newMap;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error('[useRealtimeNotifications] Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('system-notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLog = payload.new as SystemLog;
            setNotifications(prev => {
              const map = new Map(notificationsMapRef.current);
              map.set(newLog.id, newLog);
              notificationsMapRef.current = map;
              
              const updated = Array.from(map.values()).sort((a: SystemLog, b: SystemLog) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              return updated.slice(0, limit);
            });
            if (!newLog.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedLog = payload.new as SystemLog;
            setNotifications(prev => {
              const map = new Map(notificationsMapRef.current);
              map.set(updatedLog.id, updatedLog);
              notificationsMapRef.current = map;
              
              return Array.from(map.values()).sort((a: SystemLog, b: SystemLog) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            });
            
            // Recalculate unread count
            setUnreadCount(Array.from(notificationsMapRef.current.values()).filter((n: SystemLog) => !n.is_read).length);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, limit]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('system_logs')
        .update({ is_read: true })
        .eq('id', id);
      
      if (error) throw error;
      // Real-time update will handle the local state change
    } catch (err) {
      console.error('[useRealtimeNotifications] MarkAsRead Error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('system_logs')
        .update({ is_read: true })
        .eq('is_read', false);
      
      if (error) throw error;
      // Real-time update will handle the local state change
    } catch (err) {
      console.error('[useRealtimeNotifications] MarkAllAsRead Error:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};
