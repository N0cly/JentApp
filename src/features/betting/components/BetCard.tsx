import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Bet } from '../types';
import {useBetStore} from "../store/useBetStore";
import {useUserStore} from "../../user/store/useUserStore";

interface Props {
    bet: Bet;
    onSelectOption: (betId: string, optionId: string) => void;
}

export const BetCard = ({ bet, onSelectOption }: any) => {
    const { allUserBets } = useBetStore();
    const { username } = useUserStore(); // Pour savoir quel est MON pari

    // On récupère le pari de l'utilisateur sur cet événement
    const myBet = allUserBets.find(ub => ub.betId === bet.id && ub.username === username);

    const isSettled = bet.status === 'SETTLED';
    const isWinner = isSettled && myBet && myBet.optionId === bet.winningOptionId;
    const isLoser = isSettled && myBet && myBet.optionId !== bet.winningOptionId;

    // Style dynamique de la carte
    const cardStyle = [
        styles.card,
        isWinner && styles.cardWinner,
        isLoser && styles.cardLoser
    ];

    return (
        <View style={cardStyle}>
            <Text style={styles.question}>{bet.question}</Text>

            <View style={styles.optionsGrid}>
                {bet.options.map((option) => {
                    const isMyOption = myBet?.optionId === option.id;
                    const isWinningOption = isSettled && option.id === bet.winningOptionId;

                    return (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.optionBtn,
                                isMyOption && styles.myOption,
                                isWinningOption && styles.winningOption,
                                isSettled && { opacity: 0.7 } // On réduit l'opacité si fini
                            ]}
                            onPress={() => !isSettled && onSelectOption(bet.id, option.id)}
                            disabled={isSettled}
                        >
                            <Text style={styles.optionLabel}>{option.label}</Text>
                            <Text style={styles.odds}>x{option.odds}</Text>

                            {/* Affichage des mises et gains potentiels */}
                            {isMyOption && (
                                <View style={styles.betInfo}>
                                    <Text style={styles.betAmount}>Misée: {myBet.amount}🚬</Text>
                                    {!isSettled && (
                                        <Text style={styles.potential}>Gain: {myBet.amount * option.odds}🚬</Text>
                                    )}
                                    {isWinner && (
                                        <Text style={styles.resultGain}>+{myBet.amount * option.odds}🚬 Gagnés !</Text>
                                    )}
                                    {isLoser && (
                                        <Text style={styles.resultLoss}>-{myBet.amount}🚬 Perdus</Text>
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
    cardWinner: { borderColor: '#1DB954', backgroundColor: 'rgba(29, 185, 84, 0.1)' },
    cardLoser: { borderColor: '#E50914', backgroundColor: 'rgba(229, 9, 20, 0.1)' },
    question: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    optionsGrid: { flexDirection: 'row', gap: 8 },
    optionBtn: { flex: 1, backgroundColor: '#222', padding: 10, borderRadius: 12, alignItems: 'center' },
    myOption: { borderWidth: 2, borderColor: '#FFD700' },
    winningOption: { backgroundColor: '#1DB954' },
    optionLabel: { color: '#fff', fontSize: 13 },
    odds: { color: '#FFD700', fontWeight: 'bold' },
    betInfo: { marginTop: 5, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 5 },
    betAmount: { color: '#aaa', fontSize: 10 },
    potential: { color: '#FFD700', fontSize: 10, fontWeight: 'bold' },
    resultGain: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    resultLoss: { color: '#ffaaaa', fontSize: 10, fontWeight: 'bold' }
});