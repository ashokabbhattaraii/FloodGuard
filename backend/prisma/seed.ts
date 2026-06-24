import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole, RiskLevel, AlertSeverity, AlertStatus, ReportStatus, SensorType, RequestType, RequestPriority, RequestStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const password = '12345678';

const accounts = [
  {
    email: 'user@gmail.com',
    name: 'Resident User',
    role: UserRole.resident,
  },
  {
    email: 'volunteer@gmail.com',
    name: 'Volunteer Responder',
    role: UserRole.volunteer,
  },
  {
    email: 'admin@gmail.com',
    name: 'Admin User',
    role: UserRole.admin,
  },
];

async function main() {
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Seed Users
  console.log('Seeding users...');
  const users: Record<string, any> = {};
  for (const account of accounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        password: hashedPassword,
        role: account.role,
      },
      create: {
        ...account,
        password: hashedPassword,
      },
    });
    users[account.email] = user;
  }

  // 2. Seed Regions
  console.log('Seeding regions...');
  const regionData = [
    {
      name: 'Downtown Metro',
      riskLevel: RiskLevel.high,
      coordinates: { lat: 27.7172, lng: 85.3240 },
    },
    {
      name: 'River Basin Valley',
      riskLevel: RiskLevel.critical,
      coordinates: { lat: 27.6853, lng: 85.3400 },
    },
    {
      name: 'Hillside Heights',
      riskLevel: RiskLevel.low,
      coordinates: { lat: 27.7300, lng: 85.3000 },
    },
  ];

  const regions: Record<string, any> = {};
  for (const reg of regionData) {
    // Delete existing to avoid conflicts
    const existing = await prisma.region.findFirst({ where: { name: reg.name } });
    if (existing) {
      regions[reg.name] = existing;
    } else {
      const created = await prisma.region.create({
        data: reg,
      });
      regions[reg.name] = created;
    }
  }

  // 3. Seed Evacuation Centers (Routes)
  console.log('Seeding evacuation centers...');
  const shelterData = [
    {
      regionId: regions['Downtown Metro'].id,
      shelterName: 'Metro Sports Complex',
      capacity: 500,
      routeData: {
        instructions: 'Head north along arterial road, shelter is behind the central park.',
        coordinates: { lat: 27.7215, lng: 85.3305 },
        currentCount: 180,
      },
    },
    {
      regionId: regions['River Basin Valley'].id,
      shelterName: 'Valley Community School',
      capacity: 300,
      routeData: {
        instructions: 'Proceed to highland road, school is on the right side next to fire station.',
        coordinates: { lat: 27.6885, lng: 85.3455 },
        currentCount: 240,
      },
    },
    {
      regionId: regions['Hillside Heights'].id,
      shelterName: 'Hillside Community Center',
      capacity: 200,
      routeData: {
        instructions: 'Take route 3 uphill, center is adjacent to city water tank.',
        coordinates: { lat: 27.7335, lng: 85.2955 },
        currentCount: 60,
      },
    },
  ];

  for (const s of shelterData) {
    const existing = await prisma.evacuationRoute.findFirst({ where: { shelterName: s.shelterName } });
    if (!existing) {
      await prisma.evacuationRoute.create({ data: s });
    } else {
      // Keep coordinates / occupancy in sync on reseed
      await prisma.evacuationRoute.update({
        where: { id: existing.id },
        data: { capacity: s.capacity, routeData: s.routeData },
      });
    }
  }

  // 4. Seed Sensors
  console.log('Seeding sensors...');
  const sensorData = [
    {
      regionId: regions['River Basin Valley'].id,
      type: SensorType.water_level,
      currentValue: 4.8,
      threshold: 3.5,
    },
    {
      regionId: regions['River Basin Valley'].id,
      type: SensorType.rainfall,
      currentValue: 120.0,
      threshold: 100.0,
    },
    {
      regionId: regions['Downtown Metro'].id,
      type: SensorType.water_level,
      currentValue: 2.2,
      threshold: 3.0,
    },
    {
      regionId: regions['Downtown Metro'].id,
      type: SensorType.rainfall,
      currentValue: 65.0,
      threshold: 80.0,
    },
  ];

  for (const sen of sensorData) {
    const existing = await prisma.sensor.findFirst({
      where: { regionId: sen.regionId, type: sen.type },
    });
    if (existing) {
      await prisma.sensor.update({
        where: { id: existing.id },
        data: { currentValue: sen.currentValue, threshold: sen.threshold },
      });
    } else {
      await prisma.sensor.create({ data: sen });
    }
  }

  // 5. Seed Alerts
  console.log('Seeding alerts...');
  const alertData = [
    {
      regionId: regions['River Basin Valley'].id,
      severity: AlertSeverity.critical,
      title: 'Severe Flash Flood Warning',
      description: 'Water levels at River Basin Valley have exceeded the critical threshold (4.8m vs 3.5m). Immediate evacuation recommended.',
      issuedBy: 'System Sensor Alert',
      status: AlertStatus.active,
    },
    {
      regionId: regions['Downtown Metro'].id,
      severity: AlertSeverity.high,
      title: 'High Water Advisory',
      description: 'River levels in Downtown Metro are rising rapidly due to heavy upstream rainfall. Stay vigilant.',
      issuedBy: 'Admin User',
      status: AlertStatus.active,
    },
  ];

  for (const a of alertData) {
    const existing = await prisma.alert.findFirst({ where: { title: a.title } });
    if (!existing) {
      await prisma.alert.create({ data: a });
    }
  }

  // 6. Seed Reports
  console.log('Seeding reports...');
  const reportData = [
    {
      userId: users['user@gmail.com'].id,
      regionId: regions['Downtown Metro'].id,
      description: 'Water is starting to puddle and rise on Main Street, about ankle deep. Street sewers seem clogged.',
      latitude: 27.7180,
      longitude: 85.3250,
      waterLevel: 0.15,
      status: ReportStatus.pending,
    },
    {
      userId: users['user@gmail.com'].id,
      regionId: regions['River Basin Valley'].id,
      description: 'The small bridge near the school is completely submerged. Water velocity is high.',
      latitude: 27.6860,
      longitude: 85.3410,
      waterLevel: 0.8,
      status: ReportStatus.verified,
    },
  ];

  for (const r of reportData) {
    const existing = await prisma.report.findFirst({ where: { description: r.description } });
    if (!existing) {
      await prisma.report.create({ data: r });
    }
  }

  // 7. Seed Flood Requests (SOS)
  console.log('Seeding flood requests...');
  const requestData = [
    {
      userId: users['user@gmail.com'].id,
      type: RequestType.evacuation,
      priority: RequestPriority.critical,
      status: RequestStatus.pending,
      title: 'Emergency evacuation assistance for elderly family',
      description: 'Water is entering our ground floor rapidly. We have two elderly family members who need physical assistance to climb or move to safe shelter.',
      location: 'House 24, River Basin Road',
      peopleCount: 4,
      contactPhone: '9876543210',
      latitude: 27.6855,
      longitude: 85.3405,
    },
    {
      userId: users['user@gmail.com'].id,
      type: RequestType.relief,
      priority: RequestPriority.medium,
      status: RequestStatus.pending,
      title: 'Food and clean water request',
      description: 'We are stranded on the second floor. Safe for now but running very low on drinking water and dry baby food. Need supplies.',
      location: 'Apartment 3B, Downtown Metro Plaza',
      peopleCount: 3,
      contactPhone: '9812345678',
      latitude: 27.7170,
      longitude: 85.3235,
    },
    {
      userId: users['user@gmail.com'].id,
      type: RequestType.shelter,
      priority: RequestPriority.low,
      status: RequestStatus.pending,
      title: 'Requesting temporary shelter location info',
      description: 'Basement has minor flooding. Need sandbags if possible and guidance on where to register for temporary shelter.',
      location: 'Villa 12, Hillside Heights',
      peopleCount: 2,
      contactPhone: '9811122233',
      latitude: 27.7310,
      longitude: 85.3010,
    },
  ];

  for (const f of requestData) {
    const existing = await prisma.floodRequest.findFirst({ where: { title: f.title } });
    if (!existing) {
      await prisma.floodRequest.create({ data: f });
    }
  }

  console.log(`Seeded complete datasets successfully.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

