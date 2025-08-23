// app/api/pra-contacts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { checkAdmin } from '@/lib/check-admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updatedContact = await DatabaseService.updatePraContact(params.id, {
      name_of_pras,
      pra_contact_person,
      office_head,
      email,
      contact_number
    });

    if (!updatedContact) {
      return NextResponse.json(
        { error: 'PRA contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error('Error updating PRA contact:', error);
    return NextResponse.json(
      { error: 'Failed to update PRA contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const deletedContact = await DatabaseService.deletePraContact(params.id);

    if (!deletedContact) {
      return NextResponse.json(
        { error: 'PRA contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(deletedContact);
  } catch (error) {
    console.error('Error deleting PRA contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete PRA contact' },
      { status: 500 }
    );
  }
}
