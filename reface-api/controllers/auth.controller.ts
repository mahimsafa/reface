import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { findUserById, generateAuthTokens } from '../services/user.service';
import { config } from '../lib/constants';
import { verifyToken } from '../utils/jwt';

export const facebookAuth = passport.authenticate('facebook', {
  scope: ['email'],
  session: false,
});

export const facebookAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  const REDIRECT_URL = config.facebook.callbackUrl;
  passport.authenticate('facebook', { session: false }, (err: any, user: any, info: any) => {
    if (err || !user) {
      return res.redirect('/auth/failed');
    }

    req.login(user, { session: false }, (err: any) => {
      // Generate tokens
      const { token, refreshToken } = generateAuthTokens(user);

      // Omit password from response
      const { password, ...userWithoutPassword } = user;

      // in this redirect url add token and refreshToken as query params

      if (!REDIRECT_URL) {
        return res.json({
          message: 'Login successful. Redirect URL not found.',
          user: userWithoutPassword,
          accessToken: token,
          refreshToken,
        });
      }
      const url = new URL(REDIRECT_URL);
      url.searchParams.set('accessToken', token);
      url.searchParams.set('refreshToken', refreshToken);
      return res.redirect(url.toString());

    });

  })(req, res, next);
}

export const refreshToken = async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }
  
  let decoded;
  try {
    decoded = verifyToken(token, config.jwt.refreshToken.secret);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  try {
    // @ts-ignore
    const user = await findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const { token } = generateAuthTokens(user);

    // Omit password from response
    const { password, ...userWithoutPassword } = user;

    return res.json({
      message: 'Refresh token successful',
      user: userWithoutPassword,
      accessToken: token
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

