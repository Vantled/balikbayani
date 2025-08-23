// scripts/seed-pra-contacts.ts
import { DatabaseService } from '../lib/services/database-service';

async function seedPraContacts() {
  try {
    console.log('🌱 Seeding PRA contacts...');

    const sampleContacts = [
      {
        name_of_pras: "ABC Recruitment Agency",
        pra_contact_person: "John Doe",
        office_head: "Jane Smith",
        email: "john.doe@abc-recruitment.com",
        contact_number: "09123456789"
      },
      {
        name_of_pras: "XYZ Manpower Services",
        pra_contact_person: "Mike Johnson",
        office_head: "Sarah Williams",
        email: "mike.johnson@xyz-manpower.com",
        contact_number: "09234567890"
      },
      {
        name_of_pras: "Global Staffing Solutions",
        pra_contact_person: "Maria Garcia",
        office_head: "Carlos Rodriguez",
        email: "maria.garcia@global-staffing.com",
        contact_number: "09345678901"
      },
      {
        name_of_pras: "Premier Recruitment Corp",
        pra_contact_person: "David Chen",
        office_head: "Lisa Wang",
        email: "david.chen@premier-recruitment.com",
        contact_number: "09456789012"
      },
      {
        name_of_pras: "Elite Manpower Services",
        pra_contact_person: "Anna Santos",
        office_head: "Roberto Cruz",
        email: "anna.santos@elite-manpower.com",
        contact_number: "09567890123"
      },
      {
        name_of_pras: "Pacific Staffing Solutions",
        pra_contact_person: "James Wilson",
        office_head: "Emily Brown",
        email: "james.wilson@pacific-staffing.com",
        contact_number: "09678901234"
      },
      {
        name_of_pras: "Star Recruitment Agency",
        pra_contact_person: "Sofia Martinez",
        office_head: "Diego Lopez",
        email: "sofia.martinez@star-recruitment.com",
        contact_number: "09789012345"
      },
      {
        name_of_pras: "Golden Gate Manpower",
        pra_contact_person: "Kevin Lee",
        office_head: "Jennifer Kim",
        email: "kevin.lee@golden-gate.com",
        contact_number: "09890123456"
      },
      {
        name_of_pras: "United Staffing Services",
        pra_contact_person: "Amanda Davis",
        office_head: "Michael Thompson",
        email: "amanda.davis@united-staffing.com",
        contact_number: "09901234567"
      },
      {
        name_of_pras: "Excellence Recruitment",
        pra_contact_person: "Robert Taylor",
        office_head: "Patricia Anderson",
        email: "robert.taylor@excellence-recruitment.com",
        contact_number: "09912345678"
      }
    ];

    for (const contact of sampleContacts) {
      await DatabaseService.createPraContact(contact);
      console.log(`✅ Created PRA contact: ${contact.name_of_pras}`);
    }

    console.log('🎉 PRA contacts seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding PRA contacts:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedPraContacts();
