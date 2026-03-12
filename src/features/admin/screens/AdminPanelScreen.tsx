import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';

export default function AdminPanelScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Jenta Control Center 🕹️</Text>
                <Text style={styles.subtitle}>Espace réservé à l'administrateur</Text>

                <TouchableOpacity style={styles.adminBtn}>
                    <Text style={styles.btnText}>Créer un nouveau Pari</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.adminBtn, {backgroundColor: '#444'}]}>
                    <Text style={styles.btnText}>Mettre en pause les paris</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    subtitle: { color: '#666', marginBottom: 40 },
    adminBtn: { width: '100%', backgroundColor: '#E50914', padding: 18, borderRadius: 15, marginBottom: 15, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});