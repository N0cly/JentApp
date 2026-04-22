import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput } from 'react-native';
import { useUserStore } from '../../user/store/useUserStore';
import { useBetStore } from '../store/useBetStore';
import { useToast } from '../../../contexts/ToastContext';

interface Props {
    isVisible: boolean;
    onClose: () => void;
    betQuestion: string;
    betId: string;
    optionId: string;
    optionLabel: string;
    odds: number;
    onConfirm: (amount: number) => void;
}

export const BetModal = ({ isVisible, onClose, betQuestion, betId, optionId, optionLabel, odds, onConfirm }: Props) => {
    const { inventory, userId } = useUserStore();
    const { allUserBets } = useBetStore();
    const { showToast } = useToast();

    // Mise actuelle sur cette option
    const existingBet = allUserBets.find(
        ub => ub.bet_id === betId && ub.user_id === userId && ub.option_id === optionId
    );
    const currentStake = existingBet?.amount ?? 0;
    const isTopUp = currentStake > 0;

    const [amount, setAmount] = useState(isTopUp ? String(currentStake + 5) : '5');

    useEffect(() => {
        // Réinitialiser quand la modal s'ouvre
        if (isVisible) {
            setAmount(isTopUp ? String(currentStake + 5) : '5');
        }
    }, [isVisible, isTopUp, currentStake]);

    const numAmount = parseInt(amount, 10) || 0;
    const delta = isTopUp ? numAmount - currentStake : numAmount;
    const potentialGain = Math.floor(numAmount * odds);

    const handleConfirm = () => {
        if (isNaN(numAmount) || numAmount <= 0) {
            showToast('Mise invalide.', 'error');
            return;
        }
        if (isTopUp && numAmount <= currentStake) {
            showToast(`Ta mise actuelle est de ${currentStake}🚬. Entre un montant supérieur.`, 'error');
            return;
        }
        if (!isTopUp && numAmount > inventory.clopes) {
            showToast('Pas assez de clopes !', 'error');
            return;
        }
        if (isTopUp && delta > inventory.clopes) {
            showToast(`Il te manque ${delta - inventory.clopes}🚬 pour cette augmentation.`, 'error');
            return;
        }
        onConfirm(numAmount);
        onClose();
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.title}>{betQuestion}</Text>
                    <Text style={styles.subtitle}>
                        Mise sur : <Text style={{ color: '#FFD700' }}>{optionLabel}</Text>
                    </Text>

                    {isTopUp && (
                        <View style={styles.topUpBanner}>
                            <Text style={styles.topUpText}>
                                Mise actuelle : <Text style={{ color: '#FFD700', fontWeight: '900' }}>{currentStake}🚬</Text>
                            </Text>
                            <Text style={styles.topUpHint}>Entre le NOUVEAU TOTAL souhaité</Text>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            {isTopUp ? 'Nouveau total (clopes)' : 'Combien de clopes ?'}
                        </Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            placeholderTextColor="#444"
                        />
                        {isTopUp && delta > 0 && (
                            <Text style={styles.deltaText}>+{delta}🚬 supplémentaires</Text>
                        )}
                        <Text style={styles.potential}>
                            Gain potentiel : {potentialGain}🚬
                        </Text>
                        <Text style={styles.balanceInfo}>
                            Solde : {inventory.clopes}🚬
                        </Text>
                    </View>

                    <View style={styles.row}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <Text style={styles.confirmText}>{isTopUp ? 'Augmenter !' : 'Parier !'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#1A1A1A', padding: 25, borderRadius: 30, borderWidth: 1, borderColor: '#333' },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', lineHeight: 24 },
    subtitle: { color: '#888', textAlign: 'center', marginTop: 10 },
    topUpBanner: { marginTop: 14, backgroundColor: '#FFD70011', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FFD70033', alignItems: 'center', gap: 4 },
    topUpText: { color: '#888', fontSize: 13 },
    topUpHint: { color: '#FFD70088', fontSize: 11, fontWeight: '700' },
    inputContainer: { marginVertical: 16, alignItems: 'center', gap: 6 },
    label: { color: '#666', marginBottom: 6, fontSize: 13 },
    input: { backgroundColor: '#000', color: '#fff', width: '100%', padding: 15, borderRadius: 15, fontSize: 28, textAlign: 'center', fontWeight: 'bold', borderWidth: 1, borderColor: '#333' },
    deltaText: { color: '#4CAF50', fontWeight: '700', fontSize: 13 },
    potential: { color: '#1DB954', fontWeight: '600', fontSize: 14 },
    balanceInfo: { color: '#333', fontSize: 12 },
    row: { flexDirection: 'row', gap: 10, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#333', borderRadius: 15 },
    cancelText: { fontWeight: 'bold', color: '#fff' },
    confirmBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#FFD700', borderRadius: 15 },
    confirmText: { fontWeight: 'bold', color: '#000' },
});
