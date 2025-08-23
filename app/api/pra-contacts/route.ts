// app/api/pra-contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { checkAdmin } from '@/lib/check-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const result = await DatabaseService.getPraContacts({ 
      page, 
      limit, 
      search 
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching PRA contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PRA contacts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name_of_pras, pra_contact_person, office_head, email, contact_number } = body;

    if (!name_of_pras || !pra_contact_person || !office_head || !email || !contact_number) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const newContact = await DatabaseService.createPraContact({
      name_of_pras,
      pra_contact_person,
      office_head,
      email,
      contact_number
    });

    return NextResponse.json(newContact, { status: 201 });
  } catch (error) {
    console.error('Error creating PRA contact:', error);
    return NextResponse.json(
      { error: 'Failed to create PRA contact' },
      { status: 500 }
    );
  }
}
