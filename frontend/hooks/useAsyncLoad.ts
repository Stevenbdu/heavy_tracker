import { useState, useCallback, DependencyList } from 'react';
import { useFocusEffect } from 'expo-router';

type AsyncLoadResult<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
};

export function useAsyncLoad<T>(
  fetchFn: () => Promise<T>,
  deps: DependencyList = []
): AsyncLoadResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { data, loading, refreshing, refresh };
}
