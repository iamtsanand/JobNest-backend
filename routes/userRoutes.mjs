import express from 'express';
import protect from '../middleware/authMiddleware.mjs';
import { getProfile, updateProfile, uploadProfilePicture, uploadResumeMulter, updateResume, createJob, withdrawApplication} from '../controller/userController.mjs';

const router = express.Router();

router.post('/create-job-posting', protect, createJob);
router.post('/profile/upload-picture', protect, uploadProfilePicture); // <-- Removed `upload`
router.put('/profile/update', protect, updateProfile);
router.get('/profile', protect, getProfile);
router.post('/withdrawApplication', protect, withdrawApplication);

router.post(
    '/profile/update-resume',
    protect,
    uploadResumeMulter.single('resume'), // ✅ multer handles file upload here
    updateResume // ✅ then your handler runs
  );

export default router;
