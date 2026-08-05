import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { BillProvider } from '@/lib/bill-context';

SplashScreen.preventAutoHideAsync();
SplashScreen.hideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <BillProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="review" />
            <Stack.Screen name="assign" />
            <Stack.Screen name="summary" />
            <Stack.Screen name="shared" />
          </Stack>
        </BillProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
