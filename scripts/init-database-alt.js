// scripts/init-database-alt.js
// Enhanced database initialization script using CommonJS for better compatibility
// Includes schema creation, migrations, admin setup, and data seeding

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Database connection setup
let db;

async function setupDatabase() {
  try {
    // Try to import the database module
    const databaseModule = require('../lib/database.ts');
    db = databaseModule.db || databaseModule.default;
    
    if (!db) {
      throw new Error('Database connection not found');
    }
    
    console.log('✅ Database connection established');
    return true;
  } catch (error) {
    console.error('❌ Failed to setup database connection:', error.message);
    console.log('💡 Trying alternative database setup...');
    
    // Fallback: Create a simple database connection
    try {
      const { Pool } = require('pg');
      
      const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'balikbayani',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
      
      db = {
        query: (text, params) => pool.query(text, params),
        end: () => pool.end()
      };
      
      console.log('✅ Database connection established (fallback)');
      return true;
    } catch (fallbackError) {
      console.error('❌ Fallback database setup failed:', fallbackError.message);
      return false;
    }
  }
}

async function readSqlFile(filePath) {
  try {
    // Resolve path relative to project root
    const projectRoot = path.resolve(__dirname, '..');
    const fullPath = path.resolve(projectRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      return null;
    }
    
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    return null;
  }
}

