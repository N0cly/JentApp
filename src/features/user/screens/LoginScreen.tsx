// src/features/user/screens/LoginScreen.tsx
import React, { useRef, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Modal, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { Ionicons } from '@expo/vector-icons';

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

export default function LoginScreen() {
    const { checkUser, logIn, createUser, sendPasswordReset } = useUserStore();

    // ── Étapes du flux principal ─────────────────────────
    const [step, setStep] = useState<'username' | 'password'>('username');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // ── Modale d'inscription ─────────────────────────────
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirm, setRegConfirm] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [regError, setRegError] = useState<string | null>(null);
    const [regLoading, setRegLoading] = useState(false);

    // ── Modale mot de passe oublié ────────────────────────
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotUsername, setForgotUsername] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotStatus, setForgotStatus] = useState<'idle' | 'sent' | 'error'>('idle');
    const [forgotError, setForgotError] = useState<string | null>(null);

    const passwordInputRef = useRef<TextInput>(null);
    const regStrength = getPasswordStrength(regPassword);

    // ── Étape 1 : vérifier si le pseudo existe ────────────
    const handleNext = async () => {
        if (!username.trim()) return;
        setLoading(true);
        const { exists } = await checkUser(username.trim());
        setLoading(false);
        if (exists) {
            setStep('password');
            setTimeout(() => passwordInputRef.current?.focus(), 100);
        } else {
            setForgotUsername(username.trim());
            setShowRegisterModal(true);
        }
    };

    // ── Étape 2 : connexion ───────────────────────────────
    const handleLogin = async () => {
        setErrorMsg(null);
        setLoading(true);
        try {
            await logIn(username.trim(), password);
        } catch (e: any) {
            if (e.message?.includes('Invalid login credentials') || e.message?.includes('invalid_credentials')) {
                setErrorMsg(`Mot de passe incorrect, ${username} ! ❌`);
            } else {
                setErrorMsg(e.message ?? 'Erreur de connexion. Réessaie.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Création de compte ────────────────────────────────
    const handleRegister = async () => {
        setRegError(null);
        if (!regEmail.trim() || !regEmail.includes('@')) {
            setRegError('Adresse e-mail invalide.');
            return;
        }
        if (regPassword.length < 6) {
            setRegError('Le mot de passe doit faire au moins 6 caractères.');
            return;
        }
        if (regPassword !== regConfirm) {
            setRegError('Les mots de passe ne correspondent pas.');
            return;
        }
        setRegLoading(true);
        try {
            await createUser(username.trim(), regEmail.trim(), regPassword);
            setShowRegisterModal(false);
        } catch (e: any) {
            setRegError(e.message ?? 'Impossible de créer le compte.');
        } finally {
            setRegLoading(false);
        }
    };

    // ── Mot de passe oublié ───────────────────────────────
    const handleForgotPassword = async () => {
        setForgotError(null);
        if (!forgotUsername.trim()) return;
        setForgotLoading(true);
        try {
            await sendPasswordReset(forgotUsername.trim());
            setForgotStatus('sent');
        } catch (e: any) {
            setForgotStatus('error');
            setForgotError(e.message ?? 'Erreur lors de l\'envoi.');
        } finally {
            setForgotLoading(false);
        }
    };

    const closeForgot = () => {
        setShowForgotModal(false);
        setForgotStatus('idle');
        setForgotError(null);
        setForgotUsername(username);
    };

    // ─────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* HEADER */}
            <View style={styles.header}>
                <Text style={styles.emoji}>🚬</Text>
                <Text style={styles.title}>JENTAPP</Text>
                <Text style={styles.subtitle}>Un p'tit join dans le garage ?</Text>
            </View>

            {/* ── ÉTAPE 1 : PSEUDO ── */}
            {step === 'username' && (
                <View style={styles.form}>
                    <Text style={styles.label}>TON BLAZE</Text>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Ex: El_Jenta"
                        placeholderTextColor="#444"
                        autoCapitalize="none"
                        returnKeyType="next"
                        onSubmitEditing={handleNext}
                    />
                    <TouchableOpacity
                        style={[styles.button, (username.length < 2 || loading) && styles.buttonDisabled]}
                        disabled={username.length < 2 || loading}
                        onPress={handleNext}
                    >
                        {loading
                            ? <ActivityIndicator color="#000" />
                            : <Text style={styles.btnText}>CONTINUER →</Text>
                        }
                    </TouchableOpacity>
                </View>
            )}

            {/* ── ÉTAPE 2 : MOT DE PASSE ── */}
            {step === 'password' && (
                <View style={styles.card}>
                    <Text style={styles.label}>MOT DE PASSE POUR {username.toUpperCase()}</Text>

                    <View style={styles.inputRow}>
                        <TextInput
                            ref={passwordInputRef}
                            style={[styles.input, styles.inputFlex, errorMsg && styles.inputError]}
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={(t) => { setPassword(t); if (errorMsg) setErrorMsg(null); }}
                            placeholder="••••••"
                            placeholderTextColor="#444"
                            returnKeyType="done"
                            onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                    <TouchableOpacity
                        style={[styles.btn, (loading || !password) && styles.btnDisabled]}
                        onPress={handleLogin}
                        disabled={loading || !password}
                    >
                        {loading
                            ? <ActivityIndicator color="#000" />
                            : <Text style={styles.btnText}>SE CONNECTER</Text>
                        }
                    </TouchableOpacity>

                    {/* Actions secondaires */}
                    <View style={styles.secondaryActions}>
                        <TouchableOpacity onPress={() => { setStep('username'); setPassword(''); setErrorMsg(null); }}>
                            <Text style={styles.secondaryLink}>← Changer de pseudo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setForgotUsername(username); setShowForgotModal(true); }}>
                            <Text style={[styles.secondaryLink, { color: '#FFD700' }]}>Mot de passe oublié ?</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ══════════════════════════════════════════
                MODALE — INSCRIPTION
            ══════════════════════════════════════════ */}
            <Modal visible={showRegisterModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Nouveau Jenta ?</Text>
                        <Text style={styles.modalDesc}>
                            Le blaze <Text style={{ color: '#FFD700', fontWeight: '900' }}>"{username}"</Text> est libre. Crée ton compte !
                        </Text>

                        {/* Email */}
                        <Text style={styles.label}>TON EMAIL</Text>
                        <TextInput
                            style={[styles.input, regError && !regEmail.includes('@') && styles.inputError]}
                            placeholder="ton@email.com"
                            placeholderTextColor="#444"
                            value={regEmail}
                            onChangeText={(t) => { setRegEmail(t); setRegError(null); }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Text style={styles.emailHint}>📬 Sert uniquement à récupérer ton mot de passe</Text>

                        {/* Mot de passe */}
                        <Text style={[styles.label, { marginTop: 12 }]}>MOT DE PASSE</Text>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[styles.input, styles.inputFlex]}
                                secureTextEntry={!showRegPassword}
                                placeholder="Minimum 6 caractères"
                                placeholderTextColor="#444"
                                value={regPassword}
                                onChangeText={(t) => { setRegPassword(t); setRegError(null); }}
                            />
                            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowRegPassword(v => !v)}>
                                <Ionicons name={showRegPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Force du mot de passe */}
                        {regPassword.length > 0 && (
                            <View style={[styles.strengthRow, { marginBottom: 12 }]}>
                                {[0, 1, 2].map((i) => (
                                    <View
                                        key={i}
                                        style={[styles.strengthBar, i < regStrength.level && { backgroundColor: regStrength.color }]}
                                    />
                                ))}
                                <Text style={[styles.strengthLabel, { color: regStrength.color }]}>
                                    {regStrength.label}
                                </Text>
                            </View>
                        )}

                        {/* Confirmation */}
                        <Text style={styles.label}>CONFIRMER</Text>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[
                                    styles.input, styles.inputFlex,
                                    regConfirm.length > 0 && regPassword !== regConfirm && styles.inputError
                                ]}
                                secureTextEntry={!showRegPassword}
                                placeholder="••••••"
                                placeholderTextColor="#444"
                                value={regConfirm}
                                onChangeText={(t) => { setRegConfirm(t); setRegError(null); }}
                                onSubmitEditing={handleRegister}
                            />
                            {regConfirm.length > 0 && regPassword === regConfirm && (
                                <Ionicons name="checkmark-circle" size={22} color="#4CAF50" style={styles.checkIcon} />
                            )}
                        </View>

                        {regError && <Text style={styles.errorText}>{regError}</Text>}

                        <TouchableOpacity
                            style={[styles.btn, regLoading && styles.btnDisabled]}
                            onPress={handleRegister}
                            disabled={regLoading}
                        >
                            {regLoading
                                ? <ActivityIndicator color="#000" />
                                : <Text style={styles.btnText}>REJOINDRE LE GARAGE 🚬</Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => { setShowRegisterModal(false); setRegError(null); }} style={{ marginTop: 16 }}>
                            <Text style={styles.secondaryLink}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ══════════════════════════════════════════
                MODALE — MOT DE PASSE OUBLIÉ
            ══════════════════════════════════════════ */}
            <Modal visible={showForgotModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>

                        {forgotStatus === 'sent' ? (
                            // ── État : email envoyé ──
                            <>
                                <Text style={{ fontSize: 52, textAlign: 'center', marginBottom: 16 }}>📬</Text>
                                <Text style={styles.modalTitle}>Email envoyé !</Text>
                                <Text style={styles.modalDesc}>
                                    Vérifie ta boîte mail et clique sur le lien pour réinitialiser ton mot de passe.
                                </Text>
                                <Text style={styles.emailHint}>Pense à vérifier tes spams 🔍</Text>
                                <TouchableOpacity style={[styles.btn, { marginTop: 20 }]} onPress={closeForgot}>
                                    <Text style={styles.btnText}>OK SUPER</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            // ── État : formulaire ──
                            <>
                                <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>🔐</Text>
                                <Text style={styles.modalTitle}>Mot de passe oublié</Text>
                                <Text style={styles.modalDesc}>
                                    Saisis ton pseudo, on t'envoie un lien de réinitialisation sur ton email.
                                </Text>

                                <Text style={styles.label}>TON PSEUDO</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: El_Jenta"
                                    placeholderTextColor="#444"
                                    value={forgotUsername}
                                    onChangeText={(t) => { setForgotUsername(t); setForgotError(null); }}
                                    autoCapitalize="none"
                                    onSubmitEditing={handleForgotPassword}
                                />

                                {forgotError && <Text style={styles.errorText}>{forgotError}</Text>}

                                <TouchableOpacity
                                    style={[styles.btn, (forgotLoading || !forgotUsername.trim()) && styles.btnDisabled]}
                                    onPress={handleForgotPassword}
                                    disabled={forgotLoading || !forgotUsername.trim()}
                                >
                                    {forgotLoading
                                        ? <ActivityIndicator color="#000" />
                                        : <Text style={styles.btnText}>ENVOYER LE LIEN</Text>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity onPress={closeForgot} style={{ marginTop: 16 }}>
                                    <Text style={styles.secondaryLink}>Annuler</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 24 },

    header: { alignItems: 'center', marginBottom: 48 },
    emoji: { fontSize: 60, marginBottom: 8 },
    title: { color: '#FFD700', fontSize: 48, fontWeight: '900', letterSpacing: -2 },
    subtitle: { color: '#555', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 },

    form: { width: '100%' },
    card: { backgroundColor: '#111', padding: 28, borderRadius: 28, borderWidth: 1, borderColor: '#1e1e1e' },

    label: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },

    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
    inputFlex: { flex: 1, marginBottom: 16 },
    input: {
        backgroundColor: '#0d0d0d',
        padding: 18,
        borderRadius: 18,
        color: '#fff',
        fontSize: 17,
        borderWidth: 1,
        borderColor: '#1e1e1e',
        marginBottom: 16,
    },
    inputError: { borderColor: '#E50914' },
    eyeBtn: { position: 'absolute', right: 16, top: 0, bottom: 16, justifyContent: 'center' },
    checkIcon: { position: 'absolute', right: 16, top: 0, bottom: 16 },

    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8 },
    strengthBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#1e1e1e' },
    strengthLabel: { fontSize: 11, fontWeight: '700', width: 55 },

    errorText: {
        color: '#FF4444', fontSize: 13, fontWeight: '600',
        backgroundColor: 'rgba(255,68,68,0.08)', padding: 10,
        borderRadius: 10, textAlign: 'center', marginBottom: 14,
    },
    emailHint: { color: '#444', fontSize: 11, marginTop: -10, marginBottom: 14, textAlign: 'center' },

    button: {
        backgroundColor: '#FFD700', padding: 20, borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#FFD700', shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
    },
    buttonDisabled: { backgroundColor: '#1e1e1e', shadowOpacity: 0 },
    btn: {
        backgroundColor: '#FFD700', padding: 18, borderRadius: 18,
        alignItems: 'center', marginTop: 4,
        shadowColor: '#FFD700', shadowOpacity: 0.2, shadowRadius: 10, elevation: 3,
    },
    btnDisabled: { backgroundColor: '#1e1e1e', shadowOpacity: 0 },
    btnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

    secondaryActions: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: 18,
    },
    secondaryLink: { color: '#555', fontSize: 13, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 20 },
    modalContent: {
        backgroundColor: '#111', padding: 28, borderRadius: 28,
        borderWidth: 1, borderColor: '#FFD700',
    },
    modalTitle: { color: '#FFD700', fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
    modalDesc: { color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
});
