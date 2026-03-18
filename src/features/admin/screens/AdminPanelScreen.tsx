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
import DateTimePicker from '@react-native-community/datetimepicker';
import {BetCategory} from "../../betting/types";
import {Ionicons} from "@expo/vector-icons";

export default function AdminPanelScreen() {
    const { activeBets, resolveBet, addBet, deleteBet } = useBetStore(); // Ajoute deleteBet ici
    const [confirmModal, setConfirmModal] = useState<{visible: boolean, betId: string, optId: string, optLabel: string} | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [options, setOptions] = useState([{ label: '', odds: '2.0' }, { label: '', odds: '2.0' }]);
    const [category, setCategory] = useState<BetCategory>('SPECIAL');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 3600000)); // +1h par défaut
    const [isBlured, setIsBlured] = useState(false);
    const [showDisplayPicker, setShowDisplayPicker] = useState(false);
    const [showExpiryPicker, setShowExpiryPicker] = useState(false);

    const openConfirm = (betId: string, optId: string, optLabel: string) => {
        setConfirmModal({ visible: true, betId, optId, optLabel });
    };

    const processResolution = () => {
        if (confirmModal) {
            resolveBet(confirmModal.betId, confirmModal.optId);
            setConfirmModal(null);
            // Optionnel : un petit feedback haptique ou sonore serait top ici

            Alert.alert("Pari Résolu", `L'option "${confirmModal.optLabel}" a été désignée gagnante. Les gains sont en cours de distribution !`);
        }
    };

    const cleanNumber = (text: string) => {
        return text.replace(',', '.').replace(/[^0-9.]/g, '');
    };

    const formatDate = (date: Date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) return "--/--/---- --:--";
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const confirmDelete = (betId: string) => {
        Alert.alert(
            "Supprimer le pari ?",
            "Cette action est irréversible et supprimera toutes les mises associées.",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: () => deleteBet(betId)
                }
            ]
        );
    };

    // États du formulaire
    const [question, setQuestion] = useState('');
    const [opt1, setOpt1] = useState({ label: '', odds: '2.0' });
    const [opt2, setOpt2] = useState({ label: '', odds: '2.0' });

    const addOptionField = () => {
        if (options.length < 4) setOptions([...options, { label: '', odds: '2.0' }]);
    };

    const handleCreate = () => {
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
            alert("Le pari ne peut pas expirer avant d'être affiché !");
            return;
        }

        addBet({
            question,
            options: options.map(o => ({ label: o.label, odds: parseFloat(o.odds) })),
            category,
            displayAt: displayDate,
            expiresAt: expiryDate,
            isBlured
        });

        // Reset et fermeture
        setQuestion('');
        setOptions([{ label: '', odds: '2.0' }, { label: '', odds: '2.0' }]);
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
                        {/* Sélecteur de Catégorie */}
                        <View style={styles.catRow}>
                            {['SPECIAL', 'DAILY', 'BEFORE', 'AFTER', 'NIGHT'].map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.catBtn, category === cat && styles.catBtnActive]}
                                    onPress={() => setCategory(cat as BetCategory)}
                                >
                                    <Text style={styles.catBtnText}>{cat}</Text>
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

                        {/* Champs Options Dynamiques */}
                        {options.map((opt, index) => (
                            <View key={index} style={styles.optionInputRow}>
                                <TextInput
                                    style={[styles.input, { flex: 2 }]}
                                    placeholder={`Option ${index + 1}`}
                                    value={opt.label}
                                    onChangeText={(t) => {
                                        const newOpts = [...options];
                                        newOpts[index].label = t;
                                        setOptions(newOpts);
                                    }}
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    keyboardType="decimal-pad"
                                    value={opt.odds}
                                    onChangeText={(t) => {
                                        const newOpts = [...options];
                                        newOpts[index].odds = t;
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

                        {/* Switch Blured */}
                        <TouchableOpacity
                            style={styles.checkRow}
                            onPress={() => setIsBlured(!isBlured)}
                        >
                            <Text style={{color: '#fff'}}>Flouter avant ouverture ?</Text>
                            <View style={[styles.checkbox, isBlured && {backgroundColor: '#FFD700'}]} />
                        </TouchableOpacity>

                        {/* SECTION TIMING */}
                        <View style={styles.timingContainer}>
                            <Text style={styles.sectionTitleLabel}>Timing du Pari</Text>

                            <View style={styles.pickerRow}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.miniLabel}>Affichage :</Text>
                                    <DateTimePicker
                                        value={displayDate}
                                        mode="datetime" // CHANGÉ ICI : Permet de choisir date ET heure
                                        is24Hour={true}
                                        onChange={(event, date) => {
                                            setShowDisplayPicker(false);
                                            if (date) setDisplayDate(date);
                                        }}
                                    />
                                </View>
                            </View>

                            <View style={[styles.pickerRow, {marginTop: 15}]}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.miniLabel}>Expiration :</Text>
                                    <DateTimePicker
                                        value={expiryDate}
                                        mode="datetime" // CHANGÉ ICI
                                        is24Hour={true}
                                        onChange={(event, date) => {
                                            setShowExpiryPicker(false);
                                            if (date) setExpiryDate(date);
                                        }}
                                    />
                                </View>
                            </View>

                            {/* Sélecteurs Natifs */}
                            {showDisplayPicker && (
                                <DateTimePicker
                                    value={displayDate}
                                    mode="datetime" // CHANGÉ ICI : Permet de choisir date ET heure
                                    is24Hour={true}
                                    onChange={(event, date) => {
                                        setShowDisplayPicker(false);
                                        if (date) setDisplayDate(date);
                                    }}
                                />
                            )}

                            {showExpiryPicker && (
                                <DateTimePicker
                                    value={expiryDate}
                                    mode="datetime" // CHANGÉ ICI
                                    is24Hour={true}
                                    onChange={(event, date) => {
                                        setShowExpiryPicker(false);
                                        if (date) setExpiryDate(date);
                                    }}
                                />
                            )}
                        </View>

                        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                            <Text style={styles.createBtnText}>LANCER</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {activeBets.map((bet: any) => {
                    const isSettled = bet.status === 'SETTLED';

                    return (
                        <View key={bet.id} style={[styles.adminCard, isSettled && styles.settledCard]}>

                            {/* BOUTON SUPPRIMER */}
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => confirmDelete(bet.id)}
                            >
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
    // --- STYLES EXISTANTS ---
    container: { flex: 1, backgroundColor: '#000' },
    title: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', margin: 20, marginTop: 40 },
    addToggle: { backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    addToggleText: { color: '#000', fontWeight: 'bold' },

    // --- FORMULAIRE DE CRÉATION ---
    createForm: {
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 25,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#FFD700',
        shadowColor: '#FFD700',
        shadowOpacity: 0.1,
        shadowRadius: 10
    },

    // Sélecteur de Catégories
    catRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20
    },
    catBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: '#222',
        borderWidth: 1,
        borderColor: '#333'
    },
    catBtnActive: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700'
    },
    catBtnText: {
        color: '#888',
        fontSize: 10,
        fontWeight: 'bold'
    },
    catBtnActiveText: { // À ajouter dans le Text si tu veux changer la couleur
        color: '#000'
    },

    // Champs de texte
    input: {
        backgroundColor: '#000',
        color: '#fff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333'
    },
    optionInputRow: {
        flexDirection: 'row',
        gap: 10
    },

    // Bouton Ajouter Option
    addOptBtn: {
        alignSelf: 'flex-start',
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginBottom: 20
    },

    // Switch / Checkbox Blured
    checkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        padding: 15,
        borderRadius: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333'
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFD700',
        backgroundColor: 'transparent'
    },
    timingContainer: {
        backgroundColor: '#000',
        padding: 15,
        borderRadius: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#222'
    },
    sectionTitleLabel: {
        color: '#666',
        fontSize: 10,
        textTransform: 'uppercase',
        marginBottom: 10,
        fontWeight: 'bold'
    },
    pickerRow: {
        flexDirection: 'row',
        gap: 15
    },
    miniLabel: {
        color: '#444',
        fontSize: 10,
        marginBottom: 5
    },
    dateSelector: {
        backgroundColor: '#111',
        padding: 15, // Un peu plus de padding pour la lisibilité
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
        width: '100%'
    },
    dateText: {
        color: '#FFD700',
        fontWeight: 'bold',
        fontSize: 13, // Un poil plus petit pour faire tenir JJ/MM/YYYY HH:MM sur une ligne
    },

    // Bouton Lancer
    createBtn: {
        backgroundColor: '#FFD700',
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 10,
        elevation: 5
    },
    createBtnText: {
        color: '#000',
        fontWeight: '900',
        letterSpacing: 1
    },

    // --- CARTES ADMIN EXISTANTES ---
    adminCard: {
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 25,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#222',
        position: 'relative' // Important pour placer le bouton delete
    },
    deleteBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 5,
        backgroundColor: 'rgba(229, 9, 20, 0.1)',
        borderRadius: 8,
    },
    settledCard: { opacity: 0.6, borderColor: '#1DB954' },
    betQuestion: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    label: { color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 10 },
    btnRow: { flexDirection: 'row', gap: 10 },
    resolveBtn: { backgroundColor: '#FFD700', padding: 12, borderRadius: 12, flex: 1, alignItems: 'center' },
    btnText: { color: '#000', fontWeight: '900', fontSize: 12 },
    settledBadge: { backgroundColor: 'rgba(29, 185, 84, 0.2)', padding: 10, borderRadius: 10, alignItems: 'center' },
    settledText: { color: '#1DB954', fontWeight: 'bold', fontSize: 12 },

    // --- MODALES ---
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