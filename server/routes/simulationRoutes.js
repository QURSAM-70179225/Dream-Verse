import { Router } from 'express';
import { decisionHistory, makeDecision } from '../controllers/simulationController.js';
import { aiLimiter } from '../middleware/aiLimiter.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { decisionSchema, historyQuerySchema } from '../utils/validators.js';

const router = Router();
router.use(requireAuth);

router.post('/decisions', aiLimiter, validate(decisionSchema), makeDecision);
router.get('/history', validate(historyQuerySchema, 'query'), decisionHistory);

export default router;
