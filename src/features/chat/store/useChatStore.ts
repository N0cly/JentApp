import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useUserStore } from '../../user/store/useUserStore';

export interface ChatMessage {
    id: string;
    user_id: string;
    content: string | null;
    type: 'text' | 'image' | 'gif';
    media_url: string | null;
    mention_users: string[];
    mention_bets: string[];
    created_at: string;
    profile?: {
        username: string;
        avatar_url: string | null;
        avatar_cosmetic_id: string | null;
        border_cosmetic_id: string | null;
    };
    reactions?: { emoji: string; count: number; userReacted: boolean }[];
}

export interface PresenceUser {
    user_id: string;
    username: string;
    avatar_url: string | null;
    typing: boolean;
    online_at: string;
}

interface ChatState {
    messages: ChatMessage[];
    hasMore: boolean;
    loading: boolean;
    onlineUsers: PresenceUser[]; // tous les gens sur l'onglet Chat

    fetchMessages: () => Promise<void>;
    fetchOlderMessages: () => Promise<void>;
    sendMessage: (params: {
        content?: string;
        type: 'text' | 'image' | 'gif';
        mediaUrl?: string;
        mentionUsers?: string[];
        mentionBets?: string[];
    }) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    toggleReaction: (messageId: string, emoji: string) => Promise<void>;
    subscribeToMessages: () => () => void;
    uploadImage: (uri: string) => Promise<string | null>;

    // Présence
    joinPresence: (info: { userId: string; username: string; avatarUrl?: string | null }) => Promise<void>;
    leavePresence: () => Promise<void>;
    setTyping: (isTyping: boolean) => void;
}

const PAGE_SIZE = 30;

