// app/(tabs)/_layout.jsx
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { COLORS } from '../../src/theme';

function TabIcon({ emoji, focused }) {
  return (
    <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: focused ? COLORS.primaryLight : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
    </View>
  );
}

function AddIcon() {
  return (
    <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4, elevation: 5, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5 }}>
      <Text style={{ fontSize: 26, color: 'white', lineHeight: 30 }}>+</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { settings } = useApp();
  const insets = useSafeAreaInsets();
  const T = settings?.darkMode ? COLORS.dark : COLORS.light;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: T.card, borderTopWidth: 0.5, borderTopColor: T.border, height: 58 + insets.bottom, paddingBottom: insets.bottom + 4, paddingTop: 6 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: T.text2,
    }}>
      <Tabs.Screen name="index"    options={{ tabBarLabel: 'Customers', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="whatsapp" options={{ tabBarLabel: 'WhatsApp',  tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} /> }} />
      <Tabs.Screen name="add"      options={{ tabBarLabel: 'Add',       tabBarIcon: () => <AddIcon />, tabBarActiveTintColor: COLORS.primary }} />
      <Tabs.Screen name="report"   options={{ tabBarLabel: 'Report',    tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
      <Tabs.Screen name="settings" options={{ tabBarLabel: 'Settings',  tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }} />
    </Tabs>
  );
}
