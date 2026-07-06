import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="alert/[id]" />
      <Stack.Screen name="validate/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
