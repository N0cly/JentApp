// src/features/user/screens/PortfolioScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUserStore } from '../store/useUserStore';
import { useBetStore, UserBetHistory } from '../../betting/store/useBetStore';
import { useCosmeticsStore, Achievement, UserAchievement } from '../../shop/store/useCosmeticsStore';
import { HistoryRowSkeleton } from '../../../components/SkeletonLoader';
import { AnimatedListItem } from '../../../components/AnimatedListItem';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useNotificationStore } from '../../notifications/store/useNotificationStore';
import NotificationCenterScreen from '../../notifications/screens/NotificationCenterScreen';

// ── Composant StatCard ────────────────────────────────────────────────────────
function StatCard({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
    return (
        <View style={styles.statCard}>
            <Text style={styles.statEmoji}>{emoji}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// ── Composant HistoryRow ──────────────────────────────────────────────────────
function HistoryRow({ item }: { item: UserBetHistory }) {
    const resultEmoji = item.result === 'win' ? '🏆' : item.result === 'loss' ? '💸' : '⏳';
    const resultColor = item.result === 'win' ? '#4CAF50' : item.result === 'loss' ? '#E0245E' : '#FFD700';
    const gainText =
        item.result === 'win'
            ? `+${item.gain}🚬`
            : item.result === 'loss'
                ? `-${item.amount}🚬`
                : 'En cours';

    const chosenOption = item.bet?.options?.find((o) => o.id === item.option_id);

    return (
        <View style={styles.historyRow}>
            <Text style={styles.historyEmoji}>{resultEmoji}</Text>
            <View style={styles.historyInfo}>
                <Text style={styles.historyQuestion} numberOfLines={1}>
                    {item.bet?.question ?? '—'}
                </Text>
                <Text style={styles.historyOption}>
                    {chosenOption?.label ?? item.option_id} · {item.amount}🚬 misées
                </Text>
            </View>
            <Text style={[styles.historyGain, { color: resultColor }]}>{gainText}</Text>
        </View>
    );
}

// ── Composant AchievementCard ─────────────────────────────────────────────────
function AchievementCard({
    achievement,
    isUnlocked,
    userAch,
    progress,
}: {
    achievement: Achievement;
    isUnlocked: boolean;
    userAch?: UserAchievement;
    progress?: number; // 0-1
}) {
    const isHiddenLocked = achievement.is_hidden && !isUnlocked;

    const progressPct = progress !== undefined ? Math.min(progress, 1) : undefined;

    return (
        <View style={[styles.achievementCard, isUnlocked && styles.achievementCardUnlocked]}>
            {/* Icon */}
            <View style={[styles.achievementIcon, isUnlocked && styles.achievementIconUnlocked]}>
                <Text style={{ fontSize: 28 }}>{isHiddenLocked ? '🔒' : achievement.icon}</Text>
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
                <Text style={[styles.achievementName, !isUnlocked && styles.achievementNameLocked]}>
                    {isHiddenLocked ? '???' : achievement.name}
                </Text>
                <Text style={styles.achievementDesc} numberOfLines={2}>
                    {isHiddenLocked ? 'Succès mystère — à découvrir !' : achievement.description}
                </Text>

                {/* Progress bar for measurable locked achievements */}
                {!isUnlocked && !isHiddenLocked && progressPct !== undefined && (
                    <View style={styles.progressBarOuter}>
                        <View style={[styles.progressBarInner, { width: `${Math.round(progressPct * 100)}%` }]} />
                    </View>
                )}

                {/* Reward */}
                {!isHiddenLocked && (
                    <View style={styles.rewardRow}>
                        {achievement.reward_clopes > 0 && (
                            <Text style={styles.rewardText}>+{achievement.reward_clopes}🚬</Text>
                        )}
                        {achievement.reward_cosmetic_id && (
                            <Text style={styles.rewardText}>+Cosmétique 🎁</Text>
                        )}
                    </View>
                )}
            </View>

            {/* Status badge */}
            <View style={[styles.achBadge, isUnlocked ? styles.achBadgeUnlocked : styles.achBadgeLocked]}>
                <Text style={[styles.achBadgeText, isUnlocked && styles.achBadgeTextUnlocked]}>
                    {isUnlocked ? '✓' : isHiddenLocked ? '?' : (progress !== undefined ? `${Math.round((progress ?? 0) * achievement.requirement_value)}/${achievement.requirement_value}` : '⏳')}
                </Text>
            </View>
        </View>
    );
}

// ── Screen principal ──────────────────────────────────────────────────────────
export default function PortfolioScreen() {
    const { logOut, inventory, username, userId, fetchProfile } = useUserStore();
    const { userBetHistory, fetchUserBetHistory } = useBetStore();
    const { achievements, userAchievements, fetchAchievements } = useCosmeticsStore();
    const { showToast } = useToast();
    const { unreadCount, fetchNotifications, subscribeToNotifications } = useNotificationStore();

    const [activeTab, setActiveTab] = useState<'history' | 'stats' | 'achievements'>('history');
    const [showNotifications, setShowNotifications] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        if (!userId) return;
        const load = async () => {
            setLoadingHistory(true);
            await Promise.all([
                fetchUserBetHistory(userId),
                fetchAchievements(userId),
            ]);
            setLoadingHistory(false);
        };
        load();
        // Load current avatar
        supabase.from('profiles').select('avatar_url').eq('id', userId).single()
            .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url); });

        // Notifications
        fetchNotifications();
        const unsubNotifs = subscribeToNotifications();
        return () => { unsubNotifs(); };
    }, [userId]);

    // ── Stats calculées ───────────────────────────────────────────────────────
    const totalPlayed = userBetHistory.length;
    const wins = userBetHistory.filter((h) => h.result === 'win');
    const losses = userBetHistory.filter((h) => h.result === 'loss');
    const winRate = totalPlayed > 0 ? Math.round((wins.length / totalPlayed) * 100) : 0;
    const totalWagered = userBetHistory.reduce((sum, h) => sum + h.amount, 0);
    const totalGained = wins.reduce((sum, h) => sum + h.gain, 0);
    const totalLost = losses.reduce((sum, h) => sum + h.amount, 0);
    const netBalance = totalGained - totalLost;
    const bestWin = wins.length > 0 ? Math.max(...wins.map((h) => h.gain)) : 0;
    const singleBetMax = userBetHistory.length > 0 ? Math.max(...userBetHistory.map((h) => h.amount)) : 0;

    // ── Achievement progress helpers ──────────────────────────────────────────
    const getProgress = (ach: Achievement): number => {
        switch (ach.requirement_type) {
            case 'bets_placed': return totalPlayed / ach.requirement_value;
            case 'bets_won': return wins.length / ach.requirement_value;
            case 'clopes_earned': return totalGained / ach.requirement_value;
            case 'single_bet': return singleBetMax / ach.requirement_value;
            case 'single_win': return bestWin / ach.requirement_value;
            default: return 0;
        }
    };

    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement_id));

    // ── Avatar upload ─────────────────────────────────────────────────────────
    const handleAvatarPress = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission refusée', 'Autorise l\'accès à ta galerie pour changer ton avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        setUploadingAvatar(true);

        try {
            const ext = asset.uri.split('.').pop() ?? 'jpg';
            const fileName = `${userId}_${Date.now()}.${ext}`;

            const response = await fetch(asset.uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, blob, { contentType: `image/${ext}`, upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
            const publicUrl = urlData.publicUrl;

            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId!);
            setAvatarUrl(publicUrl);
            showToast('Photo de profil mise à jour ! 📸', 'success');
        } catch (e: any) {
            showToast('Erreur upload : ' + (e.message ?? 'Inconnue'), 'error');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const initials = username ? username.slice(0, 2).toUpperCase() : '??';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                {/* Avatar */}
                <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarWrapper}>
                    {uploadingAvatar ? (
                        <View style={styles.avatar}>
                            <ActivityIndicator color="#FFD700" />
                        </View>
                    ) : avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitials}>{initials}</Text>
                        </View>
                    )}
                    <View style={styles.avatarEditBadge}>
                        <Ionicons name="camera" size={10} color="#000" />
                    </View>
                </TouchableOpacity>

                {/* Info */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.title}>Mon Profil</Text>
                    <Text style={styles.username}>@{username}</Text>
                </View>

                {/* Bell icon */}
                <TouchableOpacity
                    style={[styles.logoutBtn, { marginRight: 8, position: 'relative' }]}
                    onPress={() => setShowNotifications(true)}
                >
                    <Ionicons name="notifications-outline" size={20} color="#fff" />
                    {unreadCount > 0 && (
                        <View style={styles.notifBadge}>
                            <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={() => logOut()}>
                    <Ionicons name="log-out-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Wallet card */}
            <View style={styles.walletCard}>
                <Text style={styles.walletLabel}>Inventaire</Text>
                <View style={styles.inventoryRow}>
                    <View style={styles.itemBox}>
                        <Text style={styles.emoji}>📦</Text>
                        <Text style={styles.count}>{inventory.packets}</Text>
                        <Text style={styles.unit}>PACKETS</Text>
                    </View>
                    <View style={styles.itemBox}>
                        <Text style={styles.emoji}>🌿</Text>
                        <Text style={styles.count}>{inventory.joints}</Text>
                        <Text style={styles.unit}>JOINTS</Text>
                    </View>
                    <View style={[styles.itemBox, styles.itemBoxHighlight]}>
                        <Text style={styles.emoji}>🚬</Text>
                        <Text style={[styles.count, { color: '#FFD700' }]}>{inventory.clopes}</Text>
                        <Text style={styles.unit}>CLOPES</Text>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {(['history', 'stats', 'achievements'] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'history' ? 'Historique' : tab === 'stats' ? 'Stats' : '🏅 Succès'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tab content */}
            {activeTab === 'history' && (
                loadingHistory ? (
                    <View style={{ padding: 16 }}>
                        {[0, 1, 2, 3, 4].map((i) => <HistoryRowSkeleton key={i} />)}
                    </View>
                ) : (
                    <FlatList
                        data={userBetHistory}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item, index }) => (
                            <AnimatedListItem index={index} delay={40}>
                                <HistoryRow item={item} />
                            </AnimatedListItem>
                        )}
                        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={{ fontSize: 48, textAlign: 'center' }}>🎲</Text>
                                <Text style={styles.emptyText}>Aucun pari pour l'instant</Text>
                                <Text style={styles.emptySubtext}>Va miser tes clopes sur des paris !</Text>
                            </View>
                        }
                    />
                )
            )}

            {activeTab === 'stats' && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                    <View style={styles.statsGrid}>
                        <View style={styles.row}>
                            <StatCard label="Taux de victoire" value={`${winRate}%`} emoji="🎯" />
                            <StatCard label="Paris joués" value={totalPlayed} emoji="🎰" />
                        </View>
                        <View style={styles.row}>
                            <StatCard label="Total misé" value={`${totalWagered}🚬`} emoji="💰" />
                            <StatCard label="Meilleur gain" value={`${bestWin}🚬`} emoji="🏆" />
                        </View>
                    </View>

                    <View style={[styles.balanceCard, { borderColor: netBalance >= 0 ? '#4CAF5044' : '#E0245E44' }]}>
                        <Text style={styles.balanceLabel}>Bilan Net</Text>
                        <Text style={[styles.balanceValue, { color: netBalance >= 0 ? '#4CAF50' : '#E0245E' }]}>
                            {netBalance >= 0 ? '+' : ''}{netBalance}🚬
                        </Text>
                        <View style={styles.balanceDetails}>
                            <Text style={styles.balanceDetail}>
                                <Text style={{ color: '#4CAF50' }}>+{totalGained}🚬</Text> gagnées
                            </Text>
                            <Text style={styles.balanceSep}>·</Text>
                            <Text style={styles.balanceDetail}>
                                <Text style={{ color: '#E0245E' }}>-{totalLost}🚬</Text> perdues
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            )}

            {activeTab === 'achievements' && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                    {/* Summary */}
                    <View style={styles.achSummary}>
                        <Text style={styles.achSummaryText}>
                            {unlockedIds.size}
                            <Text style={styles.achSummaryTotal}>/{achievements.length}</Text>
                        </Text>
                        <Text style={styles.achSummaryLabel}>succès débloqués</Text>
                    </View>

                    {/* Unlocked first */}
                    {achievements.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={{ fontSize: 40, textAlign: 'center' }}>🏅</Text>
                            <Text style={styles.emptyText}>Chargement...</Text>
                        </View>
                    ) : (
                        <>
                            {/* Unlocked */}
                            {achievements.filter(a => unlockedIds.has(a.id)).map((ach, i) => (
                                <AnimatedListItem key={ach.id} index={i} delay={30}>
                                    <AchievementCard
                                        achievement={ach}
                                        isUnlocked={true}
                                        userAch={userAchievements.find(ua => ua.achievement_id === ach.id)}
                                    />
                                </AnimatedListItem>
                            ))}

                            {/* Locked (visible) */}
                            {achievements.filter(a => !unlockedIds.has(a.id) && !a.is_hidden).map((ach, i) => (
                                <AnimatedListItem key={ach.id} index={i + unlockedIds.size} delay={30}>
                                    <AchievementCard
                                        achievement={ach}
                                        isUnlocked={false}
                                        progress={getProgress(ach)}
                                    />
                                </AnimatedListItem>
                            ))}

                            {/* Hidden locked */}
                            {achievements.filter(a => !unlockedIds.has(a.id) && a.is_hidden).map((ach, i) => (
                                <AnimatedListItem key={ach.id} index={i + achievements.length} delay={30}>
                                    <AchievementCard achievement={ach} isUnlocked={false} />
                                </AnimatedListItem>
                            ))}
                        </>
                    )}
                </ScrollView>
            )}
            {/* Notification center */}
            <Modal
                visible={showNotifications}
                animationType="slide"
                onRequestClose={() => setShowNotifications(false)}
            >
                <NotificationCenterScreen onClose={() => setShowNotifications(false)} />
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    avatarWrapper: { position: 'relative' },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarPlaceholder: {
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    avatarInitials: { color: '#FFD700', fontWeight: '900', fontSize: 20 },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFD700',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { color: '#fff', fontSize: 22, fontWeight: '900' },
    username: { color: '#555', fontSize: 13, marginTop: 1 },
    logoutBtn: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        padding: 10,
    },
    notifBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#E0245E',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

    // Wallet card
    walletCard: {
        marginHorizontal: 16,
        backgroundColor: '#0d0d0d',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1a1a1a',
        marginBottom: 16,
    },
    walletLabel: {
        color: '#444',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 14,
    },
    inventoryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    itemBox: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#111',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    itemBoxHighlight: { borderColor: '#FFD70033', backgroundColor: '#FFD70008' },
    emoji: { fontSize: 22, marginBottom: 6 },
    count: { color: '#fff', fontSize: 18, fontWeight: '900' },
    unit: { color: '#333', fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 1 },

    // Tabs
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: '#0d0d0d',
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: '#1a1a1a' },
    tabText: { color: '#444', fontWeight: '700', fontSize: 12 },
    tabTextActive: { color: '#fff' },

    // History row
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0d0d0d',
        borderRadius: 16,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#1a1a1a',
        gap: 12,
    },
    historyEmoji: { fontSize: 24 },
    historyInfo: { flex: 1 },
    historyQuestion: { color: '#ccc', fontWeight: '700', fontSize: 14 },
    historyOption: { color: '#444', fontSize: 12, marginTop: 2 },
    historyGain: { fontWeight: '900', fontSize: 15 },

    // Empty
    emptyContainer: { marginTop: 60, alignItems: 'center' },
    emptyText: { color: '#444', fontSize: 16, fontWeight: '700', marginTop: 16 },
    emptySubtext: { color: '#333', fontSize: 13, marginTop: 6 },

    // Stats
    statsGrid: { gap: 10, marginBottom: 10 },
    row: { flexDirection: 'row', gap: 10 },
    statCard: {
        flex: 1,
        backgroundColor: '#0d0d0d',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    statEmoji: { fontSize: 28, marginBottom: 8 },
    statValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
    statLabel: { color: '#444', fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },

    // Balance card
    balanceCard: {
        backgroundColor: '#0d0d0d',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
    },
    balanceLabel: { color: '#444', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    balanceValue: { fontSize: 36, fontWeight: '900', marginBottom: 12 },
    balanceDetails: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    balanceDetail: { color: '#555', fontSize: 13 },
    balanceSep: { color: '#333', fontSize: 13 },

    // Achievements
    achSummary: { alignItems: 'center', marginBottom: 20 },
    achSummaryText: { color: '#FFD700', fontSize: 40, fontWeight: '900' },
    achSummaryTotal: { color: '#333', fontSize: 28 },
    achSummaryLabel: { color: '#444', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

    achievementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0d0d0d',
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1a1a1a',
        gap: 12,
    },
    achievementCardUnlocked: {
        borderColor: '#FFD70033',
        backgroundColor: '#FFD70005',
    },
    achievementIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    achievementIconUnlocked: {
        borderColor: '#FFD70044',
        backgroundColor: '#FFD70011',
    },
    achievementName: { color: '#fff', fontWeight: '800', fontSize: 14, marginBottom: 2 },
    achievementNameLocked: { color: '#555' },
    achievementDesc: { color: '#444', fontSize: 11, lineHeight: 16 },
    progressBarOuter: {
        height: 4,
        backgroundColor: '#1a1a1a',
        borderRadius: 2,
        marginTop: 8,
        overflow: 'hidden',
    },
    progressBarInner: {
        height: 4,
        backgroundColor: '#FFD700',
        borderRadius: 2,
    },
    rewardRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
    rewardText: { color: '#4CAF50', fontSize: 11, fontWeight: '700' },

    achBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    achBadgeUnlocked: { backgroundColor: '#FFD70022', borderColor: '#FFD70055' },
    achBadgeLocked: { backgroundColor: '#111', borderColor: '#222' },
    achBadgeText: { color: '#444', fontSize: 11, fontWeight: '800' },
    achBadgeTextUnlocked: { color: '#FFD700', fontSize: 14 },
});
