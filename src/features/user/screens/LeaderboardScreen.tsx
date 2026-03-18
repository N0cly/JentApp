import React from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native';
import { useLeaderboardStore } from '../store/useLeaderboardStore';
import { useUserStore } from '../store/useUserStore';

export default function LeaderboardScreen() {
    const { players } = useLeaderboardStore();
    const { username, inventory } = useUserStore();

    // On fusionne tes données réelles avec les faux joueurs pour le test
    const allPlayers = [
        ...players.filter(p => p.username !== username),
        { id: 'me', username: username || 'Moi', clopes: inventory.clopes, isMe: true }
    ].sort((a, b) => b.clopes - a.clopes); // Tri du plus riche au plus pauvre

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        const isTop3 = index < 3;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

        return (
            <View style={[styles.playerRow, item.isMe && styles.myRow]}>
                <View style={styles.leftPart}>
                    <Text style={styles.rankText}>{medal || `#${index + 1}`}</Text>
                    <Text style={[styles.nameText, item.isMe && styles.myNameText]}>
                        {item.username} {item.isMe ? '(Toi)' : ''}
                    </Text>
                </View>
                <View style={styles.rightPart}>
                    <Text style={styles.scoreText}>{item.clopes} 🚬</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Classement 🏆</Text>
                <Text style={styles.subtitle}>Qui est le baron de la soirée ?</Text>
            </View>

            <FlatList
                data={allPlayers}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { padding: 20, marginTop: 20 },
    title: { color: '#FFF', fontSize: 32, fontWeight: '900' },
    subtitle: { color: '#666', fontSize: 14, marginTop: 5 },
    list: { padding: 20 },
    playerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#111',
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#222'
    },
    myRow: {
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
    },
    leftPart: { flexDirection: 'row', alignItems: 'center' },
    rankText: { color: '#FFD700', fontWeight: '900', fontSize: 18, marginRight: 15, width: 30 },
    nameText: { color: '#DDD', fontSize: 16, fontWeight: '600' },
    myNameText: { color: '#FFD700', fontWeight: 'bold' },
    rightPart: { alignItems: 'flex-end' },
    scoreText: { color: '#FFF', fontWeight: '900', fontSize: 18 },
});