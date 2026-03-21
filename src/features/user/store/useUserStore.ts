// src/features/user/store/useUserStore.ts
import { create } from 'zustand';
import { UNITS } from '../../economy/constants/units';
import { supabase } from "../../../lib/supabase";

interface Inventory {
    packets: number;
    joints: number;
    clopes: number;
}

interface UserState {
    userId: string | null;
    username: string | null;
    inventory: Inventory;

    checkUser: (name: string) => Promise<{ exists: boolean; data?: any }>;
    createUser: (name: string) => Promise<void>;

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
    inventory: { packets: 0, joints: 0, clopes: 50 },

    checkUser: async (name) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', name)
            .maybeSingle();

        if (data) {
            set({
                userId: data.id,
                username: data.username,
                inventory: {
                    packets: data.packets || 0,
                    joints: data.joints || 0,
                    clopes: data.clopes || 0,
                }
            });
            return { exists: true, data };
        }
        return { exists: false };
    },

    createUser: async (name) => {
        const { data, error } = await supabase
            .from('profiles')
            .insert([{ username: name, clopes: 50, joints: 0, packets: 0 }])
            .select()
            .single();

        if (error) {
            console.error("Erreur création : " + error.message);
            return;
        }

        if (data) {
            set({
                userId: data.id,
                username: data.username,
                inventory: { packets: 0, joints: 0, clopes: 50 }
            });
        }
    },

    addClopes: async (amount) => {
        const { userId, inventory } = get();
        if (!userId) return;

        const newClopes = inventory.clopes + amount;

        // Update Local
        set({ inventory: { ...inventory, clopes: newClopes } });

        // Update Cloud
        await supabase.from('profiles').update({ clopes: newClopes }).eq('id', userId);
    },

    removeClopes: async (amount) => {
        const { userId, inventory } = get();
        if (!userId) return;

        const newClopes = Math.max(0, inventory.clopes - amount);

        // Update Local
        set({ inventory: { ...inventory, clopes: newClopes } });

        // Update Cloud
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
        await supabase.from('profiles').update({
            clopes: newInv.clopes,
            joints: newInv.joints
        }).eq('id', userId);
    },
}));