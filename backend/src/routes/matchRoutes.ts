import { Router } from 'express';
import { createMatch, updateMatch, getMatches } from '../controllers/matchController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createMatch);
router.patch('/:id', authenticate, updateMatch);
router.get('/', authenticate, getMatches);

export default router;