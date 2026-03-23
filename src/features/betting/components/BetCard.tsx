// src/features/betting/components/BetCard.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { useBetStore } from '../store/useBetStore';
import { useUserStore } from '../../user/store/useUserStore';
import { BlurView } from 'expo-blur';
import { Ionicons } from "@expo/vector-icons";

export const BetCard = ({ bet, onSelectOption }: any) => {
  const { allUserBets } = useBetStore();
  const { username } = useUserStore();
  const { userId } = useUserStore(); // Récupère le userId (UUID) au lieu du username

  // State pour forcer le rendu chaque seconde
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const myBet = allUserBets?.find((ub: any) =>
      ub.bet_id === bet.id && ub.user_id === userId
  );
  const isSettled = bet.status === 'SETTLED';
  const isWinner = isSettled && myBet && myBet.option_id === bet.winning_option_id;
  const isLoser = isSettled && myBet && myBet.option_id !== bet.winning_option_id;

  const displayAt = new Date(bet.display_at);
  const expiresAt = new Date(bet.expires_at);
  // console.log(displayAt)

  const isLocked = displayAt > now;
  const isExpired = expiresAt < now;

  // Fonction pour formater le compte à rebours (HH:MM:SS)
  const getCountdown = (targetDate: Date) => {
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return "00:00:00";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let formatted = '';

    if (days > 0) {
      formatted += `${days.toString().padStart(2, '0')}:`;
    }
    if (hours > 0){
      formatted += `${hours.toString().padStart(2, '0')}:`;
    }
    if (minutes >= 0){
      formatted += `${minutes.toString().padStart(2, '0')}:`;
    }
    if (seconds >= 0){
      formatted += `${seconds.toString().padStart(2, '0')}`;
    }

    return formatted;
  };

  // 1. ÉTAT : PARI PAS ENCORE OUVERT (LOCKED)
  if (isLocked) {
    return (
        <View style={styles.card}>
          {bet.is_blured ? (
              <BlurView intensity={0} tint="dark" style={styles.lockContainer}>
                <Ionicons name="lock-closed" size={32} color="#FFD700" />
                <Text style={styles.lockText}>S'OUVRE DANS</Text>
                <Text style={styles.countdownText}>{getCountdown(displayAt)}</Text>
              </BlurView>
          ) : (
              <View>
                <View style={styles.cardHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{bet.category}</Text>
                  </View>
                </View>

                <View style={[styles.lockContainer]}>
                  <Ionicons name="time-outline" size={24} color="#FFD700" />
                  <Text style={styles.lockText}>OUVERTURE DANS</Text>
                  <Text style={styles.countdownText}>{getCountdown(displayAt)}</Text>
                </View>

                {(() => {
                  const timeUntilDisplay = displayAt.getTime() - now.getTime();
                  const isWithin30Min = timeUntilDisplay > 0 && timeUntilDisplay <= 1800000;

                  if (isWithin30Min || now >= displayAt) {
                    return (
                        <View style={styles.optionsContainer}>
                          {bet.options.map((option: any) => {
                            const optionId = option.id;
                            const isLocked = now < displayAt;

                            return (
                                <TouchableOpacity
                                    key={optionId}
                                    activeOpacity={0.7}
                                    style={[styles.optionBtn, isLocked && { opacity: 0.5 }]}
                                >
                                  <View style={styles.optionInfo}>
                                    <Text style={styles.optionLabel}>{option.label}</Text>
                                    <Text style={styles.oddsText}>x{option.odds}</Text>
                                  </View>
                                </TouchableOpacity>
                            );
                          })}
                        </View>
                    );
                  }
                  return null;
                })()}
              </View>
          )}
        </View>
    );
  }

  // 2. ÉTAT : PARI OUVERT OU TERMINE
  return (
      <View style={[
        styles.card,
        isWinner && styles.winnerBorder,
        (isLoser && myBet) && styles.loserBorder, // On n'affiche la bordure rouge QUE si on a misé
        (isExpired && !isSettled) && styles.expiredCard
      ]}>

        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{bet.category}</Text>
          </View>

          {/* Affichage dynamique du statut ou du temps restant */}
          {isSettled ? (
              myBet ? (
                  <Text style={[styles.statusText, { color: isWinner ? '#1DB954' : '#E50914' }]}>
                    {isWinner ? (() => {
                      // On cherche l'option gagnante de manière ultra-sécurisée
                      const winningOpt = bet.options.find((o: any) => o.id === bet.winning_option_id);
                      const odds = winningOpt ? winningOpt.odds : 1; // 1 par défaut pour éviter le crash
                      return `GAGNÉ +${(myBet.amount * odds).toFixed(1)}🚬`;
                    })() : 'PERDU'}
                  </Text>
              ) : (
                  <Text style={[styles.statusText, { color: '#666' }]}>TERMINÉ</Text>
              )
          ) : isExpired ? (
              <View style={styles.closedBadge}>
                <Text style={styles.closedText}>EN ATTENTE RÉSULTAT</Text>
              </View>
          ) : (
              <View style={styles.timerBadge}>
                <Ionicons name="stopwatch-outline" size={14} color="#FFD700" />
                <Text style={styles.timerText}>{getCountdown(expiresAt)}</Text>
              </View>
          )}
        </View>

        <Text style={styles.question}>{bet.question}</Text>

        <View style={styles.optionsContainer}>
          {bet.options.map((option: any) => {
            const optionId = option.id;

            const isMyChoice = myBet?.option_id === optionId;
            const isWinningOpt = isSettled && optionId === bet.winning_option_id;
            const isInteractionDisabled = isSettled || isExpired;

            return (
                <TouchableOpacity
                    key={optionId}
                    activeOpacity={0.7}
                    disabled={isInteractionDisabled}
                    onPress={() => onSelectOption(bet.id, optionId)}
                    style={[
                      styles.optionBtn,
                      isMyChoice && styles.myOptionActive,
                      isWinningOpt && styles.winningOptionActive,
                      (isSettled || isExpired) && !isWinningOpt && { opacity: 0.4 }
                    ]}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.oddsText}>x{option.odds}</Text>
                  </View>

                  {isMyChoice && myBet && !isInteractionDisabled && (
                      <View style={styles.myMiseTag}>
                        <Text style={styles.myMiseText}>Ma mise: {myBet.amount}🚬</Text>
                        <Text style={styles.myGainPotentielText}>
                          gain potentiel: {(parseFloat(myBet.amount || '0') * option.odds).toFixed(1)}🚬
                        </Text>
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
  // --- CARTE DE BASE ---
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    minHeight: 120,
    justifyContent: 'center'
  },
  lockContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // paddingVertical: 10,
    paddingBottom: 10,
    gap: 5
  },
  lockText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 8,
    letterSpacing: 1,
  },
  countdownText: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Courier', // Pour un look digital si dispo
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  timerText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closedBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  closedText: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
  },
  expiredCard: {
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },

  winnerBorder: { borderColor: '#1DB954', backgroundColor: 'rgba(29, 185, 84, 0.08)', borderWidth: 2 },
  loserBorder: { borderColor: '#E50914', backgroundColor: 'rgba(229, 9, 20, 0.08)', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: { backgroundColor: 'rgba(255, 215, 0, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.2)' },
  categoryText: { color: '#FFD700', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  statusText: { fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  question: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 20, lineHeight: 24, letterSpacing: -0.2 },
  optionsContainer: { gap: 10 },
  optionBtn: { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  optionInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionLabel: { color: '#FFF', fontSize: 15, fontWeight: '600', opacity: 0.9 },
  oddsText: { color: '#FFD700', fontSize: 18, fontWeight: '900' },
  myOptionActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.08)', borderWidth: 1.5 },
  winningOptionActive: { backgroundColor: '#1DB954', borderColor: '#1DB954', opacity: 1 },
  myMiseTag: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', justifyContent: 'space-between' },
  myMiseText: { color: '#AAA', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  myGainPotentielText: { color: '#AAA', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
});


