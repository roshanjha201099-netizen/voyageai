import { useEffect, useRef } from 'react';

export interface UseSyncRevalidationOptions {
  onFocus?: () => void;
  onStorageChange?: (key: string | null, newValue: string | null) => void;
}

export function useSyncRevalidation({ onFocus, onStorageChange }: UseSyncRevalidationOptions) {
  const onFocusRef = useRef(onFocus);
  const onStorageChangeRef = useRef(onStorageChange);

  useEffect(() => {
    onFocusRef.current = onFocus;
    onStorageChangeRef.current = onStorageChange;
  }, [onFocus, onStorageChange]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && onFocusRef.current) {
        onFocusRef.current();
      }
    };

    const handleWindowFocus = () => {
      if (onFocusRef.current) {
        onFocusRef.current();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (onStorageChangeRef.current) {
        onStorageChangeRef.current(event.key, event.newValue);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
}
