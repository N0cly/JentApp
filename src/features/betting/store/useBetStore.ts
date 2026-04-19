import { create } from 'zustand';
import { useUserStore } from '../../user/store/useUserStore';
import { BetCategory } from "../types";
import { supabase } from '../../../lib/supabase';

// --- TYPES INTERNES ---
export interface BetOption {
    id: string;
    label: string;
    odds: number;
}

export interface Bet {
    id: string;
    question: string;
    category: BetCategory;
    options: BetOption[];
    display_at: string;
    expires_at: string;
    is_blurred: boolean;
    status: 'OPEN' | 'SETTLED';
    winning_option_id?: string;
    created_at: string;
}

export interface UserBet {
    id: string;
    user_id: string;
    bet_id: string;
    option_id: string;
    amount: number;
    created_at: string;
}

// Historique enrichi : UserBet + données du pari associé
export interface UserBetHistory extends UserBet {
    bet: Bet;
    result: 'win' | 'loss' | 'pending';
    gain: number; // clopes gagnées (0 si perdu/en cours)
}

interface BetState {
    activeBets: Bet[];
    allUserBets: UserBet[];
    userBetHistory: UserBetHistory[];
    fetchBets: () => Promise<void>;
    fetchUserBets: (userId: string) => Promise<void>;
    fetchUserBetHistory: (userId: string) => Promise<void>;
    addBet: (betData: {
        question: string;
        category: BetCategory;
        options: BetOption[];
        displayAt: Date;
        expiresAt: Date;
        isBlurred: boolean;
    }) => Promise<void>;
    placeBet: (betId: string, optionId: string, amount: number) => Promise<void>;
    deleteBet: (betId: string) => Promise<void>;
    resolveBet: (betId: string, winningOptionId: string) => Promise<void>;
}

export const useBetStore = create<BetState>((set, get) => ({
    activeBets: [],
    allUserBets: [],
    userBetHistory: [],

    fetchBets: async () => {
        const { data, error } = await supabase
            .from('bets')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            set({ activeBets: data as Bet[] });
        }
    },

    fetchUserBets: async (userId: string) => {
        const { data, error } = await supabase
            .from('user_bets')
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            set({ allUserBets: data as UserBet[] });
        }
    },

    fetchUserBetHistory: async (userId: string) => {
        const { data, error } = await supabase
            .from('user_bets')
            .select('*, bet:bets(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            const history: UserBetHistory[] = data.map((ub: any) => {
                const bet: Bet = ub.bet;
                let result: 'win' | 'loss' | 'pending' = 'pending';
                let gain = 0;

                if (bet?.status === 'SETTLED') {
                    if (ub.option_id === bet.winning_option_id) {
                        result = 'win';
                        const winOpt = bet.options?.find((o: BetOption) => o.id === bet.winning_option_id);
                        gain = winOpt ? Math.floor(ub.amount * winOpt.odds) : 0;
                    } else {
                        result = 'loss';
                    }
                }
                return { ...ub, bet, result, gain };
            });
            set({ userBetHistory: history });
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
                is_blurred: betData.isBlurred, // Mapping vers le nom correct en BDD
                status: 'OPEN'
            }])
            .select();

        if (error) {
            console.error("Erreur ajout pari:", error.message);
            return;
        }

        if (data && data[0]) {
            set((state) => ({
                activeBets: [data[0] as Bet, ...state.activeBets]
            }));

            const notifTitle = "🎰 NOUVEAU PARI !";
            const notifMessage = `Question: ${betData.question}. Viens miser tes clopes !`;

            await supabase.from('notifications').insert([{
                title: notifTitle,
                message: notifMessage,
                type: 'NEW_BET'
            }]);

            // Envoyer la notification Web Push à tous les abonnés PWA
            await supabase.functions.invoke('send-push', {
                body: { title: notifTitle, body: notifMessage },
            });
        }
    },

    placeBet: async (betId, optionId, amount) => {
        const { userId } = useUserStore.getState();

        if (!userId) {
            console.error("Erreur : ID utilisateur introuvable.");
            return;
        }

        const { data, error } = await supabase
            .from('user_bets')
            .insert([{
                bet_id: betId,
                user_id: userId,
                option_id: optionId,
                amount: amount
            }])
            .select();

        if (error) {
            console.error("Erreur Supabase:", error.message);
            return;
        }

        if (data && data[0]) {
            set((state) => ({
                allUserBets: [...state.allUserBets, data[0] as UserBet]
            }));
        }
    },

    deleteBet: async (betId: string):Promise<void> => {
        const { error } = await supabase.from('bets').delete().eq('id', betId);

        if (!error) {
            set((state) => ({
                activeBets: state.activeBets.filter((b) => b.id !== betId)
            }));
        }
    },

    resolveBet: async (betId:string , winningOptionId:string) => {
        const { activeBets } = get();
        const bet = activeBets.find(b => b.id === betId);
        if (!bet) return;

        const winningOption = bet.options.find((o) => o.id === winningOptionId);
        if (!winningOption) return;

        // 1. Marquer le pari comme terminé
        const { error: updateError } = await supabase
            .from('bets')
            .update({ status: 'SETTLED', winning_option_id: winningOptionId })
            .eq('id', betId);

        if (updateError) {
            console.error("Erreur clôture pari:", updateError);
            return;
        }

        // 2. Récupérer les mises
        const { data: userBets, error: fetchError } = await supabase
            .from('user_bets')
            .select('*')
            .eq('bet_id', betId);

        if (fetchError || !userBets) return;

        // 3. Distribuer les gains
        for (const ub of userBets) {
            if (ub.option_id === winningOptionId) {
                const gain = Math.floor(ub.amount * winningOption.odds);

                const {data: userProfile, error: profileError} = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', ub.user_id)
                    .single();

                const newClopes = (userProfile?.clopes || 0) + gain;

                if (!profileError) {
                    await supabase.from('profiles').update({clopes: newClopes}).eq('id', ub.user_id);
                } else {
                    console.error("Erreur récupération profil pour gain:", profileError);
                }
            }
        }

        // 4. Update local
        set((state) => ({
            activeBets: state.activeBets.map((b) =>
                b.id === betId ? { ...b, status: 'SETTLED', winning_option_id: winningOptionId } : b
            )
        }));

        const resolveTitle = "🏁 PARI TERMINÉ";
        const resolveMessage = `Les gains ont été distribués pour : ${bet.question}`;

        await supabase.from('notifications').insert([{
            title: resolveTitle,
            message: resolveMessage,
            type: 'BET_RESOLVED'
        }]);

        // Envoyer la notification Web Push à tous les abonnés PWA
        await supabase.functions.invoke('send-push', {
            body: { title: resolveTitle, body: resolveMessage },
        });
    },
}));