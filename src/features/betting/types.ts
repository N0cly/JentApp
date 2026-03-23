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
    display_at?: Date;
    expires_at: Date;
    is_blured: boolean;
    winning_option_id?: string;
}

export interface UserBet {
    bet_id: string;
    option_id: string;
    amount: number;
}