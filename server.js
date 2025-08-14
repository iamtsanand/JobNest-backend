import express from 'express';
// import db from './config/db.mjs';
import cors from "cors";
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.mjs';
import userRoutes from './routes/userRoutes.mjs';
import jobsRoutes from './routes/jobsRoutes.mjs';
import path from 'path';

dotenv.config();

const app = express();

// Assuming your profile pictures are stored in `uploads/profile_pictures`
const __dirname = path.resolve(); // for ESModules

app.use('/api/uploads/resumes', express.static(path.join(__dirname, 'public/uploads/resumes')));

app.use('/api/uploads/profile_pictures', express.static(path.join(__dirname, 'public/uploads/profile_pictures')));

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN, // Replace with the correct frontend URL if needed
    credentials: true,
  }));

app.use(express.json());

app.use('/api/auth/v1/', authRoutes);

app.use('/api/users/v1/', userRoutes);

app.use('/api/jobs/v1/', jobsRoutes);

app.get('/', (req, res) => {
    res.send('JobNest API is running fine.');
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
});