
import { db } from "../lib/db";
import { usersTable } from "../lib/db/schema";
import { generateToken } from "../utils/jwt";

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
  
    const token = generateToken(payload);
    const refreshToken = generateToken(payload);
  
    return { token, refreshToken, user };
  };