import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { eq } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

import { db } from "./db";
import { usersTable } from "./db/schema";
import { config } from "./constants";

// Helper function to hash password using crypto
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

// Facebook Strategy for Users
passport.use(
  "facebook",
  new FacebookStrategy(
    {
      clientID: config.facebook.appId,
      clientSecret: config.facebook.appSecret,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "emails", "name", "displayName", "photos"],
      scope: ["email"],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists by facebookId
        let user = await db.query.usersTable.findFirst({
          where: (users, { eq, and }) => and(
            eq(users.providerId, profile.id),
            eq(users.provider, 'facebook')
          ),
        });

        if (user) {
          // Update existing user with facebookId
          await db
            .update(usersTable)
            .set({
              providerId: profile.id,
              provider: "facebook",
              updatedAt: new Date(),
            })
            .where(eq(usersTable.id, user.id));
          
          const updatedUser = await db.query.usersTable.findFirst({
            where: (users, { eq }) => eq(users.id, user!.id),
          });

          return done(null, updatedUser || user);
        }

        // Check if user with this email already exists
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await db.query.usersTable.findFirst({
            where: (users, { eq }) => eq(users.email, email),
          });

          if (user) {
            // Update existing user with facebookId
            await db
              .update(usersTable)
              .set({
                providerId: profile.id,
                provider: "facebook",
                updatedAt: new Date(),
              })
              .where(eq(usersTable.id, user.id));

            const updatedUser = await db.query.usersTable.findFirst({
              where: (users, { eq }) => eq(users.id, user!.id),
            });

            return done(null, updatedUser || user);
          }
        }

        // Create new user with a default hashed password for social auth
        // The password is a random string that will never be used for login
        // since we're using social auth
        const randomPassword = `social_auth_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        const defaultHashedPassword = await hashPassword(randomPassword);

        const newUser = {
          email: email || `${profile.id}@facebook.com`,
          name: profile.displayName || "Facebook User",
          password: defaultHashedPassword,
          provider: "facebook",
          providerId: profile.id,
          avatar: profile.photos?.[0]?.value || null,
          emailVerified: true,
        };

        try {
          const [createdUser] = await db
            .insert(usersTable)
            .values(newUser)
            .returning();

          done(null, createdUser);
        } catch (error) {
          console.error("Error creating user:", error);
          done(error);
        }
      } catch (error) {
        console.error("Facebook auth error:", error);
        done(error);
      }
    }
  )
);

// Simple user serialization
passport.serializeUser((user: any, done) => {
  const isUser = "provider" in user;
  done(null, { id: user.id, type: isUser ? "user" : "admin" });
});

// User deserialization
passport.deserializeUser(async (session: any, done) => {
  try {
    const user = await db.query.usersTable.findFirst({
      where: (users, { eq }) => eq(users.id, session.id),
    });
    done(null, user || false);
  } catch (err) {
    done(err, false);
  }
});

export default passport;
