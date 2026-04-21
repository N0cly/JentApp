// src/features/notifications/screens/NotificationCenterScreen.tsx
import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore, UserNotification } from '../store/useNotificationStore';
import { AnimatedListItem } from '../../../components/AnimatedListItem';

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
    BET_WON:      { emoji: '🏆', color: '#4CAF50' },
    BET_LOST:     { emoji: '💸', color: '#E0245E' },
    BET_RESOLVED: { emoji: '🏁', color: '#FFD700' },
    ACHIEVEMENT:  { emoji: '🏅', color: '#FF9800' },
    SYSTEM:       { emoji: '📣', color: '#2196F3' },
};

function NotifRow({ item, onPress }: { item: UserNotification; onPress: () => void }) {
    const cfg = TYPE_CONFIG[item.type] ?? { emoji: '🔔', color: '#666' };
    const date = new Date(item.created_at).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.notifRow, !item.is_read && styles.notifRowUnread]}
        >
            {/* Unread dot */}
            {!item.is_read && <View style={styles.unreadDot} />}

            {/* Icon */}
            <View style={[styles.notifIcon, { borderColor: cfg.color + '44', backgroundColor: cfg.color + '11' }]}>
                <Text style={{ fontSize: 20 }}>{cfg.emoji}</Text>
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
                <Text style={[styles.notifTitle, !item.is_read && { color: '#fff' }]}>
                    {item.title}
                </Text>
                <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.notifDate}>{date}</Text>
            </View>
        </TouchableOpacity>
    );
}

interface Props {
    onClose: () => void;
}

export default function NotificationCenterScreen({ onClose }: Props) {
    const { notifications, unreadCount, loading, fetchNotifications, markAllRead, markRead } = useNotificationStore();

    useEffect(() => {
        void fetchNotifications();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Notifications</Text>
                    {unreadCount > 0 && (
                        <Text style={styles.unreadLabel}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Text>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity style={styles.markAllBtn} onPress={() => void markAllRead()}>
                        <Text style={styles.markAllText}>Tout lire</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <ActivityIndicator color="#FFD700" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => (
                        <AnimatedListItem index={index} delay={30}>
                            <NotifRow item={item} onPress={() => { if (!item.is_read) void markRead(item.id); }} />
                        </AnimatedListItem>
                    )}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ fontSize: 48, textAlign: 'center' }}>🔕</Text>
                            <Text style={styles.emptyText}>Aucune notification</Text>
                            <Text style={styles.emptySubtext}>Tu verras ici tes gains, pertes et succès</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#111',
        gap: 12,
    },
    backBtn: { padding: 6, backgroundColor: '#1a1a1a', borderRadius: 10 },
    title: { color: '#fff', fontSize: 20, fontWeight: '900' },
    unreadLabel: { color: '#FFD700', fontSize: 11, fontWeight: '700', marginTop: 1 },
    markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1a1a1a', borderRadius: 10 },
    markAllText: { color: '#888', fontSize: 12, fontWeight: '700' },

    notifRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: '#0d0d0d',
        borderRadius: 16,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#1a1a1a',
        position: 'relative',
    },
    notifRowUnread: {
        borderColor: '#FFD70033',
        backgroundColor: '#FFD70005',
    },
    unreadDot: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFD700',
    },
    notifIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    notifTitle: { color: '#888', fontWeight: '800', fontSize: 14, marginBottom: 2 },
    notifMessage: { color: '#555', fontSize: 12, lineHeight: 18 },
    notifDate: { color: '#333', fontSize: 10, marginTop: 4, fontWeight: '600' },

    emptyContainer: { marginTop: 80, alignItems: 'center' },
    emptyText: { color: '#444', fontSize: 16, fontWeight: '700', marginTop: 16 },
    emptySubtext: { color: '#333', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
