import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import type { UserRole } from "@/shared/roles";
import { hashPassword, verifyPassword } from "@/server/auth/password";

export async function findUserByEmail(email: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return user ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const db = getDb();
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash,
      role: input.role,
    })
    .returning();
  return user;
}

export async function verifyUserCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const valid = await verifyPassword(user.passwordHash, password);
  return valid ? user : null;
}

export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("NOT_FOUND");

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) throw new Error("Contraseña actual incorrecta");

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
