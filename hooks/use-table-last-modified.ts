// hooks/use-table-last-modified.ts
import { useState, useEffect } from 'react';

interface UseTableLastModifiedProps {
  tableName: string;
}

export function useTableLastModified({ tableName }: UseTableLastModifiedProps) {
  const [lastModified, setLastModified] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLastModified = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching last modified time for table: ${tableName}`);
      const response = await fetch(`/api/table-last-modified/${tableName}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error for ${tableName}:`, response.status, errorText);
        throw new Error(`Failed to fetch last modified time: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Last modified data for ${tableName}:`, data);
      setLastModified(data.lastModified ? new Date(data.lastModified) : null);
    } catch (err) {
      console.error(`Error fetching last modified for ${tableName}:`, err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLastModified(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLastModified();
  }, [tableName]);

  const refresh = () => {
    fetchLastModified();
  };

  return {
    lastModified,
    loading,
    error,
    refresh
  };
}
