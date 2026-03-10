export const UNITS = {
    CLOPE: 1,
    JOINT: 5,
    PACKET: 20,
};

// On définit les règles de divisibilité
export const UNIT_RULES = {
    PACKET: { canDivide: false, minValue: 20 },
    JOINT: { canDivide: true, step: 0.5 }, // Demi-joint autorisé
    CLOPE: { canDivide: true, step: 0.5 }, // Demi-clope autorisée
};