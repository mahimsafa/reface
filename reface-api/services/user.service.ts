
import { eq } from "drizzle-orm";

import { db } from "../lib/db";
import { usersTable } from "../lib/db/schema";
import { generateToken } from "../utils/jwt";
import { config } from "../lib/constants";

export const findUserByEmail = async (email: string) => {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });
  return user;
};

export const findUserById = async (id: number) => {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, id),
  });
  return user;
};
interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  provider: string;
  providerId: string;
  avatar?: string;
}

// export async function createUserRecord(input: CreateUserInput) {
//   const now = new Date();
//   const [record] = await db
//     .insert(usersTable)
//     .values({
//       name: input.name,
//       email: input.email,
//       password: input.password,
//       provider: input.provider,
//       providerId: input.providerId,
//       avatar: input.avatar,
//       createdAt: now,
//       updatedAt: now,
//     })
//     .returning();
//   return record;
// }

export const generateAuthTokens = (user: any) => {
    const payload = {
      id: user.id,
      email: user.email,
    };
  
    const token = generateToken(
      payload, 
      config.jwt.accessToken.secret, 
      config.jwt.accessToken.expiresIn
    );
    const refreshToken = generateToken(
      payload, 
      config.jwt.refreshToken.secret, 
      config.jwt.refreshToken.expiresIn
    );
  
    return { token, refreshToken, user };
  };