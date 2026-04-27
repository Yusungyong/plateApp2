import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCH_KEY = 'search:recentKeywords';
const DEFAULT_LIMIT = 8;

const normalizeKeyword = (value: string) => value.trim();

export const loadRecentKeywords = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(RECENT_SEARCH_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === 'string').map(normalizeKeyword).filter(Boolean);
  } catch {
    return [];
  }
};

export const saveRecentKeyword = async (
  keyword: string,
  limit: number = DEFAULT_LIMIT,
): Promise<string[]> => {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return loadRecentKeywords();
  const current = await loadRecentKeywords();
  const next = [normalized, ...current.filter((item) => item !== normalized)].slice(0, limit);
  await AsyncStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
  return next;
};

export const clearRecentKeywords = async (): Promise<void> => {
  await AsyncStorage.removeItem(RECENT_SEARCH_KEY);
};

export const removeRecentKeyword = async (
  keyword: string,
  limit: number = DEFAULT_LIMIT,
): Promise<string[]> => {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return loadRecentKeywords();
  const current = await loadRecentKeywords();
  const next = current.filter((item) => item !== normalized).slice(0, limit);
  await AsyncStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
  return next;
};
