# BalikBayani Portal - Backend Setup Guide

## Overview
This guide will help you set up the complete backend infrastructure for the BalikBayani Portal, including PostgreSQL database, API routes, and authentication system.

## Prerequisites

### 1. PostgreSQL Database
- Install PostgreSQL (version 12 or higher)
- Create a new database named `balikbayani`
- Ensure PostgreSQL service is running

### 2. Node.js Environment
- Node.js version 18 or higher
- npm or pnpm package manager

## Installation Steps

### 1. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 2. Environment Configuration
1. Copy the example environment file:
```bash
cp env.example .env.local
```

2. Update `.env.local` with your database credentials:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=balikbayani
DB_USER=postgres
DB_PASSWORD=your_actual_password

# Application Configuration
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# Security Configuration
JWT_SECRET=your_jwt_secret_here
BCRYPT_ROUNDS=12

# Development Configuration
NODE_ENV=development
```

### 3. Database Setup
1. Create the database:
```sql
CREATE DATABASE balikbayani;
```

2. Initialize the database schema:
```bash
# Option 1: Run the initialization script
npx tsx lib/init-db.ts

# Option 2: Execute schema manually
psql -d balikbayani -f lib/schema.sql
```

### 4. Start the Development Server
```bash
npm run dev
# or
pnpm dev
```

## Database Schema

The database includes the following main tables:

### Core Tables
- **users** - User authentication and management
- **direct_hire_applications** - Direct hire applications
- **personal_info** - Personal information for direct hire
- **employment_info** - Employment details for direct hire

### Balik Manggagawa Module
- **balik_manggagawa_clearance** - Clearance applications
- **balik_manggagawa_processing** - Processing records
- **counter_monitoring** - Counter monitoring data

### Gov to Gov Module
- **gov_to_gov_applications** - Government to government applications
- **taiwan_work_experience** - Taiwan work experience records
- **job_experience** - Other job experience records

### Information Sheet Module
- **information_sheet_records** - Information sheet requests
- **actions_taken** - Actions taken on requests

### Job Fairs Module
- **job_fairs** - Job fair events
- **peso_contacts** - PESO contact information
- **pra_contacts** - PRA contact information
- **job_fair_monitoring** - Job fair monitoring data

### System Tables
- **documents** - File uploads and document management
- **audit_logs** - System audit trail

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Direct Hire
- `GET /api/direct-hire` - List applications (with filters)
- `POST /api/direct-hire` - Create new application
- `GET /api/direct-hire/[id]` - Get specific application
- `PUT /api/direct-hire/[id]` - Update application
- `DELETE /api/direct-hire/[id]` - Delete application

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Balik Manggagawa
- `GET /api/balik-manggagawa/clearance` - List clearances
- `POST /api/balik-manggagawa/clearance` - Create clearance
- `GET /api/balik-manggagawa/processing` - List processing records
- `POST /api/balik-manggagawa/processing` - Create processing record

### Gov to Gov
- `GET /api/gov-to-gov` - List applications
- `POST /api/gov-to-gov` - Create application

### Information Sheet
- `GET /api/information-sheet` - List records
- `POST /api/information-sheet` - Create record

### Job Fairs
- `GET /api/job-fairs` - List job fairs
- `POST /api/job-fairs` - Create job fair
- `GET /api/peso-contacts` - List PESO contacts
- `POST /api/peso-contacts` - Create PESO contact
- `GET /api/pra-contacts` - List PRA contacts
- `POST /api/pra-contacts` - Create PRA contact
- `GET /api/job-fair-monitoring` - List monitoring data
- `POST /api/job-fair-monitoring` - Create monitoring record

## Default Admin User

After database initialization, a default admin user is created:
- **Username**: admin
- **Password**: admin123 (or ADMIN_PASSWORD from environment)

**Important**: Change the default password in production!

## Security Features

### Authentication
- Password hashing with bcrypt
- JWT-based session management
- Role-based access control (admin, staff, user)

### Data Protection
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- XSS protection
- CSRF protection

### Audit Trail
- Comprehensive logging of all user actions
- IP address and user agent tracking
- Data change history

## File Structure

```
lib/
├── database.ts              # Database connection
├── schema.sql              # Database schema
├── types.ts                # TypeScript type definitions
├── init-db.ts              # Database initialization
└── services/
    └── database-service.ts # Database operations

app/api/
├── auth/
│   ├── login/
│   └── register/
├── dashboard/
│   └── stats/
├── direct-hire/
│   └── [id]/
├── balik-manggagawa/
├── gov-to-gov/
├── information-sheet/
└── job-fairs/
```

## Development Workflow

### 1. Database Changes
1. Update `lib/schema.sql`
2. Run migration script
3. Update TypeScript types in `lib/types.ts`
4. Update database service methods

### 2. API Development
1. Create API route in `app/api/`
2. Add validation and error handling
3. Update database service if needed
4. Test with frontend integration

### 3. Testing
```bash
# Run database tests
npm run test:db

# Run API tests
npm run test:api

# Run full test suite
npm test
```

## Production Deployment

### 1. Environment Setup
- Set `NODE_ENV=production`
- Use strong, unique secrets
- Configure SSL certificates
- Set up proper database credentials

### 2. Database
- Use managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
- Enable automated backups
- Configure connection pooling
- Set up monitoring and alerts

### 3. Security
- Enable HTTPS
- Configure CORS properly
- Set up rate limiting
- Implement proper logging
- Regular security audits

### 4. Performance
- Enable database query optimization
- Implement caching (Redis)
- Use CDN for static assets
- Monitor application performance

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL service status
   - Verify connection credentials
   - Ensure database exists

2. **Schema Creation Failed**
   - Check PostgreSQL user permissions
   - Verify SQL syntax
   - Check for existing tables

3. **API Routes Not Working**
   - Check Next.js server logs
   - Verify route file structure
   - Check TypeScript compilation

4. **Authentication Issues**
   - Verify JWT secret configuration
   - Check password hashing
   - Validate user approval status

### Logs and Debugging
- Check console logs for errors
- Use PostgreSQL logs for database issues
- Monitor API response status codes
- Use browser developer tools for frontend issues

## Support

For technical support or questions:
1. Check the documentation
2. Review error logs
3. Test with minimal configuration
4. Contact the development team

## License

This project is proprietary software for the Department of Migrant Workers (DMW).
