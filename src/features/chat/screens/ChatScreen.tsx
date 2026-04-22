// src/features/chat/screens/ChatScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    Image, KeyboardAvoidingView, Platform, Modal, ActivityIndicator,
    SafeAreaView, Animated, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useChatStore, ChatMessage, PresenceUser } from '../store/useChatStore';
import { useUserStore } from '../../user/store/useUserStore';
import { useBetStore, Bet } from '../../betting/store/useBetStore';
import { useCosmeticsStore } from '../../shop/store/useCosmeticsStore';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import UserProfileModal from '../../user/components/UserProfileModal';
import { BetCard } from '../../betting/components/BetCard';
import { BetModal } from '../../betting/components/BetModal';

// ── Config Giphy ─────────────────────────────────────────────────────────────
const GIPHY_KEY = 'YOUR_GIPHY_API_KEY';
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🤯', '👑'];

// ── Composant Avatar ──────────────────────────────────────────────────────────
export function Avatar({
    avatarUrl,
    username,
    size = 36,
    borderColor,
}: {
    avatarUrl?: string | null;
    username: string;
    size?: number;
    borderColor?: string | null;
}) {
    const initials = username.slice(0, 2).toUpperCase();
    const hue = username.charCodeAt(0) * 17 % 360;

    const inner = avatarUrl ? (
        <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#222' }}
        />
    ) : (
        <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: `hsl(${hue}, 60%, 30%)`,
            alignItems: 'center', justifyContent: 'center',
        }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.35 }}>{initials}</Text>
        </View>
    );

    if (borderColor) {
        return (
            <View style={{
                width: size + 6, height: size + 6,
                borderRadius: (size + 6) / 2,
                borderWidth: 3,
                borderColor,
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {inner}
            </View>
        );
    }
    return inner;
}

// ── Composant TypingIndicator ─────────────────────────────────────────────────
function TypingIndicator({ typingUsers }: { typingUsers: PresenceUser[] }) {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const bounce = (dot: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: -6, duration: 200, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 200, useNativeDriver: true }),
                    Animated.delay(400),
                ])
            );

        const anim = Animated.parallel([
            bounce(dot1, 0),
            bounce(dot2, 150),
            bounce(dot3, 300),
        ]);
        anim.start();
        return () => anim.stop();
    }, []);

    if (!typingUsers.length) return null;

    const names = typingUsers.map(u => u.username).join(', ');
    const label = typingUsers.length === 1
        ? `${names} écrit…`
        : `${names} écrivent…`;

    return (
        <View style={styles.typingBar}>
            {/* Avatars des personnes qui écrivent */}
            <View style={styles.typingAvatars}>
                {typingUsers.slice(0, 3).map(u => (
                    <View key={u.user_id} style={styles.typingAvatarWrap}>
                        <Avatar avatarUrl={u.avatar_url} username={u.username} size={22} />
                    </View>
                ))}
            </View>

            {/* Dots animés */}
            <View style={styles.typingDots}>
                {[dot1, dot2, dot3].map((dot, i) => (
                    <Animated.View
                        key={i}
                        style={[styles.typingDot, { transform: [{ translateY: dot }] }]}
                    />
                ))}
            </View>

            <Text style={styles.typingLabel}>{label}</Text>
        </View>
    );
}

