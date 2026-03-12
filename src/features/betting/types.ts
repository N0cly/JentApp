export interface BetOption {
    id: string;
    label: string;
    odds: number; // La cote (ex: 2.0)
}

export interface Bet {
    id: string;
    question: string;
    options: BetOption[];
    status: 'OPEN' | 'CLOSED' | 'SETTLED'; // Ouvert, Fermé (on ne peut plus parier), Terminé (résultats payés)
    expiresAt: Date;
    category: 'DAILY' | 'SPECIAL' | 'RECURRENT';
}

export interface UserBet {
    betId: string;
    optionId: string;
    amount: number; // Montant misé en clopes
}