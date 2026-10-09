import pg from "pg";
import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import * as schema from "../src/db/schema";
import type {
  Organization,
  InsertOrganization,
  User,
  InsertUser,
  Client,
  InsertClient,
  ServiceProduct,
  InsertServiceProduct,
  Appointment,
  InsertAppointment,
  SubscriptionTransaction,
  InsertSubscriptionTransaction,
} from "../src/db/schema";
import { getDbPool } from "../src/db/client";

const STORAGE_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(STORAGE_DIR, "kupola_storage.json");

/**
 * Helper para normalizar organization_id compatível com legado ("profile" -> "org_vintage")
 */
export function normalizeOrgId(id?: string): string {
  if (!id || id === "profile" || id === "default") return "org_vintage";
  return id;
}

/**
 * ============================================================
 * INTERFACE DE STORAGE DUAL (MULTI-TENANT)
 * ============================================================
 */
export interface IStorage {
  readonly storageType: "memory" | "postgres";
  isDatabaseConnected(): boolean;

  // Organizações
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getOrganizationByDocument(document: string): Promise<Organization | undefined>;
  createOrganization(data: InsertOrganization): Promise<Organization>;
  updateOrganizationSubscription(
    orgId: string,
    data: {
      plan: string;
      status: string;
      subscription_status?: string;
      subscription_expires_at?: Date | string | null;
      trial_ends_at?: Date | string | null;
    }
  ): Promise<Organization | undefined>;
  updateOrganizationTrialStatus(
    orgId: string,
    subscription_status: "trial" | "active" | "expired" | "past_due"
  ): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;

  // Usuários
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByOrg(orgId: string): Promise<User[]>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Clientes
  getClientsByOrg(orgId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;

  // Serviços e Produtos
  getServicesProductsByOrg(orgId: string): Promise<ServiceProduct[]>;
  getServiceProduct(id: string): Promise<ServiceProduct | undefined>;
  createServiceProduct(data: InsertServiceProduct): Promise<ServiceProduct>;

  // Atendimentos
  createAppointment(data: InsertAppointment): Promise<Appointment>;
  getAppointmentsByOrg(
    orgId: string,
    filter?: { barberId?: string; startDate?: string; endDate?: string }
  ): Promise<Appointment[]>;
  getAppointmentsByBarber(barberId: string): Promise<Appointment[]>;

  // Transações de Assinatura
  createSubscriptionTransaction(
    data: InsertSubscriptionTransaction
  ): Promise<SubscriptionTransaction>;
  getSubscriptionTransactionsByOrg(
    orgId: string
  ): Promise<SubscriptionTransaction[]>;
}

/**
 * ============================================================
 * 1. IMPLEMENTAÇÃO EM MEMÓRIA (MemStorage)
 * Fallback padrão quando DATABASE_URL não estiver configurada
 * ============================================================
 */
export class MemStorage implements IStorage {
  public readonly storageType = "memory" as const;

  private organizations = new Map<string, Organization>();
  private users = new Map<string, User>();
  private clients = new Map<string, Client>();
  private servicesProducts = new Map<string, ServiceProduct>();
  private appointments = new Map<string, Appointment>();
  private subscriptionTransactions = new Map<string, SubscriptionTransaction>();

  constructor() {
    if (!this.loadFromFile()) {
      this.seedDemoData();
      this.saveToFile();
    }
  }

  public isDatabaseConnected(): boolean {
    return false;
  }

