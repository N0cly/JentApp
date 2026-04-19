// src/features/user/store/useUserStore.ts
import { create } from 'zustand';
import { UNITS } from '../../economy/constants/units';
import { supabase } from "../../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {Platform} from "react-native";

interface Inventory {
    packets: number;
    joints: number;
    clopes: number;
}

interface UserState {
    userId: string | null;
    username: string | null;
    email: string | null;
    role: 'player' | 'admin' | 'super_admin' | null;
    inventory: Inventory;

    checkUser: (name: string) => Promise<{ exists: boolean; data?: any }>;
    createUser: (name: string, email: string, pass: string) => Promise<void>;
    logOut: () => void;
    logIn: (name: string, pass: string) => Promise<void>;
    sendPasswordReset: (username: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    _saveToStorage: (state: any) => Promise<void>;

    initStorage: () => Promise<void>;
    fetchProfile: () => Promise<void>;

    addClopes: (amount: number) => Promise<void>;
    removeClopes: (amount: number) => Promise<void>;
    convertToJoint: () => Promise<void>;
    convertToPacket: () => Promise<void>;
    breakPacket: () => Promise<void>;
    breakJoint: () => Promise<void>;
}

// URL de redirection après clic sur le lien de réinitialisation
const getResetRedirectUrl = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return `${window.location.origin}/reset-password`;
    }
    return 'https://jentapp.vercel.app/reset-password';
};

