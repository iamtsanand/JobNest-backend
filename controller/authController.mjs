import db from '../config/db.mjs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Helper to generate JWT
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const [userExists] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (userExists.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    const userId = result.insertId;

    if (role === 'job_seeker') {
      // Insert into job_seeker_profiles with default values
      await db.query(
        'INSERT INTO job_seeker_profiles (user_id, phone, skills, experience_level, bio, education, experience, social_links) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          '',                      // phone
          '',                      // skills
          '',               // experience_level
          null, null, null, null   // bio, education, experience, social_links
        ]
      );

      // Do NOT insert into job_seeker_projects unless data is available
      // Instead, wait for user to create actual projects later
    } else if (role === 'recruiter') {
      // Insert minimal recruiter profile
      await db.query(
        'INSERT INTO recruiter_profiles (user_id, phone, name) VALUES (?, ?, ?)',
        [userId, '', name]
      );
    }

    res.status(201).json({
      code: 201,
      status: 'Success',
      message: 'User registered successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      code: 500,
      status: 'failure',
      message: err.message
    });
  }
};



// Login user
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [userRows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (userRows.length === 0) {
      return res.status(401).json({ code: 401, status: 'failure', message: 'Invalid Credentials.'  });
    }

    const user = userRows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ code: 402, status: 'failure', message: 'Invalid Credentials.' });
    
    const token = generateToken(user.id, user.role);
    res.status(200).json({ code: 200, authToken: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

