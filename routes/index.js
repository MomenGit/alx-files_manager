import { Router } from 'express';
import * as AppController from '../controllers/AppController';
import * as UsersController from '../controllers/UsersController';
import * as AuthController from '../controllers/AuthController';
import * as FilesController from '../controllers/FilesController';

const router = Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

router.post('/users', UsersController.postNew);
router.get('/users/me', UsersController.getMe);

router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);

router.post('/files', FilesController.postUpload);

export default router;
