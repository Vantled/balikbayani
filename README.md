# BalikBayani Portal

A modern web application for managing overseas employment and job opportunities in the Philippines.

## Features

- Secure authentication system
- Interactive dashboard
- Information sheet management
- Government-to-government agreements
- Job fairs management
- Balik Manggagawa program
- Direct hire processing

## Tech Stack

- Next.js 15
- TypeScript
- TailwindCSS
- Radix UI
- React Hook Form
- Zod Validation
- Chart.js
- React Hot Toast
- PostgreSQL

## Quick Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- Git

### Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/balikbayani.git
cd balikbayani
```

2. **Install dependencies:**
```bash
npm install
# or
pnpm install
```

3. **Set up environment variables:**
```bash
cp env.example .env.local
```
Edit `.env.local` with your database credentials and other settings.

4. **Initialize database:**
```bash
npm run db:init-complete
# or
npm run db:init-complete-alt
```

5. **Start development server (for development only)**
```bash
npm run dev
```
5.5. **Start production server (for production, ahs better performance)**
```powershell
npm run build
npm run start
```


6. **Access the application:**
Open [http://localhost:3000](http://localhost:3000) in your browser.
## Backups (Setup and Usage)

### Configure

- In `.env.local` set:
  - `SYSTEM_NAME=balikbayani` (prefix for backup filenames)
  - `CRON_SECRET=<strong-random-secret>` (for auto backup endpoint)
  - Optional tool paths if not on PATH:
    - `PG_DUMP_PATH` (pg_dump executable path)
    - `PSQL_PATH` (psql executable path)

### Manual Backup/Restore

- Go to `/data-backups`.
- Click "Manually Create Backup" to produce a ZIP archive with:
  - `dump.sql` (database snapshot with --clean)
  - `uploads/` files (excluding `uploads/backups`)
- To restore:
  - Use per-row "Restore" on an existing backup, or
  - Use "Import Backup (.zip)" to upload a ZIP you saved

### Automatic Backups (Monthly or as scheduled)

- Trigger endpoint (superadmin auth not required; protected by secret):
  - `POST /api/backups/auto`
  - Header: `X-Cron-Secret: <CRON_SECRET>`
- Local test:
  - PowerShell: `Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/backups/auto" -Headers @{"X-Cron-Secret"="<CRON_SECRET>"}`
  - curl: `curl -X POST http://localhost:3000/api/backups/auto -H "X-Cron-Secret: <CRON_SECRET>"`
- Logs: server prints `[BACKUPS] Auto backup created: <id>.zip`

### Filename Format

- `[system]-[YYYYMMDD]-[HHMMAM/PM].zip` e.g. `balikbayani-20250916-0655PM.zip`


**Default login:**
- **Admin:** Username: `admin`, Password: `admin123` (or your `ADMIN_PASSWORD` from `.env.local`)
- **Superadmin:** Username: `superadmin`, Password: `superadmin123` (or your `SUPERADMIN_PASSWORD` from `.env.local`)

## System Transfer Instructions

### Windows Setup

