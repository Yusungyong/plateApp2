// src/screens/home/hooks/useMapSearch.ts
import { useState, useEffect } from 'react';
import { fetchStoreSuggestions, type StoreSuggestion } from '../../../api/mapStoreApi';

const SUGGEST_LIMIT = 8;

export const useMapSearch = (searchTerm: string, interactive: boolean) => {
  const [suggestions, setSuggestions] = useState<StoreSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSearchedTerm, setLastSearchedTerm] = useState('');

  useEffect(() => {
    if (!interactive) {
      return;
    }

    const keyword = searchTerm.trim();
    if (!keyword) {
      setSuggestions([]);
      setLoading(false);
      setLastSearchedTerm('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLastSearchedTerm(keyword);

    const timeout = setTimeout(async () => {
      try {
        const result = await fetchStoreSuggestions({ keyword, limit: SUGGEST_LIMIT });
        if (!cancelled) {
          setSuggestions(result);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [interactive, searchTerm]);

  return { suggestions, loading, lastSearchedTerm };
};
