// src/features/shop/screens/ShopScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Modal, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCosmeticsStore, Cosmetic } from '../store/useCosmeticsStore';
import { useUserStore } from '../../user/store/useUserStore';
import { useToast } from '../../../contexts/ToastContext';

const CURRENCY_EMOJI: Record<string, string> = {
    clopes: '🚬',
    joints: '🌿',
    packets: '📦',
};

function CosmeticCard({
    item, isOwned, isEquipped, onBuy, onEquip,
}: {
    item: Cosmetic;
    isOwned: boolean;
    isEquipped: boolean;
    onBuy: (item: Cosmetic) => void;
    onEquip: (item: Cosmetic) => void;
}) {
    const fallbackEmoji = item.type === 'avatar' ? '🧑' : item.type === 'border' ? '🖼️' : '🏅';
    return (
        <View style={[styles.card, isEquipped && styles.cardEquipped]}>
            <View style={styles.cardIcon}>
                {item.image_url ? (
                    item.type === 'border' ? (
                        /* Aperçu bordure : anneau coloré autour d'un avatar vide */
                        <View style={{
                            width: 64, height: 64, borderRadius: 32,
                            borderWidth: 4,
                            borderColor: item.tint_color ?? '#888',
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: '#111',
                        }}>
                            <Image source={{ uri: item.image_url }} style={{ width: 56, height: 56, borderRadius: 28 }} resizeMode="cover" />
                        </View>
                    ) : (
                        <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
                    )
                ) : item.type === 'border' && item.tint_color ? (
                    <View style={{
                        width: 64, height: 64, borderRadius: 32,
                        borderWidth: 4, borderColor: item.tint_color,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: '#222',
                    }}>
                        <Text style={{ fontSize: 24 }}>👤</Text>
                    </View>
                ) : (
                    <Text style={{ fontSize: 48 }}>{fallbackEmoji}</Text>
                )}
                {isEquipped && (
                    <View style={styles.equippedBadge}>
                        <Text style={styles.equippedText}>ÉQUIPÉ</Text>
                    </View>
                )}
            </View>
            <Text style={styles.cardName}>{item.name}</Text>
            {item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}

            {isOwned ? (
                <TouchableOpacity
                    style={[styles.cardBtn, isEquipped && styles.cardBtnEquipped]}
                    onPress={() => !isEquipped && onEquip(item)}
                    disabled={isEquipped}
                >
                    <Text style={styles.cardBtnText}>{isEquipped ? 'Équipé ✓' : 'Équiper'}</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.cardBtnBuy} onPress={() => onBuy(item)}>
                    <Text style={styles.cardBtnBuyText}>
                        {item.price === 0 ? 'Gratuit' : `${item.price} ${CURRENCY_EMOJI[item.currency]}`}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

export default function ShopScreen() {
    const { allCosmetics, ownedCosmeticIds, activeAvatarId, activeBorderId,
        fetchCosmetics, fetchOwnedCosmetics, buyCosmetic, equipCosmetic } = useCosmeticsStore();
    const { userId, inventory } = useUserStore();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'avatar' | 'border'>('avatar');
    const [confirmItem, setConfirmItem] = useState<Cosmetic | null>(null);
    const [buying, setBuying] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchCosmetics(), userId ? fetchOwnedCosmetics(userId) : Promise.resolve()]);
            setLoading(false);
        };
        load();
    }, [userId]);

    const filteredCosmetics = allCosmetics.filter(c => c.type === activeTab);

    const handleBuy = (item: Cosmetic) => {
        if (item.price === 0) {
            void doBuy(item);
        } else {
            setConfirmItem(item);
        }
    };

    const doBuy = async (item: Cosmetic) => {
        setBuying(true);
        const result = await buyCosmetic(item.id);
        setBuying(false);
        setConfirmItem(null);
        if (result.ok) {
            showToast(`${item.name} débloqué ! 🎉`, 'success');
        } else {
            showToast(result.error ?? 'Erreur achat.', 'error');
        }
    };

    const handleEquip = async (item: Cosmetic) => {
        await equipCosmetic(item.id, item.type as 'avatar' | 'border');
        showToast(`${item.name} équipé !`, 'success');
    };

    const balanceLabel = () => {
        return `${inventory.clopes}🚬  ${inventory.joints}🌿  ${inventory.packets}📦`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Boutique 🛍️</Text>
                    <Text style={styles.balance}>{balanceLabel()}</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'avatar' && styles.tabActive]}
                    onPress={() => setActiveTab('avatar')}
                >
                    <Text style={[styles.tabText, activeTab === 'avatar' && styles.tabTextActive]}>🧑 Avatars</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'border' && styles.tabActive]}
                    onPress={() => setActiveTab('border')}
                >
                    <Text style={[styles.tabText, activeTab === 'border' && styles.tabTextActive]}>🖼️ Bordures</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
            ) : (
                <ScrollView contentContainerStyle={styles.grid}>
                    {filteredCosmetics.map(item => (
                        <CosmeticCard
                            key={item.id}
                            item={item}
                            isOwned={ownedCosmeticIds.includes(item.id)}
                            isEquipped={activeTab === 'avatar' ? activeAvatarId === item.id : activeBorderId === item.id}
                            onBuy={handleBuy}
                            onEquip={handleEquip}
                        />
                    ))}
                    {filteredCosmetics.length === 0 && (
                        <Text style={{ color: '#444', textAlign: 'center', marginTop: 60, width: '100%' }}>
                            Aucun cosmétique disponible
                        </Text>
                    )}
                </ScrollView>
            )}

            {/* Modal confirmation achat */}
            {confirmItem && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmItem(null)}>
                    <View style={styles.overlay}>
                        <View style={styles.confirmBox}>
                            <Text style={styles.confirmTitle}>Confirmer l'achat</Text>
                            <Text style={styles.confirmName}>{confirmItem.name}</Text>
                            <Text style={styles.confirmPrice}>
                                Coût : {confirmItem.price} {CURRENCY_EMOJI[confirmItem.currency]}
                            </Text>
                            <Text style={styles.confirmBalance}>
                                Solde : {inventory[confirmItem.currency as 'clopes' | 'joints' | 'packets']} {CURRENCY_EMOJI[confirmItem.currency]}
                            </Text>
                            <View style={styles.confirmBtns}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmItem(null)}>
                                    <Text style={styles.cancelText}>Annuler</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.buyBtn, buying && { opacity: 0.5 }]}
                                    onPress={() => void doBuy(confirmItem)}
                                    disabled={buying}
                                >
                                    {buying ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.buyText}>Acheter</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { padding: 20 },
    title: { color: '#fff', fontSize: 28, fontWeight: '900' },
    balance: { color: '#555', fontSize: 13, marginTop: 4 },

    tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0d0d0d', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#1a1a1a' },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: '#1a1a1a' },
    tabText: { color: '#444', fontWeight: '700', fontSize: 13 },
    tabTextActive: { color: '#fff' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12, paddingBottom: 100 },
    card: { width: '47%', backgroundColor: '#0d0d0d', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a', gap: 8 },
    cardEquipped: { borderColor: '#FFD700', backgroundColor: '#FFD70008' },
    cardIcon: { position: 'relative', marginBottom: 4, alignItems: 'center' },
    cardImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#222' },
    equippedBadge: { position: 'absolute', bottom: -4, right: -8, backgroundColor: '#FFD700', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
    equippedText: { color: '#000', fontSize: 8, fontWeight: '900' },
    cardName: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center' },
    cardDesc: { color: '#444', fontSize: 11, textAlign: 'center', lineHeight: 16 },
    cardBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, width: '100%', alignItems: 'center' },
    cardBtnEquipped: { opacity: 0.5 },
    cardBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    cardBtnBuy: { backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, width: '100%', alignItems: 'center' },
    cardBtnBuyText: { color: '#000', fontWeight: '900', fontSize: 13 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    confirmBox: { width: '80%', backgroundColor: '#1a1a1a', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#333', gap: 8 },
    confirmTitle: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    confirmName: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
    confirmPrice: { color: '#FFD700', fontWeight: '800', fontSize: 18 },
    confirmBalance: { color: '#555', fontSize: 13 },
    confirmBtns: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: '#333', alignItems: 'center' },
    cancelText: { color: '#fff', fontWeight: '700' },
    buyBtn: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: '#FFD700', alignItems: 'center' },
    buyText: { color: '#000', fontWeight: '900' },
});
