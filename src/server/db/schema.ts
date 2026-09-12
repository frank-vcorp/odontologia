import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { UserRole } from "@/shared/roles";

export type AppointmentStatus = "programada" | "cancelada";
export type TreatmentStatus = "activo" | "terminado" | "cancelado";
export type FileSourceType = "paciente" | "consulta" | "tratamiento";
export type BudgetStatus =
  | "borrador"
  | "presentado"
  | "parcialmente_autorizado"
  | "autorizado"
  | "rechazado"
  | "cancelado";
export type BudgetItemStatus = "pendiente" | "autorizado" | "rechazado";
export type FinancialMovementType = "ingreso" | "egreso";
export type PaymentAllocationTarget = "general" | "treatment" | "consultation_service";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  birthDate: date("birth_date"),
  address: text("address"),
  medicalHistory: text("medical_history"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  suggestedPriceCents: integer("suggested_price_cents"),
  generatesTreatment: boolean("generates_treatment").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const financialCategories = pgTable("financial_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").$type<"ingreso" | "egreso">().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  status: text("status").$type<BudgetStatus>().notNull().default("borrador"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const budgetItems = pgTable("budget_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => services.id),
  serviceName: text("service_name").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  generatesTreatment: boolean("generates_treatment").notNull().default(false),
  status: text("status").$type<BudgetItemStatus>().notNull().default("pendiente"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const budgetDocuments = pgTable("budget_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  originalFilename: text("original_filename").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const treatments = pgTable("treatments", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  serviceId: uuid("service_id").references(() => services.id),
  serviceName: text("service_name").notNull(),
  agreedCostCents: integer("agreed_cost_cents").notNull().default(0),
  status: text("status").$type<TreatmentStatus>().notNull().default("activo"),
  budgetId: uuid("budget_id").references(() => budgets.id),
  budgetItemId: uuid("budget_item_id").references(() => budgetItems.id),
  recommendedFrequencyDays: integer("recommended_frequency_days"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  treatmentId: uuid("treatment_id").references(() => treatments.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  notes: text("notes"),
  status: text("status").$type<AppointmentStatus>().notNull().default("programada"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consultations = pgTable("consultations", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  clinicalNotes: text("clinical_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consultationServices = pgTable("consultation_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultationId: uuid("consultation_id")
    .notNull()
    .references(() => consultations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => services.id),
  serviceName: text("service_name").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  paidCents: integer("paid_cents").notNull().default(0),
  chargeable: boolean("chargeable").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  paymentMethodId: uuid("payment_method_id")
    .notNull()
    .references(() => paymentMethods.id),
  amountCents: integer("amount_cents").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
  consultationId: uuid("consultation_id").references(() => consultations.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentAllocations = pgTable("payment_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  targetType: text("target_type").$type<PaymentAllocationTarget>().notNull(),
  treatmentId: uuid("treatment_id").references(() => treatments.id),
  consultationServiceId: uuid("consultation_service_id").references(() => consultationServices.id),
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const financialMovements = pgTable("financial_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").$type<FinancialMovementType>().notNull(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => financialCategories.id),
  amountCents: integer("amount_cents").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  description: text("description").notNull(),
  patientId: uuid("patient_id").references(() => patients.id),
  paymentId: uuid("payment_id").references(() => payments.id),
  paymentMethodId: uuid("payment_method_id").references(() => paymentMethods.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consultationTreatments = pgTable(
  "consultation_treatments",
  {
    consultationId: uuid("consultation_id")
      .notNull()
      .references(() => consultations.id, { onDelete: "cascade" }),
    treatmentId: uuid("treatment_id")
      .notNull()
      .references(() => treatments.id),
  },
  (t) => [primaryKey({ columns: [t.consultationId, t.treatmentId] })],
);

export const patientFiles = pgTable("patient_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  consultationId: uuid("consultation_id").references(() => consultations.id),
  treatmentId: uuid("treatment_id").references(() => treatments.id),
  sourceType: text("source_type").$type<FileSourceType>().notNull(),
  originalFilename: text("original_filename").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Service = typeof services.$inferSelect;
export type FinancialCategory = typeof financialCategories.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type Treatment = typeof treatments.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Consultation = typeof consultations.$inferSelect;
export type ConsultationService = typeof consultationServices.$inferSelect;
export type PatientFile = typeof patientFiles.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type BudgetItem = typeof budgetItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type FinancialMovement = typeof financialMovements.$inferSelect;
