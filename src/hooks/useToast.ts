import { useState, useCallback } from 'react';

export function useToast(duration = 3000) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    const timer = setTimeout(() => setMessage(null), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return { message, showToast };
}
