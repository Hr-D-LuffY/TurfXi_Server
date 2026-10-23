import prisma from '../../config/db';
import { NotFoundError } from '../../utils/errors';

export interface TurfFilters {
  area?: string | undefined;
  city?: string | undefined;
  search?: string | undefined;
}

export const turfsService = {
  async list(filters?: TurfFilters) {
    const where: any = { verified: true };

    if (filters?.city) where.city = filters.city;
    if (filters?.area) where.area = filters.area;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { area: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.turf.findMany({
      where,
      include: {
        photos: true,
        membersOnlySlots: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(id: string) {
    const turf = await prisma.turf.findUnique({
      where: { id },
      include: {
        photos: true,
        membersOnlySlots: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!turf) {
      throw new NotFoundError('Turf venue not found');
    }

    return turf;
  },
};
