# BalikBayani Portal

A modern web application for managing overseas employment and job opportunities in the Philippines.

## Features

- 🔐 Secure authentication system
- 📊 Interactive dashboard
- 📝 Information sheet management
- 🤝 Government-to-government agreements
- 💼 Job fairs management
- 👥 Balik Manggagawa program
- 🎯 Direct hire processing

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

5. **Start development server:**
```bash
npm run dev
```

6. **Access the application:**
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Default login:**
- Username: `admin`
- Password: `admin123` (or your `ADMIN_PASSWORD` from `.env.local`)

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

2. **Start PostgreSQL:**
```bash
brew services start postgresql
```

3. **Clone and Setup:**
```bash
git clone https://github.com/yourusername/balikbayani.git
cd balikbayani
npm install
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

### Complete Database Initialization
```bash
npm run db:init-complete
```
This script creates all tables, applies all migrations, and sets up the default admin user.

**If you encounter module import errors, try the alternative script:**
```bash
npm run db:init-complete-alt
```

### Individual Database Commands
```bash
npm run db:init          # Basic schema only
npm run db:migrate       # Run migrations
npm run db:security-migrate  # Security features
npm run db:role-migrate  # Role hierarchy
```

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

This is a secure government system. Unauthorized access is prohibited and subject to legal action. 