// hooks/use-balik-manggagawa-processing.ts
import { useEffect, useState } from 'react'
import { BalikManggagawaProcessing } from '@/lib/types'

export function useBalikManggagawaProcessing() {
	const [records, setRecords] = useState<BalikManggagawaProcessing[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

	const fetchRecords = async (
		page = 1,
		limit = 10,
		filters?: { search?: string; types?: string[]; sexes?: string[]; dateFrom?: string; dateTo?: string; destination?: string; address?: string }
	) => {
		setLoading(true)
		setError(null)
		try {
			const params = new URLSearchParams()
			params.set('page', String(page))
			params.set('limit', String(limit))
			if (filters?.search) params.set('search', filters.search)
			if (filters?.types && filters.types.length) params.set('types', filters.types.join(','))
			if (filters?.sexes && filters.sexes.length) params.set('sexes', filters.sexes.join(','))
			if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
			if (filters?.dateTo) params.set('dateTo', filters.dateTo)
			if (filters?.destination) params.set('destination', filters.destination)
			if (filters?.address) params.set('address', filters.address)
			const res = await fetch(`/api/balik-manggagawa/processing?${params.toString()}`)
			const json = await res.json()
			if (json.success) {
				setRecords(json.data.data)
				setPagination(json.data.pagination)
			} else {
				setError(json.error || 'Failed to fetch records')
			}
		} catch (e) {
			setError('Failed to fetch records')
		} finally {
			setLoading(false)
		}
	}

	const createRecord = async (data: { nameOfWorker: string; sex: 'male' | 'female'; address: string; destination: string; }) => {
		setLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/balik-manggagawa/processing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
			const json = await res.json()
			if (json.success) {
				await fetchRecords(1, pagination.limit)
				return { success: true, data: json.data }
			}
			return { success: false, error: json.error }
		} catch (e) {
			return { success: false, error: 'Failed to create record' }
		} finally {
			setLoading(false)
		}
	}

	const updateRecord = async (id: string, data: { nameOfWorker: string; sex: 'male' | 'female'; address: string; destination: string; }) => {
		setLoading(true)
		setError(null)
		try {
			const res = await fetch(`/api/balik-manggagawa/processing/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
			const json = await res.json()
			if (json.success) {
				await fetchRecords(pagination.page, pagination.limit)
				return { success: true, data: json.data }
			}
			return { success: false, error: json.error }
		} catch (e) {
			return { success: false, error: 'Failed to update record' }
		} finally {
			setLoading(false)
		}
	}

	const deleteRecord = async (id: string) => {
		setLoading(true)
		setError(null)
		try {
			const res = await fetch(`/api/balik-manggagawa/processing/${id}`, { method: 'DELETE' })
			const json = await res.json()
			if (json.success) {
				await fetchRecords(pagination.page, pagination.limit)
				return { success: true }
			}
			return { success: false, error: json.error }
		} catch (e) {
			return { success: false, error: 'Failed to delete record' }
		} finally {
			setLoading(false)
		}
	}

	const getProcessingById = async (id: string) => {
		try {
			const res = await fetch(`/api/balik-manggagawa/processing/${id}`)
			const json = await res.json()
			if (json.success) {
				return { success: true, data: json.data }
			}
			return { success: false, error: json.error }
		} catch (e) {
			return { success: false, error: 'Failed to fetch processing record' }
		}
	}

	useEffect(() => { fetchRecords(1, 10) }, [])

	return { records, loading, error, pagination, fetchRecords, createRecord, updateRecord, deleteRecord, getProcessingById }
}
