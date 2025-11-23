// hooks/use-gov-to-gov.ts
"use client"
import { useCallback, useEffect, useState } from 'react'

export interface GovToGovListItem {
  id: string
  last_name: string
  first_name: string
  middle_name?: string
  sex: string
  with_taiwan_work_experience: boolean
}

export function useGovToGov(filters: any = {}) {
  const [items, setItems] = useState<GovToGovListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      // Add pagination parameters
      const page = filters.page || 1
      const limit = filters.limit || 10
      params.append('page', String(page))
      params.append('limit', String(limit))
      
      // Add filter parameters
      if (filters.search) params.append('search', filters.search)
      if (filters.sex) params.append('sex', filters.sex)
      if (filters.educational_attainment) params.append('educational_attainment', filters.educational_attainment)
      if (filters.with_taiwan_work_experience !== undefined) params.append('with_taiwan_work_experience', String(filters.with_taiwan_work_experience))
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      if (filters.include_deleted === true) params.append('include_deleted', 'true')
      if (filters.include_deleted === false) params.append('include_deleted', 'false')
      if (filters.include_active === false) params.append('include_active', 'false')
      
      const url = `/api/gov-to-gov${params.toString() ? '?' + params.toString() : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data?.success) {
        setItems(data.data.data || [])
        setPagination(data.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        })
      }
    } finally {
      setLoading(false)
    }
  }, [filters])

  const create = useCallback(async (payload: any) => {
    const res = await fetch('/api/gov-to-gov', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (data?.success) await refresh()
    return data
  }, [refresh])

  const update = useCallback(async (id: string, payload: any) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/gov-to-gov/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data?.success) await refresh()
      return data
    } finally {
      setLoading(false)
    }
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/gov-to-gov/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data?.success) await refresh()
      return data
    } finally {
      setLoading(false)
    }
  }, [refresh])

  useEffect(() => { refresh() }, [refresh])

  return { items, loading, pagination, refresh, create, update, remove }
}


