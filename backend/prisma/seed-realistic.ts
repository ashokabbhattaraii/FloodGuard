import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole, RiskLevel, AlertSeverity, AlertStatus, SensorType } from '@prisma/client';
import { adapter } from '../prisma.config';

const prisma = new PrismaClient({ adapter });

const password = '12345678';

async function main() {
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Create Users
  console.log('🔐 Seeding users...');
  const resident = await prisma.user.upsert({
    where: { email: 'user@gmail.com' },
    update: {},
    create: {
      email: 'user@gmail.com',
      name: 'Ahmad Resident',
      password: hashedPassword,
      role: UserRole.resident,
    },
  });

  const volunteer1 = await prisma.user.upsert({
    where: { email: 'volunteer1@gmail.com' },
    update: {},
    create: {
      email: 'volunteer1@gmail.com',
      name: 'Siti Volunteer',
      password: hashedPassword,
      role: UserRole.volunteer,
    },
  });

  const volunteer2 = await prisma.user.upsert({
    where: { email: 'volunteer2@gmail.com' },
    update: {},
    create: {
      email: 'volunteer2@gmail.com',
      name: 'Kumar Volunteer',
      password: hashedPassword,
      role: UserRole.volunteer,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      email: 'admin@gmail.com',
      name: 'Admin User',
      password: hashedPassword,
      role: UserRole.admin,
    },
  });

  // 2. Create Realistic Nepali Flood-Prone Regions
  console.log('🗺️  Seeding regions...');

  // Kathmandu Valley (Bagmati River) - Critical flood zone
  const kathmanduValley = await prisma.region.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      name: 'Kathmandu Valley - Bagmati River',
      description: 'Flood-prone area along Bagmati River covering low-lying areas of Kathmandu. Frequent flooding during monsoon season.',
      centerLat: 27.7172,
      centerLng: 85.3240,
      riskLevel: RiskLevel.critical,
      population: 150000,
      area: 25.5,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [85.3100, 27.7050],
          [85.3380, 27.7050],
          [85.3380, 27.7294],
          [85.3100, 27.7294],
          [85.3100, 27.7050],
        ]],
      },
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Kathmandu Valley - Bagmati River',
      description: 'Flood-prone area along Bagmati River covering low-lying areas of Kathmandu. Frequent flooding during monsoon season.',
      centerLat: 27.7172,
      centerLng: 85.3240,
      riskLevel: RiskLevel.critical,
      population: 150000,
      area: 25.5,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [101.6800, 3.1300],
          [101.6950, 3.1300],
          [101.6950, 3.1480],
          [101.6800, 3.1480],
          [101.6800, 3.1300],
        ]],
      },
    },
  });

  // Saptari District - Koshi Basin (Selangor) - High risk
  const shahAlam = await prisma.region.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {
      name: 'Saptari District - Koshi Basin',
      description: 'Flood-prone area in Terai region along Koshi River. Vulnerable to river overflow during monsoon.',
      centerLat: 3.0733,
      centerLng: 101.5185,
      riskLevel: RiskLevel.high,
      population: 85000,
      area: 18.2,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [101.5100, 3.0650],
          [101.5270, 3.0650],
          [101.5270, 3.0816],
          [101.5100, 3.0816],
          [101.5100, 3.0650],
        ]],
      },
    },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Saptari District - Koshi Basin',
      description: 'Flood-prone area in Terai region along Koshi River. Vulnerable to river overflow during monsoon.',
      centerLat: 3.0733,
      centerLng: 101.5185,
      riskLevel: RiskLevel.high,
      population: 85000,
      area: 18.2,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [101.5100, 3.0650],
          [101.5270, 3.0650],
          [101.5270, 3.0816],
          [101.5100, 3.0816],
          [101.5100, 3.0650],
        ]],
      },
    },
  });

  // Chitwan - Narayani River Area - Medium risk
  const penangCoastal = await prisma.region.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {
      name: 'Chitwan - Narayani River',
      description: 'Low-lying area along Narayani River. Regular flooding during monsoon season.',
      centerLat: 5.4141,
      centerLng: 100.3288,
      riskLevel: RiskLevel.medium,
      population: 62000,
      area: 12.8,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [100.3200, 5.4050],
          [100.3376, 5.4050],
          [100.3376, 5.4232],
          [100.3200, 5.4232],
          [100.3200, 5.4050],
        ]],
      },
    },
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Chitwan - Narayani River',
      description: 'Low-lying area along Narayani River. Regular flooding during monsoon season.',
      centerLat: 5.4141,
      centerLng: 100.3288,
      riskLevel: RiskLevel.medium,
      population: 62000,
      area: 12.8,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [100.3200, 5.4050],
          [100.3376, 5.4050],
          [100.3376, 5.4232],
          [100.3200, 5.4232],
          [100.3200, 5.4050],
        ]],
      },
    },
  });

  // Biratnagar - Koshi Tappu - Medium risk
  const johorBahru = await prisma.region.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {
      name: 'Biratnagar - Koshi Tappu',
      description: 'Eastern Terai city near Koshi Tappu wetlands. Flood risk from Koshi River.',
      centerLat: 1.4927,
      centerLng: 103.7414,
      riskLevel: RiskLevel.medium,
      population: 120000,
      area: 22.3,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [103.7300, 1.4800],
          [103.7528, 1.4800],
          [103.7528, 1.5054],
          [103.7300, 1.5054],
          [103.7300, 1.4800],
        ]],
      },
    },
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Biratnagar - Koshi Tappu',
      description: 'Eastern Terai city near Koshi Tappu wetlands. Flood risk from Koshi River.',
      centerLat: 1.4927,
      centerLng: 103.7414,
      riskLevel: RiskLevel.medium,
      population: 120000,
      area: 22.3,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [103.7300, 1.4800],
          [103.7528, 1.4800],
          [103.7528, 1.5054],
          [103.7300, 1.5054],
          [103.7300, 1.4800],
        ]],
      },
    },
  });

  // Pokhara Valley - Highlands - Low risk
  const pjHighlands = await prisma.region.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {
      name: 'Pokhara Valley - Highlands',
      description: 'High-altitude valley with minimal flood risk. Protected by mountain terrain.',
      centerLat: 3.1073,
      centerLng: 101.6067,
      riskLevel: RiskLevel.low,
      population: 45000,
      area: 8.5,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [101.5980, 3.0990],
          [101.6154, 3.0990],
          [101.6154, 3.1156],
          [101.5980, 3.1156],
          [101.5980, 3.0990],
        ]],
      },
    },
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      name: 'Pokhara Valley - Highlands',
      description: 'High-altitude valley with minimal flood risk. Protected by mountain terrain.',
      centerLat: 3.1073,
      centerLng: 101.6067,
      riskLevel: RiskLevel.low,
      population: 45000,
      area: 8.5,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [101.5980, 3.0990],
          [101.6154, 3.0990],
          [101.6154, 3.1156],
          [101.5980, 3.1156],
          [101.5980, 3.0990],
        ]],
      },
    },
  });

  // 3. Assign Volunteers to Regions
  console.log('👥 Assigning volunteers...');
  await prisma.regionVolunteer.upsert({
    where: {
      regionId_userId: { regionId: kathmanduValley.id, userId: volunteer1.id },
    },
    update: {},
    create: {
      regionId: kathmanduValley.id,
      userId: volunteer1.id,
    },
  });

  await prisma.regionVolunteer.upsert({
    where: {
      regionId_userId: { regionId: kathmanduValley.id, userId: volunteer2.id },
    },
    update: {},
    create: {
      regionId: kathmanduValley.id,
      userId: volunteer2.id,
    },
  });

  await prisma.regionVolunteer.upsert({
    where: {
      regionId_userId: { regionId: shahAlam.id, userId: volunteer1.id },
    },
    update: {},
    create: {
      regionId: shahAlam.id,
      userId: volunteer1.id,
    },
  });

  // 4. Create Sensors
  console.log('📡 Seeding sensors...');

  // Kathmandu Valley Sensors (Critical zone - 4 sensors)
  await prisma.sensor.create({
    data: {
      regionId: kathmanduValley.id,
      name: 'Klang River Water Level Sensor #1',
      type: SensorType.water_level,
      latitude: 3.1395,
      longitude: 101.6875,
      currentValue: 4.2,
      threshold: 3.5,
      unit: 'm',
      isActive: true,
    },
  });

  await prisma.sensor.create({
    data: {
      regionId: kathmanduValley.id,
      name: 'Klang River Water Level Sensor #2',
      type: SensorType.water_level,
      latitude: 3.1410,
      longitude: 101.6890,
      currentValue: 4.5,
      threshold: 3.5,
      unit: 'm',
      isActive: true,
    },
  });

  await prisma.sensor.create({
    data: {
      regionId: kathmanduValley.id,
      name: 'KL City Center Rainfall Monitor',
      type: SensorType.rainfall,
      latitude: 3.1385,
      longitude: 101.6860,
      currentValue: 145.0,
      threshold: 100.0,
      unit: 'mm',
      isActive: true,
    },
  });

  await prisma.sensor.create({
    data: {
      regionId: kathmanduValley.id,
      name: 'Masjid Jamek Flood Gauge',
      type: SensorType.water_level,
      latitude: 3.1480,
      longitude: 101.6945,
      currentValue: 3.8,
      threshold: 3.0,
      unit: 'm',
      isActive: true,
    },
  });

  // Shah Alam Sensors (High risk - 3 sensors)
  await prisma.sensor.create({
    data: {
      regionId: shahAlam.id,
      name: 'Shah Alam Industrial Rainfall Monitor',
      type: SensorType.rainfall,
      latitude: 3.0730,
      longitude: 101.5180,
      currentValue: 95.0,
      threshold: 80.0,
      unit: 'mm',
      isActive: true,
    },
  });

  await prisma.sensor.create({
    data: {
      regionId: shahAlam.id,
      name: 'Section 13 Water Level Sensor',
      type: SensorType.water_level,
      latitude: 3.0750,
      longitude: 101.5200,
      currentValue: 2.8,
      threshold: 3.0,
      unit: 'm',
      isActive: true,
    },
  });

  await prisma.sensor.create({
    data: {
      regionId: shahAlam.id,
      name: 'I-City Drainage Monitor',
      type: SensorType.water_level,
      latitude: 3.0680,
      longitude: 101.5150,
      currentValue: 1.9,
      threshold: 2.5,
      unit: 'm',
      isActive: true,
    },
  });

  // Penang Sensors (Medium risk - 2 sensors)
  await prisma.sensor.create({
    data: {
      regionId: penangCoastal.id,
      name: 'Georgetown Coastal Tide Gauge',
      type: SensorType.water_level,
      latitude: 5.4145,
      longitude: 100.3290,
      currentValue: 1.5,
      threshold: 2.2,
      unit: 'm',
      isActive: true,
    },
  });

  await prisma.sensor.create({
    data: {
      regionId: penangCoastal.id,
      name: 'Penang Island Rainfall Monitor',
      type: SensorType.rainfall,
      latitude: 5.4135,
      longitude: 100.3280,
      currentValue: 65.0,
      threshold: 120.0,
      unit: 'mm',
      isActive: true,
    },
  });

  // Johor Bahru Sensors (Medium risk - 2 sensors)
  await prisma.sensor.create({
    data: {
      regionId: johorBahru.id,
      name: 'JB City Rainfall Monitor',
      type: SensorType.rainfall,
      latitude: 1.4930,
      longitude: 103.7420,
      currentValue: 78.0,
      threshold: 100.0,
      unit: 'mm',
      isActive: true,
    },
  });

  await prisma.sensor.create({
    data: {
      regionId: johorBahru.id,
      name: 'Sungai Segget Water Level',
      type: SensorType.water_level,
      latitude: 1.4920,
      longitude: 103.7410,
      currentValue: 2.1,
      threshold: 2.8,
      unit: 'm',
      isActive: true,
    },
  });

  // PJ Highlands Sensor (Low risk - 1 sensor)
  await prisma.sensor.create({
    data: {
      regionId: pjHighlands.id,
      name: 'PJ Highlands Weather Station',
      type: SensorType.rainfall,
      latitude: 3.1075,
      longitude: 101.6070,
      currentValue: 42.0,
      threshold: 150.0,
      unit: 'mm',
      isActive: true,
    },
  });

  // 5. Create Evacuation Centers
  console.log('🏥 Seeding evacuation centers...');

  // Klang Valley Shelters
  await prisma.evacuationRoute.create({
    data: {
      regionId: kathmanduValley.id,
      shelterName: 'Dewan Bandaraya Kuala Lumpur',
      address: 'Jalan Raja, 50050 Kuala Lumpur',
      latitude: 3.1485,
      longitude: 101.6930,
      capacity: 800,
      currentCount: 0,
      facilities: ['Medical Aid', 'Food', 'Water', 'Blankets', 'Power Supply'],
      contactPhone: '+60 3-2698 2000',
      isActive: true,
    },
  });

  await prisma.evacuationRoute.create({
    data: {
      regionId: kathmanduValley.id,
      shelterName: 'Putra World Trade Centre',
      address: '45, Jalan Tun Ismail, 50480 Kuala Lumpur',
      latitude: 3.1672,
      longitude: 101.6942,
      capacity: 1200,
      currentCount: 0,
      facilities: ['Medical Aid', 'Food', 'Water', 'Blankets', 'Toilets', 'Power Supply'],
      contactPhone: '+60 3-4042 8888',
      isActive: true,
    },
  });

  // Shah Alam Shelter
  await prisma.evacuationRoute.create({
    data: {
      regionId: shahAlam.id,
      shelterName: 'Stadium Malawati',
      address: 'Persiaran Perbandaran, 40000 Shah Alam',
      latitude: 3.0850,
      longitude: 101.5220,
      capacity: 600,
      currentCount: 0,
      facilities: ['Medical Aid', 'Food', 'Water', 'Blankets'],
      contactPhone: '+60 3-5519 5000',
      isActive: true,
    },
  });

  // Penang Shelter
  await prisma.evacuationRoute.create({
    data: {
      regionId: penangCoastal.id,
      shelterName: 'Dewan Sri Pinang',
      address: 'Jalan Padang Kota Lama, 10200 Georgetown',
      latitude: 5.4185,
      longitude: 100.3350,
      capacity: 400,
      currentCount: 0,
      facilities: ['Medical Aid', 'Food', 'Water'],
      contactPhone: '+60 4-261 9555',
      isActive: true,
    },
  });

  // Johor Bahru Shelter
  await prisma.evacuationRoute.create({
    data: {
      regionId: johorBahru.id,
      shelterName: 'JB City Council Hall',
      address: 'Jalan Dato Dalam, 80000 Johor Bahru',
      latitude: 1.4965,
      longitude: 103.7450,
      capacity: 500,
      currentCount: 0,
      facilities: ['Medical Aid', 'Food', 'Water', 'Blankets'],
      contactPhone: '+60 7-224 2424',
      isActive: true,
    },
  });

  // 6. Create Alerts
  console.log('⚠️  Seeding alerts...');

  await prisma.alert.create({
    data: {
      regionId: kathmanduValley.id,
      severity: AlertSeverity.critical,
      title: 'Critical Flash Flood Warning - Klang River',
      description: 'Water levels in Klang River have exceeded critical threshold (4.5m vs 3.5m threshold). Three sensors reporting dangerous levels. Immediate evacuation advised for low-lying areas. Proceed to nearest evacuation center.',
      issuedBy: admin.name,
      status: AlertStatus.active,
    },
  });

  await prisma.alert.create({
    data: {
      regionId: shahAlam.id,
      severity: AlertSeverity.high,
      title: 'Heavy Rainfall Advisory - Saptari District - Koshi Basin',
      description: 'Sustained heavy rainfall detected (95mm vs 80mm threshold). Flash flooding possible in low-lying industrial areas. Monitor conditions and prepare for potential evacuation.',
      issuedBy: admin.name,
      status: AlertStatus.active,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('- 4 users created (1 resident, 2 volunteers, 1 admin)');
  console.log('- 5 realistic Malaysian regions created');
  console.log('- 3 volunteer assignments');
  console.log('- 14 sensors deployed across all regions');
  console.log('- 5 evacuation centers registered');
  console.log('- 2 active alerts issued');
  console.log('\n🔑 Login credentials:');
  console.log('Email: admin@gmail.com | Password: 12345678 (Admin)');
  console.log('Email: volunteer1@gmail.com | Password: 12345678 (Volunteer)');
  console.log('Email: user@gmail.com | Password: 12345678 (Resident)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
