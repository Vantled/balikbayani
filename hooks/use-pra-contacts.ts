// hooks/use-pra-contacts.ts
import { useState, useEffect } from 'react';
import { PraContact } from '@/lib/types';

interface UsePraContactsReturn {
  contacts: PraContact[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  createContact: (data: Omit<PraContact, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateContact: (id: string, data: Partial<PraContact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  refreshContacts: () => Promise<void>;
  searchContacts: (searchTerm: string, showDeletedOnly?: boolean) => Promise<void>;
  fetchContacts: (page?: number, limit?: number, searchTerm?: string, showDeletedOnly?: boolean) => Promise<void>;
}

export function usePraContacts(): UsePraContactsReturn {
  const [contacts, setContacts] = useState<PraContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchContacts = async (page: number = 1, limit: number = 10, searchTerm?: string, showDeletedOnly: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        showDeletedOnly: showDeletedOnly.toString()
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const url = `/api/pra-contacts?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch PRA contacts');
      }
      
      const data = await response.json();
      setContacts(data.data || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createContact = async (data: Omit<PraContact, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      
      const response = await fetch('/api/pra-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create PRA contact');
      }
      
      await fetchContacts(1, pagination.limit, undefined, false); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateContact = async (id: string, data: Partial<PraContact>) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/pra-contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update PRA contact');
      }
      
      await fetchContacts(1, pagination.limit, undefined, false); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/pra-contacts/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete PRA contact');
      }
      
      await fetchContacts(1, pagination.limit, undefined, false); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const searchContacts = async (searchTerm: string, showDeletedOnly: boolean = false) => {
    await fetchContacts(1, pagination.limit, searchTerm, showDeletedOnly);
  };

  useEffect(() => {
    fetchContacts(1, 10, undefined, false);
  }, []);

  return {
    contacts,
    loading,
    error,
    pagination,
    createContact,
    updateContact,
    deleteContact,
    refreshContacts: () => fetchContacts(1, pagination.limit, undefined, false),
    searchContacts,
    fetchContacts,
  };
}
