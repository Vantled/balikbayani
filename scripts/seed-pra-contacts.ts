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
        contact_number: "09123456789",
        emails: [
          { email_address: "john.doe@abc-recruitment.com" },
          { email_address: "contact@abc-recruitment.com" },
          { email_address: "hr@abc-recruitment.com" }
        ],
        contacts: [
          { contact_category: "Mobile No.", contact_number: "09123456789" },
          { contact_category: "Landline", contact_number: "(02) 8123-4567" },
          { contact_category: "WhatsApp", contact_number: "09987654321" }
        ]
      },
      {
        name_of_pras: "XYZ Manpower Services",
        pra_contact_person: "Mike Johnson",
        office_head: "Sarah Williams",
        email: "mike.johnson@xyz-manpower.com",
        contact_number: "09234567890",
        emails: [
          { email_address: "mike.johnson@xyz-manpower.com" },
          { email_address: "info@xyz-manpower.com" }
        ],
        contacts: [
          { contact_category: "Mobile No.", contact_number: "09234567890" },
          { contact_category: "Landline", contact_number: "(02) 8234-5678" }
        ]
      },
      {
        name_of_pras: "Global Staffing Solutions",
        pra_contact_person: "Maria Garcia",
        office_head: "Carlos Rodriguez",
        email: "maria.garcia@global-staffing.com",
        contact_number: "09345678901",
        emails: [
          { email_address: "maria.garcia@global-staffing.com" },
          { email_address: "recruitment@global-staffing.com" },
          { email_address: "support@global-staffing.com" }
        ],
        contacts: [
          { contact_category: "Mobile No.", contact_number: "09345678901" },
          { contact_category: "WhatsApp", contact_number: "09345678901" },
          { contact_category: "Landline", contact_number: "(02) 8345-6789" }
        ]
      },
      {
        name_of_pras: "Premier Recruitment Corp",
        pra_contact_person: "David Chen",
        office_head: "Lisa Wang",
        email: "david.chen@premier-recruitment.com",
        contact_number: "09456789012",
        emails: [
          { email_address: "david.chen@premier-recruitment.com" },
          { email_address: "admin@premier-recruitment.com" }
        ],
        contacts: [
          { contact_category: "Mobile No.", contact_number: "09456789012" },
          { contact_category: "Landline", contact_number: "(02) 8456-7890" }
        ]
      },
      {
        name_of_pras: "Elite Manpower Services",
        pra_contact_person: "Anna Santos",
        office_head: "Roberto Cruz",
        email: "anna.santos@elite-manpower.com",
        contact_number: "09567890123",
        emails: [
          { email_address: "anna.santos@elite-manpower.com" },
          { email_address: "elite@elite-manpower.com" }
        ],
        contacts: [
          { contact_category: "Mobile No.", contact_number: "09567890123" },
          { contact_category: "Landline", contact_number: "(02) 8567-8901" }
        ]
      },
      {
        name_of_pras: "Pacific Staffing Solutions",
        pra_contact_person: "James Wilson",
        office_head: "Emily Brown",
        email: "james.wilson@pacific-staffing.com",
        contact_number: "09678901234",
        emails: [
          { email_address: "james.wilson@pacific-staffing.com" },
          { email_address: "pacific@pacific-staffing.com" }
        ],
        contacts: [
          { contact_category: "Mobile No.", contact_number: "09678901234" },
          { contact_category: "Landline", contact_number: "(02) 8678-9012" }
        ]
      },
      {
        name_of_pras: "Star Recruitment Agency",
        pra_contact_person: "Sofia Martinez",
        office_head: "Diego Lopez",
        email: "sofia.martinez@star-recruitment.com",
        contact_number: "09789012345",
        emails: [
          { email_address: "sofia.martinez@star-recruitment.com" },
          { email_address: "star@star-recruitment.com" }
        ],
        contacts: [
          { contact_category: "Mobile No.", contact_number: "09789012345" },
          { contact_category: "Landline", contact_number: "(02) 8789-0123" }
        ]
      },
      {
        name_of_pras: "Golden Gate Manpower",
        pra_contact_person: "Kevin Lee",
        office_head: "Jennifer Kim",
        email: "kevin.lee@golden-gate.com",
        contact_number: "09890123456",
        emails: [
          { email_address: "kevin.lee@golden-gate.com" },
          { email_address: "golden@golden-gate.com" }
        ],
        contacts: [
          { contact_category: "Mobile No.", contact_number: "09890123456" },
          { contact_category: "Landline", contact_number: "(02) 8890-1234" }
        ]
      },
      {
        name_of_pras: "United Staffing Services",
        pra_contact_person: "Amanda Davis",
        office_head: "Michael Thompson",
        email: "amanda.davis@united-staffing.com",
        contact_number: "09901234567",
        emails: [
          { email_address: "amanda.davis@united-staffing.com" },
          { email_address: "united@united-staffing.com" }
        ],
        contacts: [
          { contact_category: "Mobile No.", contact_number: "09901234567" },
          { contact_category: "Landline", contact_number: "(02) 8901-2345" }
        ]
      },
      {
        name_of_pras: "Excellence Recruitment",
        pra_contact_person: "Robert Taylor",
        office_head: "Patricia Anderson",
        email: "robert.taylor@excellence-recruitment.com",
        contact_number: "09912345678",
        emails: [
          { email_address: "robert.taylor@excellence-recruitment.com" },
          { email_address: "excellence@excellence-recruitment.com" }
        ],
        contacts: [
          { contact_category: "Mobile No.", contact_number: "09912345678" },
          { contact_category: "Landline", contact_number: "(02) 8912-3456" }
        ]
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
