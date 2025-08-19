// app/api/balik-manggagawa/clearance/preview/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { ApiResponse } from '@/lib/types'

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const type = searchParams.get('type') || ''
		if (!type) {
			return NextResponse.json({ success: false, error: 'type is required' } as ApiResponse, { status: 400 })
		}

		const now = new Date()
		const year = now.getFullYear()
		const month = String(now.getMonth() + 1).padStart(2, '0')
		const day = String(now.getDate()).padStart(2, '0')

		const { rows: monthlyRows } = await db.query(
			`SELECT COUNT(*) FROM balik_manggagawa_clearance
			 WHERE clearance_type = $1 AND EXTRACT(YEAR FROM created_at) = $2 AND EXTRACT(MONTH FROM created_at) = $3`,
			[type, year, parseInt(month)]
		)
		const { rows: yearlyRows } = await db.query(
			`SELECT COUNT(*) FROM balik_manggagawa_clearance
			 WHERE clearance_type = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
			[type, year]
		)
		const monthlyCount = String(parseInt(monthlyRows[0]?.count || '0') + 1).padStart(3, '0')
		const yearlyCount = String(parseInt(yearlyRows[0]?.count || '0') + 1).padStart(3, '0')

		let prefix = 'BM'
		let delimiter: ' ' | '-' = '-'
		switch (type) {
			case 'watchlisted_employer': prefix = 'WE'; delimiter = ' '; break
			case 'seafarer_position': prefix = 'SP'; delimiter = '-'; break
			case 'non_compliant_country': prefix = 'NCC'; delimiter = ' '; break
			case 'no_verified_contract': prefix = 'NVEC'; delimiter = '-'; break
			case 'for_assessment_country': prefix = 'FAC'; delimiter = ' '; break
			case 'critical_skill': prefix = 'CS'; delimiter = '-'; break
			case 'watchlisted_similar_name': prefix = 'WSN'; delimiter = '-'; break
		}

		const preview = `${prefix}${delimiter}${year}-${month}${day}-${monthlyCount}-${yearlyCount}`
		return NextResponse.json({ success: true, data: { preview } } as ApiResponse)
	} catch (error) {
		console.error('Error generating clearance preview:', error)
		return NextResponse.json({ success: false, error: 'Failed to generate preview' } as ApiResponse, { status: 500 })
	}
}
