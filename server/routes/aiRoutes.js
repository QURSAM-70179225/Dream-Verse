import { Router } from 'express';
import {
  aiStatus,
  chat,
  clearConversation,
  generateFuture,
  generateRoadmap,
  getConversation,
} from '../controllers/aiController.js';
import { aiLimiter } from '../middleware/aiLimiter.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiTargetSchema, chatSchema, conversationQuerySchema } from '../utils/validators.js';

const router = Router();
router.use(requireAuth);

router.get('/status', aiStatus);
router.get('/conversation', validate(conversationQuerySchema, 'query'), getConversation);
router.delete('/conversation', validate(conversationQuerySchema, 'query'), clearConversation);

router.post('/generate-future', aiLimiter, validate(aiTargetSchema), generateFuture);
router.post('/generate-roadmap', aiLimiter, validate(aiTargetSchema), generateRoadmap);
router.post('/chat', aiLimiter, validate(chatSchema), chat);

export default router;
