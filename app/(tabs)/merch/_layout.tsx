import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';

export default function MerchLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
  );
}
