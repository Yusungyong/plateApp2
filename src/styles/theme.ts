// src/styles/theme.ts
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

export const lightColors = {
  background: '#FFFFFF',
  backgroundSoft: '#FAFAFA',
  textPrimary: '#222222',
  textSecondary: '#777777',
  textMuted: '#AAAAAA',

  borderDefault: '#E0E0E0',
  divider: '#E5E5E5',

  brandPrimary: '#FF7F50',
  brandDisabled: '#CCCCCC',

  socialApple: '#000000',
  socialKakao: '#FEE500',
  socialNaver: '#1EC800',
  socialGoogleBorder: '#DDDDDD',
};

export const darkColors: typeof lightColors = {
  background: '#0E0F11',
  backgroundSoft: '#16181C',
  textPrimary: '#F4F5F7',
  textSecondary: '#B3B9C4',
  textMuted: '#7D8491',

  borderDefault: '#2A2E35',
  divider: '#23262C',

  brandPrimary: '#FF8B5E',
  brandDisabled: '#4B4F57',

  socialApple: '#F4F5F7',
  socialKakao: '#FEE500',
  socialNaver: '#1EC800',
  socialGoogleBorder: '#3A3F47',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  pill: 999,
};

export const typography = {
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bodySmall: {
    fontSize: 13,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 14,
  },
};

const createTypography = (colors: typeof lightColors) => ({
  ...typography,
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export type Theme = {
  scheme: 'light' | 'dark';
  colors: typeof lightColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: ReturnType<typeof createTypography>;
};

const ThemeContext = createContext<Theme>({
  scheme: 'light',
  colors: lightColors,
  spacing,
  radius,
  typography: createTypography(lightColors),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scheme = useColorScheme();
  const resolvedScheme: Theme['scheme'] = scheme === 'dark' ? 'dark' : 'light';
  const colors = resolvedScheme === 'dark' ? darkColors : lightColors;
  const typography = useMemo(() => createTypography(colors), [colors]);
  const value = useMemo(
    () => ({
      scheme: resolvedScheme,
      colors,
      spacing,
      radius,
      typography,
    }),
    [resolvedScheme, colors, typography],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
};

export const useTheme = () => useContext(ThemeContext);
