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
    role: 'player' | 'admin' | 'super_admin' | null;
    inventory: Inventory;

    checkUser: (name: string) => Promise<{ exists: boolean; data?: any }>;
    createUser: (name: string, pass: string) => Promise<void>;
    logOut: () => void;
    logIn: (name: string, pass: string) => Promise<void>;
    _saveToStorage: (state: any) => Promise<void>;

    // AJOUTE CETTE LIGNE ICI :
    initStorage: () => Promise<void>;

    addClopes: (amount: number) => Promise<void>;
    removeClopes: (amount: number) => Promise<void>;
    convertToJoint: () => Promise<void>;
    convertToPacket: () => Promise<void>;
    breakPacket: () => Promise<void>;
    breakJoint: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
    userId: null,
    username: null,
    role: null,
    inventory: { packets: 0, joints: 0, clopes: 0 },

    // --- LOGIQUE DE SAUVEGARDE MANUELLE ---
    _saveToStorage: async (state: any) => {
        try {
            const data = JSON.stringify({
                userId: state.userId,
                username: state.username,
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

    createUser: async (name: string, pass: string) => {
        // On utilise un faux email pour Supabase Auth
        const fakeEmail = `${name.toLowerCase()}@jenta.app`;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: fakeEmail,
            password: pass,
        });

        if (authError) throw authError;

        // Le trigger Supabase (si configuré) créera le profil,
        // sinon on l'insère manuellement ici si besoin.
        const { data: profile } = await supabase
            .from('profiles')
            .update({ username: name }) // On s'assure que le pseudo est beau
            .eq('id', authData.user?.id)
            .select()
            .single();

        if (profile) {
            set({ userId: profile.id, username: profile.username, role: profile.role, inventory: { ... profile } });
        }
    },

    logIn: async (name: string, pass: string) => {
        const fakeEmail = `${name.toLowerCase()}@jenta.app`;
        const { data, error } = await supabase.auth.signInWithPassword({
            email: fakeEmail,
            password: pass,
        });

        if (error) throw error;

        // Récupérer les infos du profil
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profile) {
            const newState = {
                userId: profile.id,
                username: profile.username,
                role: profile.role,
                inventory: {
                    clopes: profile.clopes,
                    joints: profile.joints,
                    packets: profile.packets
                }
            };
            set(newState);
            get()._saveToStorage(newState);
        }
    },

    logOut: () => {
        set({ userId: null, username: null, role: null, inventory: { packets: 0, joints: 0, clopes: 0 } });
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
                // On met à jour le store avec les données récupérées
                set({
                    userId: parsed.userId,
                    username: parsed.username,
                    role: parsed.role,
                    inventory: parsed.inventory
                });
            }
        } catch (e) {
            console.error("Erreur init storage", e);
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

        // Update Local
        set({ inventory: { ...inventory, clopes: newClopes } });

        await get()._saveToStorage(get());
        await supabase.from('profiles').update({ clopes: newClopes }).eq('id', userId);
    },

    convertToJoint: async () => {
        const { userId, inventory } = get();
        if (!userId || inventory.clopes < UNITS.JOINT) return;

        const newInv = {
            ...inventory,
            clopes: inventory.clopes - UNITS.JOINT,
            joints: inventory.joints + 1
        };

        set({ inventory: newInv });
        await get()._saveToStorage(get());
        await supabase.from('profiles').update({
            clopes: newInv.clopes,
            joints: newInv.joints
        }).eq('id', userId);
    },

    convertToPacket: async () => {
        const { userId, inventory } = get();
        if (!userId || inventory.clopes < UNITS.PACKET) return;

        const newInv = {
            ...inventory,
            clopes: inventory.clopes - UNITS.PACKET,
            packets: inventory.packets + 1
        };

        set({ inventory: newInv });
        await get()._saveToStorage(get());

        await supabase.from('profiles').update({
            clopes: newInv.clopes,
            packets: newInv.packets
        }).eq('id', userId);
    },

    breakPacket: async () => {
        const { userId, inventory } = get();
        if (!userId || inventory.packets < 1) return;

        const newInv = {
            ...inventory,
            packets: inventory.packets - 1,
            clopes: inventory.clopes + UNITS.PACKET
        };

        set({ inventory: newInv });
        await get()._saveToStorage(get());

        await supabase.from('profiles').update({
            clopes: newInv.clopes,
            packets: newInv.packets
        }).eq('id', userId);
    },

    breakJoint: async () => {
        const { userId, inventory } = get();
        if (!userId || inventory.joints < 1) return;

        const newInv = {
            ...inventory,
            joints: inventory.joints - 1,
            clopes: inventory.clopes + UNITS.JOINT
        };

        set({ inventory: newInv });
        await get()._saveToStorage(get());

        await supabase.from('profiles').update({
            clopes: newInv.clopes,
            joints: newInv.joints
        }).eq('id', userId);
    },
}));