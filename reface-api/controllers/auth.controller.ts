import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { generateAuthTokens } from '../services/user.service';

export const facebookAuth = passport.authenticate('facebook', {
  scope: ['email'],
  session: true,
});

export const facebookAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  const REDIRECT_URL = process.env.FRONTEND_URL;
  passport.authenticate('facebook', { session: true }, (err: any, user: any, info: any) => {
    if (err || !user) {
      return res.redirect('/auth/failed');
    }

    req.login(user, { session: true }, (err: any) => {
      // Generate tokens
      const { token, refreshToken } = generateAuthTokens(user);

      // Omit password from response
      const { password, ...userWithoutPassword } = user;

      // in this redirect url add token and refreshToken as query params
      // const url = new URL(REDIRECT_URL);
      // url.searchParams.set('token', token);
      // url.searchParams.set('refreshToken', refreshToken);
      // return res.redirect(url);
      return res.json({
        message: 'Login successful',
        user: userWithoutPassword,
        token,
        refreshToken,
      });

    });

  })(req, res, next);
}