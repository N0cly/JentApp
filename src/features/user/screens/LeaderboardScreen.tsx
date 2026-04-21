// src/features/economy/screens/LeaderboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, DeviceEventEmitter, TouchableOpacity } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from "@expo/vector-icons";
import { LeaderRowSkeleton } from '../../../components/SkeletonLoader';
import { AnimatedListItem } from '../../../components/AnimatedListItem';
import UserProfileModal from '../components/UserProfileModal';

export default function LeaderboardScreen() {
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [listKey, setListKey] = useState(0);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const fetchLeaders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('clopes', { ascending: false })
            .limit(20);

        if (!error && data) {
            setLeaders(data);
            setListKey(k => k + 1); // Re-déclenche les animations à chaque refresh
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLeaders();

        const refreshSubscription = DeviceEventEmitter.addListener('refreshLeaderboard', fetchLeaders);

        const sub = supabase
            .channel('leaderboard-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
                fetchLeaders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
            refreshSubscription.remove();
        };
    }, []);

    const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

    const renderItem = ({ item, index }: any) => {
        const isTop3 = index < 3;
        const medalColor = medalColors[index];

        return (
            <AnimatedListItem index={index} delay={40}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setSelectedUserId(item.id)}
                    style={[
                        styles.leaderCard,
                        isTop3 && { borderColor: medalColor + '55', backgroundColor: medalColor + '08' }
                    ]}
                >
                    <View style={styles.rankContainer}>
                        {isTop3 ? (
                            <Ionicons name="trophy" size={22} color={medalColor} />
                        ) : (
                            <Text style={styles.rankText}>#{index + 1}</Text>
                        )}
                    </View>

                    <Text style={[styles.username, isTop3 && { fontWeight: '900', color: '#fff' }]}>
                        {item.username}
                    </Text>

                    <View style={styles.scoreContainer}>
                        <Text style={[styles.clopesCount, isTop3 && { color: medalColor }]}>
                            {item.clopes}🚬
                        </Text>
                    </View>
                </TouchableOpacity>
            </AnimatedListItem>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>CLASSEMENT 🏆</Text>
                <Text style={styles.subtitle}>Qui est le plus gros Jenta ?</Text>
            </View>

            {loading ? (
                <View style={{ padding: 20 }}>
                    {[0, 1, 2, 3, 4, 5].map(i => <LeaderRowSkeleton key={i} />)}
                </View>
            ) : (
                <FlatList
                    key={listKey}
                    data={leaders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    refreshing={loading}
                    onRefresh={fetchLeaders}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ fontSize: 48, textAlign: 'center' }}>🤷</Text>
                            <Text style={styles.emptyText}>Personne pour l'instant</Text>
                        </View>
                    }
                />
            )}

            {/* Modal profil joueur */}
            {selectedUserId && (
                <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#111' },
    title: { color: '#FFD700', fontSize: 28, fontWeight: '900' },
    subtitle: { color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, marginTop: 5 },
    leaderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0d0d0d',
        padding: 15,
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    rankContainer: { width: 40, alignItems: 'center' },
    rankText: { color: '#444', fontWeight: 'bold', fontSize: 14 },
    username: { color: '#ccc', fontSize: 16, flex: 1, marginLeft: 10 },
    scoreContainer: { alignItems: 'flex-end' },
    clopesCount: { color: '#FFD700', fontSize: 18, fontWeight: '900' },
    emptyContainer: { marginTop: 80, alignItems: 'center' },
    emptyText: { color: '#444', marginTop: 12, fontSize: 16 },
});
