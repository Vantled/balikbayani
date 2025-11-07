// app/api/peso-contacts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { checkAdmin } from '@/lib/check-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contact = await DatabaseService.getPesoContactById(id);
    
    if (!contact) {
      return NextResponse.json(
        { error: 'PESO contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error fetching PESO contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PESO contact' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check admin permissions
    const adminCheck = await checkAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { province, peso_office, office_head, email, contact_number, emails, contacts, office_heads } = body;

    // Validate required fields
    if (!province || !peso_office || !office_head || !email || !contact_number) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const contact = await DatabaseService.updatePesoContact(id, {
      province,
      peso_office,
      office_head,
      email,
      contact_number,
      emails: emails || [],
      contacts: contacts || [],
      office_heads: office_heads || []
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'PESO contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error updating PESO contact:', error);
    return NextResponse.json(
      { error: 'Failed to update PESO contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check admin permissions
    const adminCheck = await checkAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const success = await DatabaseService.deletePesoContact(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'PESO contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'PESO contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting PESO contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete PESO contact' },
      { status: 500 }
    );
  }
}
