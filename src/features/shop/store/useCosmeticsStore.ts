import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useUserStore } from '../../user/store/useUserStore';

export interface Cosmetic {
    id: string;
    type: 'avatar' | 'border' | 'badge' | 'other';
    name: string;
    description: string | null;
    image_url: string | null;
    price: number;
    currency: 'clopes' | 'joints' | 'packets';
    is_active: boolean;
    sort_order: number;
    tint_color: string | null; // used for border ring color
}

export interface Achievement {
    id: string;
    key: string;
    name: string;
    description: string;
    icon: string;
    is_hidden: boolean;
    requirement_type: string;
    requirement_value: number;
    reward_clopes: number;
    reward_cosmetic_id: string | null;
    sort_order: number;
}

export interface UserAchievement {
    id: string;
    user_id: string;
    achievement_id: string;
    unlocked_at: string;
    claimed: boolean;
    achievement?: Achievement;
}

interface CosmeticsState {
    allCosmetics: Cosmetic[];
    ownedCosmeticIds: string[];
    achievements: Achievement[];
    userAchievements: UserAchievement[];
    activeAvatarId: string | null;
    activeBorderId: string | null;

    fetchCosmetics: () => Promise<void>;
    fetchOwnedCosmetics: (userId: string) => Promise<void>;
    fetchAchievements: (userId: string) => Promise<void>;
    buyCosmetic: (cosmeticId: string) => Promise<{ ok: boolean; error?: string }>;
    equipCosmetic: (cosmeticId: string, type: 'avatar' | 'border') => Promise<void>;
    checkAchievements: () => Promise<string[]>;
    getEquippedBorderColor: () => string | null;
}

export const useCosmeticsStore = create<CosmeticsState>((set, get) => ({
    allCosmetics: [],
    ownedCosmeticIds: [],
    achievements: [],
    userAchievements: [],
    activeAvatarId: null,
    activeBorderId: null,

    fetchCosmetics: async () => {
        const { data } = await supabase
            .from('cosmetics')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');
        if (data) set({ allCosmetics: data as Cosmetic[] });
    },

    fetchOwnedCosmetics: async (userId: string) => {
        const { data: owned } = await supabase
            .from('user_cosmetics')
            .select('cosmetic_id')
            .eq('user_id', userId);

        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_cosmetic_id, border_cosmetic_id')
            .eq('id', userId)
            .single();

        if (owned) set({ ownedCosmeticIds: owned.map((o: any) => o.cosmetic_id) });
        if (profile) set({
            activeAvatarId: profile.avatar_cosmetic_id,
            activeBorderId: profile.border_cosmetic_id,
        });
    },

    fetchAchievements: async (userId: string) => {
        const [achievementsRes, userAchievementsRes] = await Promise.all([
            supabase.from('achievements').select('*').order('sort_order'),
            supabase.from('user_achievements').select('*, achievement:achievements(*)').eq('user_id', userId),
        ]);
        if (achievementsRes.data) set({ achievements: achievementsRes.data as Achievement[] });
        if (userAchievementsRes.data) set({ userAchievements: userAchievementsRes.data as UserAchievement[] });
    },

    buyCosmetic: async (cosmeticId: string) => {
        const { userId } = useUserStore.getState();
        if (!userId) return { ok: false, error: 'Non connecté.' };

        const { data, error } = await supabase.rpc('buy_cosmetic', {
            p_user_id: userId,
            p_cosmetic_id: cosmeticId,
        });

        if (error) return { ok: false, error: error.message };
        if (!data?.ok) return { ok: false, error: data?.error ?? 'Erreur inconnue.' };

        set(state => ({ ownedCosmeticIds: [...state.ownedCosmeticIds, cosmeticId] }));
        return { ok: true };
    },

    equipCosmetic: async (cosmeticId: string, type: 'avatar' | 'border') => {
        const { userId } = useUserStore.getState();
        if (!userId) return;

        const col = type === 'avatar' ? 'avatar_cosmetic_id' : 'border_cosmetic_id';
        const updatePayload: Record<string, any> = { [col]: cosmeticId };

        // Pour les avatars cosmétiques : mettre à jour avatar_url avec l'image du cosmétique
        if (type === 'avatar') {
            const cosmetic = get().allCosmetics.find(c => c.id === cosmeticId);
            if (cosmetic?.image_url) {
                updatePayload.avatar_url = cosmetic.image_url;
                // Mettre à jour aussi le store user
                useUserStore.getState().fetchProfile?.();
            }
        }

        await supabase.from('profiles').update(updatePayload).eq('id', userId);

        if (type === 'avatar') set({ activeAvatarId: cosmeticId });
        else set({ activeBorderId: cosmeticId });
    },

    checkAchievements: async () => {
        const { userId } = useUserStore.getState();
        if (!userId) return [];

        const { data } = await supabase.rpc('check_achievements', { p_user_id: userId });
        if (!data?.ok || !data.unlocked?.length) return [];

        await get().fetchAchievements(userId);
        return data.unlocked as string[];
    },

    getEquippedBorderColor: () => {
        const { activeBorderId, allCosmetics } = get();
        if (!activeBorderId) return null;
        const border = allCosmetics.find(c => c.id === activeBorderId);
        return border?.tint_color ?? null;
    },
}));
