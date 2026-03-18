// src/features/user/store/useUserStore.ts
import { create } from 'zustand';
import { UNITS } from '../../economy/constants/units';

interface Inventory {
    packets: number;
    joints: number;
    clopes: number;
}

interface UserState {
    username: string | null; // Le joueur actuel
    inventory: Inventory;

    // Actions de base
    setUsername: (name: string) => void;
    addClopes: (amount: number) => void;
    removeClopes: (amount: number) => void;

    // Actions de conversion manuelle
    convertToJoint: () => void;  // Consomme 5 clopes -> +1 Joint
    convertToPacket: () => void; // Consomme 20 clopes -> +1 Paquet
    breakPacket: () => void;     // Consomme 1 Paquet -> +20 Clopes
    breakJoint: () => void;      // Consomme 1 Joint -> +5 Clopes
}

export const useUserStore = create<UserState>((set) => ({
    username: null, // Au début, personne n'est connecté
    inventory: { packets: 0, joints: 0, clopes: 50 }, // On commence avec des clopes

    setUsername: (name) => set({ username: name }),

    addClopes: (amount) => set((state) => ({
        inventory: { ...state.inventory, clopes: state.inventory.clopes + amount }
    })),

    removeClopes: (amount) => set((state) => ({
        inventory: { ...state.inventory, clopes: Math.max(0, state.inventory.clopes - amount) }
    })),

    convertToJoint: () => set((state) => {
        if (state.inventory.clopes < UNITS.JOINT) return state; // Pas assez de clopes
        return {
            inventory: {
                ...state.inventory,
                clopes: state.inventory.clopes - UNITS.JOINT,
                joints: state.inventory.joints + 1
            }
        };
    }),

    convertToPacket: () => set((state) => {
        if (state.inventory.clopes < UNITS.PACKET) return state;
        return {
            inventory: {
                ...state.inventory,
                clopes: state.inventory.clopes - UNITS.PACKET,
                packets: state.inventory.packets + 1
            }
        };
    }),

    breakPacket: () => set((state) => {
        if (state.inventory.packets < 1) return state;
        return {
            inventory: {
                ...state.inventory,
                packets: state.inventory.packets - 1,
                clopes: state.inventory.clopes + UNITS.PACKET
            }
        };
    }),

    breakJoint: () => set((state) => {
        if (state.inventory.joints < 1) return state;
        return {
            inventory: {
                ...state.inventory,
                joints: state.inventory.joints - 1,
                clopes: state.inventory.clopes + UNITS.JOINT
            }
        };
    }),
}));