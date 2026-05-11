import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';

export default function AdminTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
  );
}
