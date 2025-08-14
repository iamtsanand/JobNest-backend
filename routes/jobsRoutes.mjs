import express from 'express';
import protect from '../middleware/authMiddleware.mjs';
import getAllJobs from '../controller/jobsController.mjs';

const router = express.Router();

router.get('/jobs', protect, getAllJobs);

export default router;