  public saveToFile() {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      const data = {
        organizations: Array.from(this.organizations.entries()),
        users: Array.from(this.users.entries()),
        clients: Array.from(this.clients.entries()),
        servicesProducts: Array.from(this.servicesProducts.entries()),
        appointments: Array.from(this.appointments.entries()),
        subscriptionTransactions: Array.from(this.subscriptionTransactions.entries()),
      };
      const tmp = `${STORAGE_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tmp, STORAGE_FILE);
    } catch (e: any) {
      console.error("[Storage Persistence Error]:", e.message);
    }
  }

  public loadFromFile(): boolean {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
        if (raw && raw.trim().length > 0) {
          const data = JSON.parse(raw);
          if (data && typeof data === "object") {
            if (Array.isArray(data.organizations)) {
              this.organizations = new Map(
                data.organizations.map(([k, v]: [string, any]) => [
                  k,
                  {
                    ...v,
                    created_at: v.created_at ? new Date(v.created_at) : new Date(),
                    trial_started_at: v.trial_started_at ? new Date(v.trial_started_at) : null,
                    trial_ends_at: v.trial_ends_at ? new Date(v.trial_ends_at) : null,
                    subscription_expires_at: v.subscription_expires_at ? new Date(v.subscription_expires_at) : null,
                  },
                ])
              );
            }
            if (Array.isArray(data.users)) {
              this.users = new Map(
                data.users.map(([k, v]: [string, any]) => [
                  k,
                  { ...v, created_at: v.created_at ? new Date(v.created_at) : new Date() },
                ])
              );
            }
            if (Array.isArray(data.clients)) {
              this.clients = new Map(
                data.clients.map(([k, v]: [string, any]) => [
                  k,
                  { ...v, created_at: v.created_at ? new Date(v.created_at) : new Date() },
                ])
              );
            }
            if (Array.isArray(data.servicesProducts)) {
              this.servicesProducts = new Map(
                data.servicesProducts.map(([k, v]: [string, any]) => [
                  k,
                  { ...v, created_at: v.created_at ? new Date(v.created_at) : new Date() },
                ])
              );
            }
            if (Array.isArray(data.appointments)) {
              this.appointments = new Map(
                data.appointments.map(([k, v]: [string, any]) => [
                  k,
                  { ...v, created_at: v.created_at ? new Date(v.created_at) : new Date() },
                ])
              );
            }
            if (Array.isArray(data.subscriptionTransactions)) {
              this.subscriptionTransactions = new Map(
                data.subscriptionTransactions.map(([k, v]: [string, any]) => [
                  k,
                  { ...v, created_at: v.created_at ? new Date(v.created_at) : new Date() },
                ])
              );
            }
            return true;
          }
        }
      }
    } catch (e: any) {
      console.error("[Storage Persistence Read Error]:", e.message);
    }
    return false;
  }

  private seedDemoData() {
    const now = new Date();
    const expires = new Date(Date.now() + 30 * 86400000);

    // Organização Padrão
    const defaultOrg: Organization = {
      id: "org_vintage",
      name: "Barbearia Vintage Club",
      slug: "barbearia-vintage",
      document: "12.345.678/0001-90",
      plan: "pro",
      status: "active",
      subscription_status: "active",
      trial_started_at: null,
      trial_ends_at: null,
      trial_already_used: true,
      subscription_expires_at: expires,
      created_at: now,
    };
    this.organizations.set(defaultOrg.id, defaultOrg);

    // Usuário Dono
    const ownerUser: User = {
      id: "usr_owner",
      organization_id: "org_vintage",
      name: "Carlos Eduardo (Dono)",
      email: "admin@barbearia.com",
      role: "owner",
      commission_rate: "0.00",
      password: "admin",
      created_at: now,
    };
    this.users.set(ownerUser.id, ownerUser);

    // Barbeiros
    const barbers: User[] = [
      {
        id: "barber_gabriel",
        organization_id: "org_vintage",
        name: "Gabriel Santos",
        email: "gabriel@barbearia.com",
        role: "barber",
        commission_rate: "50.00",
        password: "123",
        created_at: now,
      },
      {
        id: "barber_rafael",
        organization_id: "org_vintage",
        name: "Rafael Lima",
        email: "rafael@barbearia.com",
        role: "barber",
        commission_rate: "50.00",
        password: "123",
        created_at: now,
      },
      {
        id: "barber_andre",
        organization_id: "org_vintage",
        name: "André Costa",
        email: "andre@barbearia.com",
        role: "barber",
        commission_rate: "45.00",
        password: "123",
        created_at: now,
      },
    ];
    barbers.forEach((b) => this.users.set(b.id, b));

    // Clientes
    const initialClients: Client[] = [
      {
        id: "cli_1",
        organization_id: "org_vintage",
        name: "Marcos Silva",
        phone: "(11) 98765-4321",
        created_at: now,
      },
      {
        id: "cli_2",
        organization_id: "org_vintage",
        name: "Bruno Almeida",
        phone: "(11) 99876-5432",
        created_at: now,
      },
    ];
    initialClients.forEach((c) => this.clients.set(c.id, c));

    // Serviços e Produtos
    const items: ServiceProduct[] = [
      {
        id: "svc_corte",
        organization_id: "org_vintage",
        name: "Corte Tradicional",
        price: "50.00",
        type: "service",
        created_at: now,
      },
      {
        id: "svc_barba",
        organization_id: "org_vintage",
        name: "Barba Terapia",
        price: "40.00",
        type: "service",
        created_at: now,
      },
      {
        id: "svc_combo",
        organization_id: "org_vintage",
        name: "Combo Cabelo + Barba",
        price: "85.00",
        type: "service",
        created_at: now,
      },
      {
        id: "prd_pomada",
        organization_id: "org_vintage",
        name: "Pomada Modeladora Matte",
        price: "45.00",
        type: "product",
        created_at: now,
      },
      {
        id: "prd_oleo",
        organization_id: "org_vintage",
        name: "Óleo para Barba Premium",
        price: "38.00",
        type: "product",
        created_at: now,
      },
    ];
    items.forEach((it) => this.servicesProducts.set(it.id, it));
  }

  // Organizations
  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(normalizeOrgId(id));
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    return Array.from(this.organizations.values()).find((o) => o.slug === slug);
  }

  async getOrganizationByDocument(document: string): Promise<Organization | undefined> {
    if (!document) return undefined;
    const clean = document.replace(/\D/g, "");
    return Array.from(this.organizations.values()).find((o) => {
      if (!o.document) return false;
      return o.document === document || (clean && o.document.replace(/\D/g, "") === clean);
    });
  }

  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const org: Organization = {
      id: data.id || `org_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: data.name,
      slug: data.slug,
      document: data.document || null,
      plan: data.plan || "starter",
      status: data.status || "active",
      subscription_status: data.subscription_status || "trial",
      trial_started_at: data.trial_started_at ? new Date(data.trial_started_at) : null,
      trial_ends_at: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
      trial_already_used: data.trial_already_used ?? true,
      subscription_expires_at: data.subscription_expires_at
        ? new Date(data.subscription_expires_at)
        : null,
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
    };
    this.organizations.set(org.id, org);
    this.saveToFile();
    return org;
  }

