// App.tsx
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthProvider';
import MainNavigation from './src/navigation/MainNavigation';
import { ThemeProvider } from './src/styles/theme';

const ICON_FONT_READY_TIMEOUT_MS = 2500;

const App = () => {
  const [iconFontsReady, setIconFontsReady] = useState(false);

  useEffect(() => {
    let active = true;
    const platformLabel = Platform.OS;
    const timeout = setTimeout(() => {
      if (active) {
        console.warn(
          `[icons] preload timed out on ${platformLabel}; continuing app startup`,
        );
        setIconFontsReady(true);
      }
    }, ICON_FONT_READY_TIMEOUT_MS);

    Promise.all([Ionicons.loadFont(), FontAwesome.loadFont()])
      .catch(error => {
        console.warn(`[icons] failed to preload ${platformLabel} icon fonts`, error);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) {
          setIconFontsReady(true);
        }
      });

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);

  if (!iconFontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <MainNavigation />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
