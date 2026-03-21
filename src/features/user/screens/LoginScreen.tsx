import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform, Alert
} from 'react-native';
import { useUserStore } from '../store/useUserStore';

export default function LoginScreen() {
    const [name, setName] = useState('');
    const checkUser = useUserStore((state) => state.checkUser);
    const createUser = useUserStore((state) => state.createUser);

    const handleJoin = async () => {
        const blaze = name.trim();
        if (blaze.length < 2) {
            alert("Ton blaze est trop court, Jenta !");
            return;
        }

        const result = await checkUser(blaze);

        if (!result.exists) {
            // SI LE USER N'EXISTE PAS -> CONFIRMATION
            Alert.alert(
                "Nouveau Jenta détecté ! 🤨",
                `Le blaze "${blaze}" n'existe pas. Tu veux créer un nouveau compte avec 50 clopes ?`,
                [
                    { text: "Nan, j'me suis trompé", style: "cancel" },
                    {
                        text: "Ouais, c'est parti !",
                        onPress: () => createUser(blaze)
                    }
                ]
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.emoji}>🚬</Text>
                <Text style={styles.title}>JENTAPP</Text>
                <Text style={styles.subtitle}>Un p'tit join dans le garage ?</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>ENTRE TON BLAZE</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: JentaLeSang"
                    placeholderTextColor="#444"
                    value={name}
                    onChangeText={setName}
                    autoCorrect={false}
                    autoCapitalize="none"
                />

                <TouchableOpacity
                    style={[styles.button, name.length < 2 && styles.buttonDisabled]}
                    onPress={handleJoin}
                    disabled={name.length < 2}
                >
                    <Text style={styles.buttonText}>REJOINDRE LA SESSION</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({

    container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 30 },
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