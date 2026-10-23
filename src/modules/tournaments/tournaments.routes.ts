import { Router } from 'express';
import { tournamentsController } from './tournaments.controller';
import {
  requireAuth,
  requireTournamentOrganizer,
  requireTournamentParticipant,
} from '../../middleware/auth';

const router = Router();

router.get('/', tournamentsController.list);
router.get('/:id', tournamentsController.getById);

// Organize/Create Tournament (Gold members or Turf Owners/Admins)
router.post('/', requireAuth, requireTournamentOrganizer(), tournamentsController.create);

// Register Team (Silver/Gold members or Turf Owners/Admins)
router.post(
  '/:id/teams',
  requireAuth,
  requireTournamentParticipant(),
  tournamentsController.registerTeam
);

// Auto-generate tournament knockout bracket
router.post(
  '/:id/generate-bracket',
  requireAuth,
  requireTournamentOrganizer(),
  tournamentsController.generateBracket
);

export default router;
