import { Router } from 'express';
import achievementRoutes from './achievementRoutes.js';
import aiRoutes from './aiRoutes.js';
import authRoutes from './authRoutes.js';
import dreamRoutes from './dreamRoutes.js';
import progressRoutes from './progressRoutes.js';
import simulationRoutes from './simulationRoutes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/dreams', dreamRoutes);
router.use('/progress', progressRoutes);
router.use('/achievements', achievementRoutes);
router.use('/ai', aiRoutes);
router.use('/simulation', simulationRoutes);

export default router;
