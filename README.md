# Clínica Dental

Sistema web responsivo para la operación diaria de un consultorio dental de un solo dentista: pacientes, agenda, consultas, expedientes, presupuestos, tratamientos, pagos y finanzas.

| | |
|---|---|
| **Repositorio** | https://github.com/frank-vcorp/odontologia |
| **Stack** | Next.js 15 · TypeScript · Drizzle · PostgreSQL |
| **Puerto** | `43124` |
| **Zona horaria** | `America/Mexico_City` |
| **Documentación** | [`CLINICA_DENTAL_DISCOVERY.md`](CLINICA_DENTAL_DISCOVERY.md) · [`CLINICA_DENTAL_PLAN_VALIDACION.md`](CLINICA_DENTAL_PLAN_VALIDACION.md) |
| **Estado** | Fase 2 — Agenda y Consultas |

---

## Fuentes de verdad

| Archivo | Uso |
|---------|-----|
| [`CLINICA_DENTAL_DISCOVERY.md`](CLINICA_DENTAL_DISCOVERY.md) | Especificación funcional completa |
| [`CLINICA_DENTAL_PLAN_VALIDACION.md`](CLINICA_DENTAL_PLAN_VALIDACION.md) | Comprobaciones por fase (5 fases) |

Cada fase se detiene para validación antes de avanzar.

---

## Inicio rápido

```bash
cp .env.example .env.local
docker compose up -d db
npm install
npm run bootstrap
npm run dev
```

Abre **http://127.0.0.1:43124**

### Usuarios iniciales (solo acceso, sin datos demo)

| Rol | Correo | Contraseña inicial |
|-----|--------|-------------------|
| Dentista | `dentista@odontologia.local` | `Dentista2026!` |
| Recepcionista | `recepcion@odontologia.local` | `Recepcion2026!` |
| Superusuario VectorIA | `vectoria@vector-ia.mx` | `VectorIA2026@` |

El sistema arranca vacío: pacientes, servicios, categorías y métodos de pago se capturan manualmente.

---

## Fase 1 — Comprobaciones

- Login con los tres usuarios
- Alta rápida de paciente (nombre + teléfono)
- Búsqueda por nombre y teléfono
- Edición de datos opcionales del paciente
- CRUD de servicios (precio opcional, genera tratamiento)
- CRUD de categorías financieras (Ingreso / Egreso)
- Alta rápida de métodos de pago
- Cambio de contraseña
- Sin datos ficticios de operación

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo en `:43124` |
| `npm run build` | Build producción |
| `npm start` | Servidor producción |
| `npm run bootstrap` | Migraciones + seed de usuarios |
| `npm run db:generate` | Generar migraciones Drizzle |

---

## Despliegue Coolify

- Dockerfile incluido · puerto `43124`
- Variables: `DATABASE_URL`, `SESSION_SECRET`, `TZ=America/Mexico_City`
- Healthcheck: `GET /api/health`
- Subdominio previsto: `odontologia`
- Configurar env en Coolify con `./scripts/coolify-set-env.sh <APP_UUID> <DB_UUID>`

---

## Plan de validación (5 fases)

| Fase | Objetivo |
|------|----------|
| 1 | Núcleo operativo — Pacientes, acceso, Servicios, Categorías, Métodos de pago |
| 2 | Agenda y Consultas |
| 3 | Presupuestos y Tratamientos |
| 4 | Pagos y Finanzas |
| 5 | Integración funcional y cierre |

---

## Licencia

Uso interno Vector IA / VCorp.
