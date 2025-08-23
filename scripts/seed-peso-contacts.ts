// scripts/seed-peso-contacts.ts
import { DatabaseService } from '../lib/services/database-service';

// Generate all PESO office contacts
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

// Sample office heads and contact information
const sampleOfficeHeads = [
  "Maria Santos", "Juan Dela Cruz", "Ana Reyes", "Pedro Martinez", "Carmen Garcia",
  "Roberto Santos", "Luzviminda Cruz", "Antonio Reyes", "Isabela Garcia", "Fernando Lopez",
  "Ricardo Mendoza", "Elena Villanueva", "Miguel Torres", "Rosa Fernandez", "Jose Morales",
  "Linda Guerrero", "Carlos Ramirez", "Sofia Herrera", "Emmanuel Castro", "Gloria Valdez",
  "Rodolfo Aquino", "Teresita Gonzalez", "Francisco Rivera", "Margarita Flores", "Vicente Ramos",
  "Corazon Bautista", "Alejandro Silva", "Esperanza Medina", "Gregorio Navarro", "Remedios Cruz"
];

// Generate all PESO contacts
const allPesoContacts: any[] = [];
let contactIndex = 0;

Object.entries(pesoOfficesData).forEach(([province, offices]) => {
  offices.forEach((office, index) => {
    const officeHead = sampleOfficeHeads[contactIndex % sampleOfficeHeads.length];
    const baseNumber = 9123456789 + contactIndex;
    
    // Generate email based on office name
    const emailPrefix = office.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    allPesoContacts.push({
      province: province,
      peso_office: office,
      office_head: officeHead,
      email: `${emailPrefix}.peso@${province.toLowerCase()}.gov.ph`,
      contact_number: `0${baseNumber}`.substring(0, 11),
      emails: [
        { email_address: `${emailPrefix}.peso@${province.toLowerCase()}.gov.ph` },
        { email_address: `info.${emailPrefix}@${province.toLowerCase()}.gov.ph` }
      ],
      contacts: [
        { contact_category: "Mobile No.", contact_number: `0${baseNumber}`.substring(0, 11) },
        { contact_category: "Landline", contact_number: `(02) ${8000 + contactIndex}-${1000 + contactIndex}` }
      ]
    });
    
    contactIndex++;
  });
});

const samplePesoContacts = allPesoContacts;

async function seedPesoContacts() {
  try {
    console.log(`Seeding ${samplePesoContacts.length} PESO contacts across all Region IV-A provinces...`);
    console.log('This includes all Provincial and Municipal PESO offices.');
    console.log('');
    
    let created = 0;
    let skipped = 0;
    
    for (const contact of samplePesoContacts) {
      try {
        await DatabaseService.createPesoContact(contact);
        console.log(`✓ Created: ${contact.peso_office}, ${contact.province}`);
        created++;
      } catch (error) {
        console.log(`⚠ Skipped: ${contact.peso_office}, ${contact.province} (may already exist)`);
        skipped++;
      }
    }
    
    console.log('');
    console.log('PESO contacts seeding completed!');
    console.log(`📊 Summary: ${created} created, ${skipped} skipped, ${samplePesoContacts.length} total`);
    console.log('');
    console.log('Office distribution:');
    
    // Show distribution by province
    Object.entries(pesoOfficesData).forEach(([province, offices]) => {
      console.log(`  ${province}: ${offices.length} offices`);
    });
    
  } catch (error) {
    console.error('Error seeding PESO contacts:', error);
  }
}

// Run the seeding function
seedPesoContacts();
