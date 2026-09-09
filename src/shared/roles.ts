export const USER_ROLES = ["dentista", "recepcionista", "superusuario"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  dentista: "Dentista",
  recepcionista: "Recepcionista",
  superusuario: "Superusuario VectorIA",
};
