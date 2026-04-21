import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    Platform,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBetStore } from '../../betting/store/useBetStore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BetCategory } from '../../betting/types';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../user/store/useUserStore';
import { supabase } from '../../../lib/supabase';
import { Calendar } from 'primereact/calendar';
import { useToast } from '../../../contexts/ToastContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
    id: string;
    username: string;
    clopes: number;
    joints: number;
    packets: number;
    role: string;
}

interface AuditLog {
    id: string;
    action: string;
    actor_id: string | null;
    target_id: string | null;
    bet_id: string | null;
    details: Record<string, any> | null;
    created_at: string;
}

interface GlobalStats {
    totalClopes: number;
    totalBets: number;
    totalUserBets: number;
    topBettors: { username: string; clopes: number }[];
    byCategory: { category: string; count: number }[];
}

type AdminTab = 'bets' | 'users' | 'stats' | 'audit' | 'cosmetics';

// ── Composant principal ───────────────────────────────────────────────────────
export default function AdminPanelScreen() {
    const { activeBets, resolveBet, addBet, deleteBet } = useBetStore();
    const { userId } = useUserStore();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<AdminTab>('bets');

    // ── État onglet Paris ─────────────────────────────────────────────────────
    const [confirmModal, setConfirmModal] = useState<{
        visible: boolean; betId: string; optId: string; optLabel: string;
    } | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [options, setOptions] = useState([{ label: '', odds: '2.0' }, { label: '', odds: '2.0' }]);
    const [category, setCategory] = useState<BetCategory>('SPECIAL');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 3600000));
    const [isBlurred, setIsBlurred] = useState(false);
    const [question, setQuestion] = useState('');

    // ── État onglet Utilisateurs ──────────────────────────────────────────────
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [addClopesModal, setAddClopesModal] = useState<{ user: UserProfile | null; amount: string }>({
        user: null, amount: '10',
    });

    // ── État onglet Stats ─────────────────────────────────────────────────────
    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // ── État onglet Audit ─────────────────────────────────────────────────────
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(false);

    // ── État onglet Cosmétiques ───────────────────────────────────────────────
    interface CosmeticAdmin {
        id: string; type: string; name: string; description: string | null;
        price: number; currency: string; is_active: boolean; sort_order: number;
    }
    const [cosmetics, setCosmetics] = useState<CosmeticAdmin[]>([]);
    const [loadingCosmetics, setLoadingCosmetics] = useState(false);
    const [cosmeticForm, setCosmeticForm] = useState<Partial<CosmeticAdmin> | null>(null);
    const [savingCosmetic, setSavingCosmetic] = useState(false);

    // ── Init Paris ────────────────────────────────────────────────────────────
    useEffect(() => {
        const initAdmin = async () => {
            const { fetchBets, fetchUserBets } = useBetStore.getState();
            const { userId } = useUserStore.getState();
            await fetchBets();
            if (userId) await fetchUserBets(userId);
        };
        void initAdmin();

        const subscription = supabase
            .channel('public:bets:admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => {
                void useBetStore.getState().fetchBets();
            })
            .subscribe();

        return () => { void supabase.removeChannel(subscription); };
    }, []);

    // ── Chargement par onglet ─────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab === 'users') void fetchUsers();
        if (activeTab === 'stats') void fetchGlobalStats();
        if (activeTab === 'audit') void fetchAuditLogs();
        if (activeTab === 'cosmetics') void fetchAdminCosmetics();
    }, [activeTab]);

    // ── Fetch Utilisateurs ────────────────────────────────────────────────────
    const fetchUsers = async () => {
        setLoadingUsers(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, clopes, joints, packets, role')
            .order('clopes', { ascending: false });
        if (!error && data) setUsers(data as UserProfile[]);
        setLoadingUsers(false);
    };

    const changeRole = async (user: UserProfile) => {
        const newRole = user.role === 'admin' ? 'player' : 'admin';
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', user.id);

        if (error) { showToast('Erreur changement de rôle.', 'error'); return; }

        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
        showToast(`@${user.username} → ${newRole}`, 'success');

        // Log audit
        await supabase.from('audit_logs').insert([{
            action: 'ROLE_CHANGED',
            actor_id: userId,
            target_id: user.id,
            details: { from: user.role, to: newRole },
        }]);
    };

    const confirmAddClopes = async () => {
        const { user, amount } = addClopesModal;
        if (!user) return;
        const num = parseInt(amount, 10);
        if (isNaN(num) || num <= 0) { showToast('Montant invalide.', 'error'); return; }

        const { error } = await supabase
            .from('profiles')
            .update({ clopes: user.clopes + num })
            .eq('id', user.id);

        if (error) { showToast('Erreur ajout clopes.', 'error'); return; }

        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, clopes: u.clopes + num } : u));
        setAddClopesModal({ user: null, amount: '10' });
        showToast(`+${num}🚬 ajoutées à @${user.username}`, 'success');

        await supabase.from('audit_logs').insert([{
            action: 'CLOPES_ADDED',
            actor_id: userId,
            target_id: user.id,
            details: { amount: num },
        }]);
    };

    // ── Fetch Stats globales ──────────────────────────────────────────────────
    const fetchGlobalStats = async () => {
        setLoadingStats(true);

        const [profilesRes, betsRes, userBetsRes] = await Promise.all([
            supabase.from('profiles').select('username, clopes').order('clopes', { ascending: false }).limit(5),
            supabase.from('bets').select('category'),
            supabase.from('user_bets').select('id'),
        ]);

        const topBettors = (profilesRes.data ?? []) as { username: string; clopes: number }[];
        const totalClopes = topBettors.reduce((s, p) => s + p.clopes, 0);

        const allBets = (profilesRes.data ?? []) as any[];
        const betCategories = (betsRes.data ?? []) as { category: string }[];
        const categoryCounts: Record<string, number> = {};
        betCategories.forEach(b => {
            categoryCounts[b.category] = (categoryCounts[b.category] ?? 0) + 1;
        });

        // Recalc total clopes sur tous les profils
        const { data: allProfiles } = await supabase.from('profiles').select('clopes');
        const realTotalClopes = (allProfiles ?? []).reduce((s: number, p: any) => s + (p.clopes ?? 0), 0);

        setGlobalStats({
            totalClopes: realTotalClopes,
            totalBets: betCategories.length,
            totalUserBets: (userBetsRes.data ?? []).length,
            topBettors,
            byCategory: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
        });
        setLoadingStats(false);
    };

    // ── Fetch Audit ───────────────────────────────────────────────────────────
    const fetchAuditLogs = async () => {
        setLoadingAudit(true);
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (!error && data) setAuditLogs(data as AuditLog[]);
        setLoadingAudit(false);
    };

    // ── Actions Paris ─────────────────────────────────────────────────────────
    const openConfirm = (betId: string, optId: string, optLabel: string) => {
        setConfirmModal({ visible: true, betId, optId, optLabel });
    };

    const processResolution = async () => {
        if (!confirmModal) return;
        await resolveBet(confirmModal.betId, confirmModal.optId);
        const label = confirmModal.optLabel;
        setConfirmModal(null);
        showToast(`✅ "${label}" désignée gagnante. Les clopes sont distribuées !`, 'success');

        // Log audit
        await supabase.from('audit_logs').insert([{
            action: 'BET_RESOLVED',
            actor_id: userId,
            bet_id: confirmModal.betId,
            details: { winning_option: label },
        }]);
    };

    const confirmDelete = async (betId: string) => {
        const message = 'Supprimer le pari ?\n\nCette action est irréversible.';
        if (Platform.OS === 'web') {
            if (!window.confirm(message)) return;
        }
        await deleteBet(betId);
        showToast('Pari supprimé.', 'info');
    };

    const addOptionField = () => {
        if (options.length < 4) setOptions([...options, { label: '', odds: '2.0' }]);
    };

    const handleCreate = async () => {
        if (!question || options.some(o => !o.label)) {
            showToast('Remplis tout, Jenta !', 'error'); return;
        }
        if (isNaN(displayDate.getTime()) || isNaN(expiryDate.getTime())) {
            showToast('Les dates sélectionnées sont invalides.', 'error'); return;
        }
        if (expiryDate <= displayDate) {
            showToast("Le pari ne peut pas expirer avant d'être affiché !", 'error'); return;
        }
        const finalOptions = options.map((o, i) => ({
            id: `opt-${Date.now()}-${i}`,
            label: o.label,
            odds: parseFloat(o.odds),
        }));
        await addBet({ question, options: finalOptions, category, displayAt: displayDate, expiresAt: expiryDate, isBlurred });
        setQuestion('');
        setOptions([{ label: '', odds: '2.0' }, { label: '', odds: '2.0' }]);
        setShowForm(false);
        showToast('Pari créé et notif envoyée 🎰', 'success');
    };

    // ── Fetch & actions Cosmétiques ───────────────────────────────────────────
    const fetchAdminCosmetics = async () => {
        setLoadingCosmetics(true);
        const { data } = await supabase.from('cosmetics').select('*').order('sort_order');
        if (data) setCosmetics(data as CosmeticAdmin[]);
        setLoadingCosmetics(false);
    };

    const toggleCosmeticActive = async (c: CosmeticAdmin) => {
        const { error } = await supabase.from('cosmetics').update({ is_active: !c.is_active }).eq('id', c.id);
        if (!error) setCosmetics(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
    };

    const saveCosmetic = async () => {
        if (!cosmeticForm?.name || !cosmeticForm?.type) {
            showToast('Nom et type obligatoires.', 'error'); return;
        }
        setSavingCosmetic(true);
        const payload = {
            name: cosmeticForm.name,
            type: cosmeticForm.type ?? 'avatar',
            description: cosmeticForm.description ?? null,
            price: cosmeticForm.price ?? 0,
            currency: cosmeticForm.currency ?? 'clopes',
            is_active: cosmeticForm.is_active ?? true,
            sort_order: cosmeticForm.sort_order ?? 99,
        };
        if (cosmeticForm.id) {
            await supabase.from('cosmetics').update(payload).eq('id', cosmeticForm.id);
        } else {
            await supabase.from('cosmetics').insert([payload]);
        }
        setSavingCosmetic(false);
        setCosmeticForm(null);
        await fetchAdminCosmetics();
        showToast(cosmeticForm.id ? 'Cosmétique mis à jour ✅' : 'Cosmétique créé 🎁', 'success');
    };

    const renderCosmeticsTab = () => (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setCosmeticForm({ type: 'avatar', price: 0, currency: 'clopes', is_active: true })}
            >
                <Text style={styles.createBtnText}>+ NOUVEAU COSMÉTIQUE</Text>
            </TouchableOpacity>

            {loadingCosmetics ? (
                <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
            ) : (
                cosmetics.map(c => (
                    <View key={c.id} style={[styles.cosmeticCard, !c.is_active && { opacity: 0.4 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cosmeticName}>{c.name}</Text>
                            <Text style={styles.cosmeticMeta}>
                                {c.type.toUpperCase()} · {c.price === 0 ? 'Gratuit' : `${c.price} ${c.currency}`}
                            </Text>
                            {c.description ? <Text style={styles.cosmeticDesc}>{c.description}</Text> : null}
                        </View>
                        <View style={styles.cosmeticActions}>
                            <TouchableOpacity
                                style={styles.userActionBtn}
                                onPress={() => setCosmeticForm({ ...c })}
                            >
                                <Ionicons name="pencil-outline" size={18} color="#FFD700" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.userActionBtn}
                                onPress={() => void toggleCosmeticActive(c)}
                            >
                                <Ionicons
                                    name={c.is_active ? 'eye-outline' : 'eye-off-outline'}
                                    size={18}
                                    color={c.is_active ? '#4CAF50' : '#555'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}

            {/* Modal édition cosmétique */}
            {cosmeticForm !== null && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setCosmeticForm(null)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.confirmBox, { maxHeight: '85%' }]}>
                            <ScrollView>
                                <Text style={styles.confirmTitle}>
                                    {cosmeticForm.id ? '✏️ Modifier' : '🎁 Créer'} un cosmétique
                                </Text>

                                <Text style={styles.cosmeticFieldLabel}>Nom</Text>
                                <TextInput
                                    style={styles.input}
                                    value={cosmeticForm.name ?? ''}
                                    onChangeText={v => setCosmeticForm(p => ({ ...p, name: v }))}
                                    placeholder="Nom du cosmétique"
                                    placeholderTextColor="#555"
                                />

                                <Text style={styles.cosmeticFieldLabel}>Description</Text>
                                <TextInput
                                    style={styles.input}
                                    value={cosmeticForm.description ?? ''}
                                    onChangeText={v => setCosmeticForm(p => ({ ...p, description: v }))}
                                    placeholder="Description (optionnel)"
                                    placeholderTextColor="#555"
                                />

                                <Text style={styles.cosmeticFieldLabel}>Type</Text>
                                <View style={styles.catRow}>
                                    {(['avatar', 'border', 'badge'] as const).map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[styles.catBtn, cosmeticForm.type === t && styles.catBtnActive]}
                                            onPress={() => setCosmeticForm(p => ({ ...p, type: t }))}
                                        >
                                            <Text style={[styles.catBtnText, cosmeticForm.type === t && { color: '#000' }]}>
                                                {t.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.cosmeticFieldLabel}>Prix</Text>
                                <TextInput
                                    style={styles.input}
                                    value={String(cosmeticForm.price ?? 0)}
                                    onChangeText={v => setCosmeticForm(p => ({ ...p, price: parseInt(v, 10) || 0 }))}
                                    keyboardType="numeric"
                                    placeholderTextColor="#555"
                                />

                                <Text style={styles.cosmeticFieldLabel}>Devise</Text>
                                <View style={styles.catRow}>
                                    {(['clopes', 'joints', 'packets'] as const).map(cur => (
                                        <TouchableOpacity
                                            key={cur}
                                            style={[styles.catBtn, cosmeticForm.currency === cur && styles.catBtnActive]}
                                            onPress={() => setCosmeticForm(p => ({ ...p, currency: cur }))}
                                        >
                                            <Text style={[styles.catBtnText, cosmeticForm.currency === cur && { color: '#000' }]}>
                                                {cur === 'clopes' ? '🚬' : cur === 'joints' ? '🌿' : '📦'} {cur}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={[styles.modalButtons, { marginTop: 16 }]}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setCosmeticForm(null)}>
                                        <Text style={styles.cancelText}>Annuler</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.validBtn, savingCosmetic && { opacity: 0.5 }]}
                                        onPress={() => void saveCosmetic()}
                                        disabled={savingCosmetic}
                                    >
                                        {savingCosmetic
                                            ? <ActivityIndicator color="#000" size="small" />
                                            : <Text style={styles.validText}>Sauvegarder</Text>
                                        }
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}
        </ScrollView>
    );

    // ── Rendus ─────────────────────────────────────────────────────────────────
    const renderBetsTab = () => (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            {showForm && (
                <View style={styles.createForm}>
                    <View style={styles.catRow}>
                        {(['SPECIAL', 'DAILY', 'BEFORE', 'AFTER', 'NIGHT'] as BetCategory[]).map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.catBtn, category === cat && styles.catBtnActive]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={[styles.catBtnText, category === cat && { color: '#000' }]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="La question (ex: Jenta finit son verre ?)"
                        placeholderTextColor="#555"
                        value={question}
                        onChangeText={setQuestion}
                    />

                    {options.map((opt, index) => (
                        <View key={index} style={styles.optionInputRow}>
                            <TextInput
                                style={[styles.input, { width: '75%' }]}
                                placeholder={`Option ${index + 1}`}
                                placeholderTextColor="#444"
                                value={opt.label}
                                onChangeText={t => {
                                    const n = [...options]; n[index].label = t; setOptions(n);
                                }}
                            />
                            <TextInput
                                style={[styles.input, { width: '25%' }]}
                                keyboardType="decimal-pad"
                                placeholder="Cote"
                                placeholderTextColor="#444"
                                value={opt.odds}
                                onChangeText={t => {
                                    const n = [...options]; n[index].odds = t.replace(',', '.'); setOptions(n);
                                }}
                            />
                        </View>
                    ))}

                    {options.length < 4 && (
                        <TouchableOpacity onPress={addOptionField} style={styles.addOptBtn}>
                            <Text style={{ color: '#FFD700' }}>+ Ajouter une option</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.checkRow} onPress={() => setIsBlurred(!isBlurred)}>
                        <Text style={{ color: '#fff' }}>Flouter avant ouverture ?</Text>
                        <View style={[styles.checkbox, isBlurred && { backgroundColor: '#FFD700' }]} />
                    </TouchableOpacity>

                    <View style={styles.timingContainer}>
                        <Text style={styles.sectionTitleLabel}>Timing du Pari</Text>
                        <View style={styles.pickerRow}>
                            <Text style={styles.miniLabel}>Affichage :</Text>
                            {Platform.OS === 'web' ? (
                                <Calendar
                                    value={displayDate}
                                    onChange={e => e.value && setDisplayDate(e.value as Date)}
                                    showTime hourFormat="24"
                                    inputStyle={primePickerStyles}
                                />
                            ) : (
                                <DateTimePicker
                                    value={displayDate} themeVariant="dark" mode="datetime" is24Hour
                                    onChange={(_, d) => d && setDisplayDate(d)}
                                />
                            )}
                        </View>
                        <View style={[styles.pickerRow, { marginTop: 15 }]}>
                            <Text style={styles.miniLabel}>Expiration :</Text>
                            {Platform.OS === 'web' ? (
                                <Calendar
                                    value={expiryDate}
                                    onChange={e => e.value && setExpiryDate(e.value as Date)}
                                    showTime hourFormat="24"
                                    inputStyle={primePickerStyles}
                                />
                            ) : (
                                <DateTimePicker
                                    value={expiryDate} themeVariant="dark" mode="datetime" is24Hour
                                    onChange={(_, d) => d && setExpiryDate(d)}
                                />
                            )}
                        </View>
                    </View>

                    <TouchableOpacity style={styles.createBtn} onPress={() => void handleCreate()}>
                        <Text style={styles.createBtnText}>LANCER</Text>
                    </TouchableOpacity>
                </View>
            )}

            {activeBets.map(bet => {
                const isSettled = bet.status === 'SETTLED';
                return (
                    <View key={bet.id} style={[styles.adminCard, isSettled && styles.settledCard]}>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => void confirmDelete(bet.id)}>
                            <Ionicons name="trash-outline" size={18} color="#E50914" />
                        </TouchableOpacity>
                        <Text style={styles.betQuestion}>{bet.question}</Text>
                        {isSettled ? (
                            <View style={styles.settledBadge}>
                                <Text style={styles.settledText}>RÉSULTAT VALIDÉ ✅</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.label}>Désigner le vainqueur :</Text>
                                <View style={styles.btnRow}>
                                    {bet.options.map(opt => (
                                        <TouchableOpacity
                                            key={opt.id}
                                            style={styles.resolveBtn}
                                            onPress={() => openConfirm(bet.id, opt.id, opt.label)}
                                        >
                                            <Text style={styles.btnText}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );

    const renderUsersTab = () => (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
            {loadingUsers ? (
                <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
            ) : (
                users.map(user => (
                    <View key={user.id} style={styles.userCard}>
                        <View style={styles.userInfo}>
                            <Text style={styles.userUsername}>@{user.username}</Text>
                            <View style={styles.userMeta}>
                                <Text style={styles.userClopes}>{user.clopes}🚬</Text>
                                <View style={[styles.roleBadge, user.role === 'admin' && styles.roleBadgeAdmin]}>
                                    <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.userActions}>
                            <TouchableOpacity
                                style={styles.userActionBtn}
                                onPress={() => setAddClopesModal({ user, amount: '10' })}
                            >
                                <Ionicons name="add-circle-outline" size={20} color="#FFD700" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.userActionBtn}
                                onPress={() => void changeRole(user)}
                            >
                                <Ionicons
                                    name={user.role === 'admin' ? 'shield-checkmark' : 'shield-outline'}
                                    size={20}
                                    color={user.role === 'admin' ? '#FFD700' : '#555'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );

    const renderStatsTab = () => (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            {loadingStats || !globalStats ? (
                <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
            ) : (
                <>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statEmoji}>🚬</Text>
                            <Text style={styles.statValue}>{globalStats.totalClopes}</Text>
                            <Text style={styles.statLabel}>Clopes en circulation</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statEmoji}>🎰</Text>
                            <Text style={styles.statValue}>{globalStats.totalBets}</Text>
                            <Text style={styles.statLabel}>Paris créés</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statEmoji}>💸</Text>
                            <Text style={styles.statValue}>{globalStats.totalUserBets}</Text>
                            <Text style={styles.statLabel}>Mises jouées</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionHeader}>TOP 5 RICHISSIMES 🏆</Text>
                    {globalStats.topBettors.map((p, i) => (
                        <View key={i} style={styles.topBettorRow}>
                            <Text style={styles.topBettorRank}>#{i + 1}</Text>
                            <Text style={styles.topBettorName}>@{p.username}</Text>
                            <Text style={styles.topBettorClopes}>{p.clopes}🚬</Text>
                        </View>
                    ))}

                    <Text style={styles.sectionHeader}>PARIS PAR CATÉGORIE</Text>
                    {globalStats.byCategory.map((c, i) => (
                        <View key={i} style={styles.categoryRow}>
                            <Text style={styles.categoryName}>{c.category}</Text>
                            <Text style={styles.categoryCount}>{c.count} paris</Text>
                        </View>
                    ))}
                </>
            )}
        </ScrollView>
    );

    const auditActionLabel = (action: string) => {
        if (action === 'BET_RESOLVED') return { emoji: '🏁', label: 'Pari résolu', color: '#4CAF50' };
        if (action === 'ROLE_CHANGED') return { emoji: '🛡️', label: 'Rôle modifié', color: '#FFD700' };
        if (action === 'CLOPES_ADDED') return { emoji: '🚬', label: 'Clopes ajoutées', color: '#2196F3' };
        return { emoji: '📋', label: action, color: '#666' };
    };

    const renderAuditTab = () => (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            {loadingAudit ? (
                <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
            ) : auditLogs.length === 0 ? (
                <View style={styles.emptyAudit}>
                    <Text style={{ fontSize: 40, textAlign: 'center' }}>📋</Text>
                    <Text style={styles.emptyAuditText}>Aucune action enregistrée</Text>
                </View>
            ) : (
                auditLogs.map(log => {
                    const { emoji, label, color } = auditActionLabel(log.action);
                    const date = new Date(log.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    });
                    const details = log.details
                        ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')
                        : '';
                    return (
                        <View key={log.id} style={styles.auditRow}>
                            <Text style={{ fontSize: 22 }}>{emoji}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.auditAction, { color }]}>{label}</Text>
                                {details ? <Text style={styles.auditDetails}>{details}</Text> : null}
                                <Text style={styles.auditDate}>{date}</Text>
                            </View>
                        </View>
                    );
                })
            )}
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Jenta Control 🕹️</Text>
                    <Text style={styles.subtitle}>Pouvoir absolu, responsabilité absolue</Text>
                </View>
                {activeTab === 'bets' && (
                    <TouchableOpacity style={styles.addToggle} onPress={() => setShowForm(!showForm)}>
                        <Text style={styles.addToggleText}>{showForm ? 'Fermer' : '+ Créer'}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Tab bar */}
            <View style={styles.tabBar}>
                {([
                    { key: 'bets', icon: 'dice-outline', label: 'Paris' },
                    { key: 'users', icon: 'people-outline', label: 'Users' },
                    { key: 'stats', icon: 'bar-chart-outline', label: 'Stats' },
                    { key: 'audit', icon: 'document-text-outline', label: 'Audit' },
                    { key: 'cosmetics', icon: 'shirt-outline', label: 'Shop' },
                ] as { key: AdminTab; icon: any; label: string }[]).map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons
                            name={tab.icon}
                            size={18}
                            color={activeTab === tab.key ? '#FFD700' : '#444'}
                        />
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Contenu */}
            {activeTab === 'bets' && renderBetsTab()}
            {activeTab === 'users' && renderUsersTab()}
            {activeTab === 'stats' && renderStatsTab()}
            {activeTab === 'audit' && renderAuditTab()}
            {activeTab === 'cosmetics' && renderCosmeticsTab()}

            {/* Modal confirmation résolution */}
            {confirmModal?.visible && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.confirmBox}>
                            <Text style={styles.confirmTitle}>⚠️ Action Irréversible</Text>
                            <Text style={styles.confirmDesc}>
                                Confirmes-tu que{' '}
                                <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>
                                    "{confirmModal.optLabel}"
                                </Text>{' '}
                                est la gagnante ?
                            </Text>
                            <Text style={styles.confirmWarning}>
                                Les clopes seront distribuées immédiatement aux gagnants.
                            </Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmModal(null)}>
                                    <Text style={styles.cancelText}>Annuler</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.validBtn} onPress={() => void processResolution()}>
                                    <Text style={styles.validText}>Valider & Payer</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Modal ajout clopes */}
            {addClopesModal.user && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setAddClopesModal({ user: null, amount: '10' })}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.confirmBox}>
                            <Text style={styles.confirmTitle}>🚬 Ajouter des clopes</Text>
                            <Text style={styles.confirmDesc}>
                                Pour <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>@{addClopesModal.user.username}</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, { textAlign: 'center', fontSize: 24, marginVertical: 16 }]}
                                keyboardType="numeric"
                                value={addClopesModal.amount}
                                onChangeText={v => setAddClopesModal(prev => ({ ...prev, amount: v }))}
                                placeholderTextColor="#444"
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setAddClopesModal({ user: null, amount: '10' })}
                                >
                                    <Text style={styles.cancelText}>Annuler</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.validBtn} onPress={() => void confirmAddClopes()}>
                                    <Text style={styles.validText}>Ajouter</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const primePickerStyles = {
    backgroundColor: '#000', color: '#FFD700', border: '1px solid #333',
    textAlign: 'center', borderRadius: 8,
} as const;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    title: { color: '#FFF', fontSize: 28, fontWeight: '900' },
    subtitle: { color: '#666', fontSize: 12, marginTop: 4 },
    addToggle: { backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    addToggleText: { color: '#000', fontWeight: 'bold' },

    // Tab bar
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: '#0d0d0d',
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, gap: 2 },
    tabActive: { backgroundColor: '#1a1a1a' },
    tabText: { color: '#333', fontWeight: '700', fontSize: 10 },
    tabTextActive: { color: '#FFD700' },

    // Form création pari
    createForm: { backgroundColor: '#111', padding: 20, borderRadius: 30, marginBottom: 30, borderWidth: 1, borderColor: '#FFD700' },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
    catBtnActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
    catBtnText: { color: '#888', fontSize: 10, fontWeight: 'bold' },
    input: { backgroundColor: '#000', color: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
    optionInputRow: { flexDirection: 'row', gap: 10 },
    addOptBtn: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, marginBottom: 20 },
    checkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#FFD700' },
    timingContainer: { backgroundColor: '#000', padding: 15, borderRadius: 23, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
    sectionTitleLabel: { color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 10, fontWeight: 'bold' },
    pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
    miniLabel: { color: '#FFD700', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    createBtn: { backgroundColor: '#FFD700', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    createBtnText: { color: '#000', fontWeight: '900', letterSpacing: 1 },

    // Cards paris
    adminCard: { backgroundColor: '#111', padding: 20, borderRadius: 25, marginBottom: 15, borderWidth: 1, borderColor: '#222', position: 'relative' },
    deleteBtn: { position: 'absolute', top: 15, right: 15, padding: 5, backgroundColor: 'rgba(229, 9, 20, 0.1)', borderRadius: 8 },
    settledCard: { opacity: 0.6, borderColor: '#1DB954' },
    betQuestion: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    label: { color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 10 },
    btnRow: { flexDirection: 'row', gap: 10 },
    resolveBtn: { backgroundColor: '#FFD700', padding: 12, borderRadius: 12, flex: 1, alignItems: 'center' },
    btnText: { color: '#000', fontWeight: '900', fontSize: 12 },
    settledBadge: { backgroundColor: 'rgba(29, 185, 84, 0.2)', padding: 10, borderRadius: 10, alignItems: 'center' },
    settledText: { color: '#1DB954', fontWeight: 'bold', fontSize: 12 },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    confirmBox: { width: '85%', backgroundColor: '#1A1A1A', padding: 25, borderRadius: 30, borderWidth: 1, borderColor: '#333' },
    confirmTitle: { color: '#E50914', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    confirmDesc: { color: '#fff', textAlign: 'center', marginVertical: 15, fontSize: 16 },
    confirmWarning: { color: '#666', fontSize: 12, textAlign: 'center', marginBottom: 20 },
    modalButtons: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, padding: 15, borderRadius: 15, backgroundColor: '#333', alignItems: 'center' },
    cancelText: { color: '#fff', fontWeight: 'bold' },
    validBtn: { flex: 1, padding: 15, borderRadius: 15, backgroundColor: '#FFD700', alignItems: 'center' },
    validText: { color: '#000', fontWeight: 'bold' },

    // Utilisateurs
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d0d0d', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1a1a1a' },
    userInfo: { flex: 1 },
    userUsername: { color: '#fff', fontWeight: '700', fontSize: 15 },
    userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    userClopes: { color: '#FFD700', fontWeight: '800', fontSize: 13 },
    roleBadge: { backgroundColor: '#1a1a1a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    roleBadgeAdmin: { backgroundColor: '#FFD70022', borderWidth: 1, borderColor: '#FFD70055' },
    roleText: { color: '#555', fontSize: 10, fontWeight: '700' },
    userActions: { flexDirection: 'row', gap: 8 },
    userActionBtn: { padding: 8, backgroundColor: '#1a1a1a', borderRadius: 10 },

    // Stats
    statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    statCard: { flex: 1, minWidth: '30%', backgroundColor: '#0d0d0d', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' },
    statEmoji: { fontSize: 24, marginBottom: 6 },
    statValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
    statLabel: { color: '#444', fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 4 },
    sectionHeader: { color: '#444', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, marginTop: 6 },
    topBettorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d0d0d', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1a1a1a' },
    topBettorRank: { color: '#444', fontWeight: '700', width: 32 },
    topBettorName: { color: '#ccc', flex: 1, fontWeight: '600' },
    topBettorClopes: { color: '#FFD700', fontWeight: '900' },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0d0d0d', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#1a1a1a' },
    categoryName: { color: '#888', fontWeight: '700', fontSize: 12 },
    categoryCount: { color: '#FFD700', fontWeight: '700', fontSize: 12 },

    // Audit
    auditRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#0d0d0d', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1a1a1a' },
    auditAction: { fontWeight: '700', fontSize: 14 },
    auditDetails: { color: '#555', fontSize: 12, marginTop: 2 },
    auditDate: { color: '#333', fontSize: 11, marginTop: 4 },
    emptyAudit: { marginTop: 60, alignItems: 'center' },
    emptyAuditText: { color: '#444', fontSize: 15,        fontWeight: '600' },

    // Cosmetics admin
    cosmeticCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d0d0d', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1a1a1a' },
    cosmeticName: { color: '#fff', fontWeight: '800', fontSize: 14 },
    cosmeticMeta: { color: '#FFD700', fontSize: 12, fontWeight: '700', marginTop: 2 },
    cosmeticDesc: { color: '#444', fontSize: 11, marginTop: 2 },
    cosmeticActions: { flexDirection: 'row', gap: 8 },
    cosmeticFieldLabel: { color: '#555', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, marginTop: 10 },
});
