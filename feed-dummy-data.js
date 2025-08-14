import db from './config/db.mjs';

const insertDummyData = async () => {
  try {
    await db.query(`
INSERT INTO saved_jobs (job_seeker_id, job_id, saved_at)
VALUES 
(1, 4, '2025-04-17 10:36:14'),
(3, 3, '2025-04-16 01:05:16');
`);
    console.log('Dummy data inserted!');
    process.exit();
  } catch (error) {
    console.error('Error inserting dummy data:', error);
    process.exit(1);
  }
};

insertDummyData();
