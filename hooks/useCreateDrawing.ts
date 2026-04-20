import { useRouter } from 'next/navigation';
import { useState } from 'react';

export const useCreateDrawing = () => {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createDrawing = async () => {
    setCreating(true);

    try {
      const response = await fetch('/api/drawings', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`create failed (${response.status})`);
      }

      const { drawing } = await response.json();
      router.push(`/draw/${drawing.id}`);
    } catch (error) {
      setErrorMsg((error as Error).message);
      setCreating(false);
    }
  };

  return {
    clearError: () => setErrorMsg(null),
    createDrawing,
    creating,
    errorMsg,
  };
};
