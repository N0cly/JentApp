// src/features/user/components/UserProfileModal.tsx
import React, { useEffect, useState } from 'react';
import {
    Modal, View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { UserBetHistory } from '../../betting/store/useBetStore';
import { HistoryRowSkeleton } from '../../../components/SkeletonLoader';
import { AnimatedListItem } from '../../../components/AnimatedListItem';

interface PublicProfile {
    id: string;
    username: string;
    clopes: number;
    joints: number;
    packets: number;
    avatar_url: string | null;
    avatar_cosmetic_id: string | null;
    border_cosmetic_id: string | null;
    role: string;
}

interface Props {
    userId: string;
    onClose: () => void;
}

function StatBadge({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
    return (
        <View style={styles.statBadge}>
            <Text style={styles.statEmoji}>{emoji}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

export default function UserProfileModal({ userId, onClose }: Props) {
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [history, setHistory] = useState<UserBetHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [profileRes, historyRes] = await Promise.all([
                supabase.from('profiles')
                    .select('id, username, clopes, joints, packets, avatar_url, avatar_cosmetic_id, border_cosmetic_id, role')
                    .eq('id', userId)
                    .single(),
                supabase.from('user_bets')
                    .select('*, bet:bets(*)')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(20),
            ]);

            if (profileRes.data) setProfile(profileRes.data as PublicProfile);

            if (historyRes.data) {
                const hist: UserBetHistory[] = historyRes.data.map((ub: any) => {
                    const bet = ub.bet;
                    let result: 'win' | 'loss' | 'pending' = 'pending';
                    let gain = 0;
                    if (bet?.status === 'SETTLED') {
                        if (ub.option_id === bet.winning_option_id) {
                            result = 'win';
                            const winOpt = bet.options?.find((o: any) => o.id === bet.winning_option_id);
                            gain = winOpt ? Math.floor(ub.amount * winOpt.odds) : 0;
                        } else {
                            result = 'loss';
                        }
                    }
                    return { ...ub, bet, result, gain };
                });
                setHistory(hist);
            }
            setLoading(false);
        };
        load();
    }, [userId]);

    // ── Stats calculées ────────────────────────────────────────────────────────
    const wins = history.filter(h => h.result === 'win');
    const losses = history.filter(h => h.result === 'loss');
    const winRate = history.length > 0 ? Math.round((wins.length / history.length) * 100) : 0;
    const totalGained = wins.reduce((s, h) => s + h.gain, 0);
    const totalLost = losses.reduce((s, h) => s + h.amount, 0);
    const netBalance = totalGained - totalLost;

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Poignée */}
                    <View style={styles.handle} />
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={20} color="#666" />
                    </TouchableOpacity>

                    {loading || !profile ? (
                        <ActivityIndicator color="#FFD700" style={{ marginTop: 60 }} />
                    ) : (
                        <>
                            {/* Header profil */}
                            <View style={styles.profileHeader}>
                                {profile.avatar_url ? (
                                    <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                        <Text style={styles.avatarInitials}>
                                            {profile.username.slice(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <Text style={styles.username}>@{profile.username}</Text>
                                {profile.role === 'admin' && (
                                    <View style={styles.adminBadge}>
                                        <Text style={styles.adminBadgeText}>ADMIN</Text>
                                    </View>
                                )}

                                {/* Inventaire */}
                                <View style={styles.inventoryRow}>
                                    <View style={styles.invItem}>
                                        <Text style={styles.invEmoji}>🚬</Text>
                                        <Text style={styles.invValue}>{profile.clopes}</Text>
                                        <Text style={styles.invLabel}>clopes</Text>
                                    </View>
                                    <View style={styles.invItem}>
                                        <Text style={styles.invEmoji}>🌿</Text>
                                        <Text style={styles.invValue}>{profile.joints}</Text>
                                        <Text style={styles.invLabel}>joints</Text>
                                    </View>
                                    <View style={styles.invItem}>
                                        <Text style={styles.invEmoji}>📦</Text>
                                        <Text style={styles.invValue}>{profile.packets}</Text>
                                        <Text style={styles.invLabel}>packets</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Tabs */}
                            <View style={styles.tabBar}>
                                {(['stats', 'history'] as const).map(tab => (
                                    <TouchableOpacity
                                        key={tab}
                                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                                        onPress={() => setActiveTab(tab)}
                                    >
                                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                            {tab === 'stats' ? 'Stats' : 'Historique'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                                {activeTab === 'stats' ? (
                                    <>
                                        <View style={styles.statsGrid}>
                                            <StatBadge label="Taux victoire" value={`${winRate}%`} emoji="🎯" />
                                            <StatBadge label="Paris joués" value={history.length} emoji="🎰" />
                                            <StatBadge label="Paris gagnés" value={wins.length} emoji="🏆" />
                                            <StatBadge label="Bilan net" value={`${netBalance >= 0 ? '+' : ''}${netBalance}🚬`} emoji="📊" />
                                        </View>
                                    </>
                                ) : (
                                    history.length === 0 ? (
                                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                                            <Text style={{ fontSize: 40 }}>🎲</Text>
                                            <Text style={{ color: '#444', marginTop: 12 }}>Aucun pari joué</Text>
                                        </View>
                                    ) : (
                                        history.map((item, index) => {
                                            const emoji = item.result === 'win' ? '🏆' : item.result === 'loss' ? '💸' : '⏳';
                                            const color = item.result === 'win' ? '#4CAF50' : item.result === 'loss' ? '#E0245E' : '#FFD700';
                                            const gainText = item.result === 'win' ? `+${item.gain}🚬` : item.result === 'loss' ? `-${item.amount}🚬` : 'En cours';
                                            const opt = item.bet?.options?.find((o: any) => o.id === item.option_id);
                                            return (
                                                <AnimatedListItem key={item.id} index={index} delay={30}>
                                                    <View style={styles.histRow}>
                                                        <Text style={{ fontSize: 20 }}>{emoji}</Text>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.histQuestion} numberOfLines={1}>
                                                                {item.bet?.question ?? '—'}
                                                            </Text>
                                                            <Text style={styles.histOpt}>
                                                                {opt?.label ?? item.option_id} · {item.amount}🚬
                                                            </Text>
                                                        </View>
                                                        <Text style={[styles.histGain, { color }]}>{gainText}</Text>
                                                    </View>
                                                </AnimatedListItem>
                                            );
                                        })
                                    )
                                )}
                            </ScrollView>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: '70%', maxHeight: '92%', borderWidth: 1, borderColor: '#1a1a1a' },
    handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 6 },

    profileHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#111' },
    avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
    avatarPlaceholder: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
    avatarInitials: { color: '#FFD700', fontWeight: '900', fontSize: 28 },
    username: { color: '#fff', fontWeight: '900', fontSize: 20, marginBottom: 6 },
    adminBadge: { backgroundColor: '#FFD70022', borderWidth: 1, borderColor: '#FFD70055', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8, marginBottom: 10 },
    adminBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '800' },

    inventoryRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
    invItem: { alignItems: 'center' },
    invEmoji: { fontSize: 20 },
    invValue: { color: '#fff', fontWeight: '900', fontSize: 16 },
    invLabel: { color: '#444', fontSize: 10, fontWeight: '600' },

    tabBar: { flexDirection: 'row', margin: 12, backgroundColor: '#111', borderRadius: 12, padding: 3 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: '#1a1a1a' },
    tabText: { color: '#444', fontWeight: '700', fontSize: 13 },
    tabTextActive: { color: '#fff' },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statBadge: { width: '47%', backgroundColor: '#111', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' },
    statEmoji: { fontSize: 24, marginBottom: 6 },
    statValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
    statLabel: { color: '#444', fontSize: 11, marginTop: 3, textAlign: 'center' },

    histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1a1a1a' },
    histQuestion: { color: '#ccc', fontWeight: '700', fontSize: 13 },
    histOpt: { color: '#444', fontSize: 11, marginTop: 2 },
    histGain: { fontWeight: '900', fontSize: 14 },
});
