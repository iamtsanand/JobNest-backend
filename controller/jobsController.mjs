// import e from 'express';
import db from '../config/db.mjs';

const getAllJobs = async (req, res) => {
    
    try {
        const [rows] = await db.query('SELECT * FROM jobs');
        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({message: err.message});
    }
}

export default getAllJobs;