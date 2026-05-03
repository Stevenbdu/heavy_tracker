import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="session/[id]"
          options={{ title: 'Séance en cours', headerBackTitle: 'Accueil' }}
        />
        <Stack.Screen
          name="programs/[id]"
          options={{ title: 'Programme', headerBackTitle: 'Programmes' }}
        />
        <Stack.Screen
          name="history/[id]"
          options={{ title: 'Détail séance', headerBackTitle: 'Historique' }}
        />
      </Stack>
    </>
  );
}
