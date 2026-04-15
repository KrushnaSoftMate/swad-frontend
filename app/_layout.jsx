// app/_layout.jsx
import { Stack } from 'expo-router';
import { AppProvider } from '../src/context/AppContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="customer/[id]" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="customer/edit/[id]" options={{ headerShown: false, presentation: 'card' }} />
        </Stack>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
