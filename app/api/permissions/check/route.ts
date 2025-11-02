// app/api/permissions/check/route.ts
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

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { permission_key } = body;

    if (!permission_key) {
      return NextResponse.json({ success: false, error: 'Permission key is required' }, { status: 400 });
    }

    const hasPermission = await DatabaseService.hasPermission(user.id, permission_key);

    return NextResponse.json({
      success: true,
      data: { hasPermission }
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json({ success: false, error: 'Failed to check permission' }, { status: 500 });
  }
}
