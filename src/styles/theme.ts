// src/styles/theme.ts

export const colors = {
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

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
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
  subtitle: {
    fontSize: 13,
    color: '#888888',
  },
  label: {
    fontSize: 13,
    color: '#555555',
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bodySmall: {
    fontSize: 13,
  },
};
