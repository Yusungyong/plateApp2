// App.tsx
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthProvider';
import MainNavigation from './src/navigation/MainNavigation';
import { ThemeProvider } from './src/styles/theme';

const App = () => {
  const [iconFontsReady, setIconFontsReady] = useState(false);

  useEffect(() => {
    let active = true;
    const platformLabel = Platform.OS;

    Promise.all([Ionicons.loadFont(), FontAwesome.loadFont()])
      .catch(error => {
        console.warn(`[icons] failed to preload ${platformLabel} icon fonts`, error);
      })
      .finally(() => {
        if (active) {
          setIconFontsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!iconFontsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <MainNavigation />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
