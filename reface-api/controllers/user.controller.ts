
import { Request, Response } from 'express';

export const getUserProfile = async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    return res.json(user);
}