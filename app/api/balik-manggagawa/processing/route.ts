// app/api/balik-manggagawa/processing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '10');

		const result = await DatabaseService.getProcessingRecords({ page, limit });

		const response: ApiResponse = { success: true, data: result };
		return NextResponse.json(response);
	} catch (error) {
		console.error('Error fetching processing records:', error);
		return NextResponse.json({ success: false, error: 'Failed to fetch processing records' } satisfies ApiResponse, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { nameOfWorker, sex, address, destination } = body;

		if (!nameOfWorker || !sex || !address || !destination) {
			return NextResponse.json({ success: false, error: 'All fields are required' } satisfies ApiResponse, { status: 400 });
		}
		if (!['male', 'female'].includes(sex)) {
			return NextResponse.json({ success: false, error: 'Sex must be either male or female' } satisfies ApiResponse, { status: 400 });
		}

		const record = await DatabaseService.createBalikManggagawaProcessing({ nameOfWorker, sex, address, destination });
		return NextResponse.json({ success: true, data: record, message: 'Processing record created successfully' } satisfies ApiResponse, { status: 201 });
	} catch (error) {
		console.error('Error creating processing record:', error);
		return NextResponse.json({ success: false, error: 'Failed to create processing record' } satisfies ApiResponse, { status: 500 });
	}
}
