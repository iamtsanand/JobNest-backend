import jwt from 'jsonwebtoken';

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, status: 'failure', message: 'Token has expired' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ code: 401, status: 'failure', message: 'Invalid token' });
    } else {
      return res.status(401).json({ code: 401, status: 'failure', message: 'Authentication error' });
    }
  }
};

export default protect;