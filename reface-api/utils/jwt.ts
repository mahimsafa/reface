import jwt from "jsonwebtoken";

export const generateToken = (payload: any, secret: string, expiresIn: string) => {
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  // Convert expiresIn to string if it's a number
  const expiresInStr =
    typeof expiresIn === "number" ? `${expiresIn}s` : expiresIn;

  const options = {};
  if (expiresInStr) {
    // @ts-ignore
    options.expiresIn = expiresInStr;
  }

  return jwt.sign(payload, secret, options);
};
