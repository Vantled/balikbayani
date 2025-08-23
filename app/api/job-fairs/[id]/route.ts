// app/api/job-fairs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { AuthService } from '@/lib/services/auth-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await DatabaseService.getJobFairById(id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Job fair record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching job fair record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job fair record' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from cookies
    const token = request.cookies.get('bb_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const {
      date,
      venue,
      office_head,
      emails,
      contacts
    } = body;

    // Validate required fields
    if (!date || !venue || !office_head) {
      return NextResponse.json(
        { error: 'Date, venue, and office head are required' },
        { status: 400 }
      );
    }

    // Validate emails if provided
    const emailsArray = Array.isArray(emails) ? emails : [];
    for (const email of emailsArray) {
      if (!email.email_address) {
        return NextResponse.json(
          { error: 'Email address is required for each email' },
          { status: 400 }
        );
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.email_address)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Validate contacts if provided
    const contactsArray = Array.isArray(contacts) ? contacts : [];
    for (const contact of contactsArray) {
      if (!contact.contact_category || !contact.contact_number) {
        return NextResponse.json(
          { error: 'Contact category and number are required for each contact' },
          { status: 400 }
        );
      }
    }

    const jobFairData = {
      date: new Date(date),
      venue: venue.trim(),
      office_head: office_head.trim(),
      emails: emailsArray,
      contacts: contactsArray
    };

    const { id } = await params;
    const result = await DatabaseService.updateJobFair(id, jobFairData);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Job fair record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating job fair record:', error);
    return NextResponse.json(
      { error: 'Failed to update job fair record' },
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
    
    // Get token from cookies
    const token = request.cookies.get('bb_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const result = await DatabaseService.deleteJobFair(id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Job fair record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Job fair record deleted successfully' });
  } catch (error) {
    console.error('Error deleting job fair record:', error);
    return NextResponse.json(
      { error: 'Failed to delete job fair record' },
      { status: 500 }
    );
  }
}