// ── Composant MessageBubble ───────────────────────────────────────────────────
function MessageBubble({
    msg, isMe, borderColor, onLongPress, onReact, onMentionUser, onMentionBet,
}: {
    msg: ChatMessage;
    isMe: boolean;
    borderColor?: string | null;
    onLongPress: (msg: ChatMessage) => void;
    onReact: (msgId: string, emoji: string) => void;
    onMentionUser: (userId: string) => void;
    onMentionBet: (betId: string) => void;
}) {
    const username = msg.profile?.username ?? '???';
    const avatarUrl = msg.profile?.avatar_url;

    const renderMentions = (text: string) => {
        const parts = text.split(/(@\w+|#[^\s#]+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const mentionedUserId = msg.mention_users?.[0];
                return (
                    <Text key={i} style={styles.mention}
                        onPress={() => mentionedUserId && onMentionUser(mentionedUserId)}>
                        {part}
                    </Text>
                );
            }
            if (part.startsWith('#')) {
                const mentionedBetId = msg.mention_bets?.[0];
                return (
                    <Text key={i} style={styles.mentionBet}
                        onPress={() => mentionedBetId && onMentionBet(mentionedBetId)}>
                        {part}
                    </Text>
                );
            }
            return <Text key={i} style={isMe ? styles.msgTextMe : styles.msgText}>{part}</Text>;
        });
    };

    const renderContent = () => {
        if (msg.type === 'image' || msg.type === 'gif') {
            return (
                <View>
                    {msg.content ? <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{renderMentions(msg.content)}</Text> : null}
                    <Image source={{ uri: msg.media_url! }} style={styles.msgImage} resizeMode="cover" />
                </View>
            );
        }
        return <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{renderMentions(msg.content ?? '')}</Text>;
    };

    const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    return (
        <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
            {!isMe && (
                <TouchableOpacity onPress={() => onMentionUser(msg.user_id)}>
                    <Avatar avatarUrl={avatarUrl} username={username} borderColor={borderColor} />
                </TouchableOpacity>
            )}
            <View style={{ maxWidth: '75%' }}>
                <Text style={[styles.senderName, isMe && styles.senderNameMe]}>{username}</Text>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onLongPress={() => onLongPress(msg)}
                    style={[styles.bubble, isMe && styles.bubbleMe]}
                >
                    {renderContent()}
                </TouchableOpacity>
                {msg.reactions && msg.reactions.length > 0 && (
                    <View style={[styles.reactionsRow, isMe && { justifyContent: 'flex-end' }]}>
                        {msg.reactions.map(r => (
                            <TouchableOpacity
                                key={r.emoji}
                                style={[styles.reactionBadge, r.userReacted && styles.reactionBadgeActive]}
                                onPress={() => onReact(msg.id, r.emoji)}
                            >
                                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                                <Text style={styles.reactionCount}>{r.count}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                <Text style={[styles.msgTime, isMe && { textAlign: 'right' }]}>{time}</Text>
            </View>
            {isMe && (
                <TouchableOpacity onPress={() => onMentionUser(msg.user_id)}>
                    <Avatar avatarUrl={avatarUrl} username={username} borderColor={borderColor} />
                </TouchableOpacity>
            )}
        </View>
    );
}

// ── Modal pari mentionné ──────────────────────────────────────────────────────
function BetMentionModal({ betId, onClose }: { betId: string | null; onClose: () => void }) {
    const { activeBets, placeBet, allUserBets, fetchUserBets } = useBetStore();
    const { userId, inventory, removeClopes } = useUserStore();
    const { showToast } = useToast();
    const [betModalData, setBetModalData] = useState<{ bet: Bet; option: { id: string; label: string; odds: number } } | null>(null);

    const bet = betId ? activeBets.find(b => b.id === betId) : null;

    const handleSelectOption = (bId: string, optionId: string) => {
        if (!bet) return;
        const option = bet.options.find(o => o.id === optionId);
        if (!option) return;
        setBetModalData({ bet, option });
    };

    const handleConfirmBet = async (amount: number) => {
        if (!betModalData || !userId) return;
        try {
            const existing = allUserBets.find(
                ub => ub.bet_id === betModalData.bet.id && ub.option_id === betModalData.option.id && ub.user_id === userId
            );
            const delta = existing ? amount - existing.amount : amount;
            await placeBet(betModalData.bet.id, betModalData.option.id, amount);
            removeClopes(delta);
            setBetModalData(null);
            showToast(`${amount}🚬 misées sur "${betModalData.option.label}" !`, 'success');
        } catch (err: any) {
            showToast(err?.message ?? 'Erreur lors de la mise.', 'error');
        }
    };

    if (!bet) return null;

    return (
        <Modal visible={!!betId} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.betModalOverlay}>
                <View style={styles.betModalSheet}>
                    <View style={styles.betModalHeader}>
                        <Text style={styles.betModalTitle}>🎰 Pari mentionné</Text>
                        <TouchableOpacity onPress={onClose} style={styles.betModalClose}>
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                        <BetCard bet={bet} onSelectOption={handleSelectOption} />
                    </ScrollView>
                </View>
            </View>

            {betModalData && (
                <BetModal
                    isVisible={!!betModalData}
                    onClose={() => setBetModalData(null)}
                    betQuestion={betModalData.bet.question}
                    betId={betModalData.bet.id}
                    optionId={betModalData.option.id}
                    optionLabel={betModalData.option.label}
                    odds={betModalData.option.odds}
                    onConfirm={handleConfirmBet}
                />
            )}
        </Modal>
    );
}

// ── Écran principal ───────────────────────────────────────────────────────────
export default function ChatScreen() {
    const {
        messages, loading, onlineUsers,
        fetchMessages, fetchOlderMessages, sendMessage,
        deleteMessage, toggleReaction, subscribeToMessages, uploadImage,
        joinPresence, leavePresence, setTyping,
    } = useChatStore();
    const { userId, username } = useUserStore();
    const { activeBets } = useBetStore();
    const { allCosmetics } = useCosmeticsStore();
    const { showToast } = useToast();

    const flatListRef = useRef<FlatList>(null);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Mentions
    const [mentionMode, setMentionMode] = useState<'none' | 'user' | 'bet'>('none');
    const [mentionQuery, setMentionQuery] = useState('');
    const [allProfiles, setAllProfiles] = useState<{ id: string; username: string; avatar_url: string | null }[]>([]);
    const [selectedMentionUsers, setSelectedMentionUsers] = useState<{ id: string; username: string }[]>([]);
    const [selectedMentionBets, setSelectedMentionBets] = useState<{ id: string; question: string }[]>([]);

    // Modals
    const [longPressMsg, setLongPressMsg] = useState<ChatMessage | null>(null);
    const [showGiphy, setShowGiphy] = useState(false);
    const [giphyQuery, setGiphyQuery] = useState('');
    const [giphyResults, setGiphyResults] = useState<{ id: string; url: string }[]>([]);
    const [giphyLoading, setGiphyLoading] = useState(false);
    const [profileUserId, setProfileUserId] = useState<string | null>(null);
    const [selectedBetId, setSelectedBetId] = useState<string | null>(null);

    // Présence dérivée
    const typingUsers = onlineUsers.filter(u => u.typing && u.user_id !== userId);
    const onlineCount = onlineUsers.length; // inclut l'utilisateur courant

    useEffect(() => {
        fetchMessages();
        const unsub = subscribeToMessages();
        fetchProfiles();

        // Rejoindre la présence
        if (userId && username) {
            // Récupérer l'avatar actuel
            supabase.from('profiles').select('avatar_url').eq('id', userId).single()
                .then(({ data }) => {
                    const url = data?.avatar_url ?? null;
                    setAvatarUrl(url);
                    joinPresence({ userId, username, avatarUrl: url });
                });
        }

        return () => {
            unsub();
            leavePresence();
        };
    }, [userId]);

    const fetchProfiles = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .order('username');
        if (data) setAllProfiles(data as { id: string; username: string; avatar_url: string | null }[]);
    };

    // Helper pour récupérer la tint_color de la bordure d'un profil
    const getBorderColor = (borderCosmeticId: string | null | undefined): string | null => {
        if (!borderCosmeticId) return null;
        const c = allCosmetics.find(x => x.id === borderCosmeticId);
        return c?.tint_color ?? null;
    };

    // ── Gestion des mentions ──────────────────────────────────────────────────
    const handleTextChange = (val: string) => {
        setText(val);
        setTyping(val.length > 0);

        const lastAt = val.lastIndexOf('@');
        const lastHash = val.lastIndexOf('#');
        const lastSpace = val.lastIndexOf(' ');

        if (lastAt > lastSpace) {
            setMentionMode('user');
            setMentionQuery(val.slice(lastAt + 1).toLowerCase());
        } else if (lastHash > lastSpace) {
            setMentionMode('bet');
            setMentionQuery(val.slice(lastHash + 1).toLowerCase());
        } else {
            setMentionMode('none');
            setMentionQuery('');
        }
    };

    const filteredProfiles = allProfiles.filter(p =>
        p.id !== userId && p.username.toLowerCase().includes(mentionQuery)
    );
    const filteredBets = activeBets.filter(b =>
        b.question.toLowerCase().includes(mentionQuery)
    );

    const selectMentionUser = (profile: { id: string; username: string }) => {
        const lastAt = text.lastIndexOf('@');
        setText(text.slice(0, lastAt) + `@${profile.username} `);
        setMentionMode('none');
        if (!selectedMentionUsers.find(u => u.id === profile.id)) {
            setSelectedMentionUsers(prev => [...prev, profile]);
        }
    };

    const selectMentionBet = (bet: { id: string; question: string }) => {
        const lastHash = text.lastIndexOf('#');
        const shortQ = bet.question.slice(0, 30).replace(/\s/g, '_');
        setText(text.slice(0, lastHash) + `#${shortQ} `);
        setMentionMode('none');
        if (!selectedMentionBets.find(b => b.id === bet.id)) {
            setSelectedMentionBets(prev => [...prev, bet]);
        }
    };

    // ── Envoi texte ───────────────────────────────────────────────────────────
    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setSending(true);
        setTyping(false);
        await sendMessage({
            content: trimmed,
            type: 'text',
            mentionUsers: selectedMentionUsers.map(u => u.id),
            mentionBets: selectedMentionBets.map(b => b.id),
        });
        setText('');
        setSelectedMentionUsers([]);
        setSelectedMentionBets([]);
        setSending(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    // ── Envoi image ───────────────────────────────────────────────────────────
    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });
        if (result.canceled || !result.assets[0]) return;

        setSending(true);
        showToast('Upload en cours…', 'info');
        const url = await uploadImage(result.assets[0].uri);
        if (url) {
            await sendMessage({
                content: text.trim() || undefined,
                type: 'image',
                mediaUrl: url,
                mentionUsers: selectedMentionUsers.map(u => u.id),
                mentionBets: selectedMentionBets.map(b => b.id),
            });
            setText('');
            setSelectedMentionUsers([]);
            setSelectedMentionBets([]);
            showToast('Image envoyée !', 'success');
        } else {
            showToast('Erreur lors de l\'upload.', 'error');
        }
        setSending(false);
    };

    // ── Giphy ─────────────────────────────────────────────────────────────────
    const searchGiphy = async (q: string) => {
        if (!q.trim()) { setGiphyResults([]); return; }
        setGiphyLoading(true);
        try {
            const res = await fetch(
                `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=20&rating=g`
            );
            const json = await res.json();
            setGiphyResults((json.data ?? []).map((g: any) => ({ id: g.id, url: g.images.fixed_height_small.url })));
        } catch {
            showToast('Erreur Giphy.', 'error');
        }
        setGiphyLoading(false);
    };

    const sendGif = async (gifUrl: string) => {
        setShowGiphy(false);
        setSending(true);
        await sendMessage({ type: 'gif', mediaUrl: gifUrl, content: text.trim() || undefined });
        setText('');
        setSending(false);
    };

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleLongPress = (msg: ChatMessage) => setLongPressMsg(msg);

    const handleDeleteMessage = async () => {
        if (!longPressMsg) return;
        await deleteMessage(longPressMsg.id);
        setLongPressMsg(null);
    };

    const handleQuickReact = (emoji: string) => {
        if (!longPressMsg) return;
        toggleReaction(longPressMsg.id, emoji);
        setLongPressMsg(null);
    };

    const handleMentionUser = (uid: string) => setProfileUserId(uid);
    const handleMentionBet = (betId: string) => setSelectedBetId(betId);

    // ── Render item ───────────────────────────────────────────────────────────
    const renderItem = useCallback(({ item }: { item: ChatMessage }) => (
        <MessageBubble
            msg={item}
            isMe={item.user_id === userId}
            borderColor={getBorderColor(item.profile?.border_cosmetic_id)}
            onLongPress={handleLongPress}
            onReact={(msgId, emoji) => toggleReaction(msgId, emoji)}
            onMentionUser={handleMentionUser}
            onMentionBet={handleMentionBet}
        />
    ), [userId, allCosmetics]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>💬 Chat</Text>
                    <Text style={styles.headerSub}>
                        {onlineCount > 0 ? `${onlineCount} en ligne` : 'Chargement…'}
                    </Text>
                </View>
                {/* Avatars des connectés */}
                {onlineUsers.length > 0 && (
                    <View style={styles.onlineAvatars}>
                        {onlineUsers.slice(0, 5).map((u, i) => (
                            <View key={u.user_id} style={[styles.onlineAvatarWrap, { marginLeft: i > 0 ? -8 : 0 }]}>
                                <Avatar avatarUrl={u.avatar_url} username={u.username} size={28} />
                                <View style={styles.onlineDot} />
                            </View>
                        ))}
                        {onlineUsers.length > 5 && (
                            <View style={[styles.onlineAvatarWrap, { marginLeft: -8 }]}>
                                <View style={styles.onlineMore}>
                                    <Text style={styles.onlineMoreText}>+{onlineUsers.length - 5}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                {loading && messages.length === 0 ? (
                    <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        onEndReached={fetchOlderMessages}
                        onEndReachedThreshold={0.1}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={{ fontSize: 48 }}>💬</Text>
                                <Text style={styles.emptyText}>Sois le premier à écrire !</Text>
                            </View>
                        }
                    />
                )}

                {/* Autocomplétion mentions */}
                {mentionMode === 'user' && filteredProfiles.length > 0 && (
                    <View style={styles.autocomplete}>
                        {filteredProfiles.slice(0, 5).map(p => (
                            <TouchableOpacity key={p.id} style={styles.autocompleteItem} onPress={() => selectMentionUser(p)}>
                                <Avatar avatarUrl={p.avatar_url} username={p.username} size={22} />
                                <Text style={styles.autocompleteText}>@{p.username}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                {mentionMode === 'bet' && filteredBets.length > 0 && (
                    <View style={styles.autocomplete}>
                        {filteredBets.slice(0, 5).map(b => (
                            <TouchableOpacity key={b.id} style={styles.autocompleteItem} onPress={() => selectMentionBet({ id: b.id, question: b.question })}>
                                <Text style={styles.autocompleteText} numberOfLines={1}>#{b.question}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Indicateur de frappe */}
                <TypingIndicator typingUsers={typingUsers} />

                {/* Barre de saisie */}
                <View style={styles.inputBar}>
                    <TouchableOpacity style={styles.mediaBtn} onPress={handlePickImage}>
                        <Ionicons name="image-outline" size={22} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.mediaBtn} onPress={() => setShowGiphy(true)}>
                        <Text style={styles.gifLabel}>GIF</Text>
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={handleTextChange}
                        placeholder="Message… (@joueur, #pari)"
                        placeholderTextColor="#444"
                        multiline
                        maxLength={500}
                        onBlur={() => setTyping(false)}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
                        onPress={handleSend}
                        disabled={!text.trim() || sending}
                    >
                        <Ionicons name="send" size={18} color="#000" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Modal long press */}
            <Modal visible={!!longPressMsg} transparent animationType="fade" onRequestClose={() => setLongPressMsg(null)}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setLongPressMsg(null)}>
                    <View style={styles.reactModal}>
                        <Text style={styles.reactModalTitle}>Réagir</Text>
                        <View style={styles.reactEmojisRow}>
                            {QUICK_REACTIONS.map(e => (
                                <TouchableOpacity key={e} style={styles.reactEmoji} onPress={() => handleQuickReact(e)}>
                                    <Text style={{ fontSize: 28 }}>{e}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {longPressMsg?.user_id === userId && (
                            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteMessage}>
                                <Ionicons name="trash-outline" size={16} color="#E50914" />
                                <Text style={styles.deleteBtnText}>Supprimer</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal Giphy */}
            <Modal visible={showGiphy} animationType="slide" onRequestClose={() => setShowGiphy(false)}>
                <SafeAreaView style={styles.giphyModal}>
                    <View style={styles.giphyHeader}>
                        <Text style={styles.giphyTitle}>GIFs</Text>
                        <TouchableOpacity onPress={() => setShowGiphy(false)}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.giphySearchBar}>
                        <TextInput
                            style={styles.giphyInput}
                            placeholder="Chercher un GIF…"
                            placeholderTextColor="#555"
                            value={giphyQuery}
                            onChangeText={q => { setGiphyQuery(q); searchGiphy(q); }}
                            autoFocus
                        />
                    </View>
                    {giphyLoading ? (
                        <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
                    ) : (
                        <FlatList
                            data={giphyResults}
                            numColumns={2}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ padding: 8 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.giphyItem} onPress={() => sendGif(item.url)}>
                                    <Image source={{ uri: item.url }} style={styles.giphyImg} />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={{ color: '#444', textAlign: 'center', marginTop: 60 }}>
                                    {giphyQuery ? 'Aucun résultat' : 'Tape quelque chose pour chercher'}
                                </Text>
                            }
                        />
                    )}
                </SafeAreaView>
            </Modal>

            {/* Modal profil joueur */}
            {profileUserId && (
                <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
            )}

            {/* Modal pari mentionné */}
            <BetMentionModal
                betId={selectedBetId}
                onClose={() => setSelectedBetId(null)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', paddingBottom: 100 },

    // Header
    header: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#111', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
    headerSub: { color: '#444', fontSize: 11, marginTop: 1 },
    onlineAvatars: { flexDirection: 'row', alignItems: 'center' },
    onlineAvatarWrap: { position: 'relative' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', borderWidth: 1.5, borderColor: '#000' },
    onlineMore: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
    onlineMoreText: { color: '#666', fontSize: 9, fontWeight: '800' },

    // Messages
    list: { padding: 12, paddingBottom: 20 },
    empty: { marginTop: 80, alignItems: 'center', gap: 12 },
    emptyText: { color: '#444', fontSize: 15, textAlign: 'center' },

    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
    bubbleRowMe: { flexDirection: 'row-reverse' },
    senderName: { color: '#555', fontSize: 11, fontWeight: '700', marginBottom: 3, marginLeft: 4 },
    senderNameMe: { textAlign: 'right', marginLeft: 0, marginRight: 4, color: '#FFD70077' },
    bubble: { backgroundColor: '#1a1a1a', borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, maxWidth: '100%' },
    bubbleMe: { backgroundColor: '#2a2a1a', borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
    msgText: { color: '#ccc', fontSize: 15, lineHeight: 22 },
    msgTextMe: { color: '#fff' },
    msgImage: { width: 200, height: 150, borderRadius: 12, marginTop: 6 },
    msgTime: { color: '#333', fontSize: 10, marginTop: 3, marginLeft: 4 },
    mention: { color: '#FFD700', fontWeight: '700' },
    mentionBet: { color: '#4CAF50', fontWeight: '700' },

    // Réactions
    reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    reactionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, gap: 3, borderWidth: 1, borderColor: '#2a2a2a' },
    reactionBadgeActive: { borderColor: '#FFD700', backgroundColor: '#FFD70015' },
    reactionEmoji: { fontSize: 14 },
    reactionCount: { color: '#888', fontSize: 11, fontWeight: '700' },

    // Typing indicator
    typingBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, gap: 8, backgroundColor: '#000' },
    typingAvatars: { flexDirection: 'row' },
    typingAvatarWrap: { marginRight: -4 },
    typingDots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
    typingDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#555' },
    typingLabel: { color: '#444', fontSize: 11, fontStyle: 'italic' },

    // Autocomplete
    autocomplete: { backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#222', maxHeight: 180 },
    autocompleteItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 10 },
    autocompleteText: { color: '#FFD700', fontWeight: '700' },

    // Input bar
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: '#111', backgroundColor: '#000' },
    mediaBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
    gifLabel: { color: '#666', fontWeight: '900', fontSize: 11 },
    input: { flex: 1, backgroundColor: '#111', color: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: '#222' },
    sendBtn: { backgroundColor: '#FFD700', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

    // Long press modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    reactModal: { backgroundColor: '#1a1a1a', borderRadius: 24, padding: 20, width: '85%', borderWidth: 1, borderColor: '#333' },
    reactModalTitle: { color: '#888', fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
    reactEmojisRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
    reactEmoji: { padding: 8 },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#333' },
    deleteBtnText: { color: '#E50914', fontWeight: '700' },

    // Giphy
    giphyModal: { flex: 1, backgroundColor: '#000' },
    giphyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    giphyTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
    giphySearchBar: { paddingHorizontal: 16, marginBottom: 8 },
    giphyInput: { backgroundColor: '#111', color: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#333' },
    giphyItem: { flex: 1, margin: 4 },
    giphyImg: { width: '100%', height: 130, borderRadius: 10, backgroundColor: '#111' },

    // Bet mention modal
    betModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    betModalSheet: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', borderTopWidth: 1, borderColor: '#1a1a1a' },
    betModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
    betModalTitle: { color: '#fff', fontWeight: '900', fontSize: 18 },
    betModalClose: { padding: 6, backgroundColor: '#1a1a1a', borderRadius: 10 },
});