export const useUserStore = create<UserState>((set, get) => ({
    userId: null,
    username: null,
    email: null,
    role: null,
    inventory: { packets: 0, joints: 0, clopes: 0 },

    // --- LOGIQUE DE SAUVEGARDE MANUELLE ---
    _saveToStorage: async (state: any) => {
        try {
            const data = JSON.stringify({
                userId: state.userId,
                username: state.username,
                email: state.email,
                role: state.role,
                inventory: state.inventory
            });
            if (Platform.OS === 'web') {
                localStorage.setItem('jenta-user-storage', data);
            } else {
                await AsyncStorage.setItem('jenta-user-storage', data);
            }
        } catch (e) { console.error("Erreur save storage", e); }
    },

    checkUser: async (name: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', name)
            .maybeSingle();

        return { exists: !!data };
    },

    // ── Création de compte avec vrai email ────────────────
    createUser: async (name: string, email: string, pass: string) => {
        const cleanEmail = email.toLowerCase().trim();

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: pass,
        });

        if (authError) throw authError;

        // Mettre à jour le profil avec username + email
        const { data: profile } = await supabase
            .from('profiles')
            .update({ username: name, email: cleanEmail })
            .eq('id', authData.user?.id)
            .select()
            .single();

        if (profile) {
            const newState = {
                userId: profile.id,
                username: profile.username,
                email: profile.email,
                role: profile.role,
                inventory: {
                    clopes: profile.clopes ?? 0,
                    joints: profile.joints ?? 0,
                    packets: profile.packets ?? 0,
                }
            };
            set(newState);
            get()._saveToStorage(newState);
        }
    },

    // ── Connexion (compatible anciens comptes fake email) ──
    logIn: async (name: string, pass: string) => {
        // Récupérer le profil pour avoir le vrai email
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', name)
            .single();

        if (profileError || !profile) throw new Error('Utilisateur introuvable');

        // Fallback sur fake email pour les anciens comptes sans email réel
        const loginEmail = profile.email ?? `${name.toLowerCase()}@jenta.app`;

        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: pass,
        });

        if (error) throw error;

        const newState = {
            userId: profile.id,
            username: profile.username,
            email: profile.email ?? null,
            role: profile.role,
            inventory: {
                clopes: profile.clopes ?? 0,
                joints: profile.joints ?? 0,
                packets: profile.packets ?? 0,
            }
        };
        set(newState);
        get()._saveToStorage(newState);
    },

    // ── Envoi du lien de réinitialisation par email ───────
    sendPasswordReset: async (username: string) => {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', username)
            .single();

        if (error || !profile) throw new Error('Aucun compte trouvé pour ce pseudo.');
        if (!profile.email) throw new Error('Ce compte n\'a pas d\'email enregistré.\nContacte un admin pour récupérer ton accès.');

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            profile.email,
            { redirectTo: getResetRedirectUrl() }
        );

        if (resetError) throw resetError;
    },

    // ── Mise à jour du mot de passe après reset ───────────
    updatePassword: async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    },

    logOut: () => {
        set({ userId: null, username: null, email: null, role: null, inventory: { packets: 0, joints: 0, clopes: 0 } });
        supabase.auth.signOut();
        if (Platform.OS === 'web') localStorage.removeItem('jenta-user-storage');
        else AsyncStorage.removeItem('jenta-user-storage');
    },

    initStorage: async () => {
        try {
            const saved = Platform.OS === 'web'
                ? localStorage.getItem('jenta-user-storage')
                : await AsyncStorage.getItem('jenta-user-storage');

            if (saved) {
                const parsed = JSON.parse(saved);
                set({
                    userId: parsed.userId,
                    username: parsed.username,
                    email: parsed.email ?? null,
                    role: parsed.role,
                    inventory: parsed.inventory
                });
            }
        } catch (e) {
            console.error("Erreur init storage", e);
        }
    },

    fetchProfile: async () => {
        const { userId } = get();
        if (!userId) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            set({
                inventory: {
                    clopes: data.clopes ?? 0,
                    joints: data.joints ?? 0,
                    packets: data.packets ?? 0,
                }
            });
            get()._saveToStorage(get());
        }
    },

    addClopes: async (amount) => {
        const { userId, inventory } = get();
        if (!userId) return;
        const newClopes = inventory.clopes + amount;
        set({ inventory: { ...inventory, clopes: newClopes } });
        await get()._saveToStorage(get());
        await supabase.from('profiles').update({ clopes: newClopes }).eq('id', userId);
    },

    removeClopes: async (amount) => {
        const { userId, inventory } = get();
        if (!userId) return;
        const newClopes = Math.max(0, inventory.clopes - amount);
        set({ inventory: { ...inventory, clopes: newClopes } });
        await get()._saveToStorage(get());
        await supabase.from('profiles').update({ clopes: newClopes }).eq('id', userId);
    },

    convertToJoint: async () => {
        const { userId, inventory } = get();
        if (!userId || inventory.clopes < UNITS.JOINT) return;
        const newInv = { ...inventory, clopes: inventory.clopes - UNITS.JOINT, joints: inventory.joints + 1 };
        set({ inventory: newInv });
        await get()._saveToStorage(get());
        await supabase.from('profiles').update({ clopes: newInv.clopes, joints: newInv.joints }).eq('id', userId);
    },

    convertToPacket: async () => {
        const { userId, inventory } = get();
        if (!userId || inventory.clopes < UNITS.PACKET) return;
        const newInv = { ...inventory, clopes: inventory.clopes - UNITS.PACKET, packets: inventory.packets + 1 };
        set({ inventory: newInv });
        await get()._saveToStorage(get());
        await supabase.from('profiles').update({ clopes: newInv.clopes, packets: newInv.packets }).eq('id', userId);
    },

    breakPacket: async () => {
        const { userId, inventory } = get();
        if (!userId || inventory.packets < 1) return;
        const newInv = { ...inventory, packets: inventory.packets - 1, clopes: inventory.clopes + UNITS.PACKET };
        set({ inventory: newInv });
        await get()._saveToStorage(get());
        await supabase.from('profiles').update({ clopes: newInv.clopes, packets: newInv.packets }).eq('id', userId);
    },

    breakJoint: async () => {
        const { userId, inventory } = get();
        if (!userId || inventory.joints < 1) return;
        const newInv = { ...inventory, joints: inventory.joints - 1, clopes: inventory.clopes + UNITS.JOINT };
        set({ inventory: newInv });
        await get()._saveToStorage(get());
        await supabase.from('profiles').update({ clopes: newInv.clopes, joints: newInv.joints }).eq('id', userId);
    },
}));
