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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/useUserStore';
import { useBetStore, UserBetHistory } from '../../betting/store/useBetStore';
import { HistoryRowSkeleton } from '../../../components/SkeletonLoader';
import { AnimatedListItem } from '../../../components/AnimatedListItem';

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

// ── Screen principal ──────────────────────────────────────────────────────────
export default function PortfolioScreen() {
    const { logOut, inventory, username, userId } = useUserStore();
    const { userBetHistory, fetchUserBetHistory } = useBetStore();

    const [activeTab, setActiveTab] = useState<'history' | 'stats'>('history');
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        if (!userId) return;
        const load = async () => {
            setLoadingHistory(true);
            await fetchUserBetHistory(userId);
            setLoadingHistory(false);
        };
        load();
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

    // ── Render ────────────────────────────────────────────────────────────────

    const Col = ({ numRows, children }) => {
        return  (
            <View style={styles[`${numRows}col`]}>{children}</View>
        )
    }

    const Row = ({ children }) => (
        <View style={styles.row}>{children}</View>
    )


    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Mon Profil</Text>
                    <Text style={styles.username}>@{username}</Text>
                </View>
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
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                        Historique
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
                    onPress={() => setActiveTab('stats')}
                >
                    <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
                        Mes Stats
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tab content */}
            {activeTab === 'history' ? (
                loadingHistory ? (
                    <View style={{ padding: 16 }}>
                        {[0, 1, 2, 3, 4].map((i) => (
                            <HistoryRowSkeleton key={i} />
                        ))}
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
                                <Text style={styles.emptySubtext}>
                                    Va miser tes clopes sur des paris !
                                </Text>
                            </View>
                        }
                    />
                )
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                    {/* Grille stats */}
                    <View style={styles.statsGrid}>
                        <Row>
                            <Col numRows={2}>
                                <StatCard label="Taux de victoire" value={`${winRate}%`} emoji="🎯" />
                            </Col>
                            <Col numRows={2}>
                                <StatCard label="Paris joués" value={totalPlayed} emoji="🎰" />
                            </Col>
                        </Row>
                        <Row>
                            <Col numRows={2}>
                                <StatCard label="Total misé" value={`${totalWagered}🚬`} emoji="💰" />
                            </Col>
                            <Col numRows={2}>
                                <StatCard label="Meilleur gain" value={`${bestWin}🚬`} emoji="🏆" />
                            </Col>
                        </Row>
                    </View>

                    {/* Bilan net */}
                    <View style={[styles.balanceCard, { borderColor: netBalance >= 0 ? '#4CAF5044' : '#E0245E44' }]}>
                        <Text style={styles.balanceLabel}>Bilan Net</Text>
                        <Text
                            style={[
                                styles.balanceValue,
                                { color: netBalance >= 0 ? '#4CAF50' : '#E0245E' },
                            ]}
                        >
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    title: { color: '#fff', fontSize: 28, fontWeight: '900' },
    username: { color: '#555', fontSize: 14, marginTop: 2 },
    logoutBtn: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        padding: 10,
    },

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
    inventoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    itemBox: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#111',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    itemBoxHighlight: {
        borderColor: '#FFD70033',
        backgroundColor: '#FFD70008',
    },
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
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: { backgroundColor: '#1a1a1a' },
    tabText: { color: '#444', fontWeight: '700', fontSize: 13 },
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
    statsGrid: {
        flex: 4,
        marginHorizontal: "auto",
        width:'100%',
        gap: 10,
        marginBottom: 10
    },
    row: {
        flexDirection: "row",
        gap: 10
    },
    "1col":  {
        borderWidth:  1,
        flex:  1
    },
    "2col":  {
        borderWidth:  1,
        flex:  2
    },
    "3col":  {
        borderWidth:  1,
        flex:  3
    },
    "4col":  {
        flex:  4
    },
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
});
