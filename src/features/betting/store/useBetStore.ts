// src/features/betting/store/useBetStore.ts
import { create } from 'zustand';
import { useUserStore } from '../../user/store/useUserStore';
import {BetCategory} from "../types"; // Pour payer les gens
import { supabase } from '../../../lib/supabase';


export const useBetStore = create<BetState>((set, get) => ({
    activeBets: [],
    allUserBets: [],

    fetchBets: async () => {
        const { data, error } = await supabase
            .from('bets')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            set({ activeBets: data });
        }
    },


    fetchUserBets: async (userId: string) => {
        const { data, error } = await supabase
            .from('user_bets')
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            set({ allUserBets: data });
        }
    },

    addBet: async (betData) => {
        const { data, error } = await supabase
            .from('bets')
            .insert([{
                question: betData.question,
                category: betData.category,
                options: betData.options,
                display_at: betData.displayAt.toISOString(),
                expires_at: betData.expiresAt.toISOString(),
                is_blured: betData.isBlured,
                status: 'OPEN'
            }])
            .select();

        if (error) {
            console.error(error);
            return;
        }

        if (data && data[0]) {
            set((state) => ({
                activeBets: [data[0], ...state.activeBets]
            }));
            await supabase.from('notifications').insert([{
                title: "🎰 NOUVEAU PARI !",
                message: `Question: ${betData.question}. Viens miser tes clopes !`,
                type: 'NEW_BET'
            }]);
        }
    },


    placeBet: async (betId: string, optionId: string, amount: number) => {
        const { userId } = useUserStore.getState();

        if (!userId) {
            alert("Erreur : ID utilisateur introuvable.");
            return;
        }

        const { data, error } = await supabase
            .from('user_bets')
            .insert([{
                bet_id: betId,      // UUID du pari
                user_id: userId,    //ton UUID (id dans profiles)
                option_id: optionId, // ex: "opt-123..."
                amount: amount
            }])
            .select();

        if (error) {
            console.error("Erreur Supabase:", error.message);
            return;
        }

        if (data && data[0]) {
            set((state) => ({
                allUserBets: [...state.allUserBets, data[0]]
            }));
        }
    },

    deleteBet: async (betId: string) => {
        const { error } = await supabase.from('bets').delete().eq('id', betId);

        if (!error) {
            set((state) => ({
                activeBets: state.activeBets.filter((b) => b.id !== betId)
            }));
        }
    },

    resolveBet: async (betId, winningOptionId) => {
        const { activeBets } = get();
        const bet = activeBets.find(b => b.id === betId);
        if (!bet) return;

        const winningOption = bet.options.find((o: any) => o.id === winningOptionId);
        if (!winningOption) return;

        // 1. Marquer le pari comme terminé dans la BDD
        const { error: updateError } = await supabase
            .from('bets')
            .update({ status: 'SETTLED', winning_option_id: winningOptionId })
            .eq('id', betId);

        if (updateError) {
            console.error("Erreur clôture pari:", updateError);
            return;
        }

        // 2. Récupérer toutes les mises pour ce pari
        const { data: userBets, error: fetchError } = await supabase
            .from('user_bets')
            .select('*')
            .eq('bet_id', betId);

        if (fetchError || !userBets) return;

        // 3. Distribuer les gains aux gagnants
        for (const ub of userBets) {
            if (ub.option_id === winningOptionId) {
                const gain = Math.floor(ub.amount * winningOption.odds);

                // On appelle la fonction SQL qu'on vient de créer
                const { error: payError } = await supabase.rpc('increment_clopes', {
                    user_uuid: ub.user_id,
                    amount_to_add: gain
                });

                if (payError) console.error("Erreur paiement pour", ub.user_id, payError);
            }
        }

        // 4. Mise à jour locale du store pour l'admin
        set((state) => ({
            activeBets: state.activeBets.map(b =>
                b.id === betId ? { ...b, status: 'SETTLED', winning_option_id: winningOptionId } : b
            )
        }));
        // Après avoir payé les gagnants :
        await supabase.from('notifications').insert([{
            title: "🏁 PARI TERMINÉ",
            message: `Les gains ont été distribués pour : ${bet.question}`,
            type: 'BET_RESOLVED'
        }]);
    },
}));