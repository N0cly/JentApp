// src/features/betting/components/BetCard.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { useBetStore } from '../store/useBetStore';
import { useUserStore } from '../../user/store/useUserStore';

const { width } = Dimensions.get('window');

export const BetCard = ({ bet, onSelectOption }: any) => {
  const { allUserBets } = useBetStore();
  const { username } = useUserStore();
  
  const myBet = allUserBets.find((ub: any) => ub.betId === bet.id && ub.username === username);
  const isSettled = bet.status === 'SETTLED';
  const isWinner = isSettled && myBet && myBet.optionId === bet.winningOptionId;
  const isLoser = isSettled && myBet && myBet.optionId !== bet.winningOptionId;

  return (
    <View style={[
      styles.card, 
      isWinner && styles.winnerBorder, 
      isLoser && styles.loserBorder
    ]}>
      {/* Header du Pari */}
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{bet.category}</Text>
        </View>
        {isSettled && (
          <Text style={[styles.statusText, { color: isWinner ? '#1DB954' : '#E50914' }]}>
            {isWinner ? 'GAGNÉ +'+(myBet.amount * bet.options.find((o:any)=>o.id === bet.winningOptionId).odds)+'🚬' : 'PERDU'}
          </Text>
        )}
      </View>

      <Text style={styles.question}>{bet.question}</Text>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {bet.options.map((option: any) => {
          const isMyChoice = myBet?.optionId === option.id;
          const isWinningOpt = isSettled && option.id === bet.winningOptionId;

          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.7}
              disabled={isSettled}
              onPress={() => onSelectOption(bet.id, option.id)}
              style={[
                styles.optionBtn,
                isMyChoice && styles.myOptionActive,
                isWinningOpt && styles.winningOptionActive,
                isSettled && !isWinningOpt && { opacity: 0.4 }
              ]}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.oddsText}>x{option.odds}</Text>
              </View>
              
              {isMyChoice && (
                <View style={styles.myMiseTag}>
                  <Text style={styles.myMiseText}>Ma mise: {myBet.amount}🚬</Text>
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
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  winnerBorder: { borderColor: '#1DB954', backgroundColor: 'rgba(29, 185, 84, 0.05)' },
  loserBorder: { borderColor: '#E50914', backgroundColor: 'rgba(229, 9, 20, 0.05)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  categoryBadge: { backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryText: { color: '#FFD700', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statusText: { fontWeight: '900', fontSize: 12 },
  question: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 20, lineHeight: 24 },
  optionsContainer: { gap: 10 },
  optionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionLabel: { color: '#DDD', fontSize: 15, fontWeight: '600' },
  oddsText: { color: '#FFD700', fontSize: 18, fontWeight: '900' },
  myOptionActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.05)' },
  winningOptionActive: { backgroundColor: '#1DB954', borderColor: '#1DB954' },
  myMiseTag: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  myMiseText: { color: '#AAA', fontSize: 11, fontWeight: '500' },
});
