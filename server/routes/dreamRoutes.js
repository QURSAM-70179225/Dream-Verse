import { Router } from 'express';
import {
  createDream,
  getDream,
  listDreams,
  updateDream,
} from '../controllers/dreamController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { createDreamSchema, updateDreamSchema } from '../utils/validators.js';

const router = Router();
router.use(requireAuth);

router.post('/', validate(createDreamSchema), createDream);
router.get('/', listDreams);
router.get('/:id', validateObjectId(), getDream);
router.put('/:id', validateObjectId(), validate(updateDreamSchema), updateDream);

export default router;
