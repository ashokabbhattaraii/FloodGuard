import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, RiskLevel, AlertSeverity, AlertStatus, SensorType } from '@prisma/client';
import { adapter } from '../prisma.config';

const prisma = new PrismaClient({ adapter });

const password = '12345678';

/**
 * Comprehensive Nepal regions seed with actual flood-prone areas
 * Covers major river basins and Terai regions
 */
async function main() {
  console.log('🇳🇵 Seeding Nepal Flood-Prone Regions...\n');

  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Create System Users
  console.log('👥 Creating users...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@floodguard.np' },
    update: {},
    create: {
      email: 'admin@floodguard.np',
      name: 'System Administrator',
      password: hashedPassword,
      role: UserRole.admin,
      isApproved: true,
      approvedAt: new Date(),
    },
  });

  const resident = await prisma.user.upsert({
    where: { email: 'user@gmail.com' },
    update: {},
    create: {
      email: 'user@gmail.com',
      name: 'Ram Prasad',
      password: hashedPassword,
      role: UserRole.resident,
      isApproved: true,
      approvedAt: new Date(),
    },
  });

  const volunteer1 = await prisma.user.upsert({
    where: { email: 'volunteer1@gmail.com' },
    update: {},
    create: {
      email: 'volunteer1@gmail.com',
      name: 'Sita Kumari',
      password: hashedPassword,
      role: UserRole.volunteer,
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
  });

  const volunteer2 = await prisma.user.upsert({
    where: { email: 'volunteer2@gmail.com' },
    update: {},
    create: {
      email: 'volunteer2@gmail.com',
      name: 'Hari Bahadur',
      password: hashedPassword,
      role: UserRole.volunteer,
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
  });

  console.log('✅ Users created\n');

  // 2. Create Nepal Regions with Geographic Distribution
  console.log('🗺️  Creating Nepal regions...\n');

  // EASTERN REGION
  const koshiBasin = await prisma.region.upsert({
    where: { id: '10000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'Koshi River Basin - Biratnagar',
      description: 'High-risk flood zone along Koshi River. Affects Morang and Sunsari districts. Frequent flooding during monsoon season with severe inundation.',
      centerLat: 26.4525,
      centerLng: 87.2718,
      riskLevel: RiskLevel.high,
      population: 240000,
      area: 45.5,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [87.2500, 26.4300],
          [87.2936, 26.4300],
          [87.2936, 26.4750],
          [87.2500, 26.4750],
          [87.2500, 26.4300],
        ]],
      },
    },
  });

  const saptariDistrict = await prisma.region.upsert({
    where: { id: '10000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'Saptari - Rajbiraj Plains',
      description: 'Low-lying Terai plains prone to waterlogging and flash floods. Koshi tributary region with poor drainage infrastructure.',
      centerLat: 26.5408,
      centerLng: 86.7456,
      riskLevel: RiskLevel.critical,
      population: 185000,
      area: 38.2,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [86.7200, 26.5200],
          [86.7712, 26.5200],
          [86.7712, 26.5616],
          [86.7200, 26.5616],
          [86.7200, 26.5200],
        ]],
      },
    },
  });

  // CENTRAL REGION
  const kathmanduValley = await prisma.region.upsert({
    where: { id: '10000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000003',
      name: 'Kathmandu Valley - Bagmati River',
      description: 'Urban flood-prone area along Bagmati and Bishnumati rivers. Risk increases during heavy monsoon rainfall. Poor drainage in densely populated areas.',
      centerLat: 27.7172,
      centerLng: 85.3240,
      riskLevel: RiskLevel.medium,
      population: 350000,
      area: 52.8,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [85.2900, 27.6950],
          [85.3580, 27.6950],
          [85.3580, 27.7394],
          [85.2900, 27.7394],
          [85.2900, 27.6950],
        ]],
      },
    },
  });

  const chitwan = await prisma.region.upsert({
    where: { id: '10000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000004',
      name: 'Chitwan - Narayani River Basin',
      description: 'Narayani (Gandaki) river flood zone. Affects Bharatpur and surrounding areas. Critical during monsoon with rapid water level rise.',
      centerLat: 27.6588,
      centerLng: 84.4360,
      riskLevel: RiskLevel.high,
      population: 195000,
      area: 42.3,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [84.4000, 27.6300],
          [84.4720, 27.6300],
          [84.4720, 27.6876],
          [84.4000, 27.6876],
          [84.4000, 27.6300],
        ]],
      },
    },
  });

  const rautahat = await prisma.region.upsert({
    where: { id: '10000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000005',
      name: 'Rautahat - Gaur Terai Plains',
      description: 'Extremely flood-prone Terai district. Low elevation with multiple small rivers. Annual monsoon flooding affects thousands.',
      centerLat: 26.9794,
      centerLng: 85.2958,
      riskLevel: RiskLevel.critical,
      population: 128000,
      area: 35.7,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [85.2600, 26.9500],
          [85.3316, 26.9500],
          [85.3316, 27.0088],
          [85.2600, 27.0088],
          [85.2600, 26.9500],
        ]],
      },
    },
  });

  // WESTERN REGION
  const rupandehi = await prisma.region.upsert({
    where: { id: '10000000-0000-0000-0000-000000000006' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000006',
      name: 'Rupandehi - Butwal-Bhairahawa',
      description: 'Industrial and urban flood zone. Tinau River and tributaries cause seasonal flooding. Growing urbanization increases flood risk.',
      centerLat: 27.5058,
      centerLng: 83.4614,
      riskLevel: RiskLevel.medium,
      population: 210000,
      area: 48.6,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [83.4200, 27.4800],
          [83.5028, 27.4800],
          [83.5028, 27.5316],
          [83.4200, 27.5316],
          [83.4200, 27.4800],
        ]],
      },
    },
  });

  const banke = await prisma.region.upsert({
    where: { id: '10000000-0000-0000-0000-000000000007' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000007',
      name: 'Banke - Nepalgunj Urban Area',
      description: 'Rapti River flood zone in western Terai. Urban flooding combined with riverine floods. Critical infrastructure at risk.',
      centerLat: 28.0505,
      centerLng: 81.6167,
      riskLevel: RiskLevel.high,
      population: 165000,
      area: 39.4,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [81.5800, 28.0300],
          [81.6534, 28.0300],
          [81.6534, 28.0710],
          [81.5800, 28.0710],
          [81.5800, 28.0300],
        ]],
      },
    },
  });

  // FAR-WESTERN REGION
  const kailali = await prisma.region.upsert({
    where: { id: '10000000-0000-0000-0000-000000000008' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000008',
      name: 'Kailali - Dhangadhi Plains',
      description: 'Far-western Terai flood zone. Mohana River and tributaries. Vulnerable to trans-border flooding from India.',
      centerLat: 28.6939,
      centerLng: 80.5893,
      riskLevel: RiskLevel.medium,
      population: 142000,
      area: 36.8,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [80.5500, 28.6700],
          [80.6286, 28.6700],
          [80.6286, 28.7178],
          [80.5500, 28.7178],
          [80.5500, 28.6700],
        ]],
      },
    },
  });

  const bardiya = await prisma.region.upsert({
    where: { id: '10000000-0000-0000-0000-000000000009' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000009',
      name: 'Bardiya - Karnali River Basin',
      description: 'Karnali River delta region. National park area with human settlements. Severe flooding during heavy rainfall.',
      centerLat: 28.3352,
      centerLng: 81.5245,
      riskLevel: RiskLevel.high,
      population: 98000,
      area: 32.5,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [81.4900, 28.3100],
          [81.5590, 28.3100],
          [81.5590, 28.3604],
          [81.4900, 28.3604],
          [81.4900, 28.3100],
        ]],
      },
    },
  });

  const sunsari = await prisma.region.upsert({
    where: { id: '10000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000010',
      name: 'Sunsari - Inaruwa-Dharan Corridor',
      description: 'Koshi tributary zone. Industrial and agricultural areas. Flash floods common during intense monsoon rainfall.',
      centerLat: 26.6527,
      centerLng: 87.1891,
      riskLevel: RiskLevel.medium,
      population: 175000,
      area: 41.2,
      adminId: admin.id,
      coordinates: {
        type: 'Polygon',
        coordinates: [[
          [87.1500, 26.6300],
          [87.2282, 26.6300],
          [87.2282, 26.6754],
          [87.1500, 26.6754],
          [87.1500, 26.6300],
        ]],
      },
    },
  });

  console.log('✅ 10 Nepal regions created\n');

  // 3. Create Sensors for Each Region
  console.log('📡 Creating water level and rainfall sensors...\n');

  const regions = [
    koshiBasin, saptariDistrict, kathmanduValley, chitwan, rautahat,
    rupandehi, banke, kailali, bardiya, sunsari
  ];

  for (const region of regions) {
    // Water level sensor
    await prisma.sensor.create({
      data: {
        regionId: region.id,
        name: `${region.name.split('-')[0].trim()} Water Level Station`,
        type: SensorType.water_level,
        latitude: region.centerLat,
        longitude: region.centerLng,
        currentValue: region.riskLevel === 'critical' ? 2.8 : region.riskLevel === 'high' ? 2.1 : 1.5,
        threshold: 3.0,
        unit: 'm',
        isActive: true,
      },
    });

    // Rainfall sensor
    await prisma.sensor.create({
      data: {
        regionId: region.id,
        name: `${region.name.split('-')[0].trim()} Rain Gauge`,
        type: SensorType.rainfall,
        latitude: region.centerLat! + 0.01,
        longitude: region.centerLng! + 0.01,
        currentValue: region.riskLevel === 'critical' ? 45 : region.riskLevel === 'high' ? 28 : 12,
        threshold: 50,
        unit: 'mm/h',
        isActive: true,
      },
    });
  }

  console.log('✅ 20 sensors created (2 per region)\n');

  // 4. Create Evacuation Shelters
  console.log('🏠 Creating evacuation shelters...\n');

  const shelters = [
    {
      regionId: koshiBasin.id,
      shelterName: 'Biratnagar City Hall Shelter',
      address: 'Main Road, Biratnagar',
      latitude: 26.4546,
      longitude: 87.2721,
      capacity: 500,
      currentCount: 0,
      facilities: ['Medical Aid', 'Food', 'Water', 'Blankets', 'Toilets'],
      contactPhone: '+977-021-525252',
    },
    {
      regionId: saptariDistrict.id,
      shelterName: 'Rajbiraj District School',
      address: 'Education Road, Rajbiraj',
      latitude: 26.5430,
      longitude: 86.7468,
      capacity: 350,
      currentCount: 0,
      facilities: ['Food', 'Water', 'First Aid', 'Toilets'],
      contactPhone: '+977-031-520125',
    },
    {
      regionId: kathmanduValley.id,
      shelterName: 'Ratna Park Community Center',
      address: 'Ratna Park, Kathmandu',
      latitude: 27.7095,
      longitude: 85.3140,
      capacity: 800,
      currentCount: 12,
      facilities: ['Medical Aid', 'Food', 'Water', 'Blankets', 'Electricity', 'Toilets'],
      contactPhone: '+977-01-4223456',
    },
    {
      regionId: kathmanduValley.id,
      shelterName: 'Balkumari Sports Complex',
      address: 'Balkumari, Lalitpur',
      latitude: 27.6890,
      longitude: 85.3350,
      capacity: 600,
      currentCount: 0,
      facilities: ['Food', 'Water', 'Medical Aid', 'Blankets', 'Toilets'],
      contactPhone: '+977-01-5538822',
    },
    {
      regionId: chitwan.id,
      shelterName: 'Bharatpur Municipal Hall',
      address: 'Narayangadh, Bharatpur',
      latitude: 27.6780,
      longitude: 84.4324,
      capacity: 450,
      currentCount: 8,
      facilities: ['Medical Aid', 'Food', 'Water', 'Blankets', 'Toilets'],
      contactPhone: '+977-056-522145',
    },
    {
      regionId: rautahat.id,
      shelterName: 'Gaur Community School',
      address: 'Gaur Municipality',
      latitude: 26.9854,
      longitude: 85.2898,
      capacity: 300,
      currentCount: 0,
      facilities: ['Food', 'Water', 'First Aid', 'Toilets'],
      contactPhone: '+977-055-411236',
    },
    {
      regionId: rupandehi.id,
      shelterName: 'Butwal Engineering College',
      address: 'Kalikanagar, Butwal',
      latitude: 27.7000,
      longitude: 83.4655,
      capacity: 550,
      currentCount: 0,
      facilities: ['Medical Aid', 'Food', 'Water', 'Blankets', 'Toilets'],
      contactPhone: '+977-071-540232',
    },
    {
      regionId: banke.id,
      shelterName: 'Nepalgunj Medical College Hall',
      address: 'Kohalpur, Nepalgunj',
      latitude: 28.0515,
      longitude: 81.6200,
      capacity: 400,
      currentCount: 0,
      facilities: ['Medical Aid', 'Food', 'Water', 'Electricity', 'Toilets'],
      contactPhone: '+977-081-525645',
    },
    {
      regionId: kailali.id,
      shelterName: 'Dhangadhi Multi-Purpose Hall',
      address: 'Attaria Road, Dhangadhi',
      latitude: 28.6970,
      longitude: 80.5920,
      capacity: 350,
      currentCount: 0,
      facilities: ['Food', 'Water', 'First Aid', 'Blankets', 'Toilets'],
      contactPhone: '+977-091-522145',
    },
    {
      regionId: bardiya.id,
      shelterName: 'Gulariya District Center',
      address: 'Gulariya, Bardiya',
      latitude: 28.2145,
      longitude: 81.3562,
      capacity: 280,
      currentCount: 0,
      facilities: ['Food', 'Water', 'Medical Aid', 'Toilets'],
      contactPhone: '+977-084-400215',
    },
    {
      regionId: sunsari.id,
      shelterName: 'Inaruwa Youth Center',
      address: 'Inaruwa, Sunsari',
      latitude: 26.5122,
      longitude: 87.2356,
      capacity: 320,
      currentCount: 0,
      facilities: ['Food', 'Water', 'First Aid', 'Blankets', 'Toilets'],
      contactPhone: '+977-025-580445',
    },
    {
      regionId: koshiBasin.id,
      shelterName: 'Biratnagar Technical School',
      address: 'Airport Road, Biratnagar',
      latitude: 26.4890,
      longitude: 87.2650,
      capacity: 400,
      currentCount: 0,
      facilities: ['Food', 'Water', 'Medical Aid', 'Toilets'],
      contactPhone: '+977-021-535678',
    },
  ];

  for (const shelter of shelters) {
    await prisma.evacuationRoute.create({ data: shelter });
  }

  console.log('✅ 12 evacuation shelters created\n');

  // 5. Create Sample Alerts for High-Risk Regions
  console.log('⚠️  Creating sample alerts...\n');

  await prisma.alert.create({
    data: {
      regionId: saptariDistrict.id,
      severity: AlertSeverity.critical,
      title: 'CRITICAL: Flash Flood Warning - Saptari',
      description: `Heavy rainfall upstream has caused water levels to rise rapidly in Koshi tributaries. Flash flooding expected in low-lying areas within 3-6 hours.

IMMEDIATE ACTIONS:
- Evacuate to designated shelters immediately
- Move to higher ground
- Avoid all river crossings
- Emergency services on high alert

Expected Impact: Severe flooding in Rajbiraj plains, 50+ villages at risk.`,
      issuedBy: admin.id,
      status: AlertStatus.active,
    },
  });

  await prisma.alert.create({
    data: {
      regionId: rautahat.id,
      severity: AlertSeverity.high,
      title: 'HIGH ALERT: Monsoon Flooding - Rautahat',
      description: `Sustained heavy rainfall over the past 48 hours. Multiple rivers above danger levels. Flooding expected in Gaur and surrounding areas.

RECOMMENDED ACTIONS:
- Prepare for possible evacuation
- Move valuables to higher floors
- Keep emergency supplies ready
- Monitor updates closely

Current Status: 2 rivers at warning level, more rain forecast.`,
      issuedBy: admin.id,
      status: AlertStatus.active,
    },
  });

  console.log('✅ Sample alerts created\n');

  // 6. Create Sample Reports
  console.log('📝 Creating sample community reports...\n');

  await prisma.report.create({
    data: {
      userId: resident.id,
      regionId: kathmanduValley.id,
      description: 'Heavy waterlogging in Balaju area due to blocked drainage. Water level approximately 1 foot in residential streets.',
      latitude: 27.7305,
      longitude: 85.3002,
      waterLevel: 0.3,
      status: 'verified',
    },
  });

  await prisma.report.create({
    data: {
      userId: resident.id,
      regionId: chitwan.id,
      description: 'Narayani River water rising rapidly near Narayangadh. Small riverbank erosion observed.',
      latitude: 27.6588,
      longitude: 84.4250,
      waterLevel: 2.5,
      status: 'pending',
    },
  });

  console.log('✅ Sample reports created\n');

  console.log('═══════════════════════════════════════════');
  console.log('✅ Nepal regions database seeding complete!');
  console.log('═══════════════════════════════════════════\n');
  console.log('Summary:');
  console.log('  • 10 Nepal regions (covering major flood-prone areas)');
  console.log('  • 20 sensors (water level + rainfall per region)');
  console.log('  • 12 evacuation shelters across the country');
  console.log('  • 2 active alerts (critical and high severity)');
  console.log('  • 2 community reports');
  console.log('  • 4 users (1 admin, 1 resident, 2 volunteers)\n');
  console.log('Login Credentials:');
  console.log('  Admin:     admin@floodguard.np / 12345678');
  console.log('  Resident:  user@gmail.com / 12345678');
  console.log('  Volunteer: volunteer1@gmail.com / 12345678\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
