import { useState, useEffect, useCallback, useRef } from 'react';


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
      
      const { hostingerService } = await import('../services/hostingerService');
      const hData = await hostingerService.getNotifications();
      if (hData) {
        const newMap = new Map<string, SystemNotification>();
        hData.forEach((n: any) => newMap.set(n.id, n));
        notificationsMapRef.current = newMap;
        setNotifications(hData);
        setUnreadCount(hData.filter((n: any) => !n.read).length);
      }
    } catch (err) {
      console.error('[useRealtimeNotifications] Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
        fetchNotifications();
    }, 30000); // Poll every 30s

    return () => {
        clearInterval(interval);
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const { hostingerService } = await import('../services/hostingerService');
      await hostingerService.markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('[useRealtimeNotifications] MarkAsRead Error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { hostingerService } = await import('../services/hostingerService');
      await hostingerService.markAllNotificationsRead();
      fetchNotifications();
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
