import "./load-env";
import { ensureDefaultPaymentMethods } from "@/server/services/payment-methods";
import { createUser, findUserByEmail } from "@/server/services/users";

const DEFAULT_USERS = [
  {
    name: "Dentista",
    email: "dentista@odontologia.local",
    password: "Dentista2026!",
    role: "dentista" as const,
  },
  {
    name: "Recepcionista",
    email: "recepcion@odontologia.local",
    password: "Recepcion2026!",
    role: "recepcionista" as const,
  },
  {
    name: "Vectoria",
    email: "vectoria@vector-ia.mx",
    password: "VectorIA2026@",
    role: "superusuario" as const,
  },
];

async function seed() {
  for (const entry of DEFAULT_USERS) {
    const existing = await findUserByEmail(entry.email);
    if (!existing) {
      await createUser(entry);
      console.log(`Usuario creado: ${entry.email} (${entry.role})`);
    } else {
      console.log(`Usuario existente: ${entry.email}`);
    }
  }
  await ensureDefaultPaymentMethods();
  console.log("Métodos de pago predeterminados verificados");
  console.log("Seed completado — sistema vacío de datos operativos");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
