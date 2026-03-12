// src/features/betting/store/useBetStore.ts
import { create } from 'zustand';
import { useUserStore } from '../../user/store/useUserStore'; // Pour payer les gens

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
            expiresAt: new Date(),
            options: [
                { id: 'opt1', label: 'Avant 21h', odds: 3.0 },
                { id: 'opt2', label: 'Entre 21h et 22h', odds: 1.8 },
                { id: 'opt3', label: 'Après 22h', odds: 2.2 },
            ]
        }
    ],    allUserBets: [] as UserBet[], // Tous les paris de tous les joueurs (simulé)

    placeBet: (betId: string, optionId: string, amount: number, username: string) => {
        set((state: any) => ({
            allUserBets: [...state.allUserBets, { username, betId, optionId, amount }]
        }));
    },

    // LA FONCTION ADMIN : Valider un résultat
    resolveBet: (betId: string, winningOptionId: string) => {
        const { allUserBets } = get();
        const { addClopes } = useUserStore.getState(); // On récupère l'accès au portefeuille

        // 1. Trouver tous les gagnants pour ce pari
        const winners = allUserBets.filter(
            (ub: UserBet) => ub.betId === betId && ub.optionId === winningOptionId
        );

        // 2. Payer chaque gagnant
        winners.forEach((winner: UserBet) => {
            const bet = get().activeBets.find((b: any) => b.id === betId);
            const option = bet.options.find((o: any) => o.id === winningOptionId);
            const gain = winner.amount * option.odds;

            // Ici, on simule le paiement (dans une vraie app, on ciblerait l'ID du joueur)
            addClopes(gain);
            console.log(`Payé ${gain} clopes à ${winner.username}`);
        });

        // 3. Supprimer le pari de la liste active (ou le marquer SETTLED)
        set((state: any) => ({
            activeBets: state.activeBets.filter((b: any) => b.id !== betId),
            allUserBets: state.allUserBets.filter((ub: any) => ub.betId !== betId)
        }));
    }
}));