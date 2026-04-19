// src/features/user/screens/ResetPasswordScreen.tsx
// Affiché quand l'utilisateur clique sur le lien de réinitialisation
// reçu par email (deep link /reset-password#access_token=...)

import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, Platform
} from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    onSuccess: () => void; // Appelé après reset réussi → retour au login
}

export default function ResetPasswordScreen({ onSuccess }: Props) {
    const { updatePassword } = useUserStore();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const strength = getPasswordStrength(password);

    const handleReset = async () => {
        setError(null);
        if (password.length < 6) {
            setError('Le mot de passe doit faire au moins 6 caractères.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        setLoading(true);
        try {
            await updatePassword(password);
            setSuccess(true);
            setTimeout(onSuccess, 2000);
        } catch (e: any) {
            setError(e.message ?? 'Erreur lors de la réinitialisation.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <View style={styles.container}>
                <Text style={styles.successEmoji}>✅</Text>
                <Text style={styles.successTitle}>Mot de passe mis à jour !</Text>
                <Text style={styles.successSub}>Redirection en cours…</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.emoji}>🔑</Text>
                <Text style={styles.title}>NOUVEAU MOT DE PASSE</Text>
                <Text style={styles.subtitle}>Choisis quelque chose que t'oublieras quand même</Text>
            </View>

            <View style={styles.card}>
                {/* Nouveau mot de passe */}
                <Text style={styles.label}>NOUVEAU MOT DE PASSE</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={[styles.input, styles.inputFlex, error && password.length < 6 && styles.inputError]}
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={(t) => { setPassword(t); setError(null); }}
                        placeholder="••••••••"
                        placeholderTextColor="#444"
                        autoFocus
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* Indicateur de force */}
                {password.length > 0 && (
                    <View style={styles.strengthRow}>
                        {[0, 1, 2].map((i) => (
                            <View
                                key={i}
                                style={[
                                    styles.strengthBar,
                                    i < strength.level && { backgroundColor: strength.color }
                                ]}
                            />
                        ))}
                        <Text style={[styles.strengthLabel, { color: strength.color }]}>
                            {strength.label}
                        </Text>
                    </View>
                )}

                {/* Confirmation */}
                <Text style={[styles.label, { marginTop: 16 }]}>CONFIRMER</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={[
                            styles.input, styles.inputFlex,
                            confirmPassword.length > 0 && password !== confirmPassword && styles.inputError
                        ]}
                        secureTextEntry={!showPassword}
                        value={confirmPassword}
                        onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                        placeholder="••••••••"
                        placeholderTextColor="#444"
                        onSubmitEditing={handleReset}
                    />
                    {confirmPassword.length > 0 && password === confirmPassword && (
                        <Ionicons name="checkmark-circle" size={22} color="#4CAF50" style={styles.checkIcon} />
                    )}
                </View>

                {/* Message d'erreur */}
                {error && <Text style={styles.errorText}>{error}</Text>}

                {/* Bouton */}
                <TouchableOpacity
                    style={[styles.btn, (loading || password.length < 6) && styles.btnDisabled]}
                    onPress={handleReset}
                    disabled={loading || password.length < 6}
                >
                    {loading
                        ? <ActivityIndicator color="#000" />
                        : <Text style={styles.btnText}>CHANGER LE MOT DE PASSE</Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Calcul de la force du mot de passe ────────────────────
function getPasswordStrength(password: string): { level: number; label: string; color: string } {
    if (password.length === 0) return { level: 0, label: '', color: '#333' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password) || /[A-Z]/.test(password)) score++;

    if (score === 1) return { level: 1, label: 'Faible', color: '#E50914' };
    if (score === 2) return { level: 2, label: 'Moyen', color: '#FFD700' };
    return { level: 3, label: 'Fort 💪', color: '#4CAF50' };
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    emoji: { fontSize: 56, marginBottom: 12 },
    title: { color: '#FFD700', fontSize: 26, fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
    subtitle: { color: '#555', fontSize: 13, marginTop: 8, textAlign: 'center' },
    card: { backgroundColor: '#111', padding: 28, borderRadius: 28, borderWidth: 1, borderColor: '#222' },
    label: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    inputFlex: { flex: 1, marginBottom: 0 },
    input: {
        backgroundColor: '#0a0a0a',
        padding: 18,
        borderRadius: 16,
        color: '#fff',
        fontSize: 18,
        borderWidth: 1,
        borderColor: '#222',
        marginBottom: 16,
    },
    inputError: { borderColor: '#E50914' },
    eyeBtn: { position: 'absolute', right: 16 },
    checkIcon: { position: 'absolute', right: 16 },
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#222' },
    strengthLabel: { fontSize: 11, fontWeight: '700', width: 55 },
    errorText: {
        color: '#FF4444', fontSize: 13, fontWeight: '600',
        backgroundColor: 'rgba(255,68,68,0.1)', padding: 10,
        borderRadius: 10, textAlign: 'center', marginBottom: 16,
    },
    btn: {
        backgroundColor: '#FFD700', padding: 20, borderRadius: 18,
        alignItems: 'center', marginTop: 8,
        shadowColor: '#FFD700', shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
    },
    btnDisabled: { backgroundColor: '#2a2a2a', shadowOpacity: 0 },
    btnText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
    successEmoji: { fontSize: 72, textAlign: 'center', marginBottom: 20 },
    successTitle: { color: '#4CAF50', fontSize: 24, fontWeight: '900', textAlign: 'center' },
    successSub: { color: '#666', textAlign: 'center', marginTop: 10 },
});