1. **Install Required Software:**
   - Download and install [Node.js](https://nodejs.org/) (LTS version)
   - Download and install [PostgreSQL](https://www.postgresql.org/download/windows/)
   - Download and install [Git](https://git-scm.com/download/win)

2. **Clone and Setup:**
```bash
git clone https://github.com/yourusername/balikbayani.git
cd balikbayani
npm install
```

3. **Configure Database:**
   - Open pgAdmin (installed with PostgreSQL)
   - Create a new database named `balikbayani`
   - Copy `env.example` to `.env.local`
   - Update database credentials in `.env.local`

4. **Initialize and Run:**
```bash
npm run db:init-complete
npm run dev
```

### macOS Setup

1. **Install Required Software:**
   - Install [Homebrew](https://brew.sh/) if not installed
   - Install Node.js: `brew install node`
   - Install PostgreSQL: `brew install postgresql`
   - Install Git: `brew install git`

   Restart device, check if all softwares are working
   node -v
   git -v
   open pgAdmin 4

2. **Start PostgreSQL:**
```bash
brew services start postgresql
```

3. **Clone and Setup:**
```bash
open Github Desktop
click Current Repository > Add > Clone
choose URL and paste this "https://github.com/Vantled/balikbayani.git"
cd balikbayani
npm install --legacy-peer-deps
```

4. **Configure Database:**
   - Create database: `createdb balikbayani`
   - Copy `env.example` to `.env.local`
   - Update database credentials in `.env.local`

5. **Initialize and Run:**
```bash
npm run db:init-complete
npm run dev
```

## Database Management

### Quick Start (Recommended)
For most users, use the consolidated database manager:

```bash
# Complete setup (recommended for new installations)
npm run db:manager full

# Or use the enhanced initialization script
npm run db:init-complete-alt
```

### Complete Database Initialization
```bash
npm run db:init-complete
```
This script creates all tables, applies all migrations, and sets up the default admin user.

**If you encounter module import errors, try the alternative script:**
```bash
npm run db:init-complete-alt
```

### Database Manager (New)
The consolidated database manager provides all database operations in one tool:

```bash
npm run db:manager full          # Complete setup (init + admin + seed)
npm run db:manager init          # Initialize schema and migrations
npm run db:manager admin         # Setup admin user
npm run db:manager seed          # Seed sample data
npm run db:manager cleanup       # Remove users (except admin)
npm run db:manager verify        # Verify database setup
npm run db:manager reset         # Complete reset

# Options
npm run db:manager full --no-seed    # Skip seeding
npm run db:manager cleanup --confirm # Confirm destructive operations
```

### Individual Database Commands
```bash
npm run db:init          # Basic schema only
npm run db:migrate       # Run migrations
npm run db:security-migrate  # Security features
npm run db:role-migrate  # Role hierarchy
npm run db:seed-peso     # Seed PESO contacts
npm run db:seed-pra      # Seed PRA contacts
npm run db:seed-bm       # Seed Balik Manggagawa data
npm run db:cleanup-users # Clean up users (with --confirm flag)
```

### Sample Data Management

#### Generate Sample Data
```bash
npm run db:generate-sample-data
```

**Description:** Generates 1000 realistic sample records for each of the following tables:
- **Direct Hire Applications** - With proper control numbers (DHPSW-ROIVA-YYYY-MMDD-MMM-YYY format)
- **Balik Manggagawa Clearance** - With various clearance types (BM, WE, SP, NCC, NVEC, FAC, CS, WSN)
- **Gov to Gov Applications** - With personal information and work experience data
- **Information Sheet Records** - With documents and actions taken
- **Job Fairs** - With multiple email addresses and contact numbers

**Features:**
- Follows all validation rules and constraints
- Proper capitalization (all uppercase where required)
- Realistic Filipino names, destinations, and positions
- Unique control numbers generated correctly
- Related data included (emails, contacts, documents)
- Timestamps spread over the past year

**Note:** This script uses your database credentials from `.env.local` and will automatically handle existing records to avoid duplicate control numbers.

#### Cleanup Sample Data
```bash
npm run db:cleanup-sample-data
```

**Description:** Removes all records from the sample data tables and resets control numbers. This script will:
- Delete all records from Direct Hire Applications, Balik Manggagawa Clearance, Gov to Gov Applications, Information Sheet Records, and Job Fairs
- Delete all related records (documents, actions taken, emails, contacts, etc.)
- Reset sequences for SERIAL columns
- Verify that all tables are empty after cleanup

**Features:**
- Safe deletion order (respects foreign key constraints)
- Includes confirmation prompt (requires typing "YES")
- Verification report showing record counts after cleanup
- Control numbers automatically reset to 001-001 on next record creation

**Warning:** This operation is **irreversible**. All data in the specified tables will be permanently deleted. The script will prompt for confirmation before proceeding.

**Usage Example:**
```bash
# Clean up all sample data
npm run db:cleanup-sample-data

# Then regenerate fresh sample data
npm run db:generate-sample-data
```

📖 **For detailed database script documentation, see [DATABASE_SCRIPTS.md](DATABASE_SCRIPTS.md)**

## Project Structure

```
balikbayani/
├── app/                    # App router pages
├── components/            # Reusable components
├── lib/                   # Utility functions and configurations
├── hooks/                # Custom React hooks
├── scripts/              # Database scripts
├── migrations/           # Database migrations
├── public/               # Static assets
└── styles/              # Global styles
```

## Troubleshooting

### Common Issues

1. **Database Connection Error:**
   - Verify PostgreSQL is running
   - Check database credentials in `.env.local`
   - Ensure database `balikbayani` exists

2. **Port Already in Use:**
   - Change port in `.env.local`: `PORT=3001`
   - Or kill process using port 3000

3. **Permission Errors (macOS/Linux):**
   - Use `sudo` for PostgreSQL commands
   - Check file permissions: `chmod +x scripts/*.js`

4. **Module Import Errors:**
   - Try the alternative initialization script: `npm run db:init-complete-alt`
   - Ensure all dependencies are installed: `npm install`
   - Check Node.js version (requires 18+): `node --version`

### Reset Database
```bash
npm run db:reset
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

This is a secure government system. Unauthorized access is prohibited and subject to legal action. 