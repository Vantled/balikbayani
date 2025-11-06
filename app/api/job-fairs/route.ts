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
    
    // Format dates as strings to avoid timezone issues when serializing to JSON
    const formattedData = result.data.map(jobFair => {
      const date = jobFair.date;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      return {
        ...jobFair,
        date: dateStr // Return as string to avoid timezone shifts
      };
    });
    
    return NextResponse.json({
      ...result,
      data: formattedData
    });
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

    // Parse date string (YYYY-MM-DD) to ensure correct date handling
    // PostgreSQL DATE type stores just the date, so we need to ensure no timezone shifts
    // Send the date string directly to PostgreSQL - it will handle the conversion
    // For PostgreSQL DATE type, we can send the string directly or use a Date object
    // But to avoid timezone issues, let's send it as a string in YYYY-MM-DD format
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
