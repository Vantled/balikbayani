// app/api/job-fairs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { AuthService } from '@/lib/services/auth-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const showDeletedOnly = searchParams.get('showDeletedOnly') === 'true';

    const result = await DatabaseService.getJobFairs({ page, limit, search, showDeletedOnly });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching job fairs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job fairs data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const result = await DatabaseService.createJobFair(jobFairData);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating job fair:', error);
    return NextResponse.json(
      { error: 'Failed to create job fair record' },
      { status: 500 }
    );
  }
}
