// src/features/betting/store/useBetStore.ts
import { create } from 'zustand';
import { useUserStore } from '../../user/store/useUserStore';
import {BetCategory} from "../types"; // Pour payer les gens

// On ajoute un type pour le pari d'un joueur
interface UserBet {
    username: string;
    betId: string;
    optionId: string;
    amount: number;
}

export const useBetStore = create<any>((set, get) => ({
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
            expiresAt: new Date(+new Date() + 2 * 60 * 60 * 1000), // expire dans 2h
            options: [
                { id: 'opt1', label: 'Avant 21h', odds: 3.0 },
                { id: 'opt2', label: 'Entre 21h et 22h', odds: 1.5 },
                { id: 'opt3', label: 'Après 22h', odds: 2.0 },
            ]
        }
    ],
    allUserBets: [],

    placeBet: (betId, optionId, amount, username) => {
        set((state) => ({
            allUserBets: [...state.allUserBets, { username, betId, optionId, amount }]
        }));
    },

    resolveBet: (betId: string, winningOptionId: string) => {
        const { allUserBets, activeBets } = get();

        // 1. VERIFICATION DE SECURITE : Est-ce que le pari est déjà réglé ?
        const betToResolve = activeBets.find(b => b.id === betId);
        if (!betToResolve || betToResolve.status === 'SETTLED') {
            console.log("Ce pari est déjà clos ou inexistant.");
            return;
        }

        const { addClopes } = useUserStore.getState();

        // 2. DISTRIBUTION DES GAINS
        allUserBets
            .filter(ub => ub.betId === betId && ub.optionId === winningOptionId)
            .forEach(winner => {
                const option = betToResolve.options.find(o => o.id === winningOptionId);
                const gain = winner.amount * option.odds;
                addClopes(gain);
            });

        // 3. VERROUILLAGE DEFINITIF
        set((state) => ({
            activeBets: state.activeBets.map(b =>
                b.id === betId
                    ? { ...b, status: 'SETTLED', winningOptionId: winningOptionId }
                    : b
            )
        }));
    },

    addBet: (betData: {
        question: string,
        options: {label: string, odds: number}[],
        category: BetCategory,
        displayAt?: Date,
        expiresAt: Date,
        isBlured: boolean
    }) => {
        const newBet = {
            id: Date.now().toString(),
            status: 'OPEN',
            ...betData,
            options: betData.options.map((opt, i) => ({
                id: `opt-${i}-${Date.now()}`,
                label: opt.label,
                odds: opt.odds
            }))
        };

        set((state: any) => ({ activeBets: [newBet, ...state.activeBets] }));
    },

    // Dans ton useBetStore.ts

    deleteBet: (betId: string) => {
        const { allUserBets } = get();
        const { addClopes } = useUserStore.getState(); // On récupère ton action de remboursement

        // 1. Filtrer les mises qui appartiennent à ce pari
        const betsToRefund = allUserBets.filter((ub: any) => ub.betId === betId);

        // 2. Rembourser l'utilisateur (on simule que c'est toi qui récupères tes billes)
        betsToRefund.forEach((ub: any) => {
            const amountToRefund = parseFloat(ub.amount);
            if (amountToRefund > 0) {
                addClopes(amountToRefund); // On réinjecte les clopes dans ton inventaire
                console.log(`Remboursement de ${amountToRefund}🚬 à ${ub.username}`);
            }
        });

        // 3. Nettoyer le store des paris
        set((state: any) => ({
            activeBets: state.activeBets.filter((b: any) => b.id !== betId),
            allUserBets: state.allUserBets.filter((ub: any) => ub.betId !== betId)
        }));
    },
}));