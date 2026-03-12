import { create } from 'zustand';
import { Bet, UserBet } from '../types';

interface BetState {
    activeBets: Bet[];
    userBets: UserBet[]; // Les paris que MOI j'ai fait

    // Actions Admin
    setBets: (bets: Bet[]) => void;

    // Actions Utilisateur
    placeBet: (betId: string, optionId: string, amount: number) => void;
}

export const useBetStore = create<BetState>((set) => ({
    activeBets: [
        {
            id: '1',
            question: "Est-ce que Jenta va mettre un pull ce soir ?",
            status: 'OPEN',
            category: 'DAILY',
            expiresAt: new Date(),
            options: [
                { id: 'opt1', label: 'Oui', odds: 1.5 },
                { id: 'opt2', label: 'Non', odds: 2.5 },
            ]
        },
        {
            id: '2',
            question: "A quelle heure Jenta arrive à la soirée ?",
            status: 'OPEN',
            category: 'SPECIAL',
            expiresAt: new Date(),
            options: [
                { id: 'opt1', label: 'Avant 21h', odds: 3.0 },
                { id: 'opt2', label: 'Entre 21h et 22h', odds: 1.8 },
                { id: 'opt3', label: 'Après 22h', odds: 2.2 },
            ]
        }
    ],
    userBets: [],

    setBets: (bets) => set({ activeBets: bets }),

    placeBet: (betId, optionId, amount) => set((state) => ({
        userBets: [...state.userBets, { betId, optionId, amount }]
    })),
}));