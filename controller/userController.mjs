import db from '../config/db.mjs';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import  path from 'path';

// Setup __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up multer storage for profile pic
const profilePicturesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/profile_pictures'));
  },
  filename: (req, file, cb) => {
    const userId = req.user?.userId || 'unknown';
    console.log('userID:', userId);
    const ext = path.extname(file.originalname);
    const uniqueName = `user-${userId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

export const uploadProfilePictureMulter = multer({ storage: profilePicturesStorage }).single('profile_picture');

// Multer storage config for resumes
const resumeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads/resumes');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `resume-${req.user.userId}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

export const uploadResumeMulter = multer({ storage: resumeStorage });


// getProfile - get all profile info
export const getProfile = async (req, res) => {
  const userId = req.user.userId;
  console.log('Decoded user:', req.user);

  try {
    const [userRows] = await db.execute(
      'SELECT id, name, email, role, created_at, profile_picture FROM users WHERE id = ?', 
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ code: 404, status: 'failure', message: 'User not found' });
    }

    const user = userRows[0];
    const role = user.role;

    // Default fields
    let saved_jobs = 'NA';
    let applied_jobs = 'NA';
    let uploaded_jobs_id = 'NA';

    let phone = 'NA';
    let skills = 'NA';
    let experience_level = 'NA';
    let bio = 'NA';
    let education = 'NA';
    let experience = 'NA';
    let social_links = 'NA';
    let projects = 'NA';
    let resumes = 'NA';

    let companyDetails = 'NA';
    let postedJobs = 'NA';
    let applicants = 'NA';

    if (role === 'job_seeker') {
      const [profileRows] = await db.execute(
        'SELECT phone, skills, experience_level, bio, education, experience, social_links FROM job_seeker_profiles WHERE user_id = ?',
        [userId]
      );
      if (profileRows.length > 0) {
        const profile = profileRows[0];
        phone = profile.phone;
        skills = JSON.parse(profile.skills);;
        experience_level = profile.experience_level;
        bio = profile.bio;
        education = profile.education || '[]';
        experience = profile.experience || '[]';
        social_links = profile.social_links || '{}';
      }

      const [projectRows] = await db.execute(
        'SELECT id, name, description, start_date, completion_date, github_link, deployment_link FROM job_seeker_projects WHERE job_seeker_id = ?',
        [userId]
      );
      projects = projectRows;

      const [resumeRows] = await db.execute(
        'SELECT id, file_name, file_path, uploaded_at FROM resumes WHERE job_seeker_id = ?',
        [userId]
      );
      resumes = resumeRows;

      const [savedRows] = await db.execute(
        'SELECT job_id FROM saved_jobs WHERE job_seeker_id = ?',
        [userId]
      );
      saved_jobs = savedRows.map(row => row.job_id);

      const [appliedRows] = await db.execute(`
        SELECT 
          a.id AS application_id,
          a.status,
          a.applied_at,
          j.id AS job_id,
          j.title AS job_title,
          j.location AS job_location,
          j.created_at AS job_posted_at,
          c.name AS job_company
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        JOIN recruiter_profiles rp ON j.recruiter_id = rp.user_id
        JOIN companies c ON rp.company_id = c.id
        WHERE a.job_seeker_id = ?
      `, [userId]);
      
      applied_jobs = appliedRows.map(row => ({
        id: row.application_id,
        status: row.status,
        applied_at: row.applied_at,
        job: {
          id: row.job_id,
          title: row.job_title,
          company: row.job_company,
          location: row.job_location,
          posted_at: row.job_posted_at,
        }
      }));
      
    }

    if (role === 'recruiter') {
      const [recruiterRows] = await db.execute(
        'SELECT phone, company_id FROM recruiter_profiles WHERE user_id = ?',
        [userId]
      );
    
      if (recruiterRows.length > 0) {
        phone = recruiterRows[0].phone;
        const companyId = recruiterRows[0].company_id;
    
        const [companyRows] = await db.execute(
          `SELECT id, name, website, description, location, founded_year, industry, employees, logo, benefits
           FROM companies WHERE id = ?`,
          [companyId]
        );
        const company = companyRows[0] || {};
        companyDetails = {
          ...company,
          benefits: company.benefits ? JSON.parse(company.benefits) : [],
        };
    
        // Get count of open positions
        const [[{ open_positions }]] = await db.execute(
          `SELECT COUNT(*) AS open_positions 
           FROM jobs WHERE recruiter_id = ? AND status = 'open'`,
          [userId]
        );
        companyDetails.open_positions = open_positions;
    
        // Get featured jobs (recent 5)
        const [featuredJobs] = await db.execute(
          `SELECT j.id, j.title, j.location, j.created_at, COUNT(a.id) AS applications
           FROM jobs j
           LEFT JOIN applications a ON j.id = a.job_id
           WHERE j.recruiter_id = ?
           GROUP BY j.id
           ORDER BY j.created_at DESC
           LIMIT 5`,
          [userId]
        );
        companyDetails.featured_jobs = featuredJobs;
      }
    
      const [jobsRows] = await db.execute(
        'SELECT id, title, location, created_at FROM jobs WHERE recruiter_id = ?',
        [userId]
      );
      uploaded_jobs_id = jobsRows.map(row => row.id);
    
      postedJobs = await Promise.all(
        jobsRows.map(async (job) => {
          const [applicants] = await db.execute(
            `SELECT 
               a.id AS application_id,
               a.status,
               a.applied_at,
               u.id AS user_id,
               u.name AS user_name,
               u.email AS user_email
             FROM applications a
             JOIN users u ON a.job_seeker_id = u.id
             WHERE a.job_id = ?`,
            [job.id]
          );
    
          return {
            ...job,
            applicants,
          };
        })
      );
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      joined_at: user.created_at,
      profile_pic: user.profile_picture,
      phone,
      saved_jobs,
      applied_jobs,
      skills,
      experience_level,
      experience,
      bio,
      education,
      social_links,
      projects,
      resumes,
      uploaded_jobs_id,
      companyDetails,
      postedJobs
    };

    res.status(200).json({ code: 200, status: 'success', data: userData });

  } catch (error) {
    console.error(error);
    res.status(500).json({ code: 500, status: 'failure', message: 'Internal Server error' });
  }
};



