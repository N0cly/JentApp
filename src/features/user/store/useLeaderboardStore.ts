import { create } from 'zustand';

interface LeaderboardUser {
    id: string;
    username: string;
    clopes: number;
    isMe?: boolean;
}

interface LeaderboardState {
    players: LeaderboardUser[];
    updatePlayerScore: (username: string, clopes: number) => void;
}

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
    // On simule quelques joueurs pour le test
    players: [
        { id: '1', username: 'Jenta_Le_King', clopes: 150 },
        { id: '2', username: 'Paco_Le_Fou', clopes: 85 },
        { id: '3', username: 'Mister_Clope', clopes: 42 },
        { id: '4', username: 'La_Dèche', clopes: 5 },
    ],

    updatePlayerScore: (username, clopes) => set((state) => ({
        players: state.players.map(p =>
            p.username === username ? { ...p, clopes } : p
        )
    })),
}));