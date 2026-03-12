import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Bet } from '../types';

interface Props {
    bet: Bet;
    onSelectOption: (betId: string, optionId: string) => void;
}

export const BetCard = ({ bet, onSelectOption }: Props) => {
    return (
        <View style={styles.card}>
            <Text style={styles.question}>{bet.question}</Text>

            <View style={styles.optionsGrid}>
                {bet.options.map((option) => (
                    <TouchableOpacity
                        key={option.id}
                        style={styles.optionBtn}
                        onPress={() => onSelectOption(bet.id, option.id)}
                    >
                        <Text style={styles.optionLabel}>{option.label}</Text>
                        <Text style={styles.odds}>x{option.odds}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    question: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    optionBtn: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    optionLabel: { color: '#bbb', fontSize: 14, fontWeight: '600' },
    odds: { color: '#FFD700', fontSize: 16, fontWeight: '800', marginTop: 4 },
});