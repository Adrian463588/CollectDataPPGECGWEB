"use client";

import { useState, useCallback } from "react";

export function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(
      promise: Promise<T>,
      defaultErrorMessage: string = "An error occurred"
    ): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const result = await promise;
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : defaultErrorMessage;
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, run, clearError };
}
