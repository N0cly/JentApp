// src/features/economy/screens/LeaderboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, Image, DeviceEventEmitter } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from "@expo/vector-icons";

export default function LeaderboardScreen() {
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('clopes', { ascending: false }) // On trie par les plus riches
            .limit(20);

        if (!error && data) {
            setLeaders(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLeaders();

        // Écouter l'événement de rafraîchissement depuis la barre de navigation
        const refreshSubscription = DeviceEventEmitter.addListener('refreshLeaderboard', fetchLeaders);

        // Realtime : si quelqu'un gagne un pari, le classement bouge en direct !
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

    const renderItem = ({ item, index }: any) => {
        const isTop3 = index < 3;
        const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

        return (
            <View style={styles.leaderCard}>
                <View style={styles.rankContainer}>
                    {isTop3 ? (
                        <Ionicons name="trophy" size={20} color={medalColors[index]} />
                    ) : (
                        <Text style={styles.rankText}>#{index + 1}</Text>
                    )}
                </View>

                <Text style={[styles.username, isTop3 && { fontWeight: '900' }]}>
                    {item.username}
                </Text>

                <View style={styles.scoreContainer}>
                    <Text style={styles.clopesCount}>{item.clopes}🚬</Text>
                    {/*<Text style={styles.secondaryCount}>{item.joints}🌿 • {item.packets}📦</Text>*/}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>CLASSEMENT 🏆</Text>
                <Text style={styles.subtitle}>Qui est le plus gros Jenta ?</Text>
            </View>

            <FlatList
                data={leaders}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20 , height: '89%', overflow: 'scroll'}}
                refreshing={loading}
                onRefresh={fetchLeaders}
            />
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
        backgroundColor: '#111',
        padding: 15,
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#222'
    },
    rankContainer: { width: 40, alignItems: 'center' },
    rankText: { color: '#444', fontWeight: 'bold' },
    username: { color: '#FFF', fontSize: 16, flex: 1, marginLeft: 10 },
    scoreContainer: { alignItems: 'flex-end' },
    clopesCount: { color: '#FFD700', fontSize: 18, fontWeight: '900' },
    secondaryCount: { color: '#444', fontSize: 10, marginTop: 2 }
});