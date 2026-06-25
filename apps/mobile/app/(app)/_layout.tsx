import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { HERMES } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: HERMES.blue,
        tabBarInactiveTintColor: HERMES.gray400,
        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopColor: HERMES.gray200,
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts/index"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bell-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts/[id]"
        options={{
          href: null,
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
