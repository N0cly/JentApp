import { UNITS } from '../constants/units';

export interface WalletBreakdown {
    packets: number;
    joints: number;
    clopes: number;
}

/**
 * Transforme un solde total de clopes en répartition Paquets / Joints / Clopes
 * Logique : On remplit d'abord les paquets entiers, puis les joints, puis le reste.
 */
export const breakdownBalance = (totalClopes: number): WalletBreakdown => {
    let remaining = totalClopes;

    // 1. Calcul des paquets (indivisibles)
    const packets = Math.floor(remaining / UNITS.PACKET);
    remaining -= packets * UNITS.PACKET;

    // 2. Calcul des joints (on garde les demi-joints si besoin)
    // On utilise Math.floor(x * 2) / 2 pour arrondir au 0.5 le plus proche
    const joints = Math.floor((remaining / UNITS.JOINT) * 2) / 2;
    remaining -= joints * UNITS.JOINT;

    // 3. Le reste en clopes (arrondi au 0.5)
    const clopes = Math.round(remaining * 2) / 2;

    return { packets, joints, clopes };
};

/**
 * Affiche le solde de manière stylée
 */
export const formatJentaBalance = (totalClopes: number): string => {
    const { packets, joints, clopes } = breakdownBalance(totalClopes);

    const parts = [];
    if (packets > 0) parts.push(`${packets} pqt${packets > 1 ? 's' : ''}`);
    if (joints > 0) parts.push(`${joints} j${joints > 1 ? 's' : ''}`);
    if (clopes > 0) parts.push(`${clopes} clope${clopes > 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(', ') : '0 clope';
};