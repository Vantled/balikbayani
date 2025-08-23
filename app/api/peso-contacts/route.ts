// app/api/peso-contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { checkAdmin } from '@/lib/check-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10'); // Default to 10 contacts per page
    const search = searchParams.get('search') || undefined;

    const pagination = { page, limit, search };
    
    const response = await DatabaseService.getPesoContacts(pagination);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching PESO contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PESO contacts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin permissions
    const adminCheck = await checkAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { province, peso_office, office_head, email, contact_number, emails, contacts } = body;

    // Validate required fields
    if (!province || !peso_office || !office_head || !email || !contact_number) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const contact = await DatabaseService.createPesoContact({
      province,
      peso_office,
      office_head,
      email,
      contact_number,
      emails: emails || [],
      contacts: contacts || []
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating PESO contact:', error);
    return NextResponse.json(
      { error: 'Failed to create PESO contact' },
      { status: 500 }
    );
  }
}
