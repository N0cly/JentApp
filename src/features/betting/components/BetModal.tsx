import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput } from 'react-native';
import { useUserStore } from '../../user/store/useUserStore';

interface Props {
    isVisible: boolean;
    onClose: () => void;
    betQuestion: string;
    optionLabel: string;
    odds: number;
    onConfirm: (amount: number) => void;
}

export const BetModal = ({ isVisible, onClose, betQuestion, optionLabel, odds, onConfirm }: Props) => {
    const [amount, setAmount] = useState('5');
    const { inventory } = useUserStore();

    const handleConfirm = () => {
        const numAmount = parseFloat(amount);
        if (numAmount > 0 && numAmount <= inventory.clopes) {
            onConfirm(numAmount);
            onClose();
        } else {
            alert("Pas assez de clopes en vrac ! Casse un joint ou un paquet.");
        }
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.title}>{betQuestion}</Text>
                    <Text style={styles.subtitle}>Mise sur : <Text style={{color: '#FFD700'}}>{optionLabel}</Text></Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Combien de clopes ?</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            placeholderTextColor="#444"
                        />
                        <Text style={styles.potential}>Gain potentiel : {(parseFloat(amount || '0') * odds).toFixed(1)} 🚬</Text>
                    </View>

                    <View style={styles.row}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.btnText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <Text style={styles.btnText}>Parier !</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#1A1A1A', padding: 25, borderRadius: 30, borderColor: '#333' },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    subtitle: { color: '#888', textAlign: 'center', marginTop: 10 },
    inputContainer: { marginVertical: 20, alignItems: 'center' },
    label: { color: '#666', marginBottom: 10 },
    input: { backgroundColor: '#000', color: '#fff', width: '100%', padding: 15, borderRadius: 15, fontSize: 24, textAlign: 'center', fontWeight: 'bold' },
    potential: { color: '#1DB954', marginTop: 10, fontWeight: '600' },
    row: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#333', borderRadius: 15 },
    confirmBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#FFD700', borderRadius: 15 },
    btnText: { fontWeight: 'bold', color: '#000' }
});