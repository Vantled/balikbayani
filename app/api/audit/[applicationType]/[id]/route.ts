// app/api/audit/[applicationType]/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { AuthService } from '@/lib/services/auth-service';
import { isSuperadmin } from '@/lib/auth';
import type { ApiResponse, ApplicationTransaction } from '@/lib/types';

const TABLE_MAP: Record<string, string> = {
  'direct-hire': 'direct_hire_applications',
  'balik-manggagawa': 'balik_manggagawa_clearance',
  'gov-to-gov': 'gov_to_gov_applications',
  'information-sheet': 'information_sheet_records',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationType: string; id: string }> }
): Promise<NextResponse<ApiResponse<ApplicationTransaction[]>>> {
  try {
    const { applicationType, id } = await params;
    const tableName = TABLE_MAP[applicationType];

    if (!tableName) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported application type: ${applicationType}`,
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200);

    const logs = await DatabaseService.getAuditLogsForRecord(tableName, id, limit);

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load audit logs',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ applicationType: string; id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await AuthService.validateSession(token);
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { applicationType, id } = await params;
    const tableName = TABLE_MAP[applicationType];

    if (!tableName) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported application type: ${applicationType}`,
        },
        { status: 400 }
      );
    }

    const deletedCount = await DatabaseService.deleteAuditLogsForRecord(tableName, id);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} audit log entries`,
    });
  } catch (error) {
    console.error('Error deleting audit logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete audit logs',
      },
      { status: 500 }
    );
  }
}

