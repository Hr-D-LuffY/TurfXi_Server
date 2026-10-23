import prisma from '../../config/db';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';

export interface CreateTournamentInput {
  name: string;
  hostTurfId: string;
  entryFee: number;
  prizeInfo?: string | undefined;
  rules?: string | undefined;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

export const tournamentsService = {
  async list(filters: { status?: string | undefined; search?: string | undefined }) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        hostTurf: {
          select: {
            id: true,
            name: true,
            city: true,
            area: true,
            pricePerHour: true,
            photos: { take: 1, select: { url: true } },
          },
        },
        organizer: {
          select: { id: true, name: true, role: true, membershipTier: true },
        },
        _count: {
          select: { teamEntries: true, matches: true },
        },
      },
    });

    return tournaments;
  },

  async getById(id: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        hostTurf: {
          include: {
            photos: true,
          },
        },
        organizer: {
          select: { id: true, name: true, email: true, role: true, membershipTier: true },
        },
        teamEntries: {
          orderBy: { seed: 'asc' },
          include: {
            team: {
              include: {
                captain: { select: { id: true, name: true } },
                _count: { select: { members: true } },
              },
            },
          },
        },
        matches: {
          orderBy: [{ round: 'asc' }, { scheduledAt: 'asc' }],
          include: {
            teamA: { select: { id: true, name: true, logoUrl: true } },
            teamB: { select: { id: true, name: true, logoUrl: true } },
            turf: { select: { id: true, name: true } },
            match: { select: { id: true, scoreA: true, scoreB: true } },
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    return tournament;
  },

  async create(userId: string, input: CreateTournamentInput) {
    if (!input.name || !input.hostTurfId) {
      throw new BadRequestError('Tournament name and host venue are required');
    }

    const hostTurf = await prisma.turf.findUnique({
      where: { id: input.hostTurfId },
    });

    if (!hostTurf) {
      throw new NotFoundError('Host turf venue not found');
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: input.name.trim(),
        organizerId: userId,
        hostTurfId: input.hostTurfId,
        entryFee: input.entryFee >= 0 ? input.entryFee : 0,
        prizeInfo: input.prizeInfo ?? null,
        rules: input.rules ?? null,
        status: 'UPCOMING',
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      },
      include: {
        hostTurf: true,
        organizer: {
          select: { id: true, name: true },
        },
      },
    });

    return tournament;
  },

  async registerTeam(userId: string, tournamentId: string, teamId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teamEntries: true },
    });

    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    if (tournament.status !== 'UPCOMING' && tournament.status !== 'DRAFT') {
      throw new BadRequestError('Cannot register for a tournament that has already started or ended');
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    if (team.captainId !== userId) {
      throw new ForbiddenError('Only the team captain can register the team for tournaments');
    }

    const alreadyRegistered = tournament.teamEntries.some((e) => e.teamId === teamId);
    if (alreadyRegistered) {
      throw new BadRequestError('This team is already registered for this tournament');
    }

    const entryFeeNum = Number(tournament.entryFee);

    // Run registration and wallet fee deduction atomically
    return prisma.$transaction(async (tx) => {
      if (entryFeeNum > 0) {
        const wallet = await tx.wallet.findUnique({
          where: { userId },
        });

        if (!wallet || Number(wallet.balance) < entryFeeNum) {
          throw new BadRequestError(
            `Insufficient wallet balance. Entry fee is ${entryFeeNum} BDT. Please top up your wallet.`
          );
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: entryFeeNum },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'PAYMENT',
            status: 'COMPLETED',
            amount: entryFeeNum,
            referenceType: 'TOURNAMENT_ENTRY',
            referenceId: tournamentId,
          },
        });
      }

      const nextSeed = tournament.teamEntries.length + 1;
      const entry = await tx.tournamentTeamEntry.create({
        data: {
          tournamentId,
          teamId,
          seed: nextSeed,
        },
        include: {
          team: true,
        },
      });

      return entry;
    });
  },

  async generateBracket(userId: string, tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        hostTurf: true,
        teamEntries: {
          orderBy: { seed: 'asc' },
          include: { team: true },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    if (tournament.organizerId !== userId && tournament.hostTurf?.ownerId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') {
        throw new ForbiddenError('Only the tournament organizer or venue owner can generate brackets');
      }
    }

    const teams = tournament.teamEntries.map((e) => e.team);
    if (teams.length < 2) {
      throw new BadRequestError('At least 2 registered teams are required to generate brackets');
    }

    // Determine tournament bracket bracket size (closest power of 2, e.g. 2, 4, 8, 16)
    let bracketSize = 2;
    while (bracketSize < teams.length && bracketSize < 16) {
      bracketSize *= 2;
    }

    const totalRounds = Math.log2(bracketSize);

    // Clean any prior bracket matches for this tournament
    await prisma.tournamentMatch.deleteMany({
      where: { tournamentId },
    });

    const createdMatches: any[] = [];
    const baseDate = new Date(tournament.startDate);

    // Round 1 pairings (Seed 1 vs Seed N, Seed 2 vs Seed N-1, etc.)
    const round1MatchCount = bracketSize / 2;
    for (let i = 0; i < round1MatchCount; i++) {
      const teamA = teams[i * 2] || null;
      const teamB = teams[i * 2 + 1] || null;

      const matchTime = new Date(baseDate);
      matchTime.setHours(10 + i * 2, 0, 0, 0); // 10:00 AM, 12:00 PM, 2:00 PM, etc.

      const match = await prisma.tournamentMatch.create({
        data: {
          tournamentId,
          turfId: tournament.hostTurfId || tournament.teamEntries[0]?.teamId || '',
          round: 1,
          teamAId: teamA?.id ?? null,
          teamBId: teamB?.id ?? null,
          scheduledAt: matchTime,
        },
      });
      createdMatches.push(match);
    }

    // Subsequent rounds (Round 2, 3... up to Final) with placeholder slots
    for (let r = 2; r <= totalRounds; r++) {
      const matchesInRound = bracketSize / Math.pow(2, r);
      const roundDate = new Date(baseDate);
      roundDate.setDate(roundDate.getDate() + (r - 1));

      for (let m = 0; m < matchesInRound; m++) {
        const matchTime = new Date(roundDate);
        matchTime.setHours(14 + m * 2, 0, 0, 0);

        const match = await prisma.tournamentMatch.create({
          data: {
            tournamentId,
            turfId: tournament.hostTurfId || '',
            round: r,
            scheduledAt: matchTime,
          },
        });
        createdMatches.push(match);
      }
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'IN_PROGRESS' },
    });

    return {
      message: `Single-elimination bracket successfully generated for ${teams.length} teams across ${totalRounds} rounds`,
      matchesCount: createdMatches.length,
      rounds: totalRounds,
    };
  },
};
