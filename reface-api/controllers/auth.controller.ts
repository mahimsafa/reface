import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { generateAuthTokens } from '../services/user.service';
import { config } from '../lib/constants';

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
