// app/api/users/[id]/permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

function getUserFromRequest(request: NextRequest) {
  const userCookie = request.cookies.get('bb_user');
  if (!userCookie?.value) return null;
  try {
    return JSON.parse(userCookie.value);
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const permissions = await DatabaseService.getUserPermissions(id);

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch permissions' }, { status: 500 });
  }
}