async function executeSqlFile(filePath, description) {
  console.log(`\n📄 ${description}...`);
  const sql = await readSqlFile(filePath);
  
  if (sql) {
    try {
      await db.query(sql);
      console.log(`✅ ${description} completed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      return false;
    }
  }
  return false;
}

// Enhanced seeding functions
async function seedPesoContacts() {
  console.log('\n🌱 Seeding PESO contacts...');
  
  const pesoOfficesData = {
    "Cavite": [
      "Provincial PESO", "Alfonso", "Amadeo", "Bacoor", "Carmona", "Cavite City", "Dasmariñas",
      "General Emilio Aguinaldo", "General Mariano Alvarez (GMA)", "General Trias", "Imus", "Indang",
      "Kawit", "Maragondon", "Magallanes", "Mendez-Nunez", "Naic", "Noveleta", "Rosario", "Silang",
      "Tagaytay", "Tanza", "Ternate", "Trece Martires"
    ],
    "Laguna": [
      "Provincial PESO", "Alaminos", "Bay", "Biñan", "Calamba", "Famy", "Kalayaan", "Liliw",
      "Los Baños", "Luisiana", "Lumban", "Mabitac", "Magdalena", "Majayjay", "Nagcarlan", "Paete",
      "Pagsanjan", "Pakil", "Pangil", "Pila", "Rizal", "San Pablo", "San Pedro", "Siniloan", "Sta. Cruz"
    ],
    "Batangas": [
      "Provincial PESO", "Agoncillo", "Alitagtag", "Balayan", "Balete", "Batangas City", "Bauan",
      "Calaca", "Calatagan Municipal", "Cuenca", "Ibaan", "Laurel", "Lemery", "Lian", "Lipa", "Lobo",
      "Mabini", "Malvar", "Mataas na Kahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose",
      "San Juan", "San Luis", "San Nicolas", "San Pascual", "Sta. Teresita", "Sto. Tomas", "Taal",
      "Tanauan", "Taysan", "Tuy"
    ],
    "Rizal": [
      "Provincial PESO", "Angono", "Antipolo", "Baras", "Binangonan", "Cainta", "Cardona", "Jalajala",
      "Morong", "Pililla", "Rodriguez", "San Mateo", "Tanay", "Taytay", "Teresa"
    ],
    "Quezon": [
      "Provincial PESO", "Agdangan", "Alabat", "Atimonan", "Burdeos", "Calauag", "Candelaria",
      "Catanauan", "Dolores", "General Luna", "General Nakar", "Guinayangan", "Gumaca", "Infanta",
      "Lopez Quezon", "Lucban", "Lucena", "Macalelon", "Mauban", "Mulanay", "Padre Burgos", "Pagbilao",
      "Panukulan", "Perez", "Pitogo", "Plaridel", "Polilio", "Quezon", "Real", "San Andres",
      "San Antonio", "Sariaya", "Tagkawayan", "Tiaong", "Tayabas", "Unisan"
    ]
  };

  const sampleOfficeHeads = [
    "Maria Santos", "Juan Dela Cruz", "Ana Reyes", "Pedro Martinez", "Carmen Garcia",
    "Roberto Santos", "Luzviminda Cruz", "Antonio Reyes", "Isabela Garcia", "Fernando Lopez",
    "Ricardo Mendoza", "Elena Villanueva", "Miguel Torres", "Rosa Fernandez", "Jose Morales",
    "Linda Guerrero", "Carlos Ramirez", "Sofia Herrera", "Emmanuel Castro", "Gloria Valdez",
    "Rodolfo Aquino", "Teresita Gonzalez", "Francisco Rivera", "Margarita Flores", "Vicente Ramos",
    "Corazon Bautista", "Alejandro Silva", "Esperanza Medina", "Gregorio Navarro", "Remedios Cruz"
  ];

  let contactIndex = 0;
  let created = 0;
  let skipped = 0;

  for (const [province, offices] of Object.entries(pesoOfficesData)) {
    for (const office of offices) {
      const officeHead = sampleOfficeHeads[contactIndex % sampleOfficeHeads.length];
      const baseNumber = 9123456789 + contactIndex;
      
      const emailPrefix = office.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      
      try {
        // Check if contact already exists
        const { rows: existing } = await db.query(
          'SELECT id FROM peso_contacts WHERE peso_office = $1 AND province = $2',
          [office, province]
        );

        if (existing.length === 0) {
          // Insert main contact
          await db.query(
            `INSERT INTO peso_contacts (province, peso_office, office_head, email, contact_number) 
             VALUES ($1, $2, $3, $4, $5)`,
            [province, office, officeHead, `${emailPrefix}.peso@${province.toLowerCase()}.gov.ph`, `0${baseNumber}`.substring(0, 11)]
          );

          // Get the inserted contact ID
          const { rows: [insertedContact] } = await db.query(
            'SELECT id FROM peso_contacts WHERE peso_office = $1 AND province = $2',
            [office, province]
          );

          // Insert emails
          await db.query(
            'INSERT INTO peso_contact_emails (peso_contact_id, email_address) VALUES ($1, $2), ($1, $3)',
            [
              insertedContact.id,
              `${emailPrefix}.peso@${province.toLowerCase()}.gov.ph`,
              `info.${emailPrefix}@${province.toLowerCase()}.gov.ph`
            ]
          );

          // Insert contacts
          await db.query(
            'INSERT INTO peso_contact_numbers (peso_contact_id, contact_category, contact_number) VALUES ($1, $2, $3), ($1, $4, $5)',
            [
              insertedContact.id,
              'Mobile No.',
              `0${baseNumber}`.substring(0, 11),
              'Landline',
              `(02) ${8000 + contactIndex}-${1000 + contactIndex}`
            ]
          );

          created++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error creating PESO contact for ${office}, ${province}:`, error.message);
        skipped++;
      }
      
      contactIndex++;
    }
  }

  console.log(`✅ PESO contacts seeding completed: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedPraContacts() {
  console.log('\n🌱 Seeding PRA contacts...');
  
  const sampleContacts = [
    {
      name_of_pras: "ABC Recruitment Agency",
      pra_contact_person: "John Doe",
      office_head: "Jane Smith",
      email: "john.doe@abc-recruitment.com",
      contact_number: "09123456789",
      emails: ["john.doe@abc-recruitment.com", "contact@abc-recruitment.com", "hr@abc-recruitment.com"],
      contacts: [
        { category: "Mobile No.", number: "09123456789" },
        { category: "Landline", number: "(02) 8123-4567" },
        { category: "WhatsApp", number: "09987654321" }
      ]
    },
    {
      name_of_pras: "XYZ Manpower Services",
      pra_contact_person: "Mike Johnson",
      office_head: "Sarah Williams",
      email: "mike.johnson@xyz-manpower.com",
      contact_number: "09234567890",
      emails: ["mike.johnson@xyz-manpower.com", "info@xyz-manpower.com"],
      contacts: [
        { category: "Mobile No.", number: "09234567890" },
        { category: "Landline", number: "(02) 8234-5678" }
      ]
    },
    {
      name_of_pras: "Global Staffing Solutions",
      pra_contact_person: "Maria Garcia",
      office_head: "Carlos Rodriguez",
      email: "maria.garcia@global-staffing.com",
      contact_number: "09345678901",
      emails: ["maria.garcia@global-staffing.com", "recruitment@global-staffing.com", "support@global-staffing.com"],
      contacts: [
        { category: "Mobile No.", number: "09345678901" },
        { category: "WhatsApp", number: "09345678901" },
        { category: "Landline", number: "(02) 8345-6789" }
      ]
    }
  ];

  let created = 0;
  let skipped = 0;

  for (const contact of sampleContacts) {
    try {
      // Check if contact already exists
      const { rows: existing } = await db.query(
        'SELECT id FROM pra_contacts WHERE name_of_pras = $1',
        [contact.name_of_pras]
      );

      if (existing.length === 0) {
        // Insert main contact
        await db.query(
          `INSERT INTO pra_contacts (name_of_pras, pra_contact_person, office_head, email, contact_number) 
           VALUES ($1, $2, $3, $4, $5)`,
          [contact.name_of_pras, contact.pra_contact_person, contact.office_head, contact.email, contact.contact_number]
        );

        // Get the inserted contact ID
        const { rows: [insertedContact] } = await db.query(
          'SELECT id FROM pra_contacts WHERE name_of_pras = $1',
          [contact.name_of_pras]
        );

        // Insert emails
        for (const email of contact.emails) {
          await db.query(
            'INSERT INTO pra_contact_emails (pra_contact_id, email_address) VALUES ($1, $2)',
            [insertedContact.id, email]
          );
        }

        // Insert contacts
        for (const contactInfo of contact.contacts) {
          await db.query(
            'INSERT INTO pra_contact_numbers (pra_contact_id, contact_category, contact_number) VALUES ($1, $2, $3)',
            [insertedContact.id, contactInfo.category, contactInfo.number]
          );
        }

        created++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`❌ Error creating PRA contact for ${contact.name_of_pras}:`, error.message);
      skipped++;
    }
  }

  console.log(`✅ PRA contacts seeding completed: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedBalikManggagawaData() {
  console.log('\n🌱 Seeding Balik Manggagawa sample data...');
  
  const clearanceData = [
    {
      nameOfWorker: 'Maria Santos Cruz',
      sex: 'female',
      employer: 'ABC Company Ltd',
      destination: 'UAE',
      salary: 2500,
      clearanceType: 'for_assessment_country',
      position: 'Housekeeper',
      monthsYears: '2 years',
      withPrincipal: 'Yes',
      newPrincipalName: 'ABC Company Ltd',
      employmentDuration: '2 years',
      dateArrival: '2023-01-15',
      dateDeparture: '2025-01-15',
      placeDateEmployment: 'Dubai, UAE - 2023-01-15',
      employmentStartDate: '2023-01-15',
      processingDate: '2024-12-01',
      remarks: 'Valid employment contract'
    },
    {
      nameOfWorker: 'Juan Dela Cruz',
      sex: 'male',
      employer: 'XYZ Corporation',
      destination: 'Qatar',
      salary: 3000,
      clearanceType: 'non_compliant_country',
      position: 'Construction Worker',
      monthsYears: '3 years',
      withPrincipal: 'Yes',
      newPrincipalName: 'XYZ Corporation',
      employmentDuration: '3 years',
      dateArrival: '2022-06-01',
      dateDeparture: '2025-06-01',
      placeDateEmployment: 'Doha, Qatar - 2022-06-01',
      employmentStartDate: '2022-06-01',
      processingDate: '2024-12-01',
      remarks: 'Non-compliant country clearance'
    }
  ];

  const processingData = [
    {
      nameOfWorker: 'Rosa Fernandez',
      sex: 'female',
      address: 'Makati, Metro Manila',
      destination: 'UAE',
      clearanceType: 'for_assessment_country'
    },
    {
      nameOfWorker: 'Carlos Rodriguez',
      sex: 'male',
      address: 'Quezon City, Metro Manila',
      destination: 'Qatar',
      clearanceType: 'non_compliant_country'
    }
  ];

  let clearanceCreated = 0;
  let processingCreated = 0;

  // Create clearance records
  for (const data of clearanceData) {
    try {
      await db.query(
        `INSERT INTO balik_manggagawa_clearance (
          name_of_worker, sex, employer, destination, salary, clearance_type, 
          position, months_years, with_principal, new_principal_name, 
          employment_duration, date_arrival, date_departure, 
          place_date_employment, employment_start_date, processing_date, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          data.nameOfWorker, data.sex, data.employer, data.destination, data.salary,
          data.clearanceType, data.position, data.monthsYears, data.withPrincipal,
          data.newPrincipalName, data.employmentDuration, data.dateArrival,
          data.dateDeparture, data.placeDateEmployment, data.employmentStartDate,
          data.processingDate, data.remarks
        ]
      );
      clearanceCreated++;
    } catch (error) {
      console.error(`❌ Error creating clearance for ${data.nameOfWorker}:`, error.message);
    }
  }

  // Create processing records
  for (const data of processingData) {
    try {
      await db.query(
        `INSERT INTO balik_manggagawa_processing (
          name_of_worker, sex, address, destination, clearance_type
        ) VALUES ($1, $2, $3, $4, $5)`,
        [data.nameOfWorker, data.sex, data.address, data.destination, data.clearanceType]
      );
      processingCreated++;
    } catch (error) {
      console.error(`❌ Error creating processing record for ${data.nameOfWorker}:`, error.message);
    }
  }

  console.log(`✅ Balik Manggagawa data seeding completed: ${clearanceCreated} clearance records, ${processingCreated} processing records`);
  return { clearanceCreated, processingCreated };
}

async function initializeDatabase() {
  try {
    console.log('🚀 Starting comprehensive database initialization...\n');

    // Setup database connection
    const dbSetup = await setupDatabase();
    if (!dbSetup) {
      throw new Error('Database setup failed');
    }

    // Step 1: Execute main schema
    await executeSqlFile('lib/schema.sql', 'Creating main database schema');

    // Step 2: Execute all migrations in order
    const migrations = [
      { file: 'migrations/add_is_first_login_to_users.sql', desc: 'Adding is_first_login field to users' },
      { file: 'migrations/allow_null_email_for_users.sql', desc: 'Allowing NULL email for temporary users' },
      { file: 'migrations/add_salary_currency_to_direct_hire.sql', desc: 'Adding salary currency and raw salary to direct hire' },
      { file: 'migrations/add_table_last_modified_tracking.sql', desc: 'Adding table last modified tracking' },
      { file: 'migrations/add_deleted_at_to_job_fairs.sql', desc: 'Adding soft delete to job fairs' },
      { file: 'migrations/add_deleted_at_to_pra_contacts.sql', desc: 'Adding soft delete to PRA contacts' },
      { file: 'migrations/add_rescheduled_field.sql', desc: 'Adding rescheduled field to job fairs' },
      { file: 'migrations/update_job_fairs_contacts.sql', desc: 'Updating job fairs contacts structure' },
      { file: 'migrations/update_peso_contacts_multiple_fields.sql', desc: 'Updating PESO contacts for multiple fields' },
      { file: 'migrations/update_pra_contacts_multiple_fields.sql', desc: 'Updating PRA contacts for multiple fields' },
      { file: 'migrations/remove_contact_number_from_job_fairs.sql', desc: 'Removing contact number from job fairs' }
    ];

    for (const migration of migrations) {
      await executeSqlFile(migration.file, migration.desc);
    }

    // Step 3: Execute lib migrations
    const libMigrations = [
      { file: 'lib/migrate-bm-clearance-extended.sql', desc: 'Extending balik manggagawa clearance fields' },
      { file: 'lib/migrate-bm-clearance-missing-fields.sql', desc: 'Adding missing fields to BM clearance' },
      { file: 'lib/migrate-bm-clearance-status.sql', desc: 'Adding status field to BM clearance' },
      { file: 'lib/migrate-bm-processing-documents.sql', desc: 'Adding document tracking to BM processing' },
      { file: 'lib/migrate-bm-processing-clearance-link.sql', desc: 'Adding clearance link to BM processing' },
      { file: 'lib/migrate-bm-clearance-narrative.sql', desc: 'Adding narrative fields to BM clearance' },
      { file: 'lib/migrate-add-employer.sql', desc: 'Adding employer field to direct hire' },
      { file: 'lib/migrate-status-checklist.sql', desc: 'Adding status checklist to direct hire' },
      { file: 'lib/migrate-soft-delete.sql', desc: 'Adding soft delete functionality' }
    ];

    for (const migration of libMigrations) {
      await executeSqlFile(migration.file, migration.desc);
    }

    // Step 4: Create default admin and superadmin users
    console.log('\n👤 Setting up default admin and superadmin users...');
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
    const saltRounds = 12;
    const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);
    const superadminPasswordHash = await bcrypt.hash(superadminPassword, saltRounds);

    // Check if admin user exists
    const { rows: existingAdmin } = await db.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    if (existingAdmin.length === 0) {
      // Create admin user if it doesn't exist
      await db.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, is_approved, is_first_login, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['admin', 'admin@balikbayani.gov.ph', adminPasswordHash, 'Administrator', 'admin', true, false, true]
      );
      console.log('✅ Default admin user created');
    } else {
      // Update existing admin user
      await db.query(
        `UPDATE users SET 
          password_hash = $1,
          email = $2,
          full_name = $3,
          role = $4,
          is_approved = $5,
          is_first_login = $6,
          is_active = $7
        WHERE username = 'admin'`,
        [adminPasswordHash, 'admin@balikbayani.gov.ph', 'Administrator', 'admin', true, false, true]
      );
      console.log('✅ Default admin user updated');
    }

    // Check if superadmin user exists
    const { rows: existingSuperadmin } = await db.query(
      'SELECT id FROM users WHERE username = $1',
      ['superadmin']
    );

    if (existingSuperadmin.length === 0) {
      // Create superadmin user if it doesn't exist
      await db.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, is_approved, is_first_login, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['superadmin', 'superadmin@balikbayani.gov.ph', superadminPasswordHash, 'Super Administrator', 'superadmin', true, false, true]
      );
      console.log('✅ Default superadmin user created');
    } else {
      // Update existing superadmin user
      await db.query(
        `UPDATE users SET 
          password_hash = $1,
          email = $2,
          full_name = $3,
          role = $4,
          is_approved = $5,
          is_first_login = $6,
          is_active = $7
        WHERE username = 'superadmin'`,
        [superadminPasswordHash, 'superadmin@balikbayani.gov.ph', 'Super Administrator', 'superadmin', true, false, true]
      );
      console.log('✅ Default superadmin user updated');
    }
    
    console.log('📋 Login credentials:');
    console.log('   Admin:');
    console.log('     Username: admin');
    console.log(`     Password: ${adminPassword}`);
    console.log('   Superadmin:');
    console.log('     Username: superadmin');
    console.log(`     Password: ${superadminPassword}`);

    // Step 5: Seed sample data (optional - can be skipped with --no-seed flag)
    if (!process.argv.includes('--no-seed')) {
      console.log('\n🌱 Seeding sample data...');
      
      // Seed PESO contacts
      await seedPesoContacts();
      
      // Seed PRA contacts
      await seedPraContacts();
      
      // Seed Balik Manggagawa data
      await seedBalikManggagawaData();
      
      console.log('✅ Sample data seeding completed');
    } else {
      console.log('\n⏭️  Skipping sample data seeding (--no-seed flag provided)');
    }

    // Step 6: Verify database setup
    console.log('\n🔍 Verifying database setup...');
    const { rows: tables } = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`✅ Database initialized successfully with ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Access the application at: http://localhost:3000');
    console.log('   3. Login with admin or superadmin credentials above');
    console.log('\n💡 Additional options:');
    console.log('   - Run with --no-seed to skip sample data seeding');
    console.log('   - Run with --cleanup to remove existing users (except admin and superadmin)');

    return true;

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    throw error;
  } finally {
    if (db && db.end) {
      await db.end();
    }
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('\n✅ Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
