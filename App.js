// App.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useUserStore } from './src/features/user/store/useUserStore';
import { formatJentaBalance } from './src/features/economy/utils/converter';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const { clopesBalance, breakdown, addClopes, removeClopes } = useUserStore();

  return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>JentApp 🚬</Text>

        <View style={styles.walletCard}>
          <Text style={styles.label}>Ton Portefeuille :</Text>
          {/* Affichage stylé via ta fonction converter */}
          <Text style={styles.formattedBalance}>{formatJentaBalance(clopesBalance)}</Text>

          <View style={styles.divider} />

          {/* Affichage détaillé en chiffres */}
          <View style={styles.detailsRow}>
            <Text style={styles.detailItem}>📦 {breakdown.packets} Pkts</Text>
            <Text style={styles.detailItem}>🌿 {breakdown.joints} Js</Text>
            <Text style={styles.detailItem}>🚬 {breakdown.clopes} Clps</Text>
          </View>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.btn} onPress={() => addClopes(1)}>
            <Text style={styles.btnText}>+1 Clope</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => addClopes(5)}>
            <Text style={styles.btnText}>+1 Joint</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => addClopes(20)}>
            <Text style={styles.btnText}>+1 Paquet</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
            style={[styles.btn, {marginTop: 20, backgroundColor: '#444'}]}
            onPress={() => removeClopes(2.5)}
        >
          <Text style={styles.btnText}>Perdre 2.5 Clopes</Text>
        </TouchableOpacity>

        <StatusBar style="light" />
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 40, fontWeight: '900', color: '#fff', marginBottom: 30 },
  walletCard: {
    backgroundColor: '#1A1A1A',
    width: '90%',
    padding: 25,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    // On commence à préparer le style premium
    shadowColor: '#fff',
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  label: { color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontSize: 12 },
  formattedBalance: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginVertical: 15, textAlign: 'center' },
  divider: { height: 1, width: '100%', backgroundColor: '#333', marginVertical: 10 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  detailItem: { color: '#bbb', fontSize: 14, fontWeight: '600' },
  actionGrid: { flexDirection: 'row', gap: 10, marginTop: 40 },
  btn: { backgroundColor: '#E50914', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});