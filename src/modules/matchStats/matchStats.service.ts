import prisma from '../../config/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import type { MembershipTier } from '../../generated/prisma/client';

export interface SubmitMatchReportInput {
  bookingId: string;
  teamAId?: string | undefined;
  teamBId?: string | undefined;
  scoreA: number;
  scoreB: number;
  playerStats: Array<{
    playerId: string;
    goals: number;
    assists: number;
    saves: number;
    rating?: number | undefined;
    position?: string | undefined;
  }>;
}

export const matchStatsService = {
  async getPlayerStats(playerId: string, viewerTier: MembershipTier = 'FREE') {
    const user = await prisma.user.findUnique({
      where: { id: playerId },
      include: {
        playerProfile: true,
        teamMemberships: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Player not found');
    }

    const matchStats = await prisma.playerMatchStat.findMany({
      where: { playerId },
      include: {
        match: {
          include: {
            teamA: { select: { id: true, name: true, logoUrl: true } },
            teamB: { select: { id: true, name: true, logoUrl: true } },
            booking: {
              include: {
                turf: { select: { id: true, name: true, area: true } },
              },
            },
          },
        },
      },
      orderBy: { match: { createdAt: 'desc' } },
    });

    const matchesPlayed = matchStats.length;
    const totalGoals = matchStats.reduce((acc, s) => acc + s.goals, 0);
    const totalAssists = matchStats.reduce((acc, s) => acc + s.assists, 0);
    const totalSaves = matchStats.reduce((acc, s) => acc + s.saves, 0);

    const ratings = matchStats.map((s) => s.rating).filter((r): r is number => r !== null && r !== undefined);
    const avgRating = ratings.length > 0 ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 7.0;

    // Calculate wins & form
    let wins = 0;
    const form: Array<'W' | 'D' | 'L'> = [];

    matchStats.slice(0, 5).forEach((stat) => {
      const match = stat.match;
      if (match.scoreA !== null && match.scoreB !== null) {
        const isTeamA = user.teamMemberships.some((m) => m.teamId === match.teamAId);
        const isTeamB = user.teamMemberships.some((m) => m.teamId === match.teamBId);

        if (match.scoreA === match.scoreB) {
          form.push('D');
        } else if ((isTeamA && match.scoreA > match.scoreB) || (isTeamB && match.scoreB > match.scoreA)) {
          wins++;
          form.push('W');
        } else {
          form.push('L');
        }
      }
    });

    // Dynamic achievement badges
    const badges: Array<{ id: string; name: string; description: string; tier: string }> = [];
    if (totalGoals >= 3) {
      badges.push({
        id: 'sharpshooter',
        name: 'Sharpshooter',
        description: 'Scored 3+ career turf goals',
        tier: 'GOLD',
      });
    }
    if (totalAssists >= 2) {
      badges.push({
        id: 'playmaker',
        name: 'Prime Playmaker',
        description: 'Delivered 2+ crucial assists',
        tier: 'SILVER',
      });
    }
    if (totalSaves >= 5) {
      badges.push({
        id: 'brick-wall',
        name: 'The Brick Wall',
        description: 'Recorded 5+ match saves',
        tier: 'GOLD',
      });
    }
    if (avgRating >= 8.5) {
      badges.push({
        id: 'perfectionist',
        name: 'Top Form Master',
        description: 'Maintained 8.5+ average rating',
        tier: 'GOLD',
      });
    }
    if (matchesPlayed >= 1) {
      badges.push({
        id: 'debut',
        name: 'Turf Debutant',
        description: 'Completed first verified match',
        tier: 'BRONZE',
      });
    }

    // Determine access based on membership tier
    const isFree = viewerTier === 'FREE' && user.membershipTier === 'FREE';

    const baseProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      membershipTier: user.membershipTier,
      playerProfile: user.playerProfile,
      team: user.teamMemberships[0]?.team || null,
      matchesPlayed,
    };

    if (isFree) {
      return {
        ...baseProfile,
        tierGated: true,
        previewStats: {
          goals: totalGoals,
          assists: totalAssists,
          avgRating,
        },
      };
    }

    return {
      ...baseProfile,
      tierGated: false,
      stats: {
        matchesPlayed,
        goals: totalGoals,
        assists: totalAssists,
        saves: totalSaves,
        avgRating,
        wins,
        winRate: matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0,
        form: form.reverse(),
      },
      badges,
      matchHistory: matchStats.map((s) => ({
        id: s.id,
        matchId: s.matchId,
        date: s.match.createdAt,
        venue: s.match.booking?.turf?.name || 'Dhaka Turf Arena',
        teamA: s.match.teamA?.name || 'Team A',
        teamB: s.match.teamB?.name || 'Team B',
        scoreA: s.match.scoreA,
        scoreB: s.match.scoreB,
        personalGoals: s.goals,
        personalAssists: s.assists,
        personalRating: s.rating,
      })),
      ...(viewerTier === 'GOLD' || user.membershipTier === 'GOLD'
        ? {
            goldInsights: {
              percentileRating: 92,
              headToHeadPredictionPower: 'High',
              cityRank: 4,
            },
          }
        : {}),
    };
  },

  async getLeaderboard(category: 'goals' | 'assists' | 'rating' = 'goals') {
    const players = await prisma.playerProfile.findMany({
      include: {
        user: {
          include: {
            matchStats: true,
            teamMemberships: {
              include: { team: true },
            },
          },
        },
      },
    });

    const ranked = players.map((p) => {
      const stats = p.user.matchStats;
      const goals = stats.reduce((acc, s) => acc + s.goals, 0);
      const assists = stats.reduce((acc, s) => acc + s.assists, 0);
      const ratings = stats.map((s) => s.rating).filter((r): r is number => r !== null && r !== undefined);
      const avgRating = ratings.length > 0 ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 7.0;

      return {
        playerId: p.userId,
        name: p.user.name,
        position: p.position || 'Forward',
        city: p.city || 'Dhaka',
        area: p.area || 'Dhanmondi',
        teamName: p.user.teamMemberships[0]?.team.name || 'Free Agent',
        goals,
        assists,
        avgRating,
        matchesPlayed: stats.length,
      };
    });

    if (category === 'goals') {
      ranked.sort((a, b) => b.goals - a.goals);
    } else if (category === 'assists') {
      ranked.sort((a, b) => b.assists - a.assists);
    } else {
      ranked.sort((a, b) => b.avgRating - a.avgRating);
    }

    return ranked.slice(0, 10).map((player, index) => ({
      rank: index + 1,
      ...player,
    }));
  },

  async submitMatchReport(reporterUserId: string, input: SubmitMatchReportInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
    });

    if (!booking) {
      throw new NotFoundError('Booking record not found for match report');
    }

    // Verify captain or vice-captain authorization
    const callerTeams = await prisma.team.findMany({
      where: {
        OR: [{ captainId: reporterUserId }, { viceCaptainId: reporterUserId }],
      },
    });

    const callerTeamIds = callerTeams.map((t) => t.id);
    const isAuthorized =
      (input.teamAId && callerTeamIds.includes(input.teamAId)) ||
      (input.teamBId && callerTeamIds.includes(input.teamBId));

    if (!isAuthorized) {
      const user = await prisma.user.findUnique({ where: { id: reporterUserId } });
      if (user?.role !== 'ADMIN') {
        throw new ForbiddenError(
          'Only the team Captain or Vice-Captain can submit an official match report.'
        );
      }
    }

    // Create match and player statistics in an atomic transaction
    return prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          bookingId: input.bookingId,
          teamAId: input.teamAId ?? null,
          teamBId: input.teamBId ?? null,
          reportedByUserId: reporterUserId,
          scoreA: input.scoreA,
          scoreB: input.scoreB,
          playerStats: {
            create: input.playerStats.map((stat) => ({
              playerId: stat.playerId,
              goals: stat.goals,
              assists: stat.assists,
              saves: stat.saves,
              rating: stat.rating ?? 7.5,
              position: stat.position ?? null,
            })),
          },
        },
        include: {
          playerStats: true,
          teamA: true,
          teamB: true,
        },
      });

      return match;
    });
  },

  async getHeadToHead(teamAId: string, teamBId: string) {
    const [teamA, teamB] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamAId } }),
      prisma.team.findUnique({ where: { id: teamBId } }),
    ]);

    if (!teamA || !teamB) {
      throw new NotFoundError('One or both squads could not be found');
    }

    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { teamAId, teamBId },
          { teamAId: teamBId, teamBId: teamAId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    let teamAWins = 0;
    let teamBWins = 0;
    let draws = 0;
    let teamAGoals = 0;
    let teamBGoals = 0;

    matches.forEach((m) => {
      if (m.scoreA !== null && m.scoreB !== null) {
        const aScore = m.teamAId === teamAId ? m.scoreA : m.scoreB;
        const bScore = m.teamAId === teamAId ? m.scoreB : m.scoreA;
        teamAGoals += aScore;
        teamBGoals += bScore;

        if (aScore > bScore) teamAWins++;
        else if (bScore > aScore) teamBWins++;
        else draws++;
      }
    });

    const totalMatches = matches.length;
    // Win prediction probability (Gold feature)
    let teamAWinProbability = 50;
    if (totalMatches > 0) {
      teamAWinProbability = Math.round(
        (teamAWins / totalMatches) * 70 + (teamAGoals / (teamAGoals + teamBGoals || 1)) * 30
      );
    }
    const teamBWinProbability = 100 - teamAWinProbability;

    return {
      teamA: { id: teamA.id, name: teamA.name, wins: teamAWins, goals: teamAGoals, winProbability: teamAWinProbability },
      teamB: { id: teamB.id, name: teamB.name, wins: teamBWins, goals: teamBGoals, winProbability: teamBWinProbability },
      draws,
      totalMatches,
      recentMatches: matches.slice(0, 3).map((m) => ({
        id: m.id,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        date: m.createdAt,
      })),
    };
  },
};
