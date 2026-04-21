// src/features/notifications/store/useNotificationStore.ts
import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useUserStore } from '../../user/store/useUserStore';

export interface UserNotification {
    id: string;
    user_id: string;
    type: 'BET_WON' | 'BET_LOST' | 'BET_RESOLVED' | 'ACHIEVEMENT' | 'SYSTEM';
    title: string;
    message: string;
    is_read: boolean;
    metadata: Record<string, any> | null;
    created_at: string;
}

interface NotificationState {
    notifications: UserNotification[];
    unreadCount: number;
    loading: boolean;

    fetchNotifications: () => Promise<void>;
    markAllRead: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    subscribeToNotifications: () => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,

    fetchNotifications: async () => {
        const { userId } = useUserStore.getState();
        if (!userId) return;
        set({ loading: true });

        const { data, error } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            const notifs = data as UserNotification[];
            set({
                notifications: notifs,
                unreadCount: notifs.filter(n => !n.is_read).length,
            });
        }
        set({ loading: false });
    },

    markRead: async (id: string) => {
        await supabase.from('user_notifications').update({ is_read: true }).eq('id', id);
        set(state => ({
            notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
            unreadCount: Math.max(0, state.unreadCount - 1),
        }));
    },

    markAllRead: async () => {
        const { userId } = useUserStore.getState();
        if (!userId) return;
        await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', userId);
        set(state => ({
            notifications: state.notifications.map(n => ({ ...n, is_read: true })),
            unreadCount: 0,
        }));
    },

    subscribeToNotifications: () => {
        const { userId } = useUserStore.getState();
        if (!userId) return () => {};

        const sub = supabase
            .channel(`user-notifications-${userId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}` },
                (payload) => {
                    const newNotif = payload.new as UserNotification;
                    set(state => ({
                        notifications: [newNotif, ...state.notifications],
                        unreadCount: state.unreadCount + 1,
                    }));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    },
}));
