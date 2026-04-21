// src/features/betting/components/BetCard.tsx
import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, Modal,
    ScrollView, ActivityIndicator,
} from 'react-native';
import { useBetStore, Bet, BetOption } from '../store/useBetStore';
import { useUserStore } from '../../user/store/useUserStore';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

interface BetCardProps {
    bet: Bet;
    onSelectOption: (betId: string, optionId: string) => void;
}

interface OptionStat {
    optionId: string;
    label: string;
    odds: number;
    totalAmount: number;
    count: number;
    percent: number;
    players: { username: string; amount: number; gain: number }[];
}

// ── Barre de progression option ───────────────────────────────────────────────
function OptionBar({
    stat, isWinner, isMyChoice, onPress,
}: {
    stat: OptionStat;
    isWinner: boolean;
    isMyChoice: boolean;
    onPress: () => void;
}) {
    const barColor = isWinner ? '#4CAF50' : isMyChoice ? '#FFD700' : '#333';
    return (
        <TouchableOpacity style={styles.optionBarContainer} onPress={onPress} activeOpacity={0.75}>
            {/* Label + pourcentage */}
            <View style={styles.optionBarHeader}>
                <Text style={[styles.optionBarLabel, isWinner && { color: '#4CAF50' }, isMyChoice && !isWinner && { color: '#FFD700' }]}>
                    {stat.label}
                    {isMyChoice ? ' (ma mise)' : ''}
                    {isWinner ? ' ✓' : ''}
                </Text>
                <View style={styles.optionBarMeta}>
                    <Text style={styles.optionBarOdds}>x{stat.odds}</Text>
                    <Text style={styles.optionBarPercent}>{stat.percent}%</Text>
                </View>
            </View>
            {/* Barre */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${stat.percent}%`, backgroundColor: barColor }]} />
            </View>
            {/* Mises */}
            <Text style={styles.optionBarSub}>
                {stat.count} mise{stat.count > 1 ? 's' : ''} · {stat.totalAmount}🚬 au total
            </Text>
        </TouchableOpacity>
    );
}

// ── Modal stats détaillées ────────────────────────────────────────────────────
function BetStatsModal({
    bet, stats, visible, onClose,
}: {
    bet: Bet;
    stats: OptionStat[];
    visible: boolean;
    onClose: () => void;
}) {
    const totalAmount = stats.reduce((s, st) => s + st.totalAmount, 0);
    const totalCount = stats.reduce((s, st) => s + st.count, 0);

    // Classement global toutes options confondues
    const allBets = stats.flatMap(st =>
        st.players.map(p => ({ ...p, optionLabel: st.label, isWinner: bet.winning_option_id ? st.optionId === bet.winning_option_id : false }))
    ).sort((a, b) => b.amount - a.amount);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.statsSheet}>
                    <View style={styles.handle} />
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={20} color="#666" />
                    </TouchableOpacity>

                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                        <Text style={styles.statsTitle} numberOfLines={2}>{bet.question}</Text>

                        {/* Résumé global */}
                        <View style={styles.globalStatsRow}>
                            <View style={styles.globalStatItem}>
                                <Text style={styles.globalStatValue}>{totalCount}</Text>
                                <Text style={styles.globalStatLabel}>Parieurs</Text>
                            </View>
                            <View style={styles.globalStatItem}>
                                <Text style={styles.globalStatValue}>{totalAmount}🚬</Text>
                                <Text style={styles.globalStatLabel}>Total misé</Text>
                            </View>
                        </View>

                        {/* Distribution par option */}
                        <Text style={styles.sectionTitle}>RÉPARTITION</Text>
                        {stats.map(st => (
                            <View key={st.optionId} style={[styles.statOptionCard, st.optionId === bet.winning_option_id && styles.statOptionWinner]}>
                                <View style={styles.statOptionHeader}>
                                    <Text style={[styles.statOptionLabel, st.optionId === bet.winning_option_id && { color: '#4CAF50' }]}>
                                        {st.label} {st.optionId === bet.winning_option_id ? '✓' : ''}
                                    </Text>
                                    <Text style={styles.statOptionPercent}>{st.percent}%</Text>
                                </View>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, {
                                        width: `${st.percent}%`,
                                        backgroundColor: st.optionId === bet.winning_option_id ? '#4CAF50' : '#444',
                                    }]} />
                                </View>
                                <Text style={styles.statOptionSub}>
                                    {st.count} mise{st.count > 1 ? 's' : ''} · {st.totalAmount}🚬 · cote x{st.odds}
                                </Text>

                                {/* Parieurs de cette option */}
                                {st.players.slice(0, 5).map((p, i) => (
                                    <View key={i} style={styles.playerRow}>
                                        <Text style={styles.playerRank}>#{i + 1}</Text>
                                        <Text style={styles.playerName}>{p.username}</Text>
                                        <Text style={styles.playerAmount}>{p.amount}🚬</Text>
                                        <Text style={styles.playerGain}>→ {p.gain}🚬 potentiel</Text>
                                    </View>
                                ))}
                            </View>
                        ))}

                        {/* Classement global des plus grosses mises */}
                        <Text style={styles.sectionTitle}>TOP MISES DU PARI</Text>
                        {allBets.slice(0, 10).map((b, i) => (
                            <View key={i} style={styles.topBetRow}>
                                <Text style={styles.topBetRank}>#{i + 1}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.topBetUser}>{b.username}</Text>
                                    <Text style={styles.topBetOpt}>{b.optionLabel}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.topBetAmount}>{b.amount}🚬</Text>
                                    <Text style={[styles.topBetGain, b.isWinner && { color: '#4CAF50' }]}>
                                        {b.isWinner ? `+${b.gain}🚬` : `gain potentiel ${b.gain}🚬`}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ── BetCard principale ────────────────────────────────────────────────────────
export const BetCard = ({ bet, onSelectOption }: BetCardProps) => {
    const { allUserBets } = useBetStore();
    const { userId } = useUserStore();

    const [now, setNow] = useState(new Date());
    const [betStats, setBetStats] = useState<OptionStat[] | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Toutes mes mises sur ce pari (une par option potentiellement)
    const myBetsOnThisBet = allUserBets?.filter(ub => ub.bet_id === bet.id && ub.user_id === userId) ?? [];
    const myBetsByOption: Record<string, number> = {};
    myBetsOnThisBet.forEach(ub => { myBetsByOption[ub.option_id] = (myBetsByOption[ub.option_id] ?? 0) + ub.amount; });

    const isSettled = bet.status === 'SETTLED';
    const expiresAt = new Date(bet.expires_at);
    const displayAt = new Date(bet.display_at);
    const isExpired = expiresAt < now;
    const isLocked = displayAt > now;
    const showStats = isSettled || isExpired;

    // Charger les stats quand le pari est terminé/expiré
    useEffect(() => {
        if (!showStats) return;
        const loadStats = async () => {
            setLoadingStats(true);
            const { data } = await supabase
                .from('user_bets')
                .select('option_id, amount, user_id, profile:profiles(username)')
                .eq('bet_id', bet.id);

            if (data) {
                const totalAmount = data.reduce((s: number, d: any) => s + d.amount, 0);
                const statMap: Record<string, OptionStat> = {};

                bet.options.forEach(opt => {
                    statMap[opt.id] = {
                        optionId: opt.id,
                        label: opt.label,
                        odds: opt.odds,
                        totalAmount: 0,
                        count: 0,
                        percent: 0,
                        players: [],
                    };
                });

                data.forEach((ub: any) => {
                    if (!statMap[ub.option_id]) return;
                    statMap[ub.option_id].totalAmount += ub.amount;
                    statMap[ub.option_id].count += 1;
                    const gain = Math.floor(ub.amount * statMap[ub.option_id].odds);
                    statMap[ub.option_id].players.push({
                        username: ub.profile?.username ?? '???',
                        amount: ub.amount,
                        gain,
                    });
                });

                const stats = Object.values(statMap).map(s => ({
                    ...s,
                    percent: totalAmount > 0 ? Math.round((s.totalAmount / totalAmount) * 100) : 0,
                    players: s.players.sort((a, b) => b.amount - a.amount),
                }));

                setBetStats(stats);
            }
            setLoadingStats(false);
        };
        loadStats();
    }, [showStats, bet.id]);

    const getCountdown = (targetDate: Date) => {
        const diff = targetDate.getTime() - now.getTime();
        if (diff <= 0) return '00:00:00';
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff / 3600000) % 24);
        const mins = Math.floor((diff / 60000) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        let f = '';
        if (days > 0) f += `${String(days).padStart(2, '0')}:`;
        f += `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        return f;
    };

    // ── Pari verrouillé ────────────────────────────────────────────────────────
    if (isLocked) {
        return (
            <View style={styles.card}>
                {bet.is_blurred ? (
                    <BlurView intensity={0} tint="dark" style={styles.lockContainer}>
                        <Ionicons name="lock-closed" size={32} color="#FFD700" />
                        <Text style={styles.lockText}>S'OUVRE DANS</Text>
                        <Text style={styles.countdownText}>{getCountdown(displayAt)}</Text>
                    </BlurView>
                ) : (
                    <View style={styles.lockContainer}>
                        <Ionicons name="time-outline" size={24} color="#FFD700" />
                        <Text style={styles.lockText}>OUVERTURE DANS</Text>
                        <Text style={styles.countdownText}>{getCountdown(displayAt)}</Text>
                    </View>
                )}
            </View>
        );
    }

    // ── Pari ouvert, expiré ou terminé ────────────────────────────────────────
    const hasMyBets = myBetsOnThisBet.length > 0;
    const isWinner = isSettled && myBetsOnThisBet.some(ub => ub.option_id === bet.winning_option_id);
    const isLoser = isSettled && hasMyBets && !isWinner;

    return (
        <View style={[
            styles.card,
            isWinner && styles.winnerBorder,
            isLoser && styles.loserBorder,
            (isExpired && !isSettled) && styles.expiredCard,
        ]}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{bet.category}</Text>
                </View>
                {isSettled ? (
                    hasMyBets ? (
                        <Text style={[styles.statusText, { color: isWinner ? '#1DB954' : '#E50914' }]}>
                            {isWinner
                                ? `GAGNÉ +${myBetsOnThisBet.filter(ub => ub.option_id === bet.winning_option_id).reduce((s, ub) => {
                                    const opt = bet.options.find(o => o.id === bet.winning_option_id);
                                    return s + Math.floor(ub.amount * (opt?.odds ?? 1));
                                }, 0)}🚬`
                                : 'PERDU'}
                        </Text>
                    ) : (
                        <Text style={[styles.statusText, { color: '#666' }]}>TERMINÉ</Text>
                    )
                ) : isExpired ? (
                    <View style={styles.closedBadge}>
                        <Text style={styles.closedText}>EN ATTENTE RÉSULTAT</Text>
                    </View>
                ) : (
                    <View style={styles.timerBadge}>
                        <Ionicons name="stopwatch-outline" size={14} color="#FFD700" />
                        <Text style={styles.timerText}>{getCountdown(expiresAt)}</Text>
                    </View>
                )}
            </View>

            {/* Question — cliquable pour les stats si terminé */}
            <TouchableOpacity
                disabled={!showStats || !betStats}
                onPress={() => setShowStatsModal(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.question}>{bet.question}</Text>
                {showStats && betStats && (
                    <Text style={styles.seeStatsHint}>📊 Voir les statistiques complètes</Text>
                )}
            </TouchableOpacity>

            {/* Options */}
            <View style={styles.optionsContainer}>
                {showStats ? (
                    loadingStats || !betStats ? (
                        <ActivityIndicator color="#FFD700" size="small" />
                    ) : (
                        betStats.map(stat => (
                            <OptionBar
                                key={stat.optionId}
                                stat={stat}
                                isWinner={isSettled && stat.optionId === bet.winning_option_id}
                                isMyChoice={!!myBetsByOption[stat.optionId]}
                                onPress={() => setShowStatsModal(true)}
                            />
                        ))
                    )
                ) : (
                    bet.options.map(option => {
                        const myAmount = myBetsByOption[option.id] ?? 0;
                        const hasMyBetOnThis = myAmount > 0;

                        return (
                            <TouchableOpacity
                                key={option.id}
                                activeOpacity={0.7}
                                onPress={() => onSelectOption(bet.id, option.id)}
                                style={[
                                    styles.optionBtn,
                                    hasMyBetOnThis && styles.myOptionActive,
                                ]}
                            >
                                <View style={styles.optionInfo}>
                                    <Text style={styles.optionLabel}>{option.label}</Text>
                                    <Text style={styles.oddsText}>x{option.odds}</Text>
                                </View>
                                {hasMyBetOnThis && (
                                    <View style={styles.myMiseTag}>
                                        <Text style={styles.myMiseText}>
                                            Ma mise : {myAmount}🚬 · Gain potentiel : {(myAmount * option.odds).toFixed(1)}🚬
                                        </Text>
                                        <Text style={styles.topUpHint}>Appuie pour augmenter →</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>

            {/* Modal stats */}
            {betStats && (
                <BetStatsModal
                    bet={bet}
                    stats={betStats}
                    visible={showStatsModal}
                    onClose={() => setShowStatsModal(false)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24, padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden', minHeight: 120,
    },
    lockContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 6 },
    lockText: { color: '#888', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    countdownText: { color: '#FFD700', fontSize: 22, fontWeight: '900' },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    categoryBadge: { backgroundColor: 'rgba(255,215,0,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
    categoryText: { color: '#FFD700', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 5, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
    timerText: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
    closedBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    closedText: { color: '#666', fontSize: 10, fontWeight: 'bold' },
    statusText: { fontWeight: '900', fontSize: 12 },

    winnerBorder: { borderColor: '#1DB954', backgroundColor: 'rgba(29,185,84,0.08)', borderWidth: 2 },
    loserBorder: { borderColor: '#E50914', backgroundColor: 'rgba(229,9,20,0.08)', borderWidth: 2 },
    expiredCard: { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.01)' },

    question: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 8, lineHeight: 24 },
    seeStatsHint: { color: '#555', fontSize: 11, fontWeight: '600', marginBottom: 14 },

    optionsContainer: { gap: 10 },
    // Bouton option (pari ouvert)
    optionBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    myOptionActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.08)', borderWidth: 1.5 },
    optionInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    optionLabel: { color: '#FFF', fontSize: 15, fontWeight: '600' },
    oddsText: { color: '#FFD700', fontSize: 18, fontWeight: '900' },
    myMiseTag: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
    myMiseText: { color: '#AAA', fontSize: 11, fontWeight: '600' },
    topUpHint: { color: '#FFD70066', fontSize: 10, marginTop: 2 },

    // Barre de progression (pari fermé)
    optionBarContainer: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    optionBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    optionBarLabel: { color: '#ccc', fontWeight: '700', fontSize: 14, flex: 1 },
    optionBarMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    optionBarOdds: { color: '#555', fontSize: 12 },
    optionBarPercent: { color: '#fff', fontWeight: '900', fontSize: 15 },
    progressTrack: { height: 8, backgroundColor: '#1a1a1a', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: '100%', borderRadius: 4 },
    optionBarSub: { color: '#444', fontSize: 11 },

    // Modal stats
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    statsSheet: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', borderWidth: 1, borderColor: '#1a1a1a' },
    handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 6 },
    statsTitle: { color: '#fff', fontWeight: '900', fontSize: 18, marginBottom: 16, lineHeight: 26 },
    globalStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    globalStatItem: { flex: 1, backgroundColor: '#111', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' },
    globalStatValue: { color: '#FFD700', fontWeight: '900', fontSize: 20 },
    globalStatLabel: { color: '#444', fontSize: 11, marginTop: 4 },
    sectionTitle: { color: '#333', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
    statOptionCard: { backgroundColor: '#111', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1a1a1a' },
    statOptionWinner: { borderColor: '#4CAF5066' },
    statOptionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    statOptionLabel: { color: '#ccc', fontWeight: '700', fontSize: 14 },
    statOptionPercent: { color: '#fff', fontWeight: '900', fontSize: 14 },
    statOptionSub: { color: '#444', fontSize: 11, marginBottom: 8 },
    playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
    playerRank: { color: '#333', fontWeight: '700', width: 28, fontSize: 12 },
    playerName: { color: '#888', flex: 1, fontSize: 12 },
    playerAmount: { color: '#FFD700', fontWeight: '700', fontSize: 12 },
    playerGain: { color: '#444', fontSize: 11 },
    topBetRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 12, marginBottom: 6, gap: 10, borderWidth: 1, borderColor: '#1a1a1a' },
    topBetRank: { color: '#333', fontWeight: '700', width: 28 },
    topBetUser: { color: '#ccc', fontWeight: '700', fontSize: 13 },
    topBetOpt: { color: '#555', fontSize: 11 },
    topBetAmount: { color: '#FFD700', fontWeight: '900', fontSize: 14 },
    topBetGain: { color: '#444', fontSize: 11 },
});
