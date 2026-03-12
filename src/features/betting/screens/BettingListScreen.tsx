import React from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native';
import { useBetStore } from '../store/useBetStore';
import { BetCard } from '../components/BetCard';

export default function BettingListScreen() {
    const { activeBets } = useBetStore();

    const handleSelectOption = (betId: string, optionId: string) => {
        console.log(`Pari sélectionné : ${betId} sur l'option : ${optionId}`);
        // Plus tard : ouvrir une modale pour choisir le montant à miser
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Paris du Jour ⚡</Text>
            <FlatList
                data={activeBets}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <BetCard bet={item} onSelectOption={handleSelectOption} />
                )}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    header: { fontSize: 28, fontWeight: 'bold', color: '#fff', margin: 20 },
    list: { padding: 20, paddingBottom: 100 }
});