// ── Variables module-level (hors du store pour éviter les re-renders) ──────────
let _presenceChannel: ReturnType<typeof supabase.channel> | null = null;
let _currentPresence: (PresenceUser & { [key: string]: any }) | null = null;
let _typingTimeout: ReturnType<typeof setTimeout> | null = null;

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    hasMore: true,
    loading: false,
    onlineUsers: [],

    fetchMessages: async () => {
        set({ loading: true });
        const { userId } = useUserStore.getState();

        const { data, error } = await supabase
            .from('messages')
            .select('*, profile:profiles(username, avatar_url, avatar_cosmetic_id, border_cosmetic_id)')
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);

        if (!error && data) {
            const enriched = await enrichWithReactions(data, userId);
            set({ messages: enriched.reverse(), hasMore: data.length === PAGE_SIZE });
        }
        set({ loading: false });
    },

    fetchOlderMessages: async () => {
        const { messages, hasMore } = get();
        if (!hasMore || messages.length === 0) return;

        const { userId } = useUserStore.getState();
        const oldest = messages[0];

        const { data, error } = await supabase
            .from('messages')
            .select('*, profile:profiles(username, avatar_url, avatar_cosmetic_id, border_cosmetic_id)')
            .lt('created_at', oldest.created_at)
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);

        if (!error && data) {
            const enriched = await enrichWithReactions(data, userId);
            set(state => ({
                messages: [...enriched.reverse(), ...state.messages],
                hasMore: data.length === PAGE_SIZE,
            }));
        }
    },

    sendMessage: async ({ content, type, mediaUrl, mentionUsers = [], mentionBets = [] }) => {
        const { userId } = useUserStore.getState();
        if (!userId) return;

        await supabase.from('messages').insert([{
            user_id: userId,
            content: content ?? null,
            type,
            media_url: mediaUrl ?? null,
            mention_users: mentionUsers,
            mention_bets: mentionBets,
        }]);
        // Le realtime subscription ajoute le message automatiquement
    },

    deleteMessage: async (messageId: string) => {
        await supabase.from('messages').delete().eq('id', messageId);
        set(state => ({ messages: state.messages.filter(m => m.id !== messageId) }));
    },

    toggleReaction: async (messageId: string, emoji: string) => {
        const { userId } = useUserStore.getState();
        if (!userId) return;

        const { messages } = get();
        const msg = messages.find(m => m.id === messageId);
        const existingReaction = msg?.reactions?.find(r => r.emoji === emoji && r.userReacted);

        if (existingReaction) {
            await supabase
                .from('message_reactions')
                .delete()
                .eq('message_id', messageId)
                .eq('user_id', userId)
                .eq('emoji', emoji);
        } else {
            await supabase.from('message_reactions').insert([{
                message_id: messageId,
                user_id: userId,
                emoji,
            }]);
        }

        set(state => ({
            messages: state.messages.map(m => {
                if (m.id !== messageId) return m;
                const reactions = [...(m.reactions ?? [])];
                const idx = reactions.findIndex(r => r.emoji === emoji);
                if (idx >= 0) {
                    const r = reactions[idx];
                    if (r.userReacted) {
                        reactions[idx] = { ...r, count: r.count - 1, userReacted: false };
                        if (reactions[idx].count <= 0) reactions.splice(idx, 1);
                    } else {
                        reactions[idx] = { ...r, count: r.count + 1, userReacted: true };
                    }
                } else {
                    reactions.push({ emoji, count: 1, userReacted: true });
                }
                return { ...m, reactions };
            }),
        }));
    },

    subscribeToMessages: () => {
        const { userId } = useUserStore.getState();

        const channel = supabase
            .channel('chat-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
                const { data } = await supabase
                    .from('messages')
                    .select('*, profile:profiles(username, avatar_url, avatar_cosmetic_id, border_cosmetic_id)')
                    .eq('id', payload.new.id)
                    .single();

                if (data) {
                    const enriched = await enrichWithReactions([data], userId);
                    set(state => ({ messages: [...state.messages, enriched[0]] }));
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
                set(state => ({ messages: state.messages.filter(m => m.id !== payload.old.id) }));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    },

    uploadImage: async (uri: string): Promise<string | null> => {
        const { userId } = useUserStore.getState();
        if (!userId) return null;

        try {
            const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
            const fileName = `${userId}/${Date.now()}.${ext}`;

            const res = await fetch(uri);
            const blob = await res.blob();

            const { data, error } = await supabase.storage
                .from('chat-images')
                .upload(fileName, blob, { contentType: blob.type || `image/${ext}`, upsert: false });

            if (error || !data) return null;

            const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(data.path);
            return urlData.publicUrl;
        } catch {
            return null;
        }
    },

    // ── Présence Realtime ──────────────────────────────────────────────────────

    joinPresence: async ({ userId, username, avatarUrl }) => {
        // Fermer le canal précédent si existant
        if (_presenceChannel) {
            await _presenceChannel.untrack();
            supabase.removeChannel(_presenceChannel);
        }

        _presenceChannel = supabase.channel('chat-room', {
            config: { presence: { key: userId } },
        });

        _presenceChannel.on('presence', { event: 'sync' }, () => {
            const state = _presenceChannel!.presenceState<PresenceUser>();
            const users: PresenceUser[] = Object.values(state)
                .flat()
                .map((p: any) => p as PresenceUser);
            set({ onlineUsers: users });
        });

        await _presenceChannel.subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                _currentPresence = {
                    user_id: userId,
                    username,
                    avatar_url: avatarUrl ?? null,
                    typing: false,
                    online_at: new Date().toISOString(),
                };
                await _presenceChannel!.track(_currentPresence);
            }
        });
    },

    leavePresence: async () => {
        if (_typingTimeout) { clearTimeout(_typingTimeout); _typingTimeout = null; }
        if (_presenceChannel) {
            await _presenceChannel.untrack();
            supabase.removeChannel(_presenceChannel);
            _presenceChannel = null;
        }
        _currentPresence = null;
        set({ onlineUsers: [] });
    },

    setTyping: (isTyping: boolean) => {
        if (!_presenceChannel || !_currentPresence) return;

        if (_typingTimeout) { clearTimeout(_typingTimeout); _typingTimeout = null; }

        const newState = { ..._currentPresence, typing: isTyping };
        _currentPresence = newState;
        _presenceChannel.track(newState);

        if (isTyping) {
            _typingTimeout = setTimeout(() => {
                if (_presenceChannel && _currentPresence) {
                    _currentPresence = { ..._currentPresence, typing: false };
                    _presenceChannel.track(_currentPresence);
                }
            }, 2500);
        }
    },
}));

// ── Helper ────────────────────────────────────────────────────────────────────
async function enrichWithReactions(messages: any[], userId: string | null): Promise<ChatMessage[]> {
    if (!messages.length) return [];

    const ids = messages.map(m => m.id);
    const { data: reactions } = await supabase
        .from('message_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', ids);

    return messages.map(msg => {
        const msgReactions = (reactions ?? []).filter((r: any) => r.message_id === msg.id);
        const grouped: Record<string, { count: number; userReacted: boolean }> = {};
        msgReactions.forEach((r: any) => {
            if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, userReacted: false };
            grouped[r.emoji].count++;
            if (r.user_id === userId) grouped[r.emoji].userReacted = true;
        });
        return {
            ...msg,
            reactions: Object.entries(grouped).map(([emoji, v]) => ({ emoji, ...v })),
        } as ChatMessage;
    });
}
