# Database Scripts Documentation

This document provides a comprehensive guide to all database scripts in the BalikBayani project.

## Quick Start

For most users, the recommended approach is to use the consolidated database manager:

```bash
# Complete setup (recommended for new installations)
npm run db:manager full

# Or use the enhanced initialization script
npm run db:init-complete-alt
```

## Script Overview

### Primary Scripts (Most Important)

#### 1. Database Manager (`scripts/database-manager.js`)
**Consolidated script that combines all database operations**

```bash
# Complete setup (init + admin + seed)
npm run db:manager full

# Individual operations
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

#### 2. Enhanced Initialization (`scripts/init-database-alt.js`)
**Comprehensive initialization with seeding**

```bash
npm run db:init-complete-alt
npm run db:init-complete-alt --no-seed  # Skip sample data
```

**Features:**
- ✅ Schema creation
- ✅ All migrations (migrations/ + lib/)
- ✅ Admin and superadmin user setup
- ✅ PESO contacts seeding (all Region IV-A offices)
- ✅ PRA contacts seeding (sample agencies)
- ✅ Balik Manggagawa sample data
- ✅ Error handling and fallback database connection

#### 3. Original Initialization (`scripts/init-database.js`)
**ES Module version of initialization**

```bash
npm run db:init-complete
```

### Seeding Scripts

#### 4. PESO Contacts (`scripts/seed-peso-contacts.ts`)
**Seeds all PESO offices in Region IV-A**

```bash
npm run db:seed-peso
```

**Coverage:**
- Cavite (25 offices)
- Laguna (26 offices)
- Batangas (32 offices)
- Rizal (16 offices)
- Quezon (40 offices)

#### 5. PRA Contacts (`scripts/seed-pra-contacts.ts`)
**Seeds sample PRA (Private Recruitment Agency) contacts**

```bash
npm run db:seed-pra
```

**Includes:**
- 10 sample agencies
- Multiple contact methods per agency
- Multiple email addresses per agency

#### 6. Balik Manggagawa (`scripts/seed-balik-manggagawa.ts`)
**Seeds sample Balik Manggagawa data**

```bash
npm run db:seed-bm
```

**Includes:**
- 5 clearance records
- 5 processing records
- Various clearance types and destinations

### Maintenance Scripts

#### 7. User Cleanup (`scripts/cleanup-users.ts`)
**Removes all users except admin and superadmin**

```bash
npm run db:cleanup-users --confirm
```

**Safety features:**
- Requires `--confirm` flag
- Preserves admin and superadmin users
- Handles foreign key constraints
- Both admin and superadmin users are kept safe

#### 8. Migration Application (`scripts/apply-migration.js`)
**Applies specific migrations**

```bash
node scripts/apply-migration.js
```

**Handles:**
- Job fair contact structure updates
- Table last modified tracking
- Trigger creation

### Individual Migration Scripts

#### 9. BM Clearance Migrations
```bash
npm run db:migrate-bm-clearance-extended
```

**Files:**
- `scripts/migrate-bm-clearance-extended.ts`
- `scripts/migrate-bm-clearance-missing-fields.ts`
- `scripts/migrate-bm-clearance-narrative.ts`
- `scripts/migrate-bm-processing-documents.ts`
- `scripts/migrate-bm-processing-clearance-link.ts`

#### 10. Other Migrations
```bash
npm run db:migrate-soft-delete
npm run db:migrate-add-employer
npm run db:migrate-status-checklist
```

## Script Priority and Usage

### For New Installations
1. **Use Database Manager (Recommended):**
   ```bash
   npm run db:manager full
   ```

2. **Or use Enhanced Initialization:**
   ```bash
   npm run db:init-complete-alt
   ```

### For Development/Testing
1. **Quick setup without sample data:**
   ```bash
   npm run db:manager full --no-seed
   ```

2. **Individual seeding as needed:**
   ```bash
   npm run db:seed-peso
   npm run db:seed-pra
   npm run db:seed-bm
   ```

### For Production
1. **Schema and migrations only:**
   ```bash
   npm run db:manager init
   npm run db:manager admin
   ```

2. **Skip seeding in production:**
   ```bash
   npm run db:init-complete-alt --no-seed
   ```

### For Maintenance
1. **User cleanup:**
   ```bash
   npm run db:manager cleanup --confirm
   ```

2. **Database verification:**
   ```bash
   npm run db:manager verify
   ```

## What Each Script Covers

### Complete Initialization Includes:

#### Schema Creation
- ✅ Main database schema (`lib/schema.sql`)
- ✅ All tables and relationships
- ✅ Indexes and constraints

#### Migrations (in order)
1. `add_is_first_login_to_users.sql`
2. `allow_null_email_for_users.sql`
3. `add_salary_currency_to_direct_hire.sql`
4. `add_table_last_modified_tracking.sql`
5. `add_deleted_at_to_job_fairs.sql`
6. `add_deleted_at_to_pra_contacts.sql`
7. `add_rescheduled_field.sql`
8. `update_job_fairs_contacts.sql`
9. `update_peso_contacts_multiple_fields.sql`
10. `update_pra_contacts_multiple_fields.sql`
11. `remove_contact_number_from_job_fairs.sql`

#### Lib Migrations
1. `migrate-bm-clearance-extended.sql`
2. `migrate-bm-clearance-missing-fields.sql`
3. `migrate-bm-clearance-status.sql`
4. `migrate-bm-processing-documents.sql`
5. `migrate-bm-processing-clearance-link.sql`
6. `migrate-bm-clearance-narrative.sql`
7. `migrate-add-employer.sql`
8. `migrate-status-checklist.sql`
9. `migrate-soft-delete.sql`

#### Admin Setup
- ✅ Default admin user creation/update
- ✅ Default superadmin user creation/update
- ✅ Password hashing with bcrypt
- ✅ Proper role assignment
- ✅ Both users set as active (not locked)

#### Sample Data Seeding
- ✅ **PESO Contacts**: 139 offices across 5 provinces
- ✅ **PRA Contacts**: 10 sample agencies with multiple contacts
- ✅ **Balik Manggagawa**: 10 sample records (5 clearance + 5 processing)

## Troubleshooting

### Common Issues

1. **Module Import Errors:**
   ```bash
   # Try the alternative script
   npm run db:init-complete-alt
   ```

2. **Database Connection Issues:**
   - Verify PostgreSQL is running
   - Check `.env.local` configuration
   - Ensure database exists

3. **Permission Errors:**
   ```bash
   # On macOS/Linux
   chmod +x scripts/*.js
   ```

4. **Migration Conflicts:**
   ```bash
   # Reset and start fresh
   npm run db:manager reset --confirm
   ```

### Verification Commands

```bash
# Check database tables
npm run db:manager verify

# Check admin user
npm run db:check-admin

# Test authentication
npm run test:auth
```

## Script Consolidation Benefits

The enhanced scripts provide several benefits:

1. **Single Command Setup**: Complete initialization with one command
2. **Comprehensive Coverage**: All necessary operations included
3. **Error Handling**: Robust error handling and fallback mechanisms
4. **Flexibility**: Options to skip seeding or confirm destructive operations
5. **Documentation**: Clear output and progress indicators
6. **Safety**: Confirmation required for destructive operations

## Migration Strategy

The scripts follow a specific migration order to ensure data integrity:

1. **Schema First**: Create all tables and basic structure
2. **Core Migrations**: Apply migrations from `migrations/` folder
3. **Feature Migrations**: Apply migrations from `lib/` folder
4. **Data Seeding**: Add sample data (optional)
5. **Verification**: Confirm setup completion

This ensures that all dependencies are properly resolved and the database is in a consistent state.
