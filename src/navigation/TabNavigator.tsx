import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {StyleSheet, View} from 'react-native';

// Import de tes futurs écrans
import PortfolioScreen from '../features/user/screens/PortfolioScreen';
import BettingListScreen from '../features/betting/screens/BettingListScreen';
import AdminPanelScreen from '../features/admin/screens/AdminPanelScreen';
import LeaderboardScreen from "../features/user/screens/LeaderboardScreen";
import {useUserStore} from "../features/user/store/useUserStore";

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {

    const role = useUserStore((state) => state.role);
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
        >
            <Tab.Screen
                name="Portfolio"
                component={PortfolioScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
                    tabBarLabel: "Mon Cash"
                }}
            />
            <Tab.Screen
                name="Bets"
                component={BettingListScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="flash" size={size} color={color} />,
                    tabBarLabel: "Paris"
                }}
            />
            <Tab.Screen
                name="Leaderboard"
                component={LeaderboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
                    tabBarLabel: "Classement"
                }}
            />
            {/* Onglet protégé : Ne s'affiche QUE pour admin ou super_admin */}
            {hasAdminAccess && (
                <Tab.Screen
                    name="Admin"
                    component={AdminPanelScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
                        tabBarLabel: "Jenta-Control"
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