// scripts/seed-balik-manggagawa.ts
import { DatabaseService } from '../lib/services/database-service';

async function seedBalikManggagawaData() {
  console.log('🌱 Seeding Balik Manggagawa sample data...');

  try {
    // Sample clearance data
    const clearanceData = [
      {
        nameOfWorker: 'Maria Santos Cruz',
        sex: 'female' as const,
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
        sex: 'male' as const,
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
      },
      {
        nameOfWorker: 'Ana Maria Reyes',
        sex: 'female' as const,
        employer: 'DEF Services',
        destination: 'Kuwait',
        salary: 2200,
        clearanceType: 'watchlisted_similar_name',
        position: 'Nurse',
        monthsYears: '1 year',
        withPrincipal: 'Yes',
        newPrincipalName: 'DEF Services',
        employmentDuration: '1 year',
        dateArrival: '2024-03-01',
        dateDeparture: '2025-03-01',
        placeDateEmployment: 'Kuwait City, Kuwait - 2024-03-01',
        employmentStartDate: '2024-03-01',
        processingDate: '2024-12-01',
        remarks: 'Watchlisted OFW clearance'
      },
      {
        nameOfWorker: 'Pedro Martinez',
        sex: 'male' as const,
        employer: 'GHI Industries',
        destination: 'Saudi Arabia',
        salary: 2800,
        clearanceType: 'for_assessment_country',
        position: 'Electrician',
        monthsYears: '4 years',
        withPrincipal: 'Yes',
        newPrincipalName: 'GHI Industries',
        employmentDuration: '4 years',
        dateArrival: '2021-08-15',
        dateDeparture: '2025-08-15',
        placeDateEmployment: 'Riyadh, Saudi Arabia - 2021-08-15',
        employmentStartDate: '2021-08-15',
        processingDate: '2024-12-01',
        remarks: 'For assessment country'
      },
      {
        nameOfWorker: 'Carmen Lopez',
        sex: 'female' as const,
        employer: 'JKL Healthcare',
        destination: 'Bahrain',
        salary: 2400,
        clearanceType: 'non_compliant_country',
        position: 'Caregiver',
        monthsYears: '2.5 years',
        withPrincipal: 'Yes',
        newPrincipalName: 'JKL Healthcare',
        employmentDuration: '2.5 years',
        dateArrival: '2022-11-01',
        dateDeparture: '2025-05-01',
        placeDateEmployment: 'Manama, Bahrain - 2022-11-01',
        employmentStartDate: '2022-11-01',
        processingDate: '2024-12-01',
        remarks: 'Non-compliant country'
      }
    ];

    // Create clearance records
    console.log('📝 Creating clearance records...');
    const clearanceIds = [];
    for (const data of clearanceData) {
      const result = await DatabaseService.createBalikManggagawaClearance(data);
      if (result) {
        clearanceIds.push(result.id);
        console.log(`✅ Created clearance for ${data.nameOfWorker}`);
      }
    }

    // Sample processing data
    const processingData = [
      {
        nameOfWorker: 'Rosa Fernandez',
        sex: 'female' as const,
        address: 'Makati, Metro Manila',
        destination: 'UAE',
        clearanceType: 'for_assessment_country'
      },
      {
        nameOfWorker: 'Carlos Rodriguez',
        sex: 'male' as const,
        address: 'Quezon City, Metro Manila',
        destination: 'Qatar',
        clearanceType: 'non_compliant_country'
      },
      {
        nameOfWorker: 'Isabel Torres',
        sex: 'female' as const,
        address: 'Cebu City, Cebu',
        destination: 'Kuwait',
        clearanceType: 'watchlisted_similar_name'
      },
      {
        nameOfWorker: 'Miguel Santos',
        sex: 'male' as const,
        address: 'Davao City, Davao del Sur',
        destination: 'Saudi Arabia',
        clearanceType: 'for_assessment_country'
      },
      {
        nameOfWorker: 'Elena Gomez',
        sex: 'female' as const,
        address: 'Baguio City, Benguet',
        destination: 'Bahrain',
        clearanceType: 'non_compliant_country'
      }
    ];

    // Create processing records
    console.log('📝 Creating processing records...');
    for (const data of processingData) {
      const result = await DatabaseService.createBalikManggagawaProcessing(data);
      if (result) {
        console.log(`✅ Created processing record for ${data.nameOfWorker}`);
      }
    }

    console.log('🎉 Balik Manggagawa sample data seeded successfully!');
    console.log(`📊 Created ${clearanceIds.length} clearance records and ${processingData.length} processing records`);

  } catch (error) {
    console.error('❌ Error seeding Balik Manggagawa data:', error);
  }
}

// Run the seeding
seedBalikManggagawaData().then(() => {
  console.log('✅ Seeding completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
