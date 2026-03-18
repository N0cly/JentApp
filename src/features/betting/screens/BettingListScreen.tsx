import React from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native';
import { useBetStore } from '../store/useBetStore';
import { BetCard } from '../components/BetCard';import { BetModal } from '../components/BetModal';
import { useUserStore } from '../../user/store/useUserStore';

export default function BettingListScreen() {
    const { activeBets, placeBet } = useBetStore();
    const { removeClopes, inventory, username } = useUserStore();

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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.welcome}>Salut, {username} 👋</Text>
          <Text style={styles.sub}>Prêt à miser tes clopes ?</Text>
        </View>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceValue}>{inventory.clopes}🚬</Text>
        </View>
      </View>

      <FlatList
        data={activeBets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BetCard bet={item} onSelectOption={handleOpenBet} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Paris Ouverts</Text>}
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

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginTop: 10 },
  welcome: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  sub: { color: '#666', fontSize: 14 },
  balanceBadge: { backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  balanceValue: { color: '#000', fontWeight: '900', fontSize: 16 },
  sectionTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginVertical: 20, opacity: 0.5 },
});
