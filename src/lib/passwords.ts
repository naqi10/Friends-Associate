import bcrypt from "bcryptjs";
import { MIN_PASSWORD_LENGTH } from "./constants";

const BCRYPT_ROUNDS = 12;

/** Policy shared by every place a password is set: length plus at least one letter and one digit. */
export function isStrongPassword(pw: string) {
  return pw.length >= MIN_PASSWORD_LENGTH && pw.length <= 200 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

export function hashPassword(pw: string) {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

/** Reads "password" + "confirm" from a form. Returns an error code or the accepted password. */
export function readNewPassword(formData: FormData): { error: "password" | "password-match" } | { password: string } {
  const password = String(formData.get("password") ?? "");
  if (!isStrongPassword(password)) return { error: "password" };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "password-match" };
  return { password };
}
