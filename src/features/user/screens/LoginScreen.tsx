import React, { useState } from 'react';
import {View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert, Platform} from 'react-native';
import { useUserStore } from '../store/useUserStore';

export default function LoginScreen() {
    const { checkUser, logIn, createUser } = useUserStore();

    const [step, setStep] = useState<'username' | 'password'>('username');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Étape 1 : Vérifier si l'utilisateur existe
    const handleNext = async () => {
        if (!username) return;
        const { exists } = await checkUser(username);
        if (exists) {
            setStep('password');
        } else {
            setShowRegisterModal(true);
        }
    };

    // Étape 2 : Connexion
    const handleLogin = async () => {
        setErrorMsg(null); // On reset l'erreur à chaque tentative

        try {
            await logIn(username, password);
            // Si ça réussit, le store mettra à jour l'utilisateur et l'app changera d'écran
        } catch (e: any) {
            // Supabase renvoie souvent "Invalid login credentials"
            if (e.message === 'Invalid login credentials') {
                setErrorMsg(`Mot de passe incorrect, ${username} !❌`);
            } else {
                setErrorMsg("Erreur de connexion. Réessaie.");
            }
            console.error(e.message);
        }
    };

    // Étape 3 : Création de compte
    const handleRegister = async () => {
        if (password !== confirmPass) {
            Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
            return;
        }
        try {
            await createUser(username, password);
            setShowRegisterModal(false);
        } catch (e) {
            Alert.alert("Erreur", "Impossible de créer le compte");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.emoji}>🚬</Text>
                <Text style={styles.title}>JENTAPP</Text>
                <Text style={styles.subtitle}>Un p'tit join dans le garage ?</Text>
            </View>

            {step === 'username' ? (
                <View style={styles.form}>
                    <Text style={styles.label}>Ton Blaze</Text>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Ex: El_Jenta"
                        placeholderTextColor="#444"
                    />
                    <TouchableOpacity
                        style={[styles.button, username.length < 2 && styles.buttonDisabled, Platform.OS === 'web' && { cursor: 'pointer' }]}
                        disabled={username.length < 2}
                        onPress={handleNext}>
                        <Text style={styles.btnText}>CONTINUER</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.card}>
                    <Text style={styles.label}>Mot de passe pour {username}</Text>

                    <TextInput
                        style={[styles.input, errorMsg && { borderColor: '#E50914' }]} // Bordure rouge si erreur
                        secureTextEntry
                        value={password}
                        onChangeText={(t) => {
                            setPassword(t);
                            if(errorMsg) setErrorMsg(null); // On efface l'erreur quand il recommence à taper
                        }}
                        placeholder="••••••"
                        placeholderTextColor="#444"
                    />

                    {/* LE MESSAGE D'ERREUR */}
                    {errorMsg && (
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    )}

                    <TouchableOpacity style={styles.btn} onPress={handleLogin}>
                        <Text style={styles.btnText}>SE CONNECTER</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setStep('username')}>
                        <Text style={{color: '#666', marginTop: 15, textAlign: 'center'}}>Changer de pseudo</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* MODALE DE CRÉATION */}
            <Modal visible={showRegisterModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Nouveau Jenta ?</Text>
                        <Text style={styles.modalDesc}>Le pseudo "{username}" est libre. Créer un compte ?</Text>

                        <TextInput
                            style={styles.input}
                            secureTextEntry
                            placeholder="Choisir un mot de passe"
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TextInput
                            style={styles.input}
                            secureTextEntry
                            placeholder="Confirmer le mot de passe"
                            value={confirmPass}
                            onChangeText={setConfirmPass}
                        />

                        <TouchableOpacity style={styles.btn} onPress={handleRegister}>
                            <Text style={styles.btnText}>REJOINDRE LE GARAGE</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                            <Text style={{color: '#666', marginTop: 15}}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 20 },
    logo: { color: '#FFD700', fontSize: 48, fontWeight: '900', textAlign: 'center', marginBottom: 40 },
    card: { backgroundColor: '#111', padding: 25, borderRadius: 25, borderWidth: 1, borderColor: '#222' },
    btn: { backgroundColor: '#FFD700', padding: 18, borderRadius: 15, alignItems: 'center' },
    btnText: { color: '#000', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#111', padding: 30, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: '#FFD700' },
    modalTitle: { color: '#FFD700', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    modalDesc: { color: '#ccc', textAlign: 'center', marginBottom: 20 },
    errorText: {
        color: '#FF4444',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        padding: 8,
        borderRadius: 8,
        overflow: 'hidden'
    },
    // container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 30 },
    // title: { color: '#FFD700', fontSize: 42, fontWeight: '900', marginBottom: 10 },
    // subtitle: { color: '#AAA', marginBottom: 30 },
    // input: { backgroundColor: '#111', width: '100%', padding: 20, borderRadius: 15, color: '#fff', fontSize: 18, borderWidth: 1, borderColor: '#333' },
    // button: { backgroundColor: '#FFD700', marginTop: 20, width: '100%', padding: 20, borderRadius: 15, alignItems: 'center' },
    // buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

    inner: { flex: 1, justifyContent: 'center', padding: 30 },
    header: { alignItems: 'center', marginBottom: 50 },
    emoji: { fontSize: 60, marginBottom: 10 },
    title: { color: '#FFD700', fontSize: 48, fontWeight: '900', letterSpacing: -2 },
    subtitle: { color: '#666', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    form: { width: '100%', justifyContent: 'center', padding: 30},
    label: { color: '#FFD700', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 2 },
    input: {
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 20,
        color: '#fff',
        fontSize: 18,
        borderWidth: 1,
        borderColor: '#222',
        marginBottom: 20
    },
    button: {
        backgroundColor: '#FFD700',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#FFD700',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5
    },
    buttonDisabled: { backgroundColor: '#333', shadowOpacity: 0 },
    buttonText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 }
});