import { Tabs } from 'expo-router';
import React, { createContext, useContext, useState } from 'react';
import { Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AppContextType = {
  activePlayerId: number | null;
  setActivePlayerId: (id: number | null) => void;
};

const AppContext = createContext<AppContextType>({
  activePlayerId: null,
  setActivePlayerId: () => {},
});

export const useApp = () => useContext(AppContext);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);

  return (
    <AppContext.Provider value={{ activePlayerId, setActivePlayerId }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Lobby',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: 'Score',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏓</Text>,
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: 'Rankings',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏆</Text>,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          }}
        />
      </Tabs>
    </AppContext.Provider>
  );
}
