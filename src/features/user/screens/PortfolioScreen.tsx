// App.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {useUserStore} from "../store/useUserStore";

export default function PortfolioScreen() {
    const {
        logOut,
        inventory,
        addClopes,
        convertToJoint,
        convertToPacket,
        breakPacket,
        breakJoint
    } = useUserStore();
    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>JentApp</Text>

            <View style={styles.walletCard}>
                <Text style={styles.label}>Inventaire Personnel</Text>

                <View style={styles.inventoryRow}>
                    <View style={styles.itemBox}>
                        <Text style={styles.emoji}>📦</Text>
                        <Text style={styles.count}>{inventory.packets}</Text>
                        <Text style={styles.unit}>PACKETS</Text>
                    </View>
                    <View style={styles.itemBox}>
                        <Text style={styles.emoji}>🌿</Text>
                        <Text style={styles.count}>{inventory.joints}</Text>
                        <Text style={styles.unit}>JOINTS</Text>
                    </View>
                    <View style={styles.itemBox}>
                        <Text style={styles.emoji}>🚬</Text>
                        <Text style={styles.count}>{inventory.clopes}</Text>
                        <Text style={styles.unit}>CLOPES</Text>
                    </View>
                </View>

                {/*<View style={styles.craftContainer}>*/}
                {/*    <Text style={styles.sectionTitle}>LABORATOIRE DE CONVERSION</Text>*/}

                {/*    <View style={styles.buttonRow}>*/}
                {/*        <TouchableOpacity*/}
                {/*            style={[styles.craftBtn, inventory.clopes < 5 && styles.disabled]}*/}
                {/*            onPress={convertToJoint}*/}
                {/*            disabled={inventory.clopes < 5}*/}
                {/*        >*/}
                {/*            <Text style={styles.btnText}>FAIRE 1 JOINT</Text>*/}
                {/*        </TouchableOpacity>*/}

                {/*        <TouchableOpacity*/}
                {/*            style={[styles.craftBtn, inventory.clopes < 20 && styles.disabled]}*/}
                {/*            onPress={convertToPacket}*/}
                {/*            disabled={inventory.clopes < 20}*/}
                {/*        >*/}
                {/*            <Text style={styles.btnText}>FAIRE 1 PAQUET</Text>*/}
                {/*        </TouchableOpacity>*/}
                {/*    </View>*/}

                {/*    <View style={styles.buttonRow}>*/}
                {/*        <TouchableOpacity*/}
                {/*            style={[styles.breakBtn, inventory.joints < 1 && styles.disabled]}*/}
                {/*            onPress={breakJoint}*/}
                {/*        >*/}
                {/*            <Text style={styles.breakText}>CASSER JOINT</Text>*/}
                {/*        </TouchableOpacity>*/}
                {/*        <TouchableOpacity*/}
                {/*            style={[styles.breakBtn, inventory.packets < 1 && styles.disabled]}*/}
                {/*            onPress={breakPacket}*/}
                {/*        >*/}
                {/*            <Text style={styles.breakText}>OUVRIR PAQUET</Text>*/}
                {/*        </TouchableOpacity>*/}
                {/*    </View>*/}
                {/*</View>*/}
            </View>

            {/* Section simulation de gain (ex: résultat d'un pari) */}
            <View style={styles.testActions}>
                <TouchableOpacity style={styles.logout} onPress={() => logOut()}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>Log Out</Text>
                </TouchableOpacity>
            </View>

            <StatusBar style="light" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A', // Noir pur pour faire ressortir le verre
        alignItems: 'center',
        paddingTop: 10,
    },
    header: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -1,
        marginBottom: 25,
    },
    walletCard: {
        width: '92%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)', // Effet verre dépoli
        borderRadius: 35,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    label: {
        color: '#666',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 15,
    },
    inventoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 10,
    },
    itemBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 15,
        borderRadius: 20,
        width: '30%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emoji: { fontSize: 24, marginBottom: 5 },
    count: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    unit: { color: '#444', fontSize: 10, fontWeight: 'bold' },

    craftContainer: {
        width: '100%',
        marginTop: 25,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap:10,
    },
    sectionTitle: {
        color: '#888',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 15,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        // marginBottom: 12,
        gap: 10,
    },
    craftBtn: {
        flex: 1,
        backgroundColor: '#FFD700', // Or pour les conversions
        paddingVertical: 12,
        borderRadius: 15,
        alignItems: 'center',
    },
    breakBtn: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 12,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    btnText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 13,
    },
    breakText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
    disabled: {
        opacity: 0.2,
    },
    // Boutons de test pour simuler les gains de paris
    testActions: {
        marginTop: 30,
        flexDirection: 'row',
        gap: 10
    },
    testBtn: {
        backgroundColor: '#1DB954', // Vert Spotify pour les gains
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 50,
    },
    logout:{
        backgroundColor: '#E0245E', // Rouge pour le logout
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 50,
    }
});