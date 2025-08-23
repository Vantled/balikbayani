// app/api/table-last-modified/[table]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { AuthService } from '@/lib/services/auth-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    console.log(`API called for table: ${table}`);
    
    // Get token from cookies
    const token = request.cookies.get('bb_auth_token')?.value;
    
    if (!token) {
      console.log('No auth token found in cookies');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);

    if (!user) {
      console.log('Invalid session token');
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    // Validate table name to prevent SQL injection
    const allowedTables = ['job_fairs', 'job_fair_monitoring', 'peso_contacts', 'pra_contacts'];
    if (!allowedTables.includes(table)) {
      console.log(`Invalid table name: ${table}`);
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    const lastModified = await DatabaseService.getTableLastModified(table);
    console.log(`Last modified for ${table}:`, lastModified);
    
    return NextResponse.json({ 
      table,
      lastModified: lastModified ? lastModified.toISOString() : null 
    });
  } catch (error) {
    console.error('Error getting table last modified time:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