  async updateOrganizationSubscription(
    orgId: string,
    data: {
      plan: string;
      status: string;
      subscription_status?: string;
      subscription_expires_at?: Date | string | null;
      trial_ends_at?: Date | string | null;
    }
  ): Promise<Organization | undefined> {
    const target = normalizeOrgId(orgId);
    let org = this.organizations.get(target);
    if (!org) {
      // Se não encontrar por ID exato, tenta pela primeira organização padrão
      org = Array.from(this.organizations.values())[0];
      if (!org) return undefined;
    }

    const updated: Organization = {
      ...org,
      plan: data.plan || org.plan,
      status: data.status || org.status,
      subscription_status: data.subscription_status || org.subscription_status,
      subscription_expires_at: data.subscription_expires_at
        ? new Date(data.subscription_expires_at)
        : org.subscription_expires_at,
      trial_ends_at: data.trial_ends_at
        ? new Date(data.trial_ends_at)
        : org.trial_ends_at,
    };
    this.organizations.set(updated.id, updated);
    this.saveToFile();
    return updated;
  }

  async updateOrganizationTrialStatus(
    orgId: string,
    subscription_status: "trial" | "active" | "expired" | "past_due"
  ): Promise<Organization | undefined> {
    const target = normalizeOrgId(orgId);
    let org = this.organizations.get(target);
    if (!org) {
      org = Array.from(this.organizations.values())[0];
      if (!org) return undefined;
    }
    const updated: Organization = {
      ...org,
      subscription_status,
      status: subscription_status === "expired" ? "expired" : "active",
    };
    this.organizations.set(updated.id, updated);
    this.saveToFile();
    return updated;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  async getUsersByOrg(orgId: string): Promise<User[]> {
    const target = normalizeOrgId(orgId);
    return Array.from(this.users.values()).filter(
      (u) => u.organization_id === target
    );
  }

  async createUser(data: InsertUser): Promise<User> {
    const user: User = {
      id: data.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      organization_id: normalizeOrgId(data.organization_id),
      name: data.name,
      email: data.email,
      role: data.role || "barber",
      commission_rate: String(data.commission_rate ?? "50.00"),
      password: data.password || null,
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
    };
    this.users.set(user.id, user);
    this.saveToFile();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated: User = {
      ...user,
      ...data,
      commission_rate:
        data.commission_rate !== undefined
          ? String(data.commission_rate)
          : user.commission_rate,
    };
    this.users.set(id, updated);
    this.saveToFile();
    return updated;
  }

  // Clientes
  async getClientsByOrg(orgId: string): Promise<Client[]> {
    const target = normalizeOrgId(orgId);
    return Array.from(this.clients.values()).filter(
      (c) => c.organization_id === target
    );
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(data: InsertClient): Promise<Client> {
    const client: Client = {
      id: data.id || `cli_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      organization_id: normalizeOrgId(data.organization_id),
      name: data.name,
      phone: data.phone || null,
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
    };
    this.clients.set(client.id, client);
    this.saveToFile();
    return client;
  }

  // Services and Products
  async getServicesProductsByOrg(orgId: string): Promise<ServiceProduct[]> {
    const target = normalizeOrgId(orgId);
    return Array.from(this.servicesProducts.values()).filter(
      (s) => s.organization_id === target
    );
  }

  async getServiceProduct(id: string): Promise<ServiceProduct | undefined> {
    return this.servicesProducts.get(id);
  }

  async createServiceProduct(data: InsertServiceProduct): Promise<ServiceProduct> {
    const item: ServiceProduct = {
      id: data.id || `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      organization_id: normalizeOrgId(data.organization_id),
      name: data.name,
      price: String(data.price ?? "0.00"),
      type: data.type,
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
    };
    this.servicesProducts.set(item.id, item);
    this.saveToFile();
    return item;
  }

  // Appointments
  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const apt: Appointment = {
      id: data.id || `apt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      organization_id: normalizeOrgId(data.organization_id),
      barber_id: data.barber_id,
      client_id: data.client_id || null,
      total_amount: String(data.total_amount ?? "0.00"),
      discount: String(data.discount ?? "0.00"),
      net_amount: String(data.net_amount ?? "0.00"),
      commission_amount: String(data.commission_amount ?? "0.00"),
      payment_method: data.payment_method,
      status: data.status || "concluido",
      date: data.date || new Date().toISOString().slice(0, 10),
      time: data.time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
    };
    this.appointments.set(apt.id, apt);
    this.saveToFile();
    return apt;
  }

  async getAppointmentsByOrg(
    orgId: string,
    filter?: { barberId?: string; startDate?: string; endDate?: string }
  ): Promise<Appointment[]> {
    const target = normalizeOrgId(orgId);
    return Array.from(this.appointments.values())
      .filter((a) => {
        if (a.organization_id !== target) return false;
        if (filter?.barberId && a.barber_id !== filter.barberId) return false;
        if (filter?.startDate && a.date && a.date < filter.startDate) return false;
        if (filter?.endDate && a.date && a.date > filter.endDate) return false;
        return true;
      })
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async getAppointmentsByBarber(barberId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values())
      .filter((a) => a.barber_id === barberId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  // Subscription Transactions
  async createSubscriptionTransaction(
    data: InsertSubscriptionTransaction
  ): Promise<SubscriptionTransaction> {
    const tx: SubscriptionTransaction = {
      id: data.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      organization_id: normalizeOrgId(data.organization_id),
      payment_id: String(data.payment_id),
      status: data.status,
      amount: String(data.amount ?? "0.00"),
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
    };
    this.subscriptionTransactions.set(tx.id, tx);
    this.saveToFile();
    return tx;
  }

  async getSubscriptionTransactionsByOrg(
    orgId: string
  ): Promise<SubscriptionTransaction[]> {
    const target = normalizeOrgId(orgId);
    return Array.from(this.subscriptionTransactions.values())
      .filter((t) => t.organization_id === target)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }
}

/**
 * ============================================================
 * 2. IMPLEMENTAÇÃO POSTGRESQL COM DRIZZLE ORM (DatabaseStorage)
 * Ativada automaticamente quando DATABASE_URL estiver configurada
 * ============================================================
 */
export class DatabaseStorage implements IStorage {
  public readonly storageType = "postgres" as const;
  private db: ReturnType<typeof drizzle>;
  private pool: pg.Pool;
  private initialized = false;

  constructor(pool: pg.Pool) {
    this.pool = pool;
    this.db = drizzle(pool, { schema });
    this.ensureTables();
  }

  public isDatabaseConnected(): boolean {
    return !!this.pool && this.initialized;
  }

  /**
   * Garante a criação de tabelas multi-tenant no PostgreSQL se ainda não existirem
   */
  private async ensureTables() {
    try {
      const client = await this.pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS organizations (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(150) NOT NULL UNIQUE,
            document VARCHAR(50),
            plan VARCHAR(50) NOT NULL DEFAULT 'pro',
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial',
            trial_started_at TIMESTAMPTZ,
            trial_ends_at TIMESTAMPTZ,
            trial_already_used BOOLEAN DEFAULT true,
            subscription_expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
          );

          ALTER TABLE organizations ADD COLUMN IF NOT EXISTS document VARCHAR(50);
          ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
          ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
          ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
          ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_already_used BOOLEAN DEFAULT true;
          CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_document ON organizations (document) WHERE document IS NOT NULL AND document != '';

          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(100) PRIMARY KEY,
            organization_id VARCHAR(100),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            role VARCHAR(50) NOT NULL DEFAULT 'barber',
            commission_rate NUMERIC(5,2) NOT NULL DEFAULT 50.00,
            password VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
          );

          ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id VARCHAR(100);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 50.00;

          CREATE TABLE IF NOT EXISTS clients (
            id VARCHAR(100) PRIMARY KEY,
            organization_id VARCHAR(100),
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
          );

          ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id VARCHAR(100);

          CREATE TABLE IF NOT EXISTS services_products (
            id VARCHAR(100) PRIMARY KEY,
            organization_id VARCHAR(100) NOT NULL,
            name VARCHAR(255) NOT NULL,
            price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
            type VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS appointments (
            id VARCHAR(100) PRIMARY KEY,
            organization_id VARCHAR(100),
            barber_id VARCHAR(100),
            client_id VARCHAR(100),
            total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
            discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
            net_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
            commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
            payment_method VARCHAR(100),
            status VARCHAR(50) DEFAULT 'concluido',
            date VARCHAR(20),
            time VARCHAR(20),
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
          );

          ALTER TABLE appointments ADD COLUMN IF NOT EXISTS organization_id VARCHAR(100);
          ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0.00;
          ALTER TABLE appointments ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0.00;
          ALTER TABLE appointments ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10,2) DEFAULT 0.00;
          ALTER TABLE appointments ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT 0.00;
          ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100);

          CREATE TABLE IF NOT EXISTS subscription_transactions (
            id VARCHAR(100) PRIMARY KEY,
            organization_id VARCHAR(100) NOT NULL,
            payment_id VARCHAR(150) NOT NULL,
            status VARCHAR(50) NOT NULL,
            amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
          );
        `);

        // Seed inicial da organização padrão se vazio
        const orgRes = await client.query("SELECT COUNT(*)::int as count FROM organizations");
        if (orgRes.rows[0].count === 0) {
          await client.query(`
            INSERT INTO organizations (id, name, slug, document, plan, status, subscription_expires_at)
            VALUES ('org_vintage', 'Barbearia Vintage Club', 'barbearia-vintage', '12.345.678/0001-90', 'pro', 'active', NOW() + INTERVAL '30 days')
            ON CONFLICT (id) DO NOTHING;

            INSERT INTO users (id, organization_id, name, username, email, role, commission_rate, password)
            VALUES 
              ('usr_owner', 'org_vintage', 'Carlos Eduardo (Dono)', 'usr_owner', 'admin@barbearia.com', 'owner', 0.00, 'admin'),
              ('barber_gabriel', 'org_vintage', 'Gabriel Santos', 'barber_gabriel', 'gabriel@barbearia.com', 'barber', 50.00, '123'),
              ('barber_rafael', 'org_vintage', 'Rafael Lima', 'barber_rafael', 'rafael@barbearia.com', 'barber', 50.00, '123'),
              ('barber_andre', 'org_vintage', 'André Costa', 'barber_andre', 'andre@barbearia.com', 'barber', 45.00, '123')
            ON CONFLICT (id) DO NOTHING;

            INSERT INTO services_products (id, organization_id, name, price, type)
            VALUES
              ('svc_corte', 'org_vintage', 'Corte Tradicional', 50.00, 'service'),
              ('svc_barba', 'org_vintage', 'Barba Terapia', 40.00, 'service'),
              ('svc_combo', 'org_vintage', 'Combo Cabelo + Barba', 85.00, 'service'),
              ('prd_pomada', 'org_vintage', 'Pomada Modeladora Matte', 45.00, 'product'),
              ('prd_oleo', 'org_vintage', 'Óleo para Barba Premium', 38.00, 'product')
            ON CONFLICT (id) DO NOTHING;
          `);
        }
        this.initialized = true;
        console.log("[DatabaseStorage] Esquema relacional PostgreSQL inicializado com sucesso via Drizzle.");
      } finally {
        client.release();
      }
    } catch (e: any) {
      console.error("[DatabaseStorage] Erro ao verificar/criar tabelas no PostgreSQL:", e.message);
    }
  }

  // Organizations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const target = normalizeOrgId(id);
    const res = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, target));
    return res[0];
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const res = await this.db.select().from(schema.organizations).where(eq(schema.organizations.slug, slug));
    return res[0];
  }

  async getOrganizationByDocument(document: string): Promise<Organization | undefined> {
    if (!document) return undefined;
    const cleanDoc = document.replace(/\D/g, "");
    const res = await this.db.select().from(schema.organizations).where(eq(schema.organizations.document, document));
    if (res.length > 0) return res[0];
    if (cleanDoc) {
      const all = await this.db.select().from(schema.organizations);
      return all.find((o) => o.document && o.document.replace(/\D/g, "") === cleanDoc);
    }
    return undefined;
  }

  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const id = data.id || `org_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const res = await this.db
      .insert(schema.organizations)
      .values({ ...data, id })
      .returning();
    return res[0];
  }

  async updateOrganizationSubscription(
    orgId: string,
    data: {
      plan: string;
      status: string;
      subscription_status?: string;
      subscription_expires_at?: Date | string | null;
      trial_ends_at?: Date | string | null;
    }
  ): Promise<Organization | undefined> {
    const target = normalizeOrgId(orgId);
    const updateValues: Record<string, any> = {
      plan: data.plan,
      status: data.status,
    };
    if (data.subscription_status !== undefined) {
      updateValues.subscription_status = data.subscription_status;
    }
    if (data.subscription_expires_at !== undefined) {
      updateValues.subscription_expires_at = data.subscription_expires_at
        ? new Date(data.subscription_expires_at)
        : null;
    }
    if (data.trial_ends_at !== undefined) {
      updateValues.trial_ends_at = data.trial_ends_at
        ? new Date(data.trial_ends_at)
        : null;
    }

    // Tenta atualizar pelo orgId; se não houver registros com esse id, atualiza o primeiro tenant existente
    const res = await this.db
      .update(schema.organizations)
      .set(updateValues)
      .where(eq(schema.organizations.id, target))
      .returning();

    if (res.length > 0) return res[0];

    const all = await this.db.select().from(schema.organizations).limit(1);
    if (all.length > 0) {
      const fallbackRes = await this.db
        .update(schema.organizations)
        .set(updateValues)
        .where(eq(schema.organizations.id, all[0].id))
        .returning();
      return fallbackRes[0];
    }
    return undefined;
  }

  async updateOrganizationTrialStatus(
    orgId: string,
    subscription_status: "trial" | "active" | "expired" | "past_due"
  ): Promise<Organization | undefined> {
    const target = normalizeOrgId(orgId);
    const status = subscription_status === "expired" ? "expired" : "active";
    const updateValues = {
      subscription_status,
      status,
    };
    const res = await this.db
      .update(schema.organizations)
      .set(updateValues)
      .where(eq(schema.organizations.id, target))
      .returning();

    if (res.length > 0) return res[0];

    const all = await this.db.select().from(schema.organizations).limit(1);
    if (all.length > 0) {
      const fallback = await this.db
        .update(schema.organizations)
        .set(updateValues)
        .where(eq(schema.organizations.id, all[0].id))
        .returning();
      return fallback[0];
    }
    return undefined;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return await this.db.select().from(schema.organizations);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const res = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return res[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const res = await this.db.select().from(schema.users).where(eq(schema.users.email, email));
    return res[0];
  }

  async getUsersByOrg(orgId: string): Promise<User[]> {
    const target = normalizeOrgId(orgId);
    return await this.db.select().from(schema.users).where(eq(schema.users.organization_id, target));
  }

  async createUser(data: InsertUser): Promise<User> {
    const id = data.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const res = await this.db
      .insert(schema.users)
      .values({ ...data, id, organization_id: normalizeOrgId(data.organization_id), commission_rate: String(data.commission_rate ?? "50.00") })
      .returning();
    return res[0];
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const updateVals: Record<string, any> = { ...data };
    if (data.commission_rate !== undefined) {
      updateVals.commission_rate = String(data.commission_rate);
    }
    const res = await this.db
      .update(schema.users)
      .set(updateVals)
      .where(eq(schema.users.id, id))
      .returning();
    return res[0];
  }

  // Clients
  async getClientsByOrg(orgId: string): Promise<Client[]> {
    const target = normalizeOrgId(orgId);
    return await this.db.select().from(schema.clients).where(eq(schema.clients.organization_id, target));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const res = await this.db.select().from(schema.clients).where(eq(schema.clients.id, id));
    return res[0];
  }

  async createClient(data: InsertClient): Promise<Client> {
    const id = data.id || `cli_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const res = await this.db
      .insert(schema.clients)
      .values({ ...data, id, organization_id: normalizeOrgId(data.organization_id) })
      .returning();
    return res[0];
  }

  // Services and Products
  async getServicesProductsByOrg(orgId: string): Promise<ServiceProduct[]> {
    const target = normalizeOrgId(orgId);
    return await this.db
      .select()
      .from(schema.servicesProducts)
      .where(eq(schema.servicesProducts.organization_id, target));
  }

  async getServiceProduct(id: string): Promise<ServiceProduct | undefined> {
    const res = await this.db
      .select()
      .from(schema.servicesProducts)
      .where(eq(schema.servicesProducts.id, id));
    return res[0];
  }

  async createServiceProduct(data: InsertServiceProduct): Promise<ServiceProduct> {
    const id = data.id || `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const res = await this.db
      .insert(schema.servicesProducts)
      .values({ ...data, id, organization_id: normalizeOrgId(data.organization_id), price: String(data.price ?? "0.00") })
      .returning();
    return res[0];
  }

  // Appointments
  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const id = data.id || `apt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const res = await this.db
      .insert(schema.appointments)
      .values({
        ...data,
        id,
        organization_id: normalizeOrgId(data.organization_id),
        total_amount: String(data.total_amount ?? "0.00"),
        discount: String(data.discount ?? "0.00"),
        net_amount: String(data.net_amount ?? "0.00"),
        commission_amount: String(data.commission_amount ?? "0.00"),
      })
      .returning();
    return res[0];
  }

  async getAppointmentsByOrg(
    orgId: string,
    filter?: { barberId?: string; startDate?: string; endDate?: string }
  ): Promise<Appointment[]> {
    const target = normalizeOrgId(orgId);
    const conditions = [eq(schema.appointments.organization_id, target)];
    if (filter?.barberId) {
      conditions.push(eq(schema.appointments.barber_id, filter.barberId));
    }
    if (filter?.startDate) {
      conditions.push(gte(schema.appointments.date, filter.startDate));
    }
    if (filter?.endDate) {
      conditions.push(lte(schema.appointments.date, filter.endDate));
    }

    return await this.db
      .select()
      .from(schema.appointments)
      .where(and(...conditions))
      .orderBy(desc(schema.appointments.created_at));
  }

  async getAppointmentsByBarber(barberId: string): Promise<Appointment[]> {
    return await this.db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.barber_id, barberId))
      .orderBy(desc(schema.appointments.created_at));
  }

  // Subscription Transactions
  async createSubscriptionTransaction(
    data: InsertSubscriptionTransaction
  ): Promise<SubscriptionTransaction> {
    const id = data.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const res = await this.db
      .insert(schema.subscriptionTransactions)
      .values({
        ...data,
        id,
        organization_id: normalizeOrgId(data.organization_id),
        payment_id: String(data.payment_id),
        amount: String(data.amount ?? "0.00"),
      })
      .returning();
    return res[0];
  }

  async getSubscriptionTransactionsByOrg(
    orgId: string
  ): Promise<SubscriptionTransaction[]> {
    const target = normalizeOrgId(orgId);
    return await this.db
      .select()
      .from(schema.subscriptionTransactions)
      .where(eq(schema.subscriptionTransactions.organization_id, target))
      .orderBy(desc(schema.subscriptionTransactions.created_at));
  }
}

/**
 * ============================================================
 * 3. FÁBRICA DO STORAGE DUAL (storage)
 * - Se DATABASE_URL estiver configurada, instancia DatabaseStorage.
 * - Caso contrário (ambiente Preview sem env ou banco offline),
 *   usa MemStorage automaticamente sem travar a aplicação.
 * ============================================================
 */
function createStorage(): IStorage {
  const pool = getDbPool();
  if (pool) {
    try {
      console.log("[Storage] Inicializando DatabaseStorage com PostgreSQL...");
      return new DatabaseStorage(pool);
    } catch (err: any) {
      console.warn(
        "[Storage] Falha ao inicializar DatabaseStorage. Usando MemStorage como fallback:",
        err.message
      );
      return new MemStorage();
    }
  }

  console.log("[Storage] DATABASE_URL não definida. Rodando com MemStorage em memória.");
  return new MemStorage();
}

export const storage: IStorage = createStorage();
