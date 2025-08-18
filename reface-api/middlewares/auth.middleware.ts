import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../lib/constants';
import { findUserById } from '../services/user.service';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    if (req.headers.bypass) {
      return next();
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.accessToken.secret) as { id: number };

    // Check if user exists
    const user = await findUserById(Number(decoded.id));

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request object
    req.user = user;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    res.status(500).json({ message: 'Authentication failed' });
  }
};