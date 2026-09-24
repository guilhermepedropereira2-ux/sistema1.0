import { pgTable, text, timestamp, numeric, varchar, boolean } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

/**
 * ============================================================
 * SCHEMA MULTI-TENANT POSTGRESQL (DRIZZLE ORM)
 * Isolamento total por organization_id
 * ============================================================
 */

// 1. Organizações (Tenants)
export const organizations = pgTable("organizations", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  document: varchar("document", { length: 50 }).unique(),
  plan: varchar("plan", { length: 50 }).notNull().default("pro"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  subscription_status: varchar("subscription_status", { length: 50 }).notNull().default("trial"), // 'trial' | 'active' | 'expired' | 'past_due'
  trial_started_at: timestamp("trial_started_at", { withTimezone: true }),
  trial_ends_at: timestamp("trial_ends_at", { withTimezone: true }),
  trial_already_used: boolean("trial_already_used").notNull().default(true),
  subscription_expires_at: timestamp("subscription_expires_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Usuários (Proprietários e Barbeiros)
export const users = pgTable("users", {
  id: varchar("id", { length: 100 }).primaryKey(),
  organization_id: varchar("organization_id", { length: 100 })
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("barber"), // "owner" | "barber"
  commission_rate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull().default("50.00"),
  password: varchar("password", { length: 255 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Clientes
export const clients = pgTable("clients", {
  id: varchar("id", { length: 100 }).primaryKey(),
  organization_id: varchar("organization_id", { length: 100 })
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Serviços e Produtos
export const servicesProducts = pgTable("services_products", {
  id: varchar("id", { length: 100 }).primaryKey(),
  organization_id: varchar("organization_id", { length: 100 })
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  type: varchar("type", { length: 50 }).notNull(), // "service" | "product"
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. Atendimentos (Appointments)
export const appointments = pgTable("appointments", {
  id: varchar("id", { length: 100 }).primaryKey(),
  organization_id: varchar("organization_id", { length: 100 })
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  barber_id: varchar("barber_id", { length: 100 })
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  client_id: varchar("client_id", { length: 100 }),
  total_amount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  net_amount: numeric("net_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  commission_amount: numeric("commission_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  payment_method: varchar("payment_method", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).default("concluido"),
  date: varchar("date", { length: 20 }),
  time: varchar("time", { length: 20 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Transações de Assinatura (Mercado Pago / Checkout)
export const subscriptionTransactions = pgTable("subscription_transactions", {
  id: varchar("id", { length: 100 }).primaryKey(),
  organization_id: varchar("organization_id", { length: 100 })
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  payment_id: varchar("payment_id", { length: 150 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // "approved", "pending", "rejected", etc.
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tipos Inferidos do Drizzle ORM
export type Organization = InferSelectModel<typeof organizations>;
export type InsertOrganization = Omit<InferInsertModel<typeof organizations>, "id"> & { id?: string };

export type User = InferSelectModel<typeof users>;
export type InsertUser = Omit<InferInsertModel<typeof users>, "id"> & { id?: string };

export type Client = InferSelectModel<typeof clients>;
export type InsertClient = Omit<InferInsertModel<typeof clients>, "id"> & { id?: string };

export type ServiceProduct = InferSelectModel<typeof servicesProducts>;
export type InsertServiceProduct = Omit<InferInsertModel<typeof servicesProducts>, "id"> & { id?: string };

export type Appointment = InferSelectModel<typeof appointments>;
export type InsertAppointment = Omit<InferInsertModel<typeof appointments>, "id"> & { id?: string };

export type SubscriptionTransaction = InferSelectModel<typeof subscriptionTransactions>;
export type InsertSubscriptionTransaction = Omit<InferInsertModel<typeof subscriptionTransactions>, "id"> & { id?: string };
