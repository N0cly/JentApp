// src/features/admin/screens/AdminPanelScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useBetStore } from '../../betting/store/useBetStore';

export default function AdminPanelScreen() {
    const { activeBets, allUserBets, resolveBet } = useBetStore();

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Jenta Control 🕹️</Text>

            <ScrollView>
                {activeBets.map((bet: any) => {
                    // On compte combien de clopes ont été misées au total sur ce pari
                    const totalMise = allUserBets
                        .filter((ub: any) => ub.betId === bet.id)
                        .reduce((sum: number, ub: any) => sum + ub.amount, 0);

                    return (
                        <View key={bet.id} style={styles.adminCard}>
                            <Text style={styles.betQuestion}>{bet.question}</Text>
                            <Text style={styles.stats}>Mise totale : {totalMise} 🚬</Text>

                            <Text style={styles.label}>Valider le gagnant :</Text>
                            <View style={styles.btnRow}>
                                {bet.options.map((opt: any) => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={styles.resolveBtn}
                                        onPress={() => resolveBet(bet.id, opt.id)}
                                    >
                                        <Text style={styles.btnText}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    );
                })}

                {activeBets.length === 0 && (
                    <Text style={styles.empty}>Aucun pari en cours à valider.</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', padding: 20 },
    title: { fontSize: 28, color: '#fff', fontWeight: 'bold', marginBottom: 20, marginTop: 40 },
    adminCard: { backgroundColor: '#111', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
    betQuestion: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    stats: { color: '#1DB954', marginVertical: 10, fontSize: 13 },
    label: { color: '#666', fontSize: 11, textTransform: 'uppercase', marginTop: 10, marginBottom: 10 },
    btnRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    resolveBtn: { backgroundColor: '#FFD700', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10 },
    btnText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
    empty: { color: '#444', textAlign: 'center', marginTop: 50 }
});