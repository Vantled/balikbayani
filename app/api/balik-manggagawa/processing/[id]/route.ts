// app/api/balik-manggagawa/processing/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const record = await DatabaseService.getBalikManggagawaProcessingById(id);
		if (!record) {
			return NextResponse.json({ success: false, error: 'Record not found' } satisfies ApiResponse, { status: 404 });
		}
		return NextResponse.json({ success: true, data: record } satisfies ApiResponse);
	} catch (error) {
		console.error('Error fetching processing record:', error);
		return NextResponse.json({ success: false, error: 'Failed to fetch processing record' } satisfies ApiResponse, { status: 500 });
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const { nameOfWorker, sex, address, destination } = body;
		if (!nameOfWorker || !sex || !address || !destination) {
			return NextResponse.json({ success: false, error: 'All fields are required' } satisfies ApiResponse, { status: 400 });
		}
		if (!['male', 'female'].includes(sex)) {
			return NextResponse.json({ success: false, error: 'Sex must be either male or female' } satisfies ApiResponse, { status: 400 });
		}
		const updated = await DatabaseService.updateBalikManggagawaProcessing(id, { nameOfWorker, sex, address, destination });
		if (!updated) {
			return NextResponse.json({ success: false, error: 'Record not found' } satisfies ApiResponse, { status: 404 });
		}
		return NextResponse.json({ success: true, data: updated, message: 'Processing record updated successfully' } satisfies ApiResponse);
	} catch (error) {
		console.error('Error updating processing record:', error);
		return NextResponse.json({ success: false, error: 'Failed to update processing record' } satisfies ApiResponse, { status: 500 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const deleted = await DatabaseService.deleteBalikManggagawaProcessing(id);
		if (!deleted) {
			return NextResponse.json({ success: false, error: 'Record not found' } satisfies ApiResponse, { status: 404 });
		}
		return NextResponse.json({ success: true, message: 'Processing record deleted successfully' } satisfies ApiResponse);
	} catch (error) {
		console.error('Error deleting processing record:', error);
		return NextResponse.json({ success: false, error: 'Failed to delete processing record' } satisfies ApiResponse, { status: 500 });
	}
}
