import prisma from '../src/config/db';
import { hashPassword } from '../src/modules/auth/auth.utils';

async function main() {
  console.log('🌱 Starting TurfXI database seed...');

  // 1. Clean existing seed data
  console.log('Cleaning old records...');
  await prisma.playerMatchStat.deleteMany({});
  await prisma.tournamentMatch.deleteMany({});
  await prisma.tournamentTeamEntry.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.teamRecruitment.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.membersOnlySlot.deleteMany({});
  await prisma.turfPhoto.deleteMany({});
  await prisma.turf.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.playerProfile.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPasswordHash = await hashPassword('Password123!');

  // 2. Create Users across all roles and tiers
  console.log('Creating users...');

  // Admin
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@turfxi.com',
      password: defaultPasswordHash,
      role: 'ADMIN',
      membershipTier: 'GOLD',
      wallet: { create: { balance: 50000 } },
    },
  });

  // Turf Owner
  const owner = await prisma.user.create({
    data: {
      name: 'Kabir Khan (Venue Owner)',
      email: 'owner@turfxi.com',
      password: defaultPasswordHash,
      role: 'TURF_OWNER',
      membershipTier: 'FREE',
      wallet: { create: { balance: 25000 } },
    },
  });

  // Gold Player (Shihab)
  const playerGold = await prisma.user.create({
    data: {
      name: 'Shihab (Gold Captain)',
      email: 'player.gold@turfxi.com',
      password: defaultPasswordHash,
      role: 'PLAYER',
      membershipTier: 'GOLD',
      wallet: { create: { balance: 10000 } },
      playerProfile: {
        create: {
          position: 'Forward',
          preferredFoot: 'Right',
          city: 'Dhaka',
          area: 'Dhanmondi',
          skillLevel: 'Advanced',
        },
      },
    },
    include: { playerProfile: true },
  });

  // Silver Player
  const playerSilver = await prisma.user.create({
    data: {
      name: 'Rahim Alom (Silver Midfielder)',
      email: 'player.silver@turfxi.com',
      password: defaultPasswordHash,
      role: 'PLAYER',
      membershipTier: 'SILVER',
      wallet: { create: { balance: 5000 } },
      playerProfile: {
        create: {
          position: 'Midfielder',
          preferredFoot: 'Left',
          city: 'Dhaka',
          area: 'Banani',
          skillLevel: 'Intermediate',
        },
      },
    },
  });

  // Free Player
  const playerFree = await prisma.user.create({
    data: {
      name: 'Tanvir Hasan (Free GK)',
      email: 'player.free@turfxi.com',
      password: defaultPasswordHash,
      role: 'PLAYER',
      membershipTier: 'FREE',
      wallet: { create: { balance: 1500 } },
      playerProfile: {
        create: {
          position: 'Goalkeeper',
          preferredFoot: 'Right',
          city: 'Dhaka',
          area: 'Uttara',
          skillLevel: 'Beginner',
        },
      },
    },
  });

  // Normal Booker
  const normalUser = await prisma.user.create({
    data: {
      name: 'Nayeem Booker',
      email: 'user@turfxi.com',
      password: defaultPasswordHash,
      role: 'NORMAL',
      membershipTier: 'FREE',
      wallet: { create: { balance: 3000 } },
    },
  });

  console.log('✅ Users created: Admin, Owner, Gold Player, Silver Player, Free Player, Normal Booker');

  // 3. Create Turfs
  console.log('Creating turfs...');
  const apexTurf = await prisma.turf.create({
    data: {
      ownerId: owner.id,
      name: 'Apex Turf Arena Dhanmondi',
      description: 'FIFA standard 5-a-side and 7-a-side artificial turf with floodlights and locker rooms.',
      address: 'Road 27 (Old), Dhanmondi',
      city: 'Dhaka',
      area: 'Dhanmondi',
      latitude: 23.7533,
      longitude: 90.3776,
      pricePerHour: 1800,
      size: '60x40 ft (5v5)',
      surfaceType: 'Artificial Turf v3',
      advancePercent: 30,
      verified: true,
      photos: {
        create: [
          { url: 'https://images.unsplash.com/photo-1529900240041-22f114d18e40?w=800' },
          { url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800' },
        ],
      },
      membersOnlySlots: {
        create: [
          { dayOfWeek: 5, startTime: '06:00', endTime: '08:00' }, // Friday 6-8 AM
          { dayOfWeek: 6, startTime: '06:00', endTime: '08:00' }, // Saturday 6-8 AM
        ],
      },
    },
  });

  const skylineTurf = await prisma.turf.create({
    data: {
      ownerId: owner.id,
      name: 'Skyline Sports Ground Banani',
      description: 'Premium rooftop turf venue overlooking the city skyline, equipped with high-grade safety netting.',
      address: 'Block E, Kemal Ataturk Avenue, Banani',
      city: 'Dhaka',
      area: 'Banani',
      latitude: 23.7937,
      longitude: 90.4066,
      pricePerHour: 2200,
      size: '75x45 ft (6v6)',
      surfaceType: 'Premium Monofilament',
      advancePercent: 30,
      verified: true,
      photos: {
        create: [
          { url: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800' },
        ],
      },
    },
  });

  console.log('✅ Turfs created: Apex Turf Dhanmondi & Skyline Sports Banani');

  // 4. Create Teams
  console.log('Creating squads / teams...');
  const teamThunder = await prisma.team.create({
    data: {
      name: 'Dhaka Thunder FC',
      captainId: playerGold.id,
      viceCaptainId: playerSilver.id,
      members: {
        create: [
          { userId: playerGold.id },
          { userId: playerSilver.id },
          { userId: playerFree.id },
        ],
      },
      recruitment: {
        create: {
          positionsNeeded: 'GK, CB',
          isOpen: true,
        },
      },
    },
  });

  const teamStrikers = await prisma.team.create({
    data: {
      name: 'Apex Strikers',
      captainId: playerSilver.id,
      members: {
        create: [
          { userId: playerSilver.id },
        ],
      },
    },
  });

  console.log('✅ Teams created: Dhaka Thunder FC & Apex Strikers');

  // 5. Create a Completed Match with Player Stats
  console.log('Creating sample match with player statistics...');
  const sampleBooking = await prisma.booking.create({
    data: {
      turfId: apexTurf.id,
      bookerId: playerGold.id,
      type: 'HOURLY',
      bookingDate: new Date('2026-10-23T00:00:00.000Z'),
      startTime: '20:00',
      endTime: '21:00',
      totalPrice: 1800,
      advanceAmount: 1800,
      status: 'COMPLETED',
    },
  });

  const sampleMatch = await prisma.match.create({
    data: {
      bookingId: sampleBooking.id,
      teamAId: teamThunder.id,
      teamBId: teamStrikers.id,
      reportedByUserId: playerGold.id,
      scoreA: 5,
      scoreB: 3,
      playerStats: {
        create: [
          {
            playerId: playerGold.id,
            goals: 3,
            assists: 1,
            saves: 0,
            rating: 9.4,
            position: 'Forward',
          },
          {
            playerId: playerSilver.id,
            goals: 2,
            assists: 2,
            saves: 0,
            rating: 8.7,
            position: 'Midfielder',
          },
          {
            playerId: playerFree.id,
            goals: 0,
            assists: 0,
            saves: 8,
            rating: 8.2,
            position: 'Goalkeeper',
          },
        ],
      },
    },
  });

  console.log('✅ Sample Match created (Dhaka Thunder 5 - 3 Apex Strikers) with match stats!');

  // 6. Create Tournament
  console.log('Creating tournament...');
  const tournament = await prisma.tournament.create({
    data: {
      name: 'Dhaka Winter Turf Championship 2026',
      organizerId: playerGold.id,
      hostTurfId: apexTurf.id,
      entryFee: 3500,
      prizeInfo: 'Champion: 25,000 BDT + Trophy, Runner-up: 10,000 BDT',
      rules: '5-a-side knockout format. 20 min halves. Yellow card = 2 min sit out.',
      status: 'UPCOMING',
      startDate: new Date('2026-11-15T00:00:00.000Z'),
      endDate: new Date('2026-11-20T00:00:00.000Z'),
      teamEntries: {
        create: [
          { teamId: teamThunder.id, seed: 1 },
          { teamId: teamStrikers.id, seed: 2 },
        ],
      },
    },
  });

  console.log('✅ Tournament created:', tournament.name);
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
