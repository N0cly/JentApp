import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    Alert,
    TextInput
} from 'react-native';
import { useBetStore } from '../../betting/store/useBetStore';

export default function AdminPanelScreen() {
    const { activeBets, resolveBet, addBet} = useBetStore();
    const [confirmModal, setConfirmModal] = useState<{visible: boolean, betId: string, optId: string, optLabel: string} | null>(null);
    const [showForm, setShowForm] = useState(false);

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

    const cleanNumber = (text: string) => {
        return text.replace(',', '.').replace(/[^0-9.]/g, '');
    };

    // États du formulaire
    const [question, setQuestion] = useState('');
    const [opt1, setOpt1] = useState({ label: '', odds: '2.0' });
    const [opt2, setOpt2] = useState({ label: '', odds: '2.0' });

    const handleCreate = () => {
        if (!question || !opt1.label || !opt2.label) {
            alert("Remplis tout, Jenta !");
            return;
        }

        addBet(question, [
            { label: opt1.label, odds: parseFloat(opt1.odds) },
            { label: opt2.label, odds: parseFloat(opt2.odds) }
        ]);

        // Reset du formulaire
        setQuestion('');
        setOpt1({ label: '', odds: '2.0' });
        setOpt2({ label: '', odds: '2.0' });
        setShowForm(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Jenta Control 🕹️</Text>
                <TouchableOpacity
                    style={styles.addToggle}
                    onPress={() => setShowForm(!showForm)}
                >
                    <Text style={styles.addToggleText}>{showForm ? 'Fermer' : '+ Créer'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>

                {/* FORMULAIRE DE CRÉATION */}
                {showForm && (
                    <View style={styles.createForm}>
                        <Text style={styles.formTitle}>Nouveau Pari ✍️</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="La question (ex: Jenta finit son verre ?)"
                            placeholderTextColor="#555"
                            value={question}
                            onChangeText={setQuestion}
                        />

                        <View style={styles.optionInputRow}>
                            <TextInput
                                style={[styles.input, { flex: 2 }]}
                                placeholder="Option 1 (ex: Oui)"
                                placeholderTextColor="#555"
                                value={opt1.label}
                                onChangeText={(t) => setOpt1({...opt1, label: t})}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                keyboardType="decimal-pad"
                                value={opt1.odds}
                                onChangeText={(t) => setOpt1({...opt1, odds: cleanNumber(t)})}
                            />
                        </View>

                        <View style={styles.optionInputRow}>
                            <TextInput
                                style={[styles.input, { flex: 2 }]}
                                placeholder="Option 2 (ex: Non)"
                                placeholderTextColor="#555"
                                value={opt2.label}
                                onChangeText={(t) => setOpt2({...opt2, label: t})}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                keyboardType="decimal-pad"
                                value={opt2.odds}
                                onChangeText={(t) => setOpt2({...opt2, odds: cleanNumber(t)})}
                            />
                        </View>

                        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                            <Text style={styles.createBtnText}>LANCER LE PARI 🚀</Text>
                        </TouchableOpacity>
                    </View>
                )}

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
    title: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
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
    validText: { color: '#000', fontWeight: 'bold' },

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', margin: 20, marginTop: 40 },
    addToggle: { backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    addToggleText: { color: '#000', fontWeight: 'bold' },
    createForm: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 25, marginBottom: 30, borderWidth: 1, borderColor: '#FFD700' },
    formTitle: { color: '#FFD700', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    input: { backgroundColor: '#000', color: '#fff', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
    optionInputRow: { flexDirection: 'row', gap: 10 },
    createBtn: { backgroundColor: '#FFD700', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
    createBtnText: { color: '#000', fontWeight: '900' },
});