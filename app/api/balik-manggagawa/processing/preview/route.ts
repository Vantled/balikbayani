// app/api/balik-manggagawa/processing/preview/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { ApiResponse } from '@/lib/types'

export async function GET(_request: NextRequest) {
	try {
		const now = new Date()
		const year = now.getFullYear()
		const { rows } = await db.query('SELECT COUNT(*) FROM balik_manggagawa_processing WHERE EXTRACT(YEAR FROM created_at) = $1', [year])
		const next = String(parseInt(rows[0]?.count || '0') + 1).padStart(4, '0')
		const preview = `OR-${year}-${next}`
		return NextResponse.json({ success: true, data: { preview } } as ApiResponse)
	} catch (error) {
		console.error('Error generating OR preview:', error)
		return NextResponse.json({ success: false, error: 'Failed to generate preview' } as ApiResponse, { status: 500 })
	}
}
