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

// ── Helper audit log ──────────────────────────────────────────────────────────
async function logAudit(action: string, category: string, details?: Record<string, any>, betId?: string | null, actorId?: string | null, targetId?: string | null) {
    await supabase.from('audit_logs').insert([{
        action,
        category,
        actor_id: actorId ?? null,
        target_id: targetId ?? null,
        bet_id: betId ?? null,
        details: details ?? null,
    }]);
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
        const { userId } = useUserStore.getState();

        const { data, error } = await supabase
            .from('bets')
            .insert([{
                question: betData.question,
                category: betData.category,
                options: betData.options,
                display_at: betData.displayAt.toISOString(),
                expires_at: betData.expiresAt.toISOString(),
                is_blurred: betData.isBlurred,
                status: 'OPEN'
            }])
            .select();

        if (error) {
            console.error("Erreur ajout pari:", error.message);
            return;
        }

        if (data && data[0]) {
            const bet = data[0] as Bet;
            set((state) => ({
                activeBets: [bet, ...state.activeBets]
            }));

            const notifTitle = "🎰 NOUVEAU PARI !";
            const notifMessage = betData.question;

            // Notifier tous les utilisateurs dans user_notifications
            supabase.rpc('notify_new_bet', {
                p_bet_id: bet.id,
                p_question: notifMessage,
            }).then(() => {});

            // Log admin
            logAudit('BET_CREATED', 'admin', { question: betData.question }, bet.id, userId);

            // Push
            supabase.functions.invoke('send-push', {
                body: { title: notifTitle, body: notifMessage },
            }).catch(() => {});
        }
    },

    placeBet: async (betId, optionId, amount) => {
        const { userId } = useUserStore.getState();

        if (!userId) {
            throw new Error("Utilisateur non connecté.");
        }

        // RPC : p_amount est maintenant le TOTAL souhaité
        const { data, error } = await supabase.rpc('place_bet', {
            p_bet_id: betId,
            p_user_id: userId,
            p_option_id: optionId,
            p_amount: amount,
        });

        if (error) {
            throw new Error(error.message);
        }

        if (!data?.ok) {
            throw new Error(data?.error ?? "Impossible de placer la mise.");
        }

        const action = data.action === 'increased' ? 'BET_INCREASED' : 'BET_PLACED';
        const { activeBets } = get();
        const bet = activeBets.find(b => b.id === betId);
        const option = bet?.options.find(o => o.id === optionId);

        // Log audit (fire-and-forget)
        logAudit(action, 'bet', {
            bet_question: bet?.question,
            option: option?.label,
            amount,
            delta: data.delta,
        }, betId, userId);

        // Mise à jour du state local
        const existingBet = get().allUserBets.find(
            ub => ub.bet_id === betId && ub.user_id === userId && ub.option_id === optionId
        );

        if (existingBet) {
            // Mise à jour du montant total dans le state
            set((state) => ({
                allUserBets: state.allUserBets.map(ub =>
                    ub.id === existingBet.id ? { ...ub, amount } : ub
                ),
            }));
        } else {
            const newBet: UserBet = {
                id: data.user_bet_id,
                user_id: userId,
                bet_id: betId,
                option_id: optionId,
                amount,
                created_at: new Date().toISOString(),
            };
            set((state) => ({
                allUserBets: [...state.allUserBets, newBet]
            }));
        }
    },

    deleteBet: async (betId: string): Promise<void> => {
        const { userId } = useUserStore.getState();
        const { activeBets } = get();
        const bet = activeBets.find(b => b.id === betId);

        // RPC atomique : rembourse + supprime
        const { data, error } = await supabase.rpc('refund_and_delete_bet', { p_bet_id: betId });

        if (!error) {
            set((state) => ({
                activeBets: state.activeBets.filter((b) => b.id !== betId),
                allUserBets: state.allUserBets.filter((ub) => ub.bet_id !== betId),
            }));

            // Log audit
            logAudit('BET_DELETED', 'admin', {
                question: bet?.question,
                refunded_count: data?.refunded_count ?? 0,
            }, betId, userId);
        }
    },

    resolveBet: async (betId: string, winningOptionId: string) => {
        const { activeBets } = get();
        const bet = activeBets.find(b => b.id === betId);
        if (!bet) return;

        const winningOption = bet.options.find((o) => o.id === winningOptionId);
        if (!winningOption) return;

        const { userId } = useUserStore.getState();

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
        const winnerIds: string[] = [];
        const loserIds: string[] = [];

        for (const ub of userBets) {
            if (ub.option_id === winningOptionId) {
                const gain = Math.floor(ub.amount * winningOption.odds);
                const { data: userProfile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', ub.user_id)
                    .single();

                const newClopes = (userProfile?.clopes || 0) + gain;
                if (!profileError) {
                    await supabase.from('profiles').update({ clopes: newClopes }).eq('id', ub.user_id);
                    winnerIds.push(ub.user_id);
                }
            } else {
                loserIds.push(ub.user_id);
            }
        }

        // 4. Update local
        set((state) => ({
            activeBets: state.activeBets.map((b) =>
                b.id === betId ? { ...b, status: 'SETTLED', winning_option_id: winningOptionId } : b
            )
        }));

        // 5. Log audit
        logAudit('BET_RESOLVED', 'admin', { winning_option: winningOption.label, question: bet.question, winners: winnerIds.length, losers: loserIds.length }, betId, userId);

        // 6. Notifications in-app pour participants
        supabase.rpc('notify_bet_resolved', {
            p_bet_id: betId,
            p_winning_option_label: winningOption.label,
            p_question: bet.question,
        }).then(() => {});

        // 7. Vérifier les succès
        for (const winnerId of winnerIds) {
            supabase.rpc('check_achievements', { p_user_id: winnerId }).then(() => {});
        }

        // 8. Push ciblées
        if (winnerIds.length > 0) {
            supabase.functions.invoke('send-push', {
                body: { title: '🏆 Tu as gagné !', body: `Tu remportes des clopes sur "${bet.question}" !`, user_ids: winnerIds },
            }).catch(() => {});
        }
        if (loserIds.length > 0) {
            supabase.functions.invoke('send-push', {
                body: { title: '💸 Perdu cette fois...', body: `Pas de bol sur "${bet.question}".`, user_ids: loserIds },
            }).catch(() => {});
        }
    },
}));
