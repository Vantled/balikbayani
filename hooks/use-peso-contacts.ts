// hooks/use-peso-contacts.ts
import { useState, useEffect } from 'react';
import { PesoContact } from '@/lib/types';

interface UsePesoContactsReturn {
  contacts: PesoContact[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  createContact: (data: Omit<PesoContact, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateContact: (id: string, data: Partial<PesoContact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  refreshContacts: () => Promise<void>;
  searchContacts: (searchTerm: string) => Promise<void>;
  filterContacts: (filterQuery: string) => Promise<void>;
  fetchContacts: (page?: number, limit?: number, searchTerm?: string) => Promise<void>;
}

export function usePesoContacts(): UsePesoContactsReturn {
  const [contacts, setContacts] = useState<PesoContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchContacts = async (page: number = 1, limit: number = 10, searchTerm?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const url = `/api/peso-contacts?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch PESO contacts');
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

  const createContact = async (data: Omit<PesoContact, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      
      const response = await fetch('/api/peso-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create PESO contact');
      }
      
      await fetchContacts(1, pagination.limit); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateContact = async (id: string, data: Partial<PesoContact>) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/peso-contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update PESO contact');
      }
      
      await fetchContacts(1, pagination.limit); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/peso-contacts/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete PESO contact');
      }
      
      await fetchContacts(1, pagination.limit); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const searchContacts = async (searchTerm: string) => {
    await fetchContacts(1, pagination.limit, searchTerm);
  };

  const filterContacts = async (filterQuery: string) => {
    await fetchContacts(1, pagination.limit, filterQuery);
  };

  useEffect(() => {
    fetchContacts(1, 10);
  }, []);

  return {
    contacts,
    loading,
    error,
    pagination,
    createContact,
    updateContact,
    deleteContact,
    refreshContacts: () => fetchContacts(1, pagination.limit),
    searchContacts,
    filterContacts,
    fetchContacts,
  };
}
