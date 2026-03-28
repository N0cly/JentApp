import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Modal,
    Alert,
    TextInput,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Utilisation de la version non dépréciée
import { useBetStore } from '../../betting/store/useBetStore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BetCategory } from "../../betting/types";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "../../user/store/useUserStore";
import { supabase } from "../../../lib/supabase";
import { Calendar } from 'primereact/calendar';

export default function AdminPanelScreen() {
    const { activeBets, resolveBet, addBet, deleteBet } = useBetStore();

    // ÉTATS
    const [confirmModal, setConfirmModal] = useState<{ visible: boolean, betId: string, optId: string, optLabel: string } | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [options, setOptions] = useState([{ label: '', odds: '2.0' }, { label: '', odds: '2.0' }]);
    const [category, setCategory] = useState<BetCategory>('SPECIAL');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 3600000));
    const [isBlurred, setIsBlurred] = useState(false); // Correction typo : setis -> setIs
    const [question, setQuestion] = useState('');

    // INITIALISATION & SUBSCRIPTION
    useEffect(() => {
        const initAdmin = async () => {
            const { fetchBets, fetchUserBets } = useBetStore.getState();
            const { userId } = useUserStore.getState();

            await fetchBets();
            if (userId) {
                await fetchUserBets(userId);
            }
        };

        void initAdmin();

        const subscription = supabase
            .channel('public:bets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => {
                void useBetStore.getState().fetchBets();
            })
            .subscribe();

        return () => {
            void supabase.removeChannel(subscription);
        };
    }, []);

    // ACTIONS
    const openConfirm = (betId: string, optId: string, optLabel: string) => {
        setConfirmModal({ visible: true, betId, optId, optLabel });
    };

    const processResolution = async () => {
        if (confirmModal) {
            await resolveBet(confirmModal.betId, confirmModal.optId);
            const label = confirmModal.optLabel;
            setConfirmModal(null);
            Alert.alert("Pari Résolu", `L'option "${label}" a été désignée gagnante. Les gains sont en cours de distribution !`);
        }
    };

    const confirmDelete = async (betId: string) => {
        const title = "Supprimer le pari ?";
        const message = "Cette action est irréversible et supprimera toutes les mises associées.";

        if (Platform.OS === 'web') {
            if (window.confirm(`${title}\n\n${message}`)) {
                await deleteBet(betId);
            }
        } else {
            Alert.alert(title, message, [
                { text: "Annuler", style: "cancel" },
                { text: "Supprimer", style: "destructive", onPress: () => void deleteBet(betId) }
            ]);
        }
    };

    const addOptionField = () => {
        if (options.length < 4) setOptions([...options, { label: '', odds: '2.0' }]);
    };

    const handleCreate = async () => {
        if (!question || options.some(o => !o.label)) {
            alert("Remplis tout, Jenta !");
            return;
        }

        // Vérification que les dates sont valides
        if (isNaN(displayDate.getTime()) || isNaN(expiryDate.getTime())) {
            alert("Les dates sélectionnées sont invalides.");
            return;
        }

        if (expiryDate <= displayDate) {
            Alert.alert("Erreur", "Le pari ne peut pas expirer avant d'être affiché !");
            return;
        }

        const finalOptions = options.map((o, i) => ({
            id: `opt-${Date.now()}-${i}`,
            label: o.label,
            odds: parseFloat(o.odds)
        }));

        await addBet({
            question,
            options: finalOptions,
            category,
            displayAt: displayDate,
            expiresAt: expiryDate,
            isBlurred: isBlurred
        });

        setQuestion('');
        setOptions([{ label: '', odds: '2.0' }, { label: '', odds: '2.0' }]);
        setShowForm(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Jenta Control 🕹️</Text>
                    <Text style={styles.subtitle}>Un grand pouvoir implique de grandes responsabilités</Text>
                </View>
                <TouchableOpacity style={styles.addToggle} onPress={() => setShowForm(!showForm)}>
                    <Text style={styles.addToggleText}>{showForm ? 'Fermer' : '+ Créer'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {showForm && (
                    <View style={styles.createForm}>
                        <View style={styles.catRow}>
                            {['SPECIAL', 'DAILY', 'BEFORE', 'AFTER', 'NIGHT'].map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.catBtn, category === cat && styles.catBtnActive]}
                                    onPress={() => setCategory(cat as BetCategory)}
                                >
                                    <Text style={[styles.catBtnText, category === cat && {color: '#000'}]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="La question (ex: Jenta finit son verre ?)"
                            placeholderTextColor="#555"
                            value={question}
                            onChangeText={setQuestion}
                        />

                        {options.map((opt, index) => (
                            <View key={index} style={styles.optionInputRow}>
                                <TextInput
                                    style={[styles.input, { width: '75%' }]}
                                    placeholder={`Option ${index + 1}`}
                                    placeholderTextColor="#444"
                                    value={opt.label}
                                    onChangeText={(t) => {
                                        const newOpts = [...options];
                                        newOpts[index].label = t;
                                        setOptions(newOpts);
                                    }}
                                />
                                <TextInput
                                    style={[styles.input, { width: '25%' }]}
                                    keyboardType="decimal-pad"
                                    placeholder="Cote"
                                    placeholderTextColor="#444"
                                    value={opt.odds}
                                    onChangeText={(t) => {
                                        const newOpts = [...options];
                                        newOpts[index].odds = t.replace(',', '.');
                                        setOptions(newOpts);
                                    }}
                                />
                            </View>
                        ))}

                        {options.length < 4 && (
                            <TouchableOpacity onPress={addOptionField} style={styles.addOptBtn}>
                                <Text style={{color: '#FFD700'}}>+ Ajouter une option</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.checkRow} onPress={() => setIsBlurred(!isBlurred)}>
                            <Text style={{color: '#fff'}}>Flouter avant ouverture ?</Text>
                            <View style={[styles.checkbox, isBlurred && {backgroundColor: '#FFD700'}]} />
                        </TouchableOpacity>

                        <View style={styles.timingContainer}>
                            <Text style={styles.sectionTitleLabel}>Timing du Pari</Text>
                            <View style={styles.pickerRow}>
                                <Text style={styles.miniLabel}>Affichage :</Text>
                                {Platform.OS === 'web' ? (
                                    <Calendar
                                        value={displayDate}
                                        onChange={(e) => e.value && setDisplayDate(e.value as Date)}
                                        showTime
                                        hourFormat="24"
                                        inputStyle={primePickerStyles}
                                    />
                                ) : (
                                    <DateTimePicker
                                        value={displayDate}
                                        themeVariant="dark"
                                        mode="datetime"
                                        is24Hour={true}
                                        onChange={(_, date) => date && setDisplayDate(date)}
                                    />
                                )}
                            </View>

                            <View style={[styles.pickerRow, {marginTop: 15}]}>
                                <Text style={styles.miniLabel}>Expiration :</Text>
                                {Platform.OS === 'web' ? (
                                    <Calendar
                                        value={expiryDate}
                                        onChange={(e) => e.value && setExpiryDate(e.value as Date)}
                                        showTime
                                        hourFormat="24"
                                        inputStyle={primePickerStyles}
                                    />
                                ) : (
                                    <DateTimePicker
                                        themeVariant="dark"
                                        value={expiryDate}
                                        mode="datetime"
                                        is24Hour={true}
                                        onChange={(_, date) => date && setExpiryDate(date)}
                                    />
                                )}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.createBtn} onPress={() => void handleCreate()}>
                            <Text style={styles.createBtnText}>LANCER</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {activeBets.map((bet) => {
                    const isSettled = bet.status === 'SETTLED';
                    return (
                        <View key={bet.id} style={[styles.adminCard, isSettled && styles.settledCard]}>
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => void confirmDelete(bet.id)}>
                                <Ionicons name="trash-outline" size={18} color="#E50914" />
                            </TouchableOpacity>

                            <Text style={styles.betQuestion}>{bet.question}</Text>

                            {isSettled ? (
                                <View style={styles.settledBadge}>
                                    <Text style={styles.settledText}>RÉSULTAT VALIDÉ ✅</Text>
                                </View>
                            ) : (
                                <>
                                    <Text style={styles.label}>Désigner le vainqueur :</Text>
                                    <View style={styles.btnRow}>
                                        {bet.options.map((opt) => (
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

            {confirmModal?.visible && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
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
                                <TouchableOpacity style={styles.validBtn} onPress={() => void processResolution()}>
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

const primePickerStyles = {
    backgroundColor: '#000', color: '#FFD700', border: '1px solid #333', textAlign: 'center', borderRadius: 8
} as const ;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20},
    title: { color: '#FFF', fontSize: 32, fontWeight: '900' },
    subtitle: { color: '#666', fontSize: 14, marginTop: 5, flexWrap: "wrap", width: 300 },
    addToggle: { backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    addToggleText: { color: '#000', fontWeight: 'bold' },
    createForm: { backgroundColor: '#111', padding: 20, borderRadius: 30, marginBottom: 30, borderWidth: 1, borderColor: '#FFD700' },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
    catBtnActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
    catBtnText: { color: '#888', fontSize: 10, fontWeight: 'bold' },
    input: { backgroundColor: '#000', color: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
    optionInputRow: { flexDirection: 'row', gap: 10 },
    addOptBtn: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, marginBottom: 20 },
    checkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#FFD700' },
    timingContainer: { backgroundColor: '#000', padding: 15, borderRadius: 23, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
    sectionTitleLabel: { color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 10, fontWeight: 'bold' },
    pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
    miniLabel: { color: '#FFD700', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    createBtn: { backgroundColor: '#FFD700', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    createBtnText: { color: '#000', fontWeight: '900', letterSpacing: 1 },
    adminCard: { backgroundColor: '#111', padding: 20, borderRadius: 25, marginBottom: 15, borderWidth: 1, borderColor: '#222', position: 'relative' },
    deleteBtn: { position: 'absolute', top: 15, right: 15, padding: 5, backgroundColor: 'rgba(229, 9, 20, 0.1)', borderRadius: 8 },
    settledCard: { opacity: 0.6, borderColor: '#1DB954' },
    betQuestion: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    label: { color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 10 },
    btnRow: { flexDirection: 'row', gap: 10 },
    resolveBtn: { backgroundColor: '#FFD700', padding: 12, borderRadius: 12, flex: 1, alignItems: 'center' },
    btnText: { color: '#000', fontWeight: '900', fontSize: 12 },
    settledBadge: { backgroundColor: 'rgba(29, 185, 84, 0.2)', padding: 10, borderRadius: 10, alignItems: 'center' },
    settledText: { color: '#1DB954', fontWeight: 'bold', fontSize: 12 },
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