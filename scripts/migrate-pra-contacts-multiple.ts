// scripts/migrate-pra-contacts-multiple.ts
import { db } from '../lib/database';

async function migratePraContactsMultiple() {
  try {
    console.log('🔄 Starting PRAS contacts migration for multiple emails and contacts...');

    // Add new columns for multiple emails and contacts
    console.log('📝 Adding emails and contacts JSONB columns...');
    await db.query(`
      ALTER TABLE pra_contacts ADD COLUMN IF NOT EXISTS emails JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE pra_contacts ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;
    `);

    // Migrate existing data to new format
    console.log('🔄 Migrating existing data...');
    await db.query(`
      UPDATE pra_contacts 
      SET 
        emails = CASE 
          WHEN email IS NOT NULL AND email != '' 
          THEN jsonb_build_array(jsonb_build_object('email_address', email))
          ELSE '[]'::jsonb
        END,
        contacts = CASE 
          WHEN contact_number IS NOT NULL AND contact_number != '' 
          THEN jsonb_build_array(jsonb_build_object('contact_category', 'Mobile No.', 'contact_number', contact_number))
          ELSE '[]'::jsonb
        END
      WHERE emails IS NULL OR contacts IS NULL;
    `);

    // Make the new columns NOT NULL after migration
    console.log('🔒 Making columns NOT NULL...');
    await db.query(`
      ALTER TABLE pra_contacts ALTER COLUMN emails SET NOT NULL;
      ALTER TABLE pra_contacts ALTER COLUMN contacts SET NOT NULL;
    `);

    // Add indexes for better performance
    console.log('📊 Adding indexes...');
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_pra_contacts_emails ON pra_contacts USING GIN (emails);
      CREATE INDEX IF NOT EXISTS idx_pra_contacts_contacts ON pra_contacts USING GIN (contacts);
    `);

    // Update the updated_at trigger
    console.log('🔧 Updating triggers...');
    await db.query(`
      DROP TRIGGER IF EXISTS update_pra_contacts_updated_at ON pra_contacts;
      CREATE TRIGGER update_pra_contacts_updated_at 
        BEFORE UPDATE ON pra_contacts 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ PRAS contacts migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during PRAS contacts migration:', error);
    process.exit(1);
  }
}

// Run the migration
migratePraContactsMultiple();
