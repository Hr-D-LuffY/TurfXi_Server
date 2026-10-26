import { Router } from 'express';
import { turfsController } from './turfs.controller';

const router = Router();

router.get('/', turfsController.list);
router.get('/:id', turfsController.getById);

export default router;
