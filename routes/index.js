import { Router } from 'express';
import * as AppController from '../controllers/AppController';

const router = Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

export default router;
