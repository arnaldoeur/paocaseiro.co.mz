import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

export interface SystemNotification {
    id: string;
    type: 'order' | 'support' | 'system' | 'user';
    title: string;
    message: string;
    entity_id?: string;
    link?: string;
    read: boolean;
    created_at: string;
}

export const useRealtimeNotifications = (onNewNotification?: (notification: SystemNotification) => void, limit: number = 50) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const notificationsMapRef = useRef<Map<string, SystemNotification>>(new Map());
  const onNewRef = useRef(onNewNotification);

  // Keep ref in sync
  useEffect(() => {
    onNewRef.current = onNewNotification;
  }, [onNewNotification]);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;

      const newMap = new Map<string, SystemNotification>();
      data?.forEach(log => newMap.set(log.id, log));
      notificationsMapRef.current = newMap;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (err) {
      console.error('[useRealtimeNotifications] Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-realtime-hook')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLog = payload.new as SystemNotification;
            
            // Trigger callback if unread
            if (!newLog.read && onNewRef.current) {
              onNewRef.current(newLog);
            }

            setNotifications(prev => {
              const map = new Map(notificationsMapRef.current);
              map.set(newLog.id, newLog);
              notificationsMapRef.current = map;
              
              const updated = Array.from(map.values()).sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              return updated.slice(0, limit) as SystemNotification[];
            });
            
            if (!newLog.read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedLog = payload.new as SystemNotification;
            setNotifications(prev => {
              const map = new Map(notificationsMapRef.current);
              map.set(updatedLog.id, updatedLog);
              notificationsMapRef.current = map;
              
              return Array.from(map.values()).sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              ) as SystemNotification[];
            });
            
            // Recalculate unread count
            const all = Array.from(notificationsMapRef.current.values());
            setUnreadCount(all.filter(n => !n.read).length);
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
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.error('[useRealtimeNotifications] MarkAsRead Error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);
      
      if (error) throw error;
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
