import React, {useEffect} from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native';
import { useBetStore } from '../store/useBetStore';
import { BetCard } from '../components/BetCard';import { BetModal } from '../components/BetModal';
import { useUserStore } from '../../user/store/useUserStore';
import {supabase} from "../../../lib/supabase";

export default function BettingListScreen() {
    const { activeBets, placeBet } = useBetStore();
    const { removeClopes, inventory, username } = useUserStore();

    const [modalVisible, setModalVisible] = React.useState(false);
    const [selectedBet, setSelectedBet] = React.useState<any>(null);


    useEffect(() => {
        const { fetchBets, fetchUserBets } = useBetStore.getState();
        const { userId } = useUserStore.getState();

        fetchBets();
        if (userId) {
            fetchUserBets(userId);
        }

        const subscription = supabase
            .channel('public:bets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, (payload) => {
                console.log('Changement détecté !', payload);
                fetchBets();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const handleOpenBet = (betId: string, optionId: string) => {
        const bet = activeBets.find(b => b.id === betId);
        if (!bet) return;

        // On force la comparaison en String pour éviter les erreurs de type (ID Supabase vs JS)
        const option = bet.options.find((o: any) => String(o.id) === String(optionId));

        if (!option) {
            console.error("Option introuvable pour l'ID :", optionId);
            alert("Erreur : Impossible de trouver cette option.");
            return;
        }

        setSelectedBet({ bet, option });
        setModalVisible(true);
    };

    const handleConfirmBet = (amount: number) => {
        placeBet(selectedBet.bet.id, selectedBet.option.id, amount);
        removeClopes(amount); // On déduit les clopes du portefeuille !
        alert(`Pari enregistré ! ${amount} clopes misées.`);
    };

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
                renderItem={({ item }) => (
                    <BetCard bet={item} onSelectOption={handleOpenBet} />
                )}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}

                // --- LE COMPOSANT VIDE ---
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
                        // On attend la fin de l'animation de fermeture pour reset l'état
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20},
    title: { color: '#FFF', fontSize: 32, fontWeight: '900'},
    subtitle: { color: '#666', fontSize: 14, marginTop: 5 },
    balanceBadge: { backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    balanceValue: { color: '#000', fontWeight: '900', fontSize: 16 },
    sectionTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginVertical: 20, opacity: 0.5 },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100, // Pour le centrer un peu dans l'écran
        paddingHorizontal: 40,
    },
    emptyEmoji: {
        fontSize: 60,
        marginBottom: 20,
    },
    emptyTitle: {
        color: '#FFD700',
        fontSize: 18,
        fontWeight: '900',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    emptySubtitle: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
    },
});
