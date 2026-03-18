export interface BetOption {
    id: string;
    label: string;
    odds: number;
}

export type BetCategory = 'SPECIAL' | 'DAILY' | 'BEFORE' | 'AFTER' | 'NIGHT';

export interface Bet {
    id: string;
    question: string;
    options: BetOption[];
    status: 'OPEN' | 'CLOSED' | 'SETTLED';
    category: BetCategory;
    displayAt?: Date;
    expiresAt: Date;
    isBlured: boolean;
    winningOptionId?: string;
}

export interface UserBet {
    betId: string;
    optionId: string;
    amount: number;
}