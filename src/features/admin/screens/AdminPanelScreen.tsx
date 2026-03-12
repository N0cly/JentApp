import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Modal, Alert } from 'react-native';
import { useBetStore } from '../../betting/store/useBetStore';

export default function AdminPanelScreen() {
    const { activeBets, resolveBet } = useBetStore();
    const [confirmModal, setConfirmModal] = useState<{visible: boolean, betId: string, optId: string, optLabel: string} | null>(null);

    const openConfirm = (betId: string, optId: string, optLabel: string) => {
        setConfirmModal({ visible: true, betId, optId, optLabel });
    };

    const processResolution = () => {
        if (confirmModal) {
            resolveBet(confirmModal.betId, confirmModal.optId);
            setConfirmModal(null);
            // Optionnel : un petit feedback haptique ou sonore serait top ici
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Jenta Control 🕹️</Text>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {activeBets.map((bet: any) => {
                    const isSettled = bet.status === 'SETTLED';

                    return (
                        <View key={bet.id} style={[styles.adminCard, isSettled && styles.settledCard]}>
                            <Text style={styles.betQuestion}>{bet.question}</Text>

                            {isSettled ? (
                                <View style={styles.settledBadge}>
                                    <Text style={styles.settledText}>RÉSULTAT VALIDÉ ✅</Text>
                                </View>
                            ) : (
                                <>
                                    <Text style={styles.label}>Désigner le vainqueur :</Text>
                                    <View style={styles.btnRow}>
                                        {bet.options.map((opt: any) => (
                                            <TouchableOpacity
                                                key={opt.id}
                                                style={styles.resolveBtn}
                                                onPress={() => openConfirm(bet.id, opt.id, opt.label)}
                                            >
                                                <Text style={styles.btnText}>{opt.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            {/* MODALE DE CONFIRMATION */}
            {confirmModal !== null && confirmModal.visible && (
                <Modal
                    visible={confirmModal.visible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setConfirmModal(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.confirmBox}>
                            <Text style={styles.confirmTitle}>⚠️ Action Irréversible</Text>
                            <Text style={styles.confirmDesc}>
                                Confirmes-tu que l'option <Text style={{color: '#FFD700', fontWeight: 'bold'}}>"{confirmModal.optLabel}"</Text> est la gagnante ?
                            </Text>
                            <Text style={styles.confirmWarning}>Les clopes seront distribuées immédiatement aux gagnants.</Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmModal(null)}>
                                    <Text style={styles.cancelText}>Annuler</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.validBtn} onPress={processResolution}>
                                    <Text style={styles.validText}>Valider & Payer</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    title: { fontSize: 28, color: '#fff', fontWeight: 'bold', margin: 20, marginTop: 40 },
    adminCard: { backgroundColor: '#111', padding: 20, borderRadius: 25, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
    settledCard: { opacity: 0.6, borderColor: '#1DB954' },
    betQuestion: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    label: { color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 10 },
    btnRow: { flexDirection: 'row', gap: 10 },
    resolveBtn: { backgroundColor: '#FFD700', padding: 12, borderRadius: 12, flex: 1, alignItems: 'center' },
    btnText: { color: '#000', fontWeight: '900', fontSize: 12 },
    settledBadge: { backgroundColor: 'rgba(29, 185, 84, 0.2)', padding: 10, borderRadius: 10, alignItems: 'center' },
    settledText: { color: '#1DB954', fontWeight: 'bold', fontSize: 12 },

    // Styles Modale
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    confirmBox: { width: '85%', backgroundColor: '#1A1A1A', padding: 25, borderRadius: 30, borderWidth: 1, borderColor: '#333' },
    confirmTitle: { color: '#E50914', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    confirmDesc: { color: '#fff', textAlign: 'center', marginVertical: 15, fontSize: 16 },
    confirmWarning: { color: '#666', fontSize: 12, textAlign: 'center', marginBottom: 20 },
    modalButtons: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, padding: 15, borderRadius: 15, backgroundColor: '#333', alignItems: 'center' },
    cancelText: { color: '#fff', fontWeight: 'bold' },
    validBtn: { flex: 1, padding: 15, borderRadius: 15, backgroundColor: '#FFD700', alignItems: 'center' },
    validText: { color: '#000', fontWeight: 'bold' }
});