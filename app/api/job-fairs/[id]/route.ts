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
    
    // Format date as string to avoid timezone issues when serializing to JSON
    // Extract date part using local timezone methods
    const resultDate = result.date;
    const year = resultDate.getFullYear();
    const month = String(resultDate.getMonth() + 1).padStart(2, '0');
    const day = String(resultDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return NextResponse.json({
      ...result,
      date: dateStr // Return as string to avoid timezone shifts
    });
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

    // Parse date string (YYYY-MM-DD) to ensure correct date handling
    // PostgreSQL DATE type stores just the date, so we need to ensure no timezone shifts
    // Send the date string directly to PostgreSQL - it will handle the conversion
    // For PostgreSQL DATE type, we can send the string directly to avoid timezone issues
    let dateValue: string | Date;
    if (typeof date === 'string') {
      // If it's already in YYYY-MM-DD format, use it directly
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Send as string to PostgreSQL - it will handle DATE conversion correctly
        dateValue = date;
      } else {
        // Parse and extract date part
        const dateObj = new Date(date);
        dateValue = dateObj.toISOString().split('T')[0];
      }
    } else {
      // If it's a Date object, extract the date part
      dateValue = new Date(date).toISOString().split('T')[0];
    }
    
    const jobFairData = {
      date: dateValue, // Send as YYYY-MM-DD string to avoid timezone issues
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
    
    // Format date as string to avoid timezone issues when serializing to JSON
    // Extract date part using local timezone methods
    const resultDate = result.date;
    const year = resultDate.getFullYear();
    const month = String(resultDate.getMonth() + 1).padStart(2, '0');
    const day = String(resultDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return NextResponse.json({
      ...result,
      date: dateStr // Return as string to avoid timezone shifts
    });
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
