import React from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native';
import { useBetStore } from '../store/useBetStore';
import { BetCard } from '../components/BetCard';import { BetModal } from '../components/BetModal';
import { useUserStore } from '../../user/store/useUserStore';

export default function BettingListScreen() {
    const { activeBets, placeBet } = useBetStore();
    const { removeClopes } = useUserStore();

    const [modalVisible, setModalVisible] = React.useState(false);
    const [selectedBet, setSelectedBet] = React.useState<any>(null);

    const handleOpenBet = (betId: string, optionId: string) => {
        const bet = activeBets.find(b => b.id === betId);
        const option = bet?.options.find(o => o.id === optionId);
        setSelectedBet({ bet, option });
        setModalVisible(true);
    };

    const handleConfirmBet = (amount: number) => {
        placeBet(selectedBet.bet.id, selectedBet.option.id, amount);
        removeClopes(amount); // On déduit les clopes du portefeuille !
        alert(`Pari enregistré ! ${amount} clopes misées.`);
    };

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: '#0A0A0A'}}>
            <Text style={{fontSize: 28, color: '#fff', margin: 20, fontWeight: 'bold'}}>Paris du Jour ⚡</Text>
            <FlatList
                data={activeBets}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <BetCard bet={item} onSelectOption={handleOpenBet} />
                )}
                contentContainerStyle={{padding: 20}}
            />

            {selectedBet && (
                <BetModal
                    isVisible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    betQuestion={selectedBet.bet.question}
                    optionLabel={selectedBet.option.label}
                    odds={selectedBet.option.odds}
                    onConfirm={handleConfirmBet}
                />
            )}
        </SafeAreaView>
    );
}