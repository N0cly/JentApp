// src/features/user/store/useUserStore.ts
import { create } from 'zustand';
import { breakdownBalance, WalletBreakdown } from '../../economy/utils/converter';

interface UserState {
    username: string;
    clopesBalance: number;
    breakdown: WalletBreakdown; // On stocke la répartition ici

    // Actions
    addClopes: (amount: number) => void;
    removeClopes: (amount: number) => void;
    setBalance: (amount: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
    username: "Jenta-Master",
    clopesBalance: 47.5, // Exemple de test
    breakdown: breakdownBalance(47.5), // Initialisation

    setBalance: (amount) => set({
        clopesBalance: amount,
        breakdown: breakdownBalance(amount)
    }),

    addClopes: (amount) => set((state) => {
        const newTotal = state.clopesBalance + amount;
        return { clopesBalance: newTotal, breakdown: breakdownBalance(newTotal) };
    }),

    removeClopes: (amount) => set((state) => {
        const newTotal = Math.max(0, state.clopesBalance - amount);
        return { clopesBalance: newTotal, breakdown: breakdownBalance(newTotal) };
    }),
}));