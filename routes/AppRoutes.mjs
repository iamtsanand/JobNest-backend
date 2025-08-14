import express from 'express';
import protect from '../middleware/authMiddleware.mjs';
import { getEmplyerData } from '../controller/AppController.mjs';

const router = express.Router();

//employer data route
router.get('/EmployerData', getEmplyerData);

export default router;
