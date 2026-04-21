import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, DeviceEventEmitter } from 'react-native';

import PortfolioScreen from '../features/user/screens/PortfolioScreen';
import BettingListScreen from '../features/betting/screens/BettingListScreen';
import AdminPanelScreen from '../features/admin/screens/AdminPanelScreen';
import LeaderboardScreen from '../features/user/screens/LeaderboardScreen';
import ChatScreen from '../features/chat/screens/ChatScreen';
import ShopScreen from '../features/shop/screens/ShopScreen';

import { useUserStore } from '../features/user/store/useUserStore';
import { useBetStore } from '../features/betting/store/useBetStore';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const role = useUserStore((state) => state.role);
    const fetchProfile = useUserStore((state) => state.fetchProfile);
    const userId = useUserStore((state) => state.userId);
    const fetchBets = useBetStore((state) => state.fetchBets);
    const fetchUserBets = useBetStore((state) => state.fetchUserBets);
    const hasAdminAccess = role === 'admin' || role === 'super_admin';

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: '#FFD700',
                tabBarInactiveTintColor: '#666',
                tabBarBackground: () => (
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                ),
            }}
            screenListeners={({ navigation, route }) => ({
                tabPress: () => {
                    const isFocused = navigation.isFocused();
                    if (isFocused) {
                        if (route.name === 'Portfolio') fetchProfile();
                        else if (route.name === 'Bets') {
                            fetchBets();
                            if (userId) fetchUserBets(userId);
                        } else if (route.name === 'Leaderboard') {
                            DeviceEventEmitter.emit('refreshLeaderboard');
                        }
                    }
                },
            })}
        >
            <Tab.Screen
                name="Portfolio"
                component={PortfolioScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
                    tabBarLabel: 'Profil',
                }}
            />
            <Tab.Screen
                name="Bets"
                component={BettingListScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="flash" size={size} color={color} />,
                    tabBarLabel: 'Paris',
                }}
            />
            <Tab.Screen
                name="Chat"
                component={ChatScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
                    tabBarLabel: 'Chat',
                }}
            />
            <Tab.Screen
                name="Shop"
                component={ShopScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
                    tabBarLabel: 'Boutique',
                }}
            />
            <Tab.Screen
                name="Leaderboard"
                component={LeaderboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
                    tabBarLabel: 'Classement',
                }}
            />
            {hasAdminAccess && (
                <Tab.Screen
                    name="Admin"
                    component={AdminPanelScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
                        tabBarLabel: 'Jenta-Control',
                    }}
                />
            )}
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        borderTopWidth: 0,
        elevation: 0,
        height: 85,
        paddingBottom: 25,
        backgroundColor: 'transparent',
    },
});
