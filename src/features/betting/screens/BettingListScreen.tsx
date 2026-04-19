import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native';
import { useBetStore } from '../store/useBetStore';
import { BetCard } from '../components/BetCard';
import { BetModal } from '../components/BetModal';
import { useUserStore } from '../../user/store/useUserStore';
import { supabase } from "../../../lib/supabase";
import { BetCardSkeleton } from '../../../components/SkeletonLoader';
import { AnimatedListItem } from '../../../components/AnimatedListItem';
import { useToast } from '../../../contexts/ToastContext';

export default function BettingListScreen() {
    const { activeBets, placeBet } = useBetStore();
    const { removeClopes, inventory, username } = useUserStore();
    const { showToast } = useToast();

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBet, setSelectedBet] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { fetchBets, fetchUserBets } = useBetStore.getState();
        const { userId } = useUserStore.getState();

        const init = async () => {
            setLoading(true);
            await fetchBets();
            if (userId) await fetchUserBets(userId);
            setLoading(false);
        };

        init();

        const subscription = supabase
            .channel('public:bets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => {
                fetchBets();
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, []);

    const handleOpenBet = (betId: string, optionId: string) => {
        const bet = activeBets.find(b => b.id === betId);
        if (!bet) return;
        const option = bet.options.find((o: any) => String(o.id) === String(optionId));
        if (!option) {
            showToast('Impossible de trouver cette option.', 'error');
            return;
        }
        setSelectedBet({ bet, option });
        setModalVisible(true);
    };

    const handleConfirmBet = (amount: number) => {
        placeBet(selectedBet.bet.id, selectedBet.option.id, amount);
        removeClopes(amount);
        showToast(`${amount} clopes misées sur "${selectedBet.option.label}" ! 🎰`, 'success');
    };

    // ── Skeleton pendant le chargement ────────────────────
    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Paris 🎰</Text>
                        <Text style={styles.subtitle}>Chargement des paris...</Text>
                    </View>
                </View>
                <View style={{ padding: 16 }}>
                    {[0, 1, 2].map(i => <BetCardSkeleton key={i} />)}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Salut, {username} 👋</Text>
                    <Text style={styles.subtitle}>Prêt à miser tes clopes ?</Text>
                </View>
                <View style={styles.balanceBadge}>
                    <Text style={styles.balanceValue}>{inventory.clopes}🚬</Text>
                </View>
            </View>

            <FlatList
                data={activeBets}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <AnimatedListItem index={index}>
                        <BetCard bet={item} onSelectOption={handleOpenBet} />
                    </AnimatedListItem>
                )}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>🏜️</Text>
                        <Text style={styles.emptyTitle}>Rien à gratter pour l'instant...</Text>
                        <Text style={styles.emptySubtitle}>Les admins dorment ou quoi ? Reviens plus tard pour miser tes clopes.</Text>
                    </View>
                }
                ListHeaderComponent={activeBets.length > 0 ? <Text style={styles.sectionTitle}>Paris Ouverts</Text> : null}
            />

            {selectedBet && selectedBet.option && (
                <BetModal
                    isVisible={modalVisible}
                    onClose={() => {
                        setModalVisible(false);
                        setTimeout(() => setSelectedBet(null), 300);
                    }}
                    betQuestion={selectedBet.bet.question}
                    optionLabel={selectedBet.option.label}
                    odds={selectedBet.option.odds}
                    onConfirm={handleConfirmBet}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    title: { color: '#FFF', fontSize: 32, fontWeight: '900' },
    subtitle: { color: '#666', fontSize: 14, marginTop: 5 },
    balanceBadge: { backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    balanceValue: { color: '#000', fontWeight: '900', fontSize: 16 },
    sectionTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginVertical: 20, opacity: 0.5 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyEmoji: { fontSize: 60, marginBottom: 20 },
    emptyTitle: { color: '#FFD700', fontSize: 18, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase' },
    emptySubtitle: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
});