// update profile info
export const updateProfile = async (req, res) => {
  const userId = req.user.userId;
  const role = req.user.role;

  try {
    if (role === 'job_seeker') {
      const {
        name,
        email,
        bio,
        skills,
        experience_level,
        education,
        experience,
        phone,
        social_links
      } = req.body;

      // Update name and email in users table
      await db.execute(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name, email, userId]
      );

      const [existingRows] = await db.execute(
        'SELECT user_id FROM job_seeker_profiles WHERE user_id = ?',
        [userId]
      );

      const query = existingRows.length === 0
        ? `INSERT INTO job_seeker_profiles 
           (user_id, phone, skills, experience_level, bio, education, experience, social_links)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        : `UPDATE job_seeker_profiles 
           SET phone = ?, skills = ?, experience_level = ?, bio = ?, education = ?, experience = ?, social_links = ?
           WHERE user_id = ?`;

      const values = existingRows.length === 0
        ? [userId, phone, skills, experience_level, bio, JSON.stringify(education), JSON.stringify(experience), JSON.stringify(social_links)]
        : [phone, skills, experience_level, bio, JSON.stringify(education), JSON.stringify(experience), JSON.stringify(social_links), userId];

      await db.execute(query, values);

      return res.status(200).json({ code: 200, status: 'success', message: 'Job seeker profile updated successfully.' });
    } else if (role === 'recruiter') {
      const {
        phone,
        company_id,
        name,
        company_name,
        company_website,
        company_description,
        company_location
      } = req.body;
    
      let finalCompanyId = company_id;
    
      // If no company_id, create a new company
      if (!finalCompanyId) {
        const [insertResult] = await db.execute(`
          INSERT INTO companies (name, website, description, location)
          VALUES (?, ?, ?, ?)
        `, [company_name, company_website, company_description, company_location]);
    
        finalCompanyId = insertResult.insertId;
      } else {
        // Update existing company
        await db.execute(`
          UPDATE companies
          SET name = ?, website = ?, description = ?, location = ?
          WHERE id = ?
        `, [company_name, company_website, company_description, company_location, finalCompanyId]);
      }
    
      const [existingRows] = await db.execute(
        'SELECT user_id FROM recruiter_profiles WHERE user_id = ?',
        [userId]
      );
    
      const query = existingRows.length === 0
        ? `INSERT INTO recruiter_profiles (user_id, company_id, phone, name)
           VALUES (?, ?, ?, ?)`
        : `UPDATE recruiter_profiles SET company_id = ?, phone = ?, name = ? WHERE user_id = ?`;
    
      const values = existingRows.length === 0
        ? [userId, finalCompanyId, phone, name]
        : [finalCompanyId, phone, name, userId];
    
      await db.execute(query, values);
    
      return res.status(200).json({
        code: 200,
        status: 'success',
        message: 'Recruiter profile and company updated successfully.'
      });
    }
    

    return res.status(400).json({ code: 400, status: 'failure', message: 'Unsupported role for profile update.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ code: 500, status: 'failure', message: 'Internal Server Error' });
  }
};



//upload or update profile picture
export const uploadProfilePicture = async (req, res) => {
  const userId = req.user.userId;

  // Wrap multer in a Promise to use with async/await
  const multerUpload = () =>
    new Promise((resolve, reject) => {
      uploadProfilePictureMulter(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

  try {
    await multerUpload(); // Now multer runs correctly

    if (!req.file) {
      return res.status(400).json({
        code: 400,
        status: 'failure',
        message: 'No file uploaded',
      });
    }

    const newFileName = req.file.filename;
    const newFilePath = `/uploads/profile_pictures/${newFileName}`;

    const [userRows] = await db.execute(
      'SELECT profile_picture FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        code: 404,
        status: 'failure',
        message: 'User not found',
      });
    }

    const oldProfilePic = userRows[0].profile_picture;
    const oldPath = path.join(__dirname, '../public', oldProfilePic || '');

    // Update DB
    await db.execute(
      'UPDATE users SET profile_picture = ? WHERE id = ?',
      [newFilePath, userId]
    );

    // Delete old file if it exists
    if (oldProfilePic && fs.existsSync(oldPath)) {
      fs.unlink(oldPath, (err) => {
        if (err) console.error('Failed to delete old profile picture:', err);
      });
    }

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Profile picture updated successfully',
      file: newFilePath,
    });

  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({
      code: 500,
      status: 'failure',
      message: 'Internal Server Error',
    });
  }
};


//update resume
export const updateResume = async (req, res) => {
  const userId = req.user.userId;

  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, status: "failure", message: "No resume file uploaded." });
    }

    const resumePath = `/public/uploads/resumes/${req.file.filename}`;

    // Insert or update resume path in DB (assumes a 'resumes' table)
    await db.execute(
      `INSERT INTO resumes (job_seeker_id, file_name, file_path)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)`,
      [userId, 'redacted functionality',resumePath]
    );

    res.status(200).json({ code: 200, status: "success", message: "Resume uploaded successfully.", resumePath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ code: 500, status: "failure", message: "Internal Server Error" });
  }
};



//create a job posting
export const createJob = async (req, res) => {
  const userId = req.user.userId;
  const {
    title,
    description,
    location,
    salary,
    type,
    requiredSkills,
    experienceLevel,
    application_deadline,
  } = req.body;

  // Split salary string into min and max
  let salaryMin = '';
  let salaryMax = '';

  if (typeof salary === 'string' && salary.includes('-')) {
    const [min, max] = salary.split('-').map(s => s.trim());
    salaryMin = min;
    salaryMax = max;
  } else {
    salaryMax = salary;
  }

  try {
    // 1. Verify recruiter profile exists
    const [recruiterRows] = await db.query(
      "SELECT user_id FROM recruiter_profiles WHERE user_id = ?",
      [userId]
    );

    if (recruiterRows.length === 0) {
      return res.status(404).json({ error: "Recruiter profile not found" });
    }

    // 2. Insert job (recruiter_id is the same as user_id)
    const [result] = await db.query(
      `INSERT INTO jobs (
        recruiter_id, title, description, location,
        salary_min, salary_max, type, required_skills,
        experience_level, status, application_deadline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title,
        description,
        location || null,
        salaryMin || null,
        salaryMax || null,
        type || null,
        JSON.stringify(requiredSkills || []),
        experienceLevel || null,
        "open",
        application_deadline,
      ]
    );

    res.status(201).json({
      message: "Job created successfully",
      jobId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const withdrawApplication = async (req, res) => {
  const userId = req.user.userId;
  const role = req.user.role;

  try {
    if (role === 'job_seeker') {
      const {
        jobId
      } = req.body;

      // Update name and email in users table
      await db.execute(
        'DELETE from applications WHERE id = ?',
        [jobId]
      );

      return res.status(200).json({ code: 200, status: 'success', message: 'APPlication Withdrawn Successfully.'});
    } 
  
    return res.status(400).json({ code: 400, status: 'failure', message: 'Unsupported role for profile update.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ code: 500, status: 'failure', message: 'Internal Server Error' });
  }
};