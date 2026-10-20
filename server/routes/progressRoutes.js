import { Router } from 'express';
import { getProgressSummary, recordVisit, updateMilestoneTask } from '../controllers/progressController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { milestonePatchSchema, visitSchema } from '../utils/validators.js';

const router = Router();
router.use(requireAuth);

router.get('/', getProgressSummary);
router.post('/visit', validate(visitSchema), recordVisit);
router.patch(
  '/milestones/:id',
  validateObjectId(),
  validate(milestonePatchSchema),
  updateMilestoneTask
);

export default router;
