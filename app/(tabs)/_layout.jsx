// app/(tabs)/_layout.jsx
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { COLORS } from '../../src/theme';

function TabIcon({ emoji, focused }) {
  return (
    <View style={{
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: focused ? COLORS.primaryLight : 'transparent',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: 19 }}>{emoji}</Text>
    </View>
  );
}

function AddIcon({ focused }) {
  return (
    <View style={{
      width: 46, height: 46, borderRadius: 14,
      backgroundColor: COLORS.primary,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 8,
      elevation: 6,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
    }}>
      <Text style={{ fontSize: 28, color: 'white', lineHeight: 32 }}>+</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { settings } = useApp();
  const isDark = settings?.darkMode;
  const T = isDark ? COLORS.dark : COLORS.light;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: T.card,
        borderTopWidth: 0.5,
        borderTopColor: T.border,
        height: 70,
        paddingBottom: 10,
        paddingTop: 6,
      },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: T.text2,
    }}>
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Customers', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="whatsapp" options={{ tabBarLabel: 'WhatsApp', tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} /> }} />
      <Tabs.Screen name="add" options={{ tabBarLabel: 'Add', tabBarIcon: ({ focused }) => <AddIcon focused={focused} />, tabBarActiveTintColor: COLORS.primary }} />
      <Tabs.Screen name="report" options={{ tabBarLabel: 'Report', tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
      <Tabs.Screen name="settings" options={{ tabBarLabel: 'Settings', tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }} />
    </Tabs>
  );
}
