// src/auth/tokenStorage.ts
import * as Keychain from 'react-native-keychain';

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export async function saveTokens(accessToken: string, refreshToken: string) {
  const value: Tokens = { accessToken, refreshToken };
  await Keychain.setGenericPassword('auth', JSON.stringify(value));
}

export async function getTokens(): Promise<Tokens | null> {
  const data = await Keychain.getGenericPassword();
  if (data) {
    try {
      return JSON.parse(data.password) as Tokens;
    } catch {
      return null;
    }
  }
  return null;
}

export async function clearTokens() {
  await Keychain.resetGenericPassword();
}
