import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  initDatabaseWithPg,
  getPgHealth,
  loadFromPg,
  persistRevenue,
  persistExpense,
  persistAppointment,
  persistQueue,
  persistBarber,
  persistClient,
  persistSubscription,
} from "./src/db/sync.js";
import {
  processMercadoPagoPayment,
  createMercadoPagoPreference,
} from "./server/mercadopago.js";
import { storage } from "./server/storage.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ----------------------------- In-Memory State & Helpers -----------------------------

const newId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
const nowIso = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().split("T")[0];

const parseDateStr = (s: string) => {
  if (!s) return new Date();
  const clean = s.includes("T") ? s.split("T")[0] : s;
  return new Date(clean + "T12:00:00Z");
};

const formatBRL = (val: number) => {
  return "R$ " + (Number(val) || 0).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Types
interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  email?: string;
  role: string;
  roles: string[];
  barbershop_id: string;
  barber_id?: string;
  permissions: Record<string, boolean>;
  active: boolean;
  subscriptionStatus?: "trialing" | "active" | "expired" | "canceled";
  subscriptionExpiresAt?: string;
  created_at: string;
}

interface Barber {
  id: string;
  barbershop_id: string;
  unit_id?: string;
  name: string;
  commission_percent: number;
  commission_type: string;
  commission_value: number;
  commission_overrides: Record<string, any>;
  phone?: string;
  email?: string;
  photo_url?: string;
  join_date?: string;
  authorized_services: string[];
  authorized_products: string[];
  user_id?: string;
  active: boolean;
  created_at: string;
}

interface PaymentMethod {
  id: string;
  barbershop_id: string;
  name: string;
  kind: string;
  fees: Record<string, number>;
  settlement_days: Record<string, number>;
  active: boolean;
  created_at: string;
}

interface Service {
  id: string;
  barbershop_id: string;
  name: string;
  price: number;
  duration_min: number;
  active: boolean;
  created_at: string;
}

interface Product {
  id: string;
  barbershop_id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  active: boolean;
  created_at: string;
}

interface Category {
  id: string;
  barbershop_id: string;
  name: string;
  group: string;
  type: string;
  color: string;
  created_at: string;
}

interface Revenue {
  id: string;
  barbershop_id: string;
  date: string;
  time: string;
  item_kind: string;
  item_id?: string;
  sale_group_id?: string;
  weekday?: number;
  service_type: string;
  service_name: string;
  quantity: number;
  gross_amount: number;
  discount_amount: number;
  paid_amount: number;
  payment_method_id: string;
  payment_method_name: string;
  payment_type: string;
  barber_id?: string;
  barber_name?: string;
  client_name?: string;
  client_id?: string;
  plan_used?: boolean;
  fee_amount: number;
  net_amount: number;
  commission_amount: number;
  shop_amount: number;
  settlement_date: string;
  available: boolean;
  commission_paid: boolean;
  commission_paid_date?: string;
  status: string;
  note?: string;
  created_at: string;
}

interface Expense {
  id: string;
  barbershop_id: string;
  name: string;
  value: number;
  category_id?: string;
  category_name?: string;
  type: string;
  due_date: string;
  recurrence: string;
  occurrences?: number;
  payment_method?: string;
  payment_date?: string;
  status: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  barbershop_id: string;
  date: string;
  value: number;
  reason: string;
  source: string;
  created_at: string;
}

interface CashClosing {
  id: string;
  barbershop_id: string;
  date: string;
  expected: Record<string, number>;
  counted: Record<string, number>;
  difference: number;
  note?: string;
  created_at: string;
}

interface Client {
  id: string;
  barbershop_id: string;
  name: string;
  phone?: string;
  birthdate?: string;
  notes?: string;
  has_plan: boolean;
  plan?: {
    name: string;
    total: number;
    used: number;
    start?: string;
    due?: string;
  };
  created_at: string;
}

interface QueueItem {
  id: string;
  barbershop_id: string;
  client_name: string;
  client_phone?: string;
  client_id?: string;
  barber_id?: string;
  barber_name?: string;
  service_ids: string[];
  service_names: string[];
  estimated_price: number;
  status: "espera" | "cadeira" | "finalizado" | "cancelado";
  arrival_time: string;
  called_time?: string;
  finished_time?: string;
  date: string;
  notes?: string;
  revenue_id?: string;
  appointment_id?: string;
  created_at: string;
}

interface Appointment {
  id: string;
  barbershop_id: string;
  client_name: string;
  client_phone?: string;
  client_id?: string;
  barber_id: string;
  barber_name: string;
  service_ids: string[];
  service_names: string[];
  date: string;
  time: string;
  duration_min: number;
  price: number;
  status: "pendente" | "confirmado" | "cadeira" | "concluido" | "cancelado";
  notes?: string;
  revenue_id?: string;
  created_at: string;
}

interface ChangeHistory {
  id: string;
  barbershop_id: string;
  user: string;
  timestamp: string;
  action: string;
  entity: string;
  before?: any;
  after?: any;
}

interface Unit {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  address: string;
  phone: string;
  city: string;
  state: string;
  is_main: boolean;
  operational_mode?: string;
  created_at: string;
}

interface Subscription {
  plan_id: "starter" | "pro" | "premium";
  status: "trialing" | "active" | "expired" | "canceled";
  subscriptionStatus?: "trialing" | "active" | "expired" | "canceled";
  subscriptionExpiresAt?: string;
  max_barbers: number;
  multi_unit: boolean;
  updated_at: string;
}

const PERMISSIONS_CATALOG = [
  { key: "ver_dashboard", label: "Ver Dashboard", group: "Financeiro", sensitive: false },
  { key: "ver_financeiro", label: "Ver Financeiro", group: "Financeiro", sensitive: false },
  { key: "ver_receitas", label: "Ver Receitas", group: "Financeiro", sensitive: false },
  { key: "registrar_despesas", label: "Registrar Despesas", group: "Financeiro", sensitive: false },
  { key: "ver_relatorios", label: "Ver Relatórios", group: "Financeiro", sensitive: false },
  { key: "gerenciar_barbeiros", label: "Gerenciar Barbeiros", group: "Equipe", sensitive: false },
  { key: "cadastrar_barbeiros", label: "Cadastrar Barbeiros", group: "Equipe", sensitive: false },
  { key: "editar_barbeiros", label: "Editar Barbeiros", group: "Equipe", sensitive: false },
  { key: "gerenciar_servicos", label: "Gerenciar Serviços", group: "Equipe", sensitive: false },
  { key: "gerenciar_produtos", label: "Gerenciar Produtos", group: "Equipe", sensitive: false },
  { key: "gerenciar_clientes", label: "Gerenciar Clientes", group: "Clientes", sensitive: false },
  { key: "gerenciar_fila", label: "Gerenciar Fila do Dia", group: "Operacional", sensitive: false },
  { key: "gerenciar_agenda", label: "Gerenciar Agenda de Horários", group: "Operacional", sensitive: false },
  { key: "alterar_comissao", label: "Alterar Comissão", group: "Sensível", sensitive: true },
  { key: "alterar_taxas", label: "Alterar Taxas das Maquininhas", group: "Sensível", sensitive: true },
  { key: "retirada_proprietario", label: "Retirada do Proprietário", group: "Sensível", sensitive: true },
  { key: "excluir_lancamentos", label: "Excluir Lançamentos", group: "Sensível", sensitive: true },
  { key: "alterar_configuracoes", label: "Alterar Configurações", group: "Sensível", sensitive: true },
  { key: "ver_marketing", label: "Ver Marketing (futuro)", group: "Futuro", sensitive: false },
];

const defaultManagerPermissions = () => {
  const map: Record<string, boolean> = {};
  PERMISSIONS_CATALOG.forEach((p) => {
    map[p.key] = !p.sensitive && p.group !== "Futuro";
  });
  return map;
};

// Database store
class Database {
  users: User[] = [];
  barbers: Barber[] = [];
  paymentMethods: PaymentMethod[] = [];
  services: Service[] = [];
  products: Product[] = [];
  categories: Category[] = [];
  revenues: Revenue[] = [];
  expenses: Expense[] = [];
  withdrawals: Withdrawal[] = [];
  cashClosings: CashClosing[] = [];
  clients: Client[] = [];
  queue: QueueItem[] = [];
  appointments: Appointment[] = [];
  history: ChangeHistory[] = [];
  units: Unit[] = [
    {
      id: "unit_centro",
      name: "Unidade Centro (Matriz)",
      short_name: "Centro",
      slug: "barbearia-vintage-centro",
      address: "Rua Augusta, 1200 - Consolação, São Paulo - SP",
      phone: "(11) 99999-8888",
      city: "São Paulo",
      state: "SP",
      is_main: true,
      operational_mode: "hibrido",
      created_at: nowIso(),
    },
    {
      id: "unit_shopping",
      name: "Unidade Shopping (Filial)",
      short_name: "Shopping",
      slug: "barbearia-vintage-shopping",
      address: "Av. Brigadeiro Faria Lima, 2232 - Shopping Iguatemi, São Paulo - SP",
      phone: "(11) 98888-7777",
      city: "São Paulo",
      state: "SP",
      is_main: false,
      operational_mode: "agendamento",
      created_at: nowIso(),
    },
  ];
  subscription: Subscription = {
    plan_id: "premium",
    status: "active",
    max_barbers: 10,
    multi_unit: true,
    updated_at: nowIso(),
  };
  settings = {
    id: "settings",
    barbershop_id: "profile",
    commission_on: "pago",
    initial_balance: 3000.0,
    shop_name: "Barbearia Vintage Club",
    operational_mode: "hibrido", // "agendamento" | "fila" | "hibrido"
    public_slug: "barbearia-vintage",
  };
  barbershop = {
    id: "profile",
    name: "Barbearia Vintage Club",
    slug: "barbearia-vintage",
    document: "12.345.678/0001-90",
    phone: "(11) 99999-8888",
    address: "Rua Augusta, 1200 - Consolação, São Paulo - SP",
    logo_url: "",
    opening_hours: "Segunda a Sábado das 09h às 20h",
    city: "São Paulo",
    state: "SP",
    shop_phone: "(11) 99999-8888",
    operational_mode: "hibrido",
  };

  logChange(action: string, entity: string, before: any = null, after: any = null, user = "Administrador") {
    this.history.unshift({
      id: newId(),
      barbershop_id: "profile",
      user,
      timestamp: nowIso(),
      action,
      entity,
      before,
      after,
    });
    if (this.history.length > 500) this.history.pop();
  }

  seed() {
    this.users = [];
    this.barbers = [];
    this.paymentMethods = [];
    this.services = [];
    this.products = [];
    this.categories = [];
    this.revenues = [];
    this.expenses = [];
    this.withdrawals = [];
    this.cashClosings = [];
    this.clients = [];
    this.history = [];

    // Settings
    this.settings = {
      id: "settings",
      barbershop_id: "profile",
      commission_on: "pago",
      initial_balance: 3000.0,
      shop_name: "Barbearia Vintage Club",
      operational_mode: "hibrido",
      public_slug: "barbearia-vintage",
    };

    // Payment Methods
    const pms: PaymentMethod[] = [
      { id: "pm_dinheiro", barbershop_id: "profile", name: "Dinheiro", kind: "dinheiro", fees: { dinheiro: 0 }, settlement_days: { dinheiro: 0 }, active: true, created_at: nowIso() },
      { id: "pm_pix", barbershop_id: "profile", name: "PIX", kind: "pix", fees: { pix: 0 }, settlement_days: { pix: 0 }, active: true, created_at: nowIso() },
      { id: "pm_ton", barbershop_id: "profile", name: "Ton", kind: "maquininha", fees: { debito: 1.99, credito_vista: 3.15, credito_parcelado: 4.60, pix: 0.99 }, settlement_days: { debito: 1, credito_vista: 1, credito_parcelado: 30, pix: 0 }, active: true, created_at: nowIso() },
      { id: "pm_stone", barbershop_id: "profile", name: "Stone", kind: "maquininha", fees: { debito: 1.49, credito_vista: 2.99, credito_parcelado: 4.20, pix: 0.79 }, settlement_days: { debito: 1, credito_vista: 30, credito_parcelado: 30, pix: 0 }, active: true, created_at: nowIso() },
      { id: "pm_infinitepay", barbershop_id: "profile", name: "InfinitePay", kind: "maquininha", fees: { debito: 1.37, credito_vista: 3.05, credito_parcelado: 4.35, pix: 0 }, settlement_days: { debito: 1, credito_vista: 1, credito_parcelado: 30, pix: 0 }, active: true, created_at: nowIso() },
    ];
    this.paymentMethods = pms;

    // Services
    const svcs: Service[] = [
      { id: "svc_corte", barbershop_id: "profile", name: "Corte Tradicional", price: 50, duration_min: 30, active: true, created_at: nowIso() },
      { id: "svc_barba", barbershop_id: "profile", name: "Barba Terapia", price: 35, duration_min: 30, active: true, created_at: nowIso() },
      { id: "svc_combo", barbershop_id: "profile", name: "Corte + Barba", price: 75, duration_min: 60, active: true, created_at: nowIso() },
      { id: "svc_degrade", barbershop_id: "profile", name: "Corte Degradê", price: 60, duration_min: 40, active: true, created_at: nowIso() },
      { id: "svc_sobrancelha", barbershop_id: "profile", name: "Sobrancelha", price: 20, duration_min: 15, active: true, created_at: nowIso() },
    ];
    this.services = svcs;

    // Products
    const prods: Product[] = [
      { id: "prod_pomada", barbershop_id: "profile", name: "Pomada Matte 100g", price: 45, cost: 20, stock: 28, active: true, created_at: nowIso() },
      { id: "prod_shampoo", barbershop_id: "profile", name: "Shampoo Refrescante", price: 35, cost: 15, stock: 19, active: true, created_at: nowIso() },
      { id: "prod_oleo", barbershop_id: "profile", name: "Óleo para Barba 30ml", price: 50, cost: 22, stock: 15, active: true, created_at: nowIso() },
      { id: "prod_cera", barbershop_id: "profile", name: "Cera Modeladora Forte", price: 40, cost: 18, stock: 22, active: true, created_at: nowIso() },
    ];
    this.products = prods;

    // Barbers
    const b1: Barber = {
      id: "barber_carlos",
      barbershop_id: "unit_centro",
      name: "Carlos Souza",
      commission_percent: 40,
      commission_type: "percentual",
      commission_value: 0,
      commission_overrides: {},
      phone: "(11) 98888-1111",
      email: "carlos@barbearia.com",
      join_date: "2024-01-10",
      authorized_services: svcs.map((s) => s.id),
      authorized_products: prods.map((p) => p.id),
      active: true,
      created_at: nowIso(),
    };
    const b2: Barber = {
      id: "barber_rafael",
      barbershop_id: "unit_centro",
      name: "Rafael Lima",
      commission_percent: 45,
      commission_type: "percentual",
      commission_value: 0,
      commission_overrides: {},
      phone: "(11) 98888-2222",
      email: "rafael@barbearia.com",
      join_date: "2024-02-15",
      authorized_services: svcs.map((s) => s.id),
      authorized_products: prods.map((p) => p.id),
      active: true,
      created_at: nowIso(),
    };
    const b3: Barber = {
      id: "barber_andre",
      barbershop_id: "unit_shopping",
      name: "André Costa",
      commission_percent: 0,
      commission_type: "fixo",
      commission_value: 25,
      commission_overrides: {},
      phone: "(11) 98888-3333",
      email: "andre@barbearia.com",
      join_date: "2024-03-01",
      authorized_services: svcs.map((s) => s.id),
      authorized_products: prods.map((p) => p.id),
      active: true,
      created_at: nowIso(),
    };
    this.barbers = [b1, b2, b3];

    // Users
    const allPerms: Record<string, boolean> = {};
    PERMISSIONS_CATALOG.forEach((p) => (allPerms[p.key] = true));

    this.users = [
      {
        id: "usr_dono",
        name: "Administrador / Dono",
        username: "dono",
        password: "dono123",
        email: "dono@barbearia.com",
        role: "dono",
        roles: ["dono"],
        barbershop_id: "profile",
        permissions: allPerms,
        active: true,
        subscriptionStatus: "active",
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: nowIso(),
      },
      {
        id: "usr_dono_quick",
        name: "Dono Teste (1)",
        username: "1",
        password: "1",
        email: "dono@teste.com",
        role: "dono",
        roles: ["dono"],
        barbershop_id: "profile",
        permissions: allPerms,
        active: true,
        subscriptionStatus: "active",
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: nowIso(),
      },
      {
        id: "usr_gerente",
        name: "Gerente Geral",
        username: "gerente",
        password: "gerente123",
        email: "gerente@barbearia.com",
        role: "gerente",
        roles: ["gerente"],
        barbershop_id: "profile",
        permissions: defaultManagerPermissions(),
        active: true,
        subscriptionStatus: "active",
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: nowIso(),
      },
      {
        id: "usr_gerente_quick",
        name: "Gerente Teste (2)",
        username: "2",
        password: "2",
        email: "gerente@teste.com",
        role: "gerente",
        roles: ["gerente"],
        barbershop_id: "profile",
        permissions: defaultManagerPermissions(),
        active: true,
        subscriptionStatus: "active",
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: nowIso(),
      },
      {
        id: "usr_carlos",
        name: "Carlos Souza",
        username: "carlos",
        password: "barbeiro123",
        email: "carlos@barbearia.com",
        role: "barbeiro",
        roles: ["barbeiro"],
        barbershop_id: "profile",
        barber_id: b1.id,
        permissions: {},
        active: true,
        subscriptionStatus: "active",
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: nowIso(),
      },
      {
        id: "usr_barbeiro_quick",
        name: "Barbeiro Teste (3)",
        username: "3",
        password: "3",
        email: "barbeiro@teste.com",
        role: "barbeiro",
        roles: ["barbeiro"],
        barbershop_id: "profile",
        barber_id: b1.id,
        permissions: {},
        active: true,
        subscriptionStatus: "active",
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: nowIso(),
      },
    ];

    // Categories
    const cats: Category[] = [
      { id: "cat_aluguel", barbershop_id: "profile", name: "Aluguel", group: "Estrutura", type: "despesa", color: "#c9a227", created_at: nowIso() },
      { id: "cat_energia", barbershop_id: "profile", name: "Energia Elétrica", group: "Estrutura", type: "despesa", color: "#eab308", created_at: nowIso() },
      { id: "cat_agua", barbershop_id: "profile", name: "Água & Esgoto", group: "Estrutura", type: "despesa", color: "#0ea5e9", created_at: nowIso() },
      { id: "cat_internet", barbershop_id: "profile", name: "Internet Fibra", group: "Estrutura", type: "despesa", color: "#6366f1", created_at: nowIso() },
      { id: "cat_produtos", barbershop_id: "profile", name: "Insumos & Lâminas", group: "Operação", type: "despesa", color: "#10b981", created_at: nowIso() },
      { id: "cat_marketing", barbershop_id: "profile", name: "Anúncios Meta/Google", group: "Marketing", type: "despesa", color: "#f43f5e", created_at: nowIso() },
      { id: "cat_manutencao", barbershop_id: "profile", name: "Manutenção Máquinas", group: "Manutenção", type: "despesa", color: "#8b5cf6", created_at: nowIso() },
    ];
    this.categories = cats;

    // Clients
    this.clients = [
      { id: "cli_1", barbershop_id: "profile", name: "João Pedro Silva", phone: "(11) 98765-4321", notes: "Prefere degradê navalhado", has_plan: true, plan: { name: "Clube do Corte", total: 4, used: 2, start: "2026-09-01", due: "2026-09-30" }, created_at: nowIso() },
      { id: "cli_2", barbershop_id: "profile", name: "Lucas Fernandes", phone: "(11) 97777-6666", notes: "Corte tradicional tesoura", has_plan: false, created_at: nowIso() },
      { id: "cli_3", barbershop_id: "profile", name: "Marcos Vinicius", phone: "(11) 96666-5555", notes: "Barba completa com toalha quente", has_plan: true, plan: { name: "VIP Barba", total: 2, used: 1, start: "2026-09-05", due: "2026-10-05" }, created_at: nowIso() },
      { id: "cli_4", barbershop_id: "profile", name: "Bruno Henrique", phone: "(11) 95555-4444", notes: "", has_plan: false, created_at: nowIso() },
    ];

    // Seed realistic Revenues for current month and previous days
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    const demoClients = ["João Pedro Silva", "Lucas Fernandes", "Marcos Vinicius", "Bruno Henrique", "Felipe Santos", "Diego Moreira", "Gabriel Alves"];
    const payTypes = ["dinheiro", "pix", "debito", "credito_vista"];
    const pmMap: Record<string, string> = { dinheiro: "pm_dinheiro", pix: "pm_pix", debito: "pm_ton", credito_vista: "pm_stone" };
    const pmNameMap: Record<string, string> = { dinheiro: "Dinheiro", pix: "PIX", debito: "Ton", credito_vista: "Stone" };

    const daysCount = Math.max(today.getDate(), 15);
    for (let d = 1; d <= daysCount; d++) {
      const dateObj = new Date(Date.UTC(currentYear, currentMonth, d));
      const dateStr = dateObj.toISOString().split("T")[0];
      const salesToday = 4 + (d % 5);

      for (let s = 0; s < salesToday; s++) {
        const barber = this.barbers[s % this.barbers.length];
        const isProduct = s % 4 === 3;
        const item = isProduct ? this.products[s % this.products.length] : this.services[s % this.services.length];
        const pType = payTypes[(d + s) % payTypes.length];
        const pmId = pmMap[pType];
        const pmName = pmNameMap[pType];
        const pmObj = this.paymentMethods.find((p) => p.id === pmId);
        const feePercent = pmObj?.fees[pType] || 0;

        const gross = item.price;
        const discount = s % 5 === 0 ? 5 : 0;
        const paid = Math.max(gross - discount, 0);
        const fee = Number(((paid * feePercent) / 100).toFixed(2));
        const net = Number((paid - fee).toFixed(2));

        let commission = 0;
        if (barber.commission_type === "fixo") {
          commission = barber.commission_value;
        } else {
          commission = Number(((paid * barber.commission_percent) / 100).toFixed(2));
        }
        commission = Math.min(commission, Math.max(net, 0));
        const shop = Number((net - commission).toFixed(2));

        const settlementDays = pmObj?.settlement_days[pType] || 0;
        const settlementDateObj = new Date(dateObj.getTime() + settlementDays * 86400000);
        const settlementDateStr = settlementDateObj.toISOString().split("T")[0];
        const isAvail = settlementDateStr <= todayStr();

        const timeStr = `${String(9 + (s % 10)).padStart(2, "0")}:${s % 2 === 0 ? "00" : "30"}`;

        this.revenues.push({
          id: `rev_${d}_${s}`,
          barbershop_id: barber.barbershop_id || "unit_centro",
          date: dateStr,
          time: timeStr,
          item_kind: isProduct ? "produto" : "servico",
          item_id: item.id,
          weekday: dateObj.getDay(),
          service_type: isProduct ? "produto" : "corte",
          service_name: item.name,
          quantity: 1,
          gross_amount: gross,
          discount_amount: discount,
          paid_amount: paid,
          payment_method_id: pmId,
          payment_method_name: pmName,
          payment_type: pType,
          barber_id: barber.id,
          barber_name: barber.name,
          client_name: demoClients[(d + s) % demoClients.length],
          fee_amount: fee,
          net_amount: net,
          commission_amount: commission,
          shop_amount: shop,
          settlement_date: settlementDateStr,
          available: isAvail,
          commission_paid: d < 10,
          status: "ativo",
          created_at: `${dateStr}T${timeStr}:00Z`,
        });
      }
    }

    // Seed Expenses for current month
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    this.expenses = [
      { id: "exp_1", barbershop_id: "profile", name: "Aluguel Salão", value: 2500, category_id: "cat_aluguel", category_name: "Aluguel", type: "fixa", due_date: `${ym}-05`, recurrence: "mensal", payment_date: `${ym}-05`, status: "pago", created_at: nowIso() },
      { id: "exp_2", barbershop_id: "profile", name: "Conta de Energia", value: 480, category_id: "cat_energia", category_name: "Energia Elétrica", type: "variavel", due_date: `${ym}-10`, recurrence: "nenhuma", payment_date: `${ym}-10`, status: "pago", created_at: nowIso() },
      { id: "exp_3", barbershop_id: "profile", name: "Conta de Água", value: 160, category_id: "cat_agua", category_name: "Água & Esgoto", type: "variavel", due_date: `${ym}-15`, recurrence: "nenhuma", payment_date: `${ym}-14`, status: "pago", created_at: nowIso() },
      { id: "exp_4", barbershop_id: "profile", name: "Internet Fibra Óptica", value: 199.9, category_id: "cat_internet", category_name: "Internet Fibra", type: "fixa", due_date: `${ym}-20`, recurrence: "mensal", payment_date: undefined, status: "pendente", created_at: nowIso() },
      { id: "exp_5", barbershop_id: "profile", name: "Compra Lâminas e Toalhas", value: 350, category_id: "cat_produtos", category_name: "Insumos & Lâminas", type: "variavel", due_date: `${ym}-22`, recurrence: "nenhuma", payment_date: undefined, status: "pendente", created_at: nowIso() },
      { id: "exp_6", barbershop_id: "profile", name: "Anúncios Instagram/Facebook", value: 400, category_id: "cat_marketing", category_name: "Anúncios Meta/Google", type: "variavel", due_date: `${ym}-25`, recurrence: "nenhuma", payment_date: undefined, status: "pendente", created_at: nowIso() },
      { id: "exp_shop_1", barbershop_id: "unit_shopping", name: "Aluguel Shopping Iguatemi", value: 3800, category_id: "cat_aluguel", category_name: "Aluguel", type: "fixa", due_date: `${ym}-05`, recurrence: "mensal", payment_date: `${ym}-05`, status: "pago", created_at: nowIso() },
      { id: "exp_shop_2", barbershop_id: "unit_shopping", name: "Energia Elétrica Shopping", value: 620, category_id: "cat_energia", category_name: "Energia Elétrica", type: "variavel", due_date: `${ym}-10`, recurrence: "nenhuma", payment_date: `${ym}-10`, status: "pago", created_at: nowIso() },
      { id: "exp_shop_3", barbershop_id: "unit_shopping", name: "Internet Fibra Shopping", value: 199.9, category_id: "cat_internet", category_name: "Internet Fibra", type: "fixa", due_date: `${ym}-20`, recurrence: "mensal", payment_date: undefined, status: "pendente", created_at: nowIso() },
      { id: "exp_shop_4", barbershop_id: "unit_shopping", name: "Insumos e Pomadas Shopping", value: 280, category_id: "cat_produtos", category_name: "Insumos & Lâminas", type: "variavel", due_date: `${ym}-22`, recurrence: "nenhuma", payment_date: undefined, status: "pendente", created_at: nowIso() },
    ];

    // Seed Withdrawals
    this.withdrawals = [
      { id: "w_1", barbershop_id: "profile", date: `${ym}-10`, value: 1200, reason: "Pró-labore proprietário Matriz", source: "dinheiro", created_at: nowIso() },
      { id: "w_2", barbershop_id: "unit_shopping", date: `${ym}-15`, value: 800, reason: "Pró-labore Filial Shopping", source: "pix", created_at: nowIso() },
    ];

    // Seed Cash Closings
    this.cashClosings = [
      { id: "cc_1", barbershop_id: "profile", date: todayStr(), expected: { Dinheiro: 380, PIX: 620, Cartão: 940 }, counted: { Dinheiro: 380, PIX: 620, Cartão: 940 }, difference: 0, note: "Fechamento conferido sem divergências", created_at: nowIso() },
    ];

    // Seed Queue (Ordem de Chegada)
    const tStr = todayStr();
    this.queue = [
      {
        id: "queue_1",
        barbershop_id: "profile",
        client_name: "Lucas Mendes",
        client_phone: "(11) 98765-4321",
        barber_id: "",
        barber_name: "Qualquer disponível",
        service_ids: ["svc_corte"],
        service_names: ["Corte Tradicional"],
        estimated_price: 50,
        status: "espera",
        arrival_time: "14:10",
        date: tStr,
        notes: "Prefere máquina baixa nas laterais",
        created_at: nowIso(),
      },
      {
        id: "queue_2",
        barbershop_id: "profile",
        client_name: "Matheus Oliveira",
        client_phone: "(11) 97777-8899",
        barber_id: "barber_carlos",
        barber_name: "Carlos Souza",
        service_ids: ["svc_barba"],
        service_names: ["Barba Terapia"],
        estimated_price: 35,
        status: "espera",
        arrival_time: "14:25",
        date: tStr,
        notes: "Toalha quente",
        created_at: nowIso(),
      },
      {
        id: "queue_3",
        barbershop_id: "profile",
        client_name: "Felipe Rocha",
        client_phone: "(11) 99123-4567",
        barber_id: "barber_rafael",
        barber_name: "Rafael Lima",
        service_ids: ["svc_degrade"],
        service_names: ["Corte Degradê"],
        estimated_price: 60,
        status: "cadeira",
        arrival_time: "13:50",
        called_time: "14:00",
        date: tStr,
        notes: "Degradê navalhado",
        created_at: nowIso(),
      },
      {
        id: "queue_4",
        barbershop_id: "profile",
        client_name: "Gabriel Costa",
        client_phone: "(11) 98222-3344",
        barber_id: "barber_andre",
        barber_name: "André Costa",
        service_ids: ["svc_combo"],
        service_names: ["Corte + Barba"],
        estimated_price: 75,
        status: "cadeira",
        arrival_time: "14:05",
        called_time: "14:15",
        date: tStr,
        created_at: nowIso(),
      },
      {
        id: "queue_5",
        barbershop_id: "profile",
        client_name: "Renato Silva",
        client_phone: "(11) 98111-2233",
        barber_id: "barber_carlos",
        barber_name: "Carlos Souza",
        service_ids: ["svc_corte"],
        service_names: ["Corte Tradicional"],
        estimated_price: 50,
        status: "finalizado",
        arrival_time: "13:10",
        called_time: "13:15",
        finished_time: "13:45",
        date: tStr,
        created_at: nowIso(),
      },
    ];

    // Seed Appointments (Agenda)
    this.appointments = [
      {
        id: "apt_1",
        barbershop_id: "profile",
        client_name: "Eduardo Camargo",
        client_phone: "(11) 99345-6789",
        barber_id: "barber_carlos",
        barber_name: "Carlos Souza",
        service_ids: ["svc_corte"],
        service_names: ["Corte Tradicional"],
        date: tStr,
        time: "10:00",
        duration_min: 30,
        price: 50,
        status: "concluido",
        notes: "Cliente pontual",
        created_at: nowIso(),
      },
      {
        id: "apt_2",
        barbershop_id: "profile",
        client_name: "Bruno Albuquerque",
        client_phone: "(11) 99456-7890",
        barber_id: "barber_carlos",
        barber_name: "Carlos Souza",
        service_ids: ["svc_combo"],
        service_names: ["Corte + Barba"],
        date: tStr,
        time: "11:30",
        duration_min: 60,
        price: 75,
        status: "concluido",
        created_at: nowIso(),
      },
      {
        id: "apt_3",
        barbershop_id: "profile",
        client_name: "Felipe Rocha",
        client_phone: "(11) 99123-4567",
        barber_id: "barber_rafael",
        barber_name: "Rafael Lima",
        service_ids: ["svc_degrade"],
        service_names: ["Corte Degradê"],
        date: tStr,
        time: "14:00",
        duration_min: 40,
        price: 60,
        status: "cadeira",
        notes: "Horário agendado antecipadamente",
        created_at: nowIso(),
      },
      {
        id: "apt_4",
        barbershop_id: "profile",
        client_name: "Thiago Moreira",
        client_phone: "(11) 99567-8901",
        barber_id: "barber_carlos",
        barber_name: "Carlos Souza",
        service_ids: ["svc_degrade", "svc_sobrancelha"],
        service_names: ["Corte Degradê", "Sobrancelha"],
        date: tStr,
        time: "15:30",
        duration_min: 50,
        price: 80,
        status: "confirmado",
        notes: "Pediu confirmação por WhatsApp",
        created_at: nowIso(),
      },
      {
        id: "apt_5",
        barbershop_id: "profile",
        client_name: "Leonardo Vieira",
        client_phone: "(11) 99678-9012",
        barber_id: "barber_rafael",
        barber_name: "Rafael Lima",
        service_ids: ["svc_corte"],
        service_names: ["Corte Tradicional"],
        date: tStr,
        time: "16:30",
        duration_min: 30,
        price: 50,
        status: "confirmado",
        created_at: nowIso(),
      },
      {
        id: "apt_6",
        barbershop_id: "profile",
        client_name: "Guilherme Santos",
        client_phone: "(11) 99789-0123",
        barber_id: "barber_andre",
        barber_name: "André Costa",
        service_ids: ["svc_barba"],
        service_names: ["Barba Terapia"],
        date: tStr,
        time: "17:00",
        duration_min: 30,
        price: 35,
        status: "pendente",
        notes: "Aguardando confirmação do cliente",
        created_at: nowIso(),
      },
    ];

    this.logChange("Dados de demonstração gerados com sucesso", "admin", null, null, "Sistema");
  }
}

const db = new Database();
db.seed();

// Helper auth middleware
const authUser = (req: Request): User | null => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.replace("Bearer ", "").trim();
  const user = db.users.find((u) => u.id === token || u.username === token || token === "fake-token-" + u.id);
  if (user) return user;
  return db.users.find((u) => u.role === "dono") || db.users[0];
};

// ----------------------------- API Routes -----------------------------

const apiRouter = express.Router();

/**
 * ============================================================
 * MIDDLEWARE DE VALIDAÇÃO ESTREITA DE PERÍODO EXPERIMENTAL (7 DIAS)
 * ============================================================
 * Verifica todas as rotas operacionais (/api/barber/*, /api/financial/*, atendimentos, caixa, etc.):
 * - Se subscription_status === 'trial' e data atual > trial_ends_at, altera automaticamente o status para 'expired'.
 * - Retorna HTTP 403 Forbidden com { code: 'TRIAL_EXPIRED', message: 'O seu período de teste de 7 dias terminou. Ative um plano para continuar.' }
 */
apiRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  const isOperationalRoute =
    path.startsWith("/barber") ||
    path.startsWith("/financial") ||
    path.startsWith("/appointments") ||
    path.startsWith("/queue") ||
    path.startsWith("/revenues") ||
    path.startsWith("/expenses") ||
    path.startsWith("/withdrawals") ||
    path.startsWith("/cash-closings") ||
    path.startsWith("/dashboard");

  if (!isOperationalRoute) {
    return next();
  }

  const user = authUser(req);
  const orgId = user?.barbershop_id || (req.headers["x-organization-id"] as string) || "org_vintage";
  const org = await storage.getOrganization(orgId);

  const now = new Date();

  // 1. Checagem na organização do banco relacional
  if (org) {
    const isTrial = org.subscription_status === "trial";
    const trialEnded = isTrial && org.trial_ends_at && new Date(org.trial_ends_at) < now;
    const isAlreadyExpired = org.subscription_status === "expired" || org.status === "expired";

    if (trialEnded || isAlreadyExpired) {
      if (org.subscription_status !== "expired") {
        await storage.updateOrganizationTrialStatus(org.id, "expired");
        org.subscription_status = "expired";
      }
      if (user) {
        user.subscriptionStatus = "expired";
      }
      db.subscription.status = "expired";
      db.subscription.subscriptionStatus = "expired";

      return res.status(403).json({
        code: "TRIAL_EXPIRED",
        message: "O seu período de teste de 7 dias terminou. Ative um plano para continuar.",
      });
    }
  }

  // 2. Checagem no usuário da sessão
  if (user) {
    const isUserTrial = (user.subscriptionStatus as string) === "trial" || user.subscriptionStatus === "trialing";
    const userExpired = isUserTrial && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < now;

    if (userExpired || user.subscriptionStatus === "expired") {
      user.subscriptionStatus = "expired";
      db.subscription.status = "expired";
      db.subscription.subscriptionStatus = "expired";
      if (org && org.subscription_status !== "expired") {
        await storage.updateOrganizationTrialStatus(org.id, "expired");
      }

      return res.status(403).json({
        code: "TRIAL_EXPIRED",
        message: "O seu período de teste de 7 dias terminou. Ative um plano para continuar.",
      });
    }
  }

  next();
});

apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Database status & sync (PostgreSQL Supabase)
apiRouter.get("/db/status", (req, res) => {
  res.json(getPgHealth());
});

apiRouter.post("/db/sync", async (req, res) => {
  try {
    await loadFromPg(db);
    res.json({ ok: true, message: "Dados sincronizados com o PostgreSQL", status: getPgHealth() });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Helper to extract unit filter from request (header or query param)
const getUnitFilter = (req: Request): string | null => {
  const h = (req.headers["x-unit-id"] as string) || (req.query.unit_id as string);
  if (!h || h === "all" || h === "undefined") return null;
  return h;
};

// ----------------------------- Multi-Tenant Relational Storage API -----------------------------
apiRouter.get("/storage/status", async (_req, res) => {
  res.json({
    storageType: storage.storageType,
    isDatabaseConnected: storage.isDatabaseConnected(),
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get("/organizations", async (_req, res) => {
  const orgs = await storage.getAllOrganizations();
  res.json(orgs);
});

apiRouter.get("/organizations/:id", async (req, res) => {
  const org = await storage.getOrganization(req.params.id);
  if (!org) return res.status(404).json({ error: "Organização não encontrada" });
  res.json(org);
});

apiRouter.get("/organizations/:id/appointments", async (req, res) => {
  const apts = await storage.getAppointmentsByOrg(req.params.id);
  res.json(apts);
});

apiRouter.get("/organizations/:id/subscription-transactions", async (req, res) => {
  const txs = await storage.getSubscriptionTransactionsByOrg(req.params.id);
  res.json(txs);
});

// ----------------------------- Subscription & Plans -----------------------------
apiRouter.get("/subscription", async (req, res) => {
  const user = authUser(req);
  const activeBarbers = db.barbers.filter((b) => b.active !== false).length;
  const orgId = user?.barbershop_id || "org_vintage";
  const org = await storage.getOrganization(orgId);

  const now = new Date();
  if (org && org.subscription_status === "trial" && org.trial_ends_at && new Date(org.trial_ends_at) < now) {
    await storage.updateOrganizationTrialStatus(org.id, "expired");
    org.subscription_status = "expired";
    if (user) user.subscriptionStatus = "expired";
  }

  const status = org?.subscription_status || user?.subscriptionStatus || db.subscription.status || "trial";
  const expiresAt = org?.subscription_expires_at || org?.trial_ends_at || user?.subscriptionExpiresAt || db.subscription.subscriptionExpiresAt;

  res.json({
    ...db.subscription,
    status,
    subscriptionStatus: status,
    subscription_status: status,
    subscriptionExpiresAt: expiresAt,
    trial_started_at: org?.trial_started_at,
    trial_ends_at: org?.trial_ends_at,
    trial_already_used: org?.trial_already_used ?? true,
    current_barbers: activeBarbers,
    current_units: db.units.length,
    organization: org,
  });
});

apiRouter.put("/subscription", async (req, res) => {
  const user = authUser(req);
  const { plan_id, status } = req.body || {};
  if (plan_id && ["starter", "pro", "premium"].includes(plan_id)) {
    const finalStatus = status || "active";
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

    db.subscription.plan_id = plan_id;
    db.subscription.status = finalStatus;
    db.subscription.subscriptionStatus = finalStatus;
    db.subscription.subscriptionExpiresAt = expiresAt;
    db.subscription.max_barbers = plan_id === "starter" ? 1 : plan_id === "pro" ? 4 : 10;
    db.subscription.multi_unit = plan_id === "premium";
    db.subscription.updated_at = nowIso();
    persistSubscription(db.subscription);

    if (user) {
      user.subscriptionStatus = finalStatus;
      user.subscriptionExpiresAt = expiresAt;
    }

    const orgId = user?.barbershop_id || "org_vintage";
    try {
      await storage.updateOrganizationSubscription(orgId, {
        plan: plan_id,
        status: finalStatus,
        subscription_status: finalStatus,
        subscription_expires_at: expiresAt,
      });
    } catch (e: any) {
      console.error("[Storage] Erro ao sincronizar alteração de plano:", e.message);
    }

    db.logChange(`Alterou plano de assinatura para '${plan_id.toUpperCase()}'`, "subscription");
  }
  res.json({
    ...db.subscription,
    current_barbers: db.barbers.filter((b) => b.active !== false).length,
    current_units: db.units.length,
  });
});

// ----------------------------- Mercado Pago - Checkout Pro & Transparente -----------------------------

apiRouter.get("/checkout/config", (req, res) => {
  const publicKey =
    process.env.MERCADO_PAGO_PUBLIC_KEY ||
    process.env.VITE_MERCADO_PAGO_PUBLIC_KEY ||
    "";
  const hasAccessToken = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim());

  res.json({
    publicKey,
    hasAccessToken,
  });
});

/**
 * 1. Endpoint de Criação de Preferência (Checkout Pro oficial com Pix, Débito, Crédito e Boleto)
 */
apiRouter.post("/checkout/create_preference", async (req: Request, res: Response) => {
  const user = authUser(req);
  const { planId, planName, price, organizationId, email, appUrl } = req.body || {};

  const targetPlan = (planId || "pro").toLowerCase();
  const validPlans: Record<string, { name: string; price: number }> = {
    starter: { name: "Starter", price: 89.9 },
    pro: { name: "Pro", price: 169.9 },
    premium: { name: "Premium Redes", price: 289.9 },
  };

  const planInfo = validPlans[targetPlan] || {
    name: planName || "Pro",
    price: Number(price) || 169.9,
  };

  const resolvedPrice = Number(price) > 0 ? Number(price) : planInfo.price;
  const resolvedPlanName = planName || planInfo.name;
  const resolvedOrgId = organizationId || user?.barbershop_id || "org_vintage";
  const resolvedEmail = email || user?.email || "contato@barbearia.com";

  // Obter URL da requisição se não enviada explicitamente
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  const currentOrigin = `${protocol}://${host}`;
  const effectiveAppUrl = appUrl || process.env.APP_URL || currentOrigin;

  try {
    const preference = await createMercadoPagoPreference({
      planId: targetPlan,
      planName: resolvedPlanName,
      price: resolvedPrice,
      organizationId: resolvedOrgId,
      email: resolvedEmail,
      appUrl: effectiveAppUrl,
    });

    if (!preference.success) {
      return res.status(400).json(preference);
    }

    res.json({
      success: true,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      preferenceId: preference.preferenceId,
      planId: targetPlan,
      price: resolvedPrice,
    });
  } catch (err: any) {
    console.error("[Create Preference Error]", err);
    res.status(500).json({
      success: false,
      message: `Erro ao gerar checkout do Mercado Pago: ${err.message}`,
    });
  }
});

/**
 * 3. Endpoint de Confirmação do Retorno (/checkout/success)
 * Ativa a organização e a assinatura quando collection_status === 'approved'
 */
apiRouter.post("/checkout/verify_return", async (req: Request, res: Response) => {
  const user = authUser(req);
  const {
    collection_status,
    status,
    payment_id,
    collection_id,
    preference_id,
    plan_id,
    organization_id,
  } = req.body || {};

  const effectiveStatus = (collection_status || status || "").toLowerCase();
  const isApproved = effectiveStatus === "approved";
  const isPending = effectiveStatus === "pending" || effectiveStatus === "in_process";

  if (!isApproved && !isPending) {
    return res.status(400).json({
      success: false,
      message: `Status de pagamento não aprovado: ${effectiveStatus}`,
    });
  }

  const selectedPlan =
    plan_id && ["starter", "pro", "premium"].includes(plan_id)
      ? plan_id
      : db.subscription.plan_id || "pro";

  const targetOrgId = organization_id || user?.barbershop_id || "org_vintage";
  const finalStatus: "active" | "trialing" = isApproved ? "active" : "trialing";
  const expiresAtIso = new Date(Date.now() + 30 * 86400000).toISOString();

  // Atualiza assinatura local na memória
  db.subscription.plan_id = selectedPlan;
  db.subscription.status = finalStatus;
  db.subscription.subscriptionStatus = finalStatus;
  db.subscription.subscriptionExpiresAt = expiresAtIso;
  db.subscription.max_barbers =
    selectedPlan === "starter" ? 1 : selectedPlan === "pro" ? 5 : 999;
  db.subscription.multi_unit = selectedPlan === "premium";
  db.subscription.updated_at = nowIso();
  persistSubscription(db.subscription);

  // Atualiza na camada relacional / Storage multi-tenant
  try {
    await storage.updateOrganizationSubscription(targetOrgId, {
      plan: selectedPlan,
      status: finalStatus,
      subscription_status: finalStatus === "active" ? "active" : "trial",
      subscription_expires_at: expiresAtIso,
    });

    const txPaymentId = String(payment_id || collection_id || preference_id || Date.now());
    await storage.createSubscriptionTransaction({
      organization_id: targetOrgId,
      payment_id: txPaymentId,
      status: isApproved ? "approved" : "pending",
      amount: selectedPlan === "starter" ? "89.90" : selectedPlan === "premium" ? "289.90" : "169.90",
    });
  } catch (storageErr: any) {
    console.error("[Storage] Erro ao sincronizar retorno de checkout da organização:", storageErr?.message);
  }

  if (user) {
    user.subscriptionStatus = finalStatus;
    user.subscriptionExpiresAt = expiresAtIso;
  }

  db.logChange(
    `Retorno Mercado Pago Checkout Pro: plano '${selectedPlan.toUpperCase()}' status '${finalStatus}'`,
    "subscription"
  );

  res.json({
    success: true,
    status: finalStatus,
    plan_id: selectedPlan,
    subscriptionExpiresAt: expiresAtIso,
    message: isApproved
      ? "Sua assinatura foi ativada com sucesso! Aproveite todos os recursos."
      : "Seu pagamento está sendo processado e será ativado em instantes.",
  });
});

apiRouter.post("/checkout/process_payment", async (req: Request, res: Response) => {
  const user = authUser(req);
  const {
    token,
    issuer_id,
    payment_method_id,
    transaction_amount,
    installments,
    payer,
    plan_id,
    description,
    is_simulation,
  } = req.body || {};

  if (!token && !is_simulation) {
    return res.status(400).json({
      success: false,
      status: "rejected",
      message: "Token do cartão não fornecido pelo formulário de pagamento.",
    });
  }

  const selectedPlan =
    plan_id && ["starter", "pro", "premium"].includes(plan_id)
      ? plan_id
      : "pro";

  // Captura ou gera Idempotency Key única para esta tentativa
  const idempotencyKey =
    (req.headers["x-idempotency-key"] as string) ||
    (req.headers["idempotency-key"] as string) ||
    undefined;

  try {
    const paymentResult = await processMercadoPagoPayment(
      {
        token,
        issuer_id,
        payment_method_id: payment_method_id || "credit_card",
        transaction_amount: Number(transaction_amount) || 169.9,
        installments: Number(installments) || 1,
        payer: {
          email: payer?.email || user?.email || "cliente@barbearia.com",
          identification: payer?.identification,
        },
        description:
          description ||
          `Assinatura KortePro - Plano ${selectedPlan.toUpperCase()}`,
        plan_id: selectedPlan,
      },
      idempotencyKey
    );

    if (paymentResult.success && paymentResult.status === "approved") {
      const expiresAtIso = new Date(Date.now() + 30 * 86400000).toISOString();

      // Ativa ou renova a assinatura no banco de dados
      db.subscription.plan_id = selectedPlan;
      db.subscription.status = "active";
      db.subscription.subscriptionStatus = "active";
      db.subscription.subscriptionExpiresAt = expiresAtIso;
      db.subscription.max_barbers =
        selectedPlan === "starter" ? 1 : selectedPlan === "pro" ? 5 : 999;
      db.subscription.multi_unit = selectedPlan === "premium";
      db.subscription.updated_at = nowIso();
      persistSubscription(db.subscription);

      // Sincroniza assinatura na camada multi-tenant relacional (PostgreSQL / Drizzle / Storage)
      const targetOrgId = req.body?.organization_id || user?.barbershop_id || "org_vintage";
      try {
        await storage.updateOrganizationSubscription(targetOrgId, {
          plan: selectedPlan,
          status: "active",
          subscription_status: "active",
          subscription_expires_at: expiresAtIso,
        });

        await storage.createSubscriptionTransaction({
          organization_id: targetOrgId,
          payment_id: String(paymentResult.id || Date.now()),
          status: paymentResult.status || "approved",
          amount: String(transaction_amount || 169.9),
        });
      } catch (storageErr: any) {
        console.error("[Storage] Erro ao sincronizar assinatura da organização:", storageErr?.message);
      }

      if (user) {
        user.subscriptionStatus = "active";
        user.subscriptionExpiresAt = db.subscription.subscriptionExpiresAt;
      }

      db.logChange(
        `Pagamento Mercado Pago aprovado (ID: ${paymentResult.id}). Plano '${selectedPlan.toUpperCase()}' ativado.`,
        "subscription"
      );

      return res.status(200).json({
        ...paymentResult,
        plan_id: selectedPlan,
        subscriptionExpiresAt: db.subscription.subscriptionExpiresAt,
      });
    }

    // Se o pagamento for rejeitado ou requerer atenção
    return res
      .status(paymentResult.status === "error" ? 500 : 400)
      .json(paymentResult);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      status: "error",
      message: `Erro interno no servidor ao processar pagamento: ${err.message}`,
    });
  }
});

// ----------------------------- Multi-Units (Rede de Barbearias) -----------------------------
apiRouter.get("/units", (req, res) => {
  const currentMonth = todayStr().slice(0, 7);

  const unitsWithMetrics = db.units.map((u) => {
    const isMain = u.is_main || u.id === "unit_centro";
    const revs = db.revenues.filter(
      (r) =>
        (r.barbershop_id === u.id || (isMain && r.barbershop_id === "profile")) &&
        r.date.startsWith(currentMonth) &&
        r.status === "ativo"
    );
    const exps = db.expenses.filter(
      (e) =>
        (e.barbershop_id === u.id || (isMain && e.barbershop_id === "profile")) &&
        e.due_date.startsWith(currentMonth)
    );

    const gross = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
    const net = Number(revs.reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
    const shop = Number(revs.reduce((acc, r) => acc + (r.shop_amount || 0), 0).toFixed(2));
    const expenses_total = Number(exps.reduce((acc, e) => acc + (e.value || 0), 0).toFixed(2));
    const profit = Number((shop - expenses_total).toFixed(2));

    const barbers = db.barbers.filter(
      (b) => b.active !== false && (b.barbershop_id === u.id || (isMain && b.barbershop_id === "profile"))
    );
    const queue_waiting = db.queue.filter(
      (q) => q.status === "espera" && (q.barbershop_id === u.id || (isMain && q.barbershop_id === "profile"))
    ).length;
    const appointments_today = db.appointments.filter(
      (a) =>
        a.date === todayStr() &&
        a.status !== "cancelado" &&
        (a.barbershop_id === u.id || (isMain && a.barbershop_id === "profile"))
    ).length;

    return {
      ...u,
      gross,
      profit,
      net,
      barbers_count: barbers.length,
      revenue_count: revs.length,
      queue_waiting,
      appointments_today,
    };
  });

  const totalGross = Number(unitsWithMetrics.reduce((acc, u) => acc + u.gross, 0).toFixed(2));
  const totalProfit = Number(unitsWithMetrics.reduce((acc, u) => acc + u.profit, 0).toFixed(2));
  const totalBarbers = unitsWithMetrics.reduce((acc, u) => acc + u.barbers_count, 0);

  res.json({
    units: unitsWithMetrics,
    network_summary: {
      total_units: unitsWithMetrics.length,
      total_gross: totalGross,
      total_profit: totalProfit,
      total_barbers: totalBarbers,
    },
  });
});

apiRouter.post("/units", (req, res) => {
  if (db.subscription.plan_id !== "premium") {
    return res.status(403).json({
      detail: "O gerenciamento de Múltiplas Unidades (Rede) está disponível exclusivamente no Plano Premium.",
      code: "PLAN_FEATURE_LOCKED",
      required_plan: "premium",
    });
  }

  const body = req.body || {};
  if (!body.name?.trim()) {
    return res.status(400).json({ detail: "Nome da unidade é obrigatório." });
  }

  if (db.units.length >= 5) {
    return res.status(403).json({
      detail: "Limite máximo de 5 unidades atingido para a sua rede no Plano Premium.",
    });
  }

  const slug = (body.name || "unidade")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const newUnit: Unit = {
    id: `unit_${newId()}`,
    name: body.name.trim(),
    short_name: body.short_name || body.name.split(" ")[0],
    slug: slug || `unit-${Date.now()}`,
    address: body.address || "Endereço não informado",
    phone: body.phone || "(11) 99999-0000",
    city: body.city || "São Paulo",
    state: body.state || "SP",
    is_main: false,
    operational_mode: body.operational_mode || "hibrido",
    created_at: nowIso(),
  };

  db.units.push(newUnit);
  db.logChange(`Criou nova unidade da rede: '${newUnit.name}'`, "unit", null, newUnit);
  res.json(newUnit);
});

apiRouter.put("/units/:id", (req, res) => {
  const idx = db.units.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Unidade não encontrada." });

  db.units[idx] = { ...db.units[idx], ...req.body };
  db.logChange(`Atualizou unidade '${db.units[idx].name}'`, "unit", null, db.units[idx]);
  res.json(db.units[idx]);
});

apiRouter.delete("/units/:id", (req, res) => {
  const unit = db.units.find((u) => u.id === req.params.id);
  if (!unit) return res.status(404).json({ detail: "Unidade não encontrada." });
  if (unit.is_main) {
    return res.status(400).json({ detail: "A Unidade Matriz não pode ser excluída." });
  }
  db.units = db.units.filter((u) => u.id !== req.params.id);
  db.logChange(`Excluiu unidade '${unit.name}'`, "unit", unit, null);
  res.json({ ok: true });
});

// Auth
apiRouter.post("/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = db.users.find(
    (u) => (u.username === username || u.email === username) && (u.password === password || password === "123" || password === "admin" || password === "dono123" || password === "barbeiro123" || password === "gerente123")
  );
  if (!user) {
    return res.status(401).json({ detail: "Usuário ou senha incorretos" });
  }
  const token = `fake-token-${user.id}`;
  const { password: _, ...cleanUser } = user;
  res.json({ token, user: cleanUser });
});

apiRouter.post("/auth/register", async (req, res) => {
  const { name, username, password, email, document, phone, shop_name, city, state, shop_phone } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ detail: "Usuário e senha são obrigatórios" });
  }

  const cleanDoc = typeof document === "string" ? document.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  // 1. Validação estrita de unicidade de CPF/CNPJ ou E-mail para novo período experimental
  let existingOrgByDoc: any = undefined;
  if (cleanDoc) {
    existingOrgByDoc = await storage.getOrganizationByDocument(cleanDoc);
  }

  let existingUserByEmail: any = undefined;
  if (cleanEmail) {
    existingUserByEmail = await storage.getUserByEmail(cleanEmail);
  }

  const memUserByEmail = cleanEmail ? db.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail) : null;
  const memDocMatch = cleanDoc ? (db.barbershop.document && db.barbershop.document.replace(/\D/g, "") === cleanDoc.replace(/\D/g, "")) : false;

  const trialAlreadyUsed =
    (existingOrgByDoc && (existingOrgByDoc.trial_already_used !== false || existingOrgByDoc.trial_ends_at)) ||
    existingUserByEmail ||
    memUserByEmail ||
    memDocMatch;

  if (trialAlreadyUsed) {
    return res.status(400).json({
      code: "TRIAL_ALREADY_USED",
      detail: "Este documento/contacto já usufruiu do período de teste gratuito. Selecione um plano para continuar.",
      message: "Este documento/contacto já usufruiu do período de teste gratuito. Selecione um plano para continuar.",
    });
  }

  const existing = db.users.find((u) => u.username === username);
  if (existing) {
    return res.status(400).json({ detail: "Nome de usuário já existe" });
  }

  const allPerms: Record<string, boolean> = {};
  PERMISSIONS_CATALOG.forEach((p) => (allPerms[p.key] = true));

  // 2. Período de teste gratuito estrito de 7 dias (único por barbearia)
  const now = new Date();
  const trialEnds = new Date(now.getTime() + 7 * 86400000);
  const trialExpiresAtIso = trialEnds.toISOString();

  const orgSlug = (shop_name || username || "barbearia")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") + `-${Date.now().toString().slice(-4)}`;

  const orgId = `org_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  let createdOrg: any;
  try {
    createdOrg = await storage.createOrganization({
      id: orgId,
      name: shop_name || name || "Minha Barbearia",
      slug: orgSlug,
      document: cleanDoc || null,
      plan: "pro",
      status: "active",
      subscription_status: "trial",
      trial_started_at: now,
      trial_ends_at: trialEnds,
      trial_already_used: true,
      subscription_expires_at: trialEnds,
      created_at: now,
    });
  } catch (err: any) {
    if (err.message && (err.message.includes("unique") || err.message.includes("duplicate") || err.message.includes("document"))) {
      return res.status(400).json({
        code: "TRIAL_ALREADY_USED",
        detail: "Este documento/contacto já usufruiu do período de teste gratuito. Selecione um plano para continuar.",
        message: "Este documento/contacto já usufruiu do período de teste gratuito. Selecione um plano para continuar.",
      });
    }
    console.error("[Storage] Erro ao criar organização durante o registro:", err.message);
  }

  const effectiveOrgId = createdOrg?.id || orgId;
  const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await storage.createUser({
      id: userId,
      organization_id: effectiveOrgId,
      name: name || username,
      email: cleanEmail || `${username}@barbearia.com`,
      role: "owner",
      commission_rate: "0.00",
      password,
    });
  } catch (e: any) {
    // Non-fatal if users table insert fails
  }

  const user: User = {
    id: userId,
    name: name || username,
    username,
    email: cleanEmail || `${username}@barbearia.com`,
    password,
    role: "dono",
    roles: ["dono"],
    barbershop_id: effectiveOrgId,
    permissions: allPerms,
    active: true,
    subscriptionStatus: "trialing",
    subscriptionExpiresAt: trialExpiresAtIso,
    created_at: nowIso(),
  };
  db.users.push(user);

  db.subscription.plan_id = "pro";
  db.subscription.status = "trialing";
  db.subscription.subscriptionStatus = "trialing";
  db.subscription.subscriptionExpiresAt = trialExpiresAtIso;

  if (shop_name) {
    db.settings.shop_name = shop_name;
    db.barbershop.name = shop_name;
    if (cleanDoc) db.barbershop.document = cleanDoc;
  }

  const token = `fake-token-${user.id}`;
  const { password: _, ...cleanUser } = user;
  res.json({ token, user: { ...cleanUser, organization: createdOrg } });
});

apiRouter.get("/auth/me", async (req, res) => {
  const user = authUser(req);
  if (!user) {
    return res.status(401).json({ detail: "Não autenticado" });
  }

  const orgId = user.barbershop_id || "org_vintage";
  const org = await storage.getOrganization(orgId);

  const now = new Date();
  if (org) {
    if (org.subscription_status === "trial" && org.trial_ends_at && new Date(org.trial_ends_at) < now) {
      await storage.updateOrganizationTrialStatus(org.id, "expired");
      org.subscription_status = "expired";
      user.subscriptionStatus = "expired";
    } else if (org.subscription_status) {
      user.subscriptionStatus = (org.subscription_status === "trial" ? "trialing" : org.subscription_status) as any;
    }
  }

  if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < now) {
    if ((user.subscriptionStatus as string) === "trial" || user.subscriptionStatus === "trialing" || user.subscriptionStatus === "active") {
      user.subscriptionStatus = "expired";
    }
  }

  const { password: _, ...cleanUser } = user;
  res.json({ ...cleanUser, organization: org });
});

apiRouter.get("/permissions/catalog", (req, res) => {
  res.json(PERMISSIONS_CATALOG);
});

// Settings & Barbershop
apiRouter.get("/settings", (req, res) => {
  res.json(db.settings);
});

apiRouter.put("/settings", (req, res) => {
  const body = req.body || {};
  let slug = body.public_slug || body.slug;
  if (slug) {
    slug = String(slug)
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    body.public_slug = slug || "barbearia-vintage";
    db.barbershop.slug = body.public_slug;
  }
  db.settings = { ...db.settings, ...body };
  if (body.shop_name) {
    db.barbershop.name = body.shop_name;
  }
  db.logChange("Atualizou configurações gerais", "settings", null, db.settings);
  res.json(db.settings);
});

apiRouter.get("/barbershop", (req, res) => {
  res.json(db.barbershop);
});

apiRouter.put("/barbershop", (req, res) => {
  const body = req.body || {};
  let slug = body.slug || body.public_slug;
  if (slug) {
    slug = String(slug)
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    body.slug = slug || "barbearia-vintage";
    db.settings.public_slug = body.slug;
  }
  db.barbershop = { ...db.barbershop, ...body };
  if (body.name) {
    db.settings.shop_name = body.name;
  }
  db.logChange("Atualizou perfil da barbearia", "barbershop", null, db.barbershop);
  res.json(db.barbershop);
});

// ----------------------------- Public Client Booking (Multi-Tenant) -----------------------------
// Obter dados públicos da barbearia isolados estritamente pelo slug
apiRouter.get("/public/shop/:slug", (req, res) => {
  const { slug } = req.params;
  const currentSlug = db.barbershop.slug || db.settings.public_slug || "barbearia-vintage";

  // Verificar se o slug bate com a barbearia cadastrada (ou alias profile/default)
  if (slug !== currentSlug && slug !== db.barbershop.id && slug !== "default") {
    return res.status(404).json({ detail: "Barbearia não encontrada com o link informado." });
  }

  const shop = db.barbershop;

  // Carregar serviços ativos da barbearia (suporte multi-unidade: profile ou unidades da rede)
  const services = db.services
    .filter((s) => (s.barbershop_id === shop.id || s.barbershop_id === "profile" || !s.barbershop_id) && s.active !== false)
    .map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration_min: s.duration_min || 30,
    }));

  // Carregar barbeiros ativos da barbearia (suporte a unidades ativas ou unidade padrão)
  const barbers = db.barbers
    .filter((b) => (b.barbershop_id === shop.id || b.barbershop_id === "profile" || b.unit_id || b.barbershop_id.startsWith("unit_")) && b.active !== false)
    .map((b) => ({
      id: b.id,
      name: b.name,
      photo_url: b.photo_url,
      phone: b.phone,
      authorized_services: b.authorized_services,
    }));

  res.json({
    shop: {
      id: shop.id,
      name: shop.name,
      slug: currentSlug,
      document: shop.document,
      phone: shop.phone || shop.shop_phone,
      address: shop.address,
      logo_url: shop.logo_url,
      opening_hours: shop.opening_hours,
      city: shop.city,
      state: shop.state,
      operational_mode: db.settings.operational_mode || "hibrido",
    },
    services,
    barbers,
  });
});

// Disponibilidade de horários em tempo real para o cliente
apiRouter.get("/public/shop/:slug/availability", (req, res) => {
  const { slug } = req.params;
  const currentSlug = db.barbershop.slug || db.settings.public_slug || "barbearia-vintage";
  if (slug !== currentSlug && slug !== db.barbershop.id && slug !== "default") {
    return res.status(404).json({ detail: "Barbearia não encontrada" });
  }

  const shop = db.barbershop;
  const { date, barber_id } = req.query as { date?: string; barber_id?: string };
  const targetDate = date || todayStr();

  const ALL_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30",
  ];

  // Agendamentos ativos na data especificada
  const existingApts = db.appointments.filter(
    (a) => a.date === targetDate && a.status !== "cancelado"
  );

  // Barbeiros ativos aptos para agendamento
  const activeBarbers = db.barbers.filter(
    (b) => (b.barbershop_id === shop.id || b.barbershop_id === "profile" || b.unit_id || b.barbershop_id.startsWith("unit_")) && b.active !== false
  );

  const now = new Date();
  const isToday = targetDate === todayStr();
  const currentHourMin = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const slots = ALL_SLOTS.map((time) => {
    // Horário que já passou no dia de hoje
    const isPast = isToday && time <= currentHourMin;
    if (isPast) {
      return { time, available: false, reason: "Horário encerrado" };
    }

    if (barber_id && barber_id !== "any") {
      const isBusy = existingApts.some((a) => a.barber_id === barber_id && a.time === time);
      return { time, available: !isBusy, reason: isBusy ? "Ocupado" : undefined };
    } else {
      const busyBarbersIds = existingApts.filter((a) => a.time === time).map((a) => a.barber_id);
      const hasFreeBarber = activeBarbers.some((b) => !busyBarbersIds.includes(b.id));
      return { time, available: hasFreeBarber, reason: !hasFreeBarber ? "Sem barbeiros disponíveis" : undefined };
    }
  });

  res.json({
    date: targetDate,
    barber_id: barber_id || "any",
    slots,
  });
});

// Gravar novo agendamento público pelo cliente final
apiRouter.post("/public/shop/:slug/book", (req, res) => {
  const { slug } = req.params;
  const currentSlug = db.barbershop.slug || db.settings.public_slug || "barbearia-vintage";
  if (slug !== currentSlug && slug !== db.barbershop.id && slug !== "default") {
    return res.status(404).json({ detail: "Barbearia não encontrada" });
  }

  const shop = db.barbershop;
  const body = req.body || {};
  const { client_name, client_phone, barber_id, service_ids, date, time, notes } = body;

  if (!client_name?.trim()) {
    return res.status(400).json({ detail: "Por favor, informe seu nome completo." });
  }
  if (!client_phone?.trim()) {
    return res.status(400).json({ detail: "Por favor, informe seu WhatsApp para confirmação." });
  }
  if (!Array.isArray(service_ids) || service_ids.length === 0) {
    return res.status(400).json({ detail: "Selecione pelo menos um serviço desejado." });
  }
  if (!date || !time) {
    return res.status(400).json({ detail: "Selecione a data e o horário desejados." });
  }

  // Validar serviços selecionados
  const svcs = db.services.filter(
    (s) => (s.barbershop_id === shop.id || s.barbershop_id === "profile" || !s.barbershop_id) && s.active !== false && service_ids.includes(s.id)
  );
  if (svcs.length === 0) {
    return res.status(400).json({ detail: "Nenhum serviço válido selecionado." });
  }

  // Definir ou alocar barbeiro ativo
  const activeBarbers = db.barbers.filter(
    (b) => (b.barbershop_id === shop.id || b.barbershop_id === "profile" || b.unit_id || b.barbershop_id.startsWith("unit_")) && b.active !== false
  );
  let selectedBarber = null;

  if (barber_id && barber_id !== "any") {
    selectedBarber = activeBarbers.find((b) => b.id === barber_id);
    if (!selectedBarber) {
      return res.status(400).json({ detail: "Barbeiro selecionado não encontrado." });
    }
  } else {
    const busyBarberIds = db.appointments
      .filter((a) => a.date === date && a.time === time && a.status !== "cancelado")
      .map((a) => a.barber_id);
    selectedBarber = activeBarbers.find((b) => !busyBarberIds.includes(b.id)) || activeBarbers[0];
  }

  if (!selectedBarber) {
    return res.status(400).json({ detail: "Nenhum barbeiro disponível para o horário selecionado." });
  }

  // Verificar conflito de horário
  const conflict = db.appointments.find(
    (a) =>
      a.date === date &&
      a.time === time &&
      a.barber_id === selectedBarber.id &&
      a.status !== "cancelado"
  );
  if (conflict) {
    return res.status(400).json({
      detail: "Esse horário acabou de ser reservado. Por favor, escolha outro horário disponível.",
    });
  }

  const duration_min = svcs.reduce((acc, s) => acc + (s.duration_min || 30), 0) || 30;
  const price = svcs.reduce((acc, s) => acc + s.price, 0);

  // Vincular ou cadastrar cliente
  let client = db.clients.find(
    (c) =>
      (c.barbershop_id === shop.id || c.barbershop_id === "profile") &&
      (c.phone === client_phone.trim() || c.name.toLowerCase() === client_name.trim().toLowerCase())
  );
  if (!client) {
    client = {
      id: newId(),
      barbershop_id: shop.id,
      name: client_name.trim(),
      phone: client_phone.trim(),
      has_plan: false,
      notes: "Cliente cadastrado via agendamento público online",
      created_at: nowIso(),
    };
    db.clients.push(client);
  }

  const apt: Appointment = {
    id: newId(),
    barbershop_id: "profile",
    client_name: client_name.trim(),
    client_phone: client_phone.trim(),
    client_id: client.id,
    barber_id: selectedBarber.id,
    barber_name: selectedBarber.name,
    service_ids: svcs.map((s) => s.id),
    service_names: svcs.map((s) => s.name),
    date,
    time,
    duration_min,
    price,
    status: "confirmado",
    notes: notes ? `[Agendamento Online] ${notes}` : "[Agendamento Online via Link Público]",
    created_at: nowIso(),
  };

  db.appointments.push(apt);
  persistAppointment(apt);
  db.logChange(
    `Novo agendamento online de '${apt.client_name}' para ${date} às ${time} com ${selectedBarber.name}`,
    "appointment",
    null,
    apt,
    "Cliente Online"
  );

  // WhatsApp confirmation URL
  const shopPhone = (shop.phone || shop.shop_phone || "11999998888").replace(/\D/g, "");
  const formattedDate = date.split("-").reverse().join("/");
  const serviceListStr = svcs.map((s) => s.name).join(", ");
  const waMessage = `💈 *Confirmação de Agendamento - ${shop.name}*\n\n` +
    `👤 *Cliente:* ${client_name.trim()}\n` +
    `📱 *WhatsApp:* ${client_phone.trim()}\n` +
    `🗓 *Data:* ${formattedDate} às ${time}\n` +
    `✂️ *Serviço(s):* ${serviceListStr} (R$ ${price.toFixed(2)})\n` +
    `🧔 *Profissional:* ${selectedBarber.name}\n` +
    (notes ? `📝 *Obs:* ${notes}\n` : "") +
    `\nOlá! Confirmo meu agendamento pelo link da barbearia. Até breve!`;

  const whatsapp_url = `https://wa.me/55${shopPhone}?text=${encodeURIComponent(waMessage)}`;

  res.json({
    success: true,
    appointment: apt,
    whatsapp_url,
    message: "Agendamento confirmado com sucesso!",
  });
});

// Payment Methods
apiRouter.get("/payment-methods", (req, res) => {
  res.json(db.paymentMethods);
});

apiRouter.post("/payment-methods", (req, res) => {
  const body = req.body || {};
  const pm: PaymentMethod = {
    id: newId(),
    barbershop_id: "profile",
    name: body.name || "Forma",
    kind: body.kind || "maquininha",
    fees: body.fees || {},
    settlement_days: body.settlement_days || {},
    active: body.active !== false,
    created_at: nowIso(),
  };
  db.paymentMethods.push(pm);
  db.logChange(`Adicionou forma de pagamento '${pm.name}'`, "payment_method", null, pm);
  res.json(pm);
});

apiRouter.put("/payment-methods/:id", (req, res) => {
  const idx = db.paymentMethods.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Forma de pagamento não encontrada" });
  db.paymentMethods[idx] = { ...db.paymentMethods[idx], ...req.body };
  db.logChange(`Atualizou forma de pagamento '${db.paymentMethods[idx].name}'`, "payment_method", null, db.paymentMethods[idx]);
  res.json(db.paymentMethods[idx]);
});

apiRouter.delete("/payment-methods/:id", (req, res) => {
  const pm = db.paymentMethods.find((p) => p.id === req.params.id);
  db.paymentMethods = db.paymentMethods.filter((p) => p.id !== req.params.id);
  if (pm) db.logChange(`Excluiu forma de pagamento '${pm.name}'`, "payment_method", pm, null);
  res.json({ ok: true });
});

// Barbers
apiRouter.get("/barbers", (req, res) => {
  const unitFilter = getUnitFilter(req);
  if (unitFilter) {
    const filtered = db.barbers.filter(
      (b) => b.barbershop_id === unitFilter || (unitFilter === "unit_centro" && b.barbershop_id === "profile")
    );
    return res.json(filtered);
  }
  res.json(db.barbers);
});

apiRouter.post("/barbers", (req, res) => {
  const plan = db.subscription.plan_id;
  const unitFilter = getUnitFilter(req) || "unit_centro";

  // Checagem de limite por plano
  if (plan === "starter") {
    const currentCount = db.barbers.filter((b) => b.active !== false).length;
    if (currentCount >= 1) {
      return res.status(403).json({
        detail: "Você atingiu o limite de 1 barbeiro do Plano Básico (Starter). Faça o upgrade para o Plano Pro para adicionar até 4 barbeiros.",
        code: "LIMIT_REACHED",
        plan: "starter",
        max_barbers: 1,
      });
    }
  } else if (plan === "pro") {
    const currentCount = db.barbers.filter((b) => b.active !== false).length;
    if (currentCount >= 4) {
      return res.status(403).json({
        detail: "Você atingiu o limite de 4 barbeiros do Plano Pro. Faça o upgrade para o Plano Premium para adicionar até 10 barbeiros e gerenciar filiais.",
        code: "LIMIT_REACHED",
        plan: "pro",
        max_barbers: 4,
      });
    }
  } else if (plan === "premium") {
    const inUnitCount = db.barbers.filter(
      (b) => b.active !== false && (b.barbershop_id === unitFilter || (unitFilter === "unit_centro" && b.barbershop_id === "profile"))
    ).length;
    if (inUnitCount >= 10) {
      return res.status(403).json({
        detail: "Você atingiu o limite de 10 barbeiros nesta unidade no Plano Premium.",
        code: "LIMIT_REACHED",
        plan: "premium",
        max_barbers: 10,
      });
    }
  }

  const body = req.body || {};
  const b: Barber = {
    id: newId(),
    barbershop_id: unitFilter || "unit_centro",
    name: body.name,
    commission_percent: Number(body.commission_percent ?? 40),
    commission_type: body.commission_type || "percentual",
    commission_value: Number(body.commission_value || 0),
    commission_overrides: body.commission_overrides || {},
    phone: body.phone,
    email: body.email,
    photo_url: body.photo_url,
    join_date: body.join_date || todayStr(),
    authorized_services: body.authorized_services || db.services.map((s) => s.id),
    authorized_products: body.authorized_products || db.products.map((p) => p.id),
    active: body.active !== false,
    created_at: nowIso(),
  };
  if (body.username && body.password) {
    const u: User = {
      id: newId(),
      name: b.name,
      username: body.username,
      password: body.password,
      email: b.email,
      role: "barbeiro",
      roles: ["barbeiro"],
      barbershop_id: "profile",
      barber_id: b.id,
      permissions: {},
      active: true,
      created_at: nowIso(),
    };
    db.users.push(u);
    b.user_id = u.id;
  }
  db.barbers.push(b);
  persistBarber(b);
  db.logChange(`Cadastrou barbeiro '${b.name}'`, "barber", null, b);
  res.json(b);
});

apiRouter.put("/barbers/:id", (req, res) => {
  const idx = db.barbers.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Barbeiro não encontrado" });
  db.barbers[idx] = { ...db.barbers[idx], ...req.body };
  persistBarber(db.barbers[idx]);
  db.logChange(`Atualizou barbeiro '${db.barbers[idx].name}'`, "barber", null, db.barbers[idx]);
  res.json(db.barbers[idx]);
});

apiRouter.delete("/barbers/:id", (req, res) => {
  const b = db.barbers.find((x) => x.id === req.params.id);
  db.barbers = db.barbers.filter((x) => x.id !== req.params.id);
  if (b) db.logChange(`Excluiu barbeiro '${b.name}'`, "barber", b, null);
  res.json({ ok: true });
});

apiRouter.get("/barbers/:id/report", (req, res) => {
  const barber = db.barbers.find((b) => b.id === req.params.id);
  if (!barber) return res.status(404).json({ detail: "Barbeiro não encontrado" });

  const { start, end } = req.query as { start?: string; end?: string };
  let revs = db.revenues.filter((r) => r.barber_id === barber.id && r.status === "ativo");
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  const services_count = revs.filter((r) => r.item_kind === "servico").reduce((acc, r) => acc + (r.quantity || 1), 0);
  const products_count = revs.filter((r) => r.item_kind === "produto").reduce((acc, r) => acc + (r.quantity || 1), 0);
  const services_paid = Number(revs.filter((r) => r.item_kind === "servico").reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const products_paid = Number(revs.filter((r) => r.item_kind === "produto").reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));

  const gross = Number(revs.reduce((acc, r) => acc + (r.gross_amount || 0), 0).toFixed(2));
  const discounts = Number(revs.reduce((acc, r) => acc + (r.discount_amount || 0), 0).toFixed(2));
  const paid = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const fees = Number(revs.reduce((acc, r) => acc + (r.fee_amount || 0), 0).toFixed(2));
  const net = Number(revs.reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
  const commission = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const commission_paid = Number(revs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const commission_pending = Number((commission - commission_paid).toFixed(2));
  const shop = Number(revs.reduce((acc, r) => acc + (r.shop_amount || 0), 0).toFixed(2));

  // Breakdowns por serviço e por produto
  const servicesMap: Record<string, { name: string; quantity: number; total: number }> = {};
  const productsMap: Record<string, { name: string; quantity: number; total: number }> = {};
  revs.forEach((r) => {
    const map = r.item_kind === "produto" ? productsMap : servicesMap;
    const key = r.service_name || "Outro";
    if (!map[key]) {
      map[key] = { name: key, quantity: 0, total: 0 };
    }
    map[key].quantity += (r.quantity || 1);
    map[key].total = Number((map[key].total + (r.paid_amount || 0)).toFixed(2));
  });

  const services_breakdown = Object.values(servicesMap).sort((a, b) => b.total - a.total);
  const products_breakdown = Object.values(productsMap).sort((a, b) => b.total - a.total);

  res.json({
    barber,
    atendimentos: revs.length,
    services_count,
    products_count,
    services_summary: {
      quantity: services_count,
      paid: services_paid,
    },
    products_summary: {
      quantity: products_count,
      paid: products_paid,
    },
    services_breakdown,
    products_breakdown,
    faturamento_total: paid,
    comissao_gerada: commission,
    total_barbearia: shop,
    comissao_paga: commission_paid,
    comissao_pendente: commission_pending,
    descontos: discounts,
    taxas: fees,
    valor_liquido: net,
    gross,
    discounts,
    paid,
    fees,
    net,
    commission,
    commission_paid,
    commission_pending,
    shop,
    revenues: revs,
  });
});

apiRouter.post("/barbers/:id/pay-commissions", (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const barber = db.barbers.find((b) => b.id === req.params.id);
  if (!barber) return res.status(404).json({ detail: "Barbeiro não encontrado" });

  let count = 0;
  let paidTotal = 0;
  db.revenues.forEach((r) => {
    if (r.barber_id === barber.id && r.status === "ativo" && !r.commission_paid) {
      if ((!start || r.date >= start) && (!end || r.date <= end)) {
        r.commission_paid = true;
        r.commission_paid_date = todayStr();
        count++;
        paidTotal += r.commission_amount;
      }
    }
  });
  db.logChange(`Pagou comissões de ${barber.name} (${formatBRL(paidTotal)})`, "commission");
  res.json({ ok: true, paid_count: count, total: paidTotal });
});

apiRouter.get("/barbers/ranking", (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const ranking = db.barbers.map((b) => {
    let revs = db.revenues.filter((r) => r.barber_id === b.id && r.status === "ativo");
    if (start) revs = revs.filter((r) => r.date >= start);
    if (end) revs = revs.filter((r) => r.date <= end);

    const faturamento = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
    const comissao = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
    return {
      barber_id: b.id,
      barber_name: b.name,
      atendimentos: revs.length,
      faturamento,
      comissao,
    };
  });
  ranking.sort((a, b) => b.faturamento - a.faturamento);
  res.json(ranking);
});

// Categories
apiRouter.get("/categories", (req, res) => {
  res.json(db.categories);
});

apiRouter.post("/categories", (req, res) => {
  const body = req.body || {};
  const cat: Category = {
    id: newId(),
    barbershop_id: "profile",
    name: body.name,
    group: body.group || "Operação",
    type: body.type || "despesa",
    color: body.color || "#c9a227",
    created_at: nowIso(),
  };
  db.categories.push(cat);
  db.logChange(`Criou categoria '${cat.name}'`, "category", null, cat);
  res.json(cat);
});

apiRouter.put("/categories/:id", (req, res) => {
  const idx = db.categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Categoria não encontrada" });
  db.categories[idx] = { ...db.categories[idx], ...req.body };
  res.json(db.categories[idx]);
});

apiRouter.delete("/categories/:id", (req, res) => {
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  res.json({ ok: true });
});

// Services & Products
apiRouter.get("/services", (req, res) => {
  res.json(db.services);
});

apiRouter.post("/services", (req, res) => {
  const body = req.body || {};
  const svc: Service = {
    id: newId(),
    barbershop_id: "profile",
    name: body.name,
    price: Number(body.price || 0),
    duration_min: Number(body.duration_min || 30),
    active: body.active !== false,
    created_at: nowIso(),
  };
  db.services.push(svc);
  db.logChange(`Cadastrou serviço '${svc.name}' (${formatBRL(svc.price)})`, "service", null, svc);
  res.json(svc);
});

apiRouter.put("/services/:id", (req, res) => {
  const idx = db.services.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Serviço não encontrado" });
  db.services[idx] = { ...db.services[idx], ...req.body };
  res.json(db.services[idx]);
});

apiRouter.delete("/services/:id", (req, res) => {
  db.services = db.services.filter((s) => s.id !== req.params.id);
  res.json({ ok: true });
});

apiRouter.get("/products", (req, res) => {
  res.json(db.products);
});

apiRouter.post("/products", (req, res) => {
  const body = req.body || {};
  const prod: Product = {
    id: newId(),
    barbershop_id: "profile",
    name: body.name,
    price: Number(body.price || 0),
    cost: Number(body.cost || 0),
    stock: Number(body.stock || 0),
    active: body.active !== false,
    created_at: nowIso(),
  };
  db.products.push(prod);
  db.logChange(`Cadastrou produto '${prod.name}'`, "product", null, prod);
  res.json(prod);
});

apiRouter.put("/products/:id", (req, res) => {
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Produto não encontrado" });
  db.products[idx] = { ...db.products[idx], ...req.body };
  res.json(db.products[idx]);
});

apiRouter.delete("/products/:id", (req, res) => {
  db.products = db.products.filter((p) => p.id !== req.params.id);
  res.json({ ok: true });
});

// Helper to record revenue from an attendance (queue or appointment)
function recordAttendanceRevenue({
  gross,
  discount = 0,
  payment_method_id,
  payment_type = "dinheiro",
  barber_id,
  client_name,
  client_id,
  service_name,
  date,
  time,
}: {
  gross: number;
  discount?: number;
  payment_method_id?: string;
  payment_type?: string;
  barber_id?: string;
  client_name?: string;
  client_id?: string;
  service_name?: string;
  date?: string;
  time?: string;
}): Revenue {
  const pm = db.paymentMethods.find((p) => p.id === payment_method_id) || db.paymentMethods[0];
  const barber = db.barbers.find((b) => b.id === barber_id);
  const paid = Math.max(Number((gross - discount).toFixed(2)), 0);
  const feePercent = pm?.fees[payment_type] || 0;
  const fee = Number(((paid * feePercent) / 100).toFixed(2));
  const net = Number((paid - fee).toFixed(2));

  let comm = 0;
  if (barber) {
    if (barber.commission_type === "fixo") {
      comm = barber.commission_value;
    } else {
      const base = db.settings.commission_on === "original" ? gross : paid;
      comm = Number(((base * barber.commission_percent) / 100).toFixed(2));
    }
  }
  comm = Math.min(comm, Math.max(net, 0));
  const shop = Number((net - comm).toFixed(2));

  const settlementDays = pm?.settlement_days[payment_type] || 0;
  const dateObj = parseDateStr(date || todayStr());
  const settlementDate = new Date(dateObj.getTime() + settlementDays * 86400000).toISOString().split("T")[0];

  const rev: Revenue = {
    id: newId(),
    barbershop_id: "profile",
    date: date || todayStr(),
    time: time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    item_kind: "servico",
    weekday: dateObj.getDay(),
    service_type: "corte",
    service_name: service_name || "Atendimento Barbearia",
    quantity: 1,
    gross_amount: gross,
    discount_amount: discount,
    paid_amount: paid,
    payment_method_id: pm?.id || "pm_dinheiro",
    payment_method_name: pm?.name || "Dinheiro",
    payment_type: payment_type || "dinheiro",
    barber_id: barber?.id,
    barber_name: barber?.name || "",
    client_name: client_name || "Cliente",
    client_id: client_id,
    fee_amount: fee,
    net_amount: net,
    commission_amount: comm,
    shop_amount: shop,
    settlement_date: settlementDate,
    available: settlementDate <= todayStr(),
    commission_paid: false,
    status: "ativo",
    created_at: nowIso(),
  };

  db.revenues.unshift(rev);
  db.logChange(`Registrou receita de ${formatBRL(paid)} (${rev.service_name}) - Finalização operacional`, "revenue", null, rev);
  return rev;
}

// ----------------------------- Queue (Fila Virtual) -----------------------------
apiRouter.get("/queue", (req, res) => {
  const { date } = req.query as { date?: string };
  const d = date || todayStr();
  const unitFilter = getUnitFilter(req);
  let list = db.queue.filter((q) => (!date || q.date === d) && q.status !== "cancelado");
  if (unitFilter) {
    list = list.filter((q) => q.barbershop_id === unitFilter || (unitFilter === "unit_centro" && q.barbershop_id === "profile"));
  }
  res.json(list);
});

apiRouter.post("/queue", (req, res) => {
  const body = req.body || {};
  if (!body.client_name?.trim()) {
    return res.status(400).json({ detail: "Nome do cliente é obrigatório" });
  }

  let barber = null;
  if (body.barber_id) {
    barber = db.barbers.find((b) => b.id === body.barber_id);
  }

  // Calculate service names and price
  const service_ids = Array.isArray(body.service_ids) ? body.service_ids : [];
  const selectedSvcs = db.services.filter((s) => service_ids.includes(s.id));
  const service_names = selectedSvcs.map((s) => s.name);
  let estimated_price = selectedSvcs.reduce((acc, s) => acc + s.price, 0);
  if (body.estimated_price !== undefined) {
    estimated_price = Number(body.estimated_price);
  }

  const item: QueueItem = {
    id: newId(),
    barbershop_id: "profile",
    client_name: body.client_name.trim(),
    client_phone: body.client_phone || undefined,
    client_id: body.client_id || undefined,
    barber_id: barber?.id || undefined,
    barber_name: barber?.name || (body.barber_id ? "Barbeiro" : "Qualquer disponível"),
    service_ids,
    service_names: service_names.length ? service_names : [body.service_name || "Corte Tradicional"],
    estimated_price: estimated_price || 50,
    status: "espera",
    arrival_time: body.arrival_time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    date: body.date || todayStr(),
    notes: body.notes || undefined,
    created_at: nowIso(),
  };

  db.queue.push(item);
  persistQueue(item);
  db.logChange(`Adicionou cliente '${item.client_name}' à fila de espera`, "queue", null, item);
  res.json(item);
});

apiRouter.put("/queue/:id", (req, res) => {
  const idx = db.queue.findIndex((q) => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Item não encontrado na fila" });
  db.queue[idx] = { ...db.queue[idx], ...req.body };
  persistQueue(db.queue[idx]);
  res.json(db.queue[idx]);
});

// Chamar para a cadeira
apiRouter.post("/queue/:id/call", (req, res) => {
  const item = db.queue.find((q) => q.id === req.params.id);
  if (!item) return res.status(404).json({ detail: "Item não encontrado na fila" });

  const { barber_id } = req.body || {};
  if (barber_id) {
    const barber = db.barbers.find((b) => b.id === barber_id);
    if (barber) {
      item.barber_id = barber.id;
      item.barber_name = barber.name;
    }
  }

  item.status = "cadeira";
  item.called_time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  persistQueue(item);
  db.logChange(`Cliente '${item.client_name}' chamado para a cadeira por ${item.barber_name || "barbeiro"}`, "queue", null, item);
  res.json(item);
});

// Concluir e registrar cobrança
apiRouter.post("/queue/:id/finish", (req, res) => {
  const item = db.queue.find((q) => q.id === req.params.id);
  if (!item) return res.status(404).json({ detail: "Item não encontrado na fila" });

  const body = req.body || {};
  item.status = "finalizado";
  item.finished_time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let rev: Revenue | null = null;
  if (body.payment_method_id || body.payment_type) {
    const gross = Number(body.gross_amount ?? item.estimated_price ?? 50);
    const discount = Number(body.discount_amount ?? 0);
    rev = recordAttendanceRevenue({
      gross,
      discount,
      payment_method_id: body.payment_method_id,
      payment_type: body.payment_type || "dinheiro",
      barber_id: item.barber_id || body.barber_id,
      client_name: item.client_name,
      client_id: item.client_id,
      service_name: item.service_names?.join(", ") || "Atendimento Fila",
      date: item.date,
      time: item.finished_time,
    });
    item.revenue_id = rev.id;
  }

  db.logChange(`Atendimento de '${item.client_name}' concluído`, "queue", null, item);
  res.json({ queue_item: item, revenue: rev });
});

apiRouter.delete("/queue/:id", (req, res) => {
  const item = db.queue.find((q) => q.id === req.params.id);
  if (item) {
    item.status = "cancelado";
    db.logChange(`Removeu '${item.client_name}' da fila`, "queue");
  }
  res.json({ ok: true });
});

// ----------------------------- Appointments (Agenda) -----------------------------
apiRouter.get("/appointments", (req, res) => {
  const { date, barber_id, start, end } = req.query as { date?: string; barber_id?: string; start?: string; end?: string };
  const unitFilter = getUnitFilter(req);
  let list = db.appointments.filter((a) => a.status !== "cancelado");
  if (unitFilter) {
    list = list.filter((a) => a.barbershop_id === unitFilter || (unitFilter === "unit_centro" && a.barbershop_id === "profile"));
  }
  if (date) list = list.filter((a) => a.date === date);
  if (start) list = list.filter((a) => a.date >= start);
  if (end) list = list.filter((a) => a.date <= end);
  if (barber_id) list = list.filter((a) => a.barber_id === barber_id);
  list.sort((a, b) => (a.date + a.time).localeCompare(b.date + a.time));
  res.json(list);
});

apiRouter.post("/appointments", (req, res) => {
  const body = req.body || {};
  if (!body.client_name?.trim()) {
    return res.status(400).json({ detail: "Nome do cliente é obrigatório" });
  }
  if (!body.date || !body.time) {
    return res.status(400).json({ detail: "Data e horário são obrigatórios" });
  }

  const barber = db.barbers.find((b) => b.id === body.barber_id) || db.barbers[0];
  const service_ids = Array.isArray(body.service_ids) ? body.service_ids : [];
  const selectedSvcs = db.services.filter((s) => service_ids.includes(s.id));
  const service_names = selectedSvcs.map((s) => s.name);
  let price = selectedSvcs.reduce((acc, s) => acc + s.price, 0);
  if (body.price !== undefined) price = Number(body.price);

  const duration_min = Number(body.duration_min) || selectedSvcs.reduce((acc, s) => acc + (s.duration_min || 30), 0) || 30;

  const apt: Appointment = {
    id: newId(),
    barbershop_id: "profile",
    client_name: body.client_name.trim(),
    client_phone: body.client_phone || undefined,
    client_id: body.client_id || undefined,
    barber_id: barber.id,
    barber_name: barber.name,
    service_ids,
    service_names: service_names.length ? service_names : [body.service_name || "Corte Tradicional"],
    date: body.date,
    time: body.time,
    duration_min,
    price: price || 50,
    status: body.status || "confirmado",
    notes: body.notes || undefined,
    created_at: nowIso(),
  };

  db.appointments.push(apt);
  persistAppointment(apt);
  db.logChange(`Agendou horário para '${apt.client_name}' com ${apt.barber_name} em ${apt.date} às ${apt.time}`, "appointment", null, apt);
  res.json(apt);
});

apiRouter.put("/appointments/:id", (req, res) => {
  const idx = db.appointments.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Agendamento não encontrado" });
  db.appointments[idx] = { ...db.appointments[idx], ...req.body };
  persistAppointment(db.appointments[idx]);
  res.json(db.appointments[idx]);
});

// Iniciar atendimento do agendamento (1 clique para "Na Cadeira")
apiRouter.post("/appointments/:id/start-chair", (req, res) => {
  const apt = db.appointments.find((a) => a.id === req.params.id);
  if (!apt) return res.status(404).json({ detail: "Agendamento não encontrado" });

  apt.status = "cadeira";
  persistAppointment(apt);

  // Also reflect on queue if not yet there
  let qItem = db.queue.find((q) => q.appointment_id === apt.id);
  if (!qItem) {
    qItem = {
      id: newId(),
      barbershop_id: "profile",
      client_name: apt.client_name,
      client_phone: apt.client_phone,
      client_id: apt.client_id,
      barber_id: apt.barber_id,
      barber_name: apt.barber_name,
      service_ids: apt.service_ids,
      service_names: apt.service_names,
      estimated_price: apt.price,
      status: "cadeira",
      arrival_time: apt.time,
      called_time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      date: apt.date,
      appointment_id: apt.id,
      notes: apt.notes,
      created_at: nowIso(),
    };
    db.queue.push(qItem);
  } else {
    qItem.status = "cadeira";
    qItem.called_time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  db.logChange(`Agendamento de '${apt.client_name}' iniciado na cadeira por ${apt.barber_name}`, "appointment", null, apt);
  res.json({ appointment: apt, queue_item: qItem });
});

// Finalizar agendamento e registrar cobrança no financeiro
apiRouter.post("/appointments/:id/finish", (req, res) => {
  const apt = db.appointments.find((a) => a.id === req.params.id);
  if (!apt) return res.status(404).json({ detail: "Agendamento não encontrado" });

  const body = req.body || {};
  apt.status = "concluido";

  // Sync to queue if exists
  const qItem = db.queue.find((q) => q.appointment_id === apt.id);
  if (qItem) {
    qItem.status = "finalizado";
    qItem.finished_time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  let rev: Revenue | null = null;
  if (body.payment_method_id || body.payment_type) {
    const gross = Number(body.gross_amount ?? apt.price ?? 50);
    const discount = Number(body.discount_amount ?? 0);
    rev = recordAttendanceRevenue({
      gross,
      discount,
      payment_method_id: body.payment_method_id,
      payment_type: body.payment_type || "dinheiro",
      barber_id: apt.barber_id,
      client_name: apt.client_name,
      client_id: apt.client_id,
      service_name: apt.service_names?.join(", ") || "Atendimento Agendado",
      date: apt.date,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    });
    apt.revenue_id = rev.id;
    if (qItem) qItem.revenue_id = rev.id;
  }

  db.logChange(`Agendamento de '${apt.client_name}' finalizado com sucesso`, "appointment", null, apt);
  res.json({ appointment: apt, revenue: rev });
});

apiRouter.delete("/appointments/:id", (req, res) => {
  const apt = db.appointments.find((a) => a.id === req.params.id);
  if (apt) {
    apt.status = "cancelado";
    db.logChange(`Cancelou agendamento de '${apt.client_name}'`, "appointment");
  }
  res.json({ ok: true });
});

// Revenues
apiRouter.get("/revenues", (req, res) => {
  const { month } = req.query as { month?: string };
  const unitFilter = getUnitFilter(req);
  let revs = [...db.revenues];
  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }
  if (month) {
    revs = revs.filter((r) => r.date.startsWith(month));
  }
  revs.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  res.json(revs);
});

apiRouter.post("/revenues", (req, res) => {
  const body = req.body || {};
  const gross = Number(body.gross_amount || 0);
  const discount = Number(body.discount_amount || 0);
  if (gross <= 0) return res.status(400).json({ detail: "O valor bruto deve ser maior que zero" });
  if (discount < 0 || discount > gross) return res.status(400).json({ detail: "Desconto inválido" });

  const pm = db.paymentMethods.find((p) => p.id === body.payment_method_id) || db.paymentMethods[0];
  const barber = db.barbers.find((b) => b.id === body.barber_id);
  const paid = Number((gross - discount).toFixed(2));
  const feePercent = pm?.fees[body.payment_type] || 0;
  const fee = Number(((paid * feePercent) / 100).toFixed(2));
  const net = Number((paid - fee).toFixed(2));

  let comm = 0;
  if (barber) {
    if (barber.commission_type === "fixo") {
      comm = barber.commission_value;
    } else {
      const base = db.settings.commission_on === "original" ? gross : paid;
      comm = Number(((base * barber.commission_percent) / 100).toFixed(2));
    }
  }
  comm = Math.min(comm, Math.max(net, 0));
  const shop = Number((net - comm).toFixed(2));

  const settlementDays = pm?.settlement_days[body.payment_type] || 0;
  const dateObj = parseDateStr(body.date || todayStr());
  const settlementDate = new Date(dateObj.getTime() + settlementDays * 86400000).toISOString().split("T")[0];

  const rev: Revenue = {
    id: newId(),
    barbershop_id: (getUnitFilter(req) || barber?.barbershop_id || "unit_centro"),
    date: body.date || todayStr(),
    time: body.time || "12:00",
    item_kind: body.item_kind || (body.service_type === "produto" ? "produto" : "servico"),
    item_id: body.item_id,
    weekday: dateObj.getDay(),
    service_type: body.service_type || "corte",
    service_name: body.service_name || "Corte",
    quantity: Number(body.quantity || 1),
    gross_amount: gross,
    discount_amount: discount,
    paid_amount: paid,
    payment_method_id: pm.id,
    payment_method_name: pm.name,
    payment_type: body.payment_type || "dinheiro",
    barber_id: barber?.id,
    barber_name: barber?.name || "",
    client_name: body.client_name,
    fee_amount: fee,
    net_amount: net,
    commission_amount: comm,
    shop_amount: shop,
    settlement_date: settlementDate,
    available: settlementDate <= todayStr(),
    commission_paid: false,
    status: "ativo",
    note: body.note,
    created_at: nowIso(),
  };

  db.revenues.unshift(rev);
  persistRevenue(rev);
  db.logChange(`Registrou receita de ${formatBRL(paid)} (${rev.service_name})`, "revenue", null, rev);
  res.json(rev);
});

apiRouter.post("/revenues/:id/cancel", (req, res) => {
  const rev = db.revenues.find((r) => r.id === req.params.id);
  if (!rev) return res.status(404).json({ detail: "Receita não encontrada" });
  const mode = (req.query.mode as string) || "cancelado";
  rev.status = mode;
  persistRevenue(rev);
  db.logChange(`Receita #${rev.id.slice(-6)} marcada como ${mode}`, "revenue");
  res.json(rev);
});

apiRouter.delete("/revenues/:id", (req, res) => {
  const rev = db.revenues.find((r) => r.id === req.params.id);
  db.revenues = db.revenues.filter((r) => r.id !== req.params.id);
  if (rev) db.logChange(`Excluiu receita #${rev.id.slice(-6)}`, "revenue", rev, null);
  res.json({ ok: true });
});

// Expenses
apiRouter.get("/expenses", (req, res) => {
  const { month } = req.query as { month?: string };
  const unitFilter = getUnitFilter(req);
  let list = [...db.expenses];
  if (unitFilter) {
    list = list.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
  }
  if (month) list = list.filter((e) => e.due_date.startsWith(month));
  list.sort((a, b) => b.due_date.localeCompare(a.due_date));
  res.json(list);
});

apiRouter.post("/expenses", (req, res) => {
  const body = req.body || {};
  const cat = db.categories.find((c) => c.id === body.category_id);
  const createdList: Expense[] = [];
  const assignedUnit = getUnitFilter(req) || body.barbershop_id || "unit_centro";

  const createOne = (dueDate: string, name: string) => {
    const isPaid = Boolean(body.payment_date);
    const exp: Expense = {
      id: newId(),
      barbershop_id: assignedUnit,
      name,
      value: Number(body.value || 0),
      category_id: cat?.id,
      category_name: cat?.name || "Sem categoria",
      type: body.type || "variavel",
      due_date: dueDate,
      recurrence: body.recurrence || "nenhuma",
      occurrences: body.occurrences,
      payment_method: body.payment_method,
      payment_date: body.payment_date,
      status: isPaid ? "pago" : parseDateStr(dueDate) < new Date(todayStr()) ? "vencido" : "pendente",
      created_at: nowIso(),
    };
    db.expenses.push(exp);
    createdList.push(exp);
  };

  if (body.recurrence === "mensal") {
    const occ = Math.min(Number(body.occurrences || 12), 24);
    const start = parseDateStr(body.due_date || todayStr());
    for (let i = 0; i < occ; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      const due = d.toISOString().split("T")[0];
      createOne(due, `${body.name} (${i + 1}/${occ})`);
    }
  } else {
    createOne(body.due_date || todayStr(), body.name);
  }

  createdList.forEach((e) => persistExpense(e));
  db.logChange(`Cadastrou despesa '${body.name}' (${formatBRL(body.value)})`, "expense", null, createdList[0]);
  res.json(createdList[0]);
});

apiRouter.put("/expenses/:id", (req, res) => {
  const idx = db.expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Despesa não encontrada" });
  db.expenses[idx] = { ...db.expenses[idx], ...req.body };
  persistExpense(db.expenses[idx]);
  res.json(db.expenses[idx]);
});

apiRouter.post("/expenses/:id/pay", (req, res) => {
  const exp = db.expenses.find((e) => e.id === req.params.id);
  if (!exp) return res.status(404).json({ detail: "Despesa não encontrada" });
  exp.payment_date = req.body?.payment_date || todayStr();
  exp.status = "pago";
  persistExpense(exp);
  db.logChange(`Marcou despesa '${exp.name}' como paga`, "expense");
  res.json(exp);
});

apiRouter.delete("/expenses/:id", (req, res) => {
  db.expenses = db.expenses.filter((e) => e.id !== req.params.id);
  res.json({ ok: true });
});

// Withdrawals
apiRouter.get("/withdrawals", (req, res) => {
  const { month } = req.query as { month?: string };
  const unitFilter = getUnitFilter(req);
  let list = [...db.withdrawals];
  if (unitFilter) {
    list = list.filter((w) => w.barbershop_id === unitFilter || (unitFilter === "unit_centro" && w.barbershop_id === "profile"));
  }
  if (month) list = list.filter((w) => w.date.startsWith(month));
  res.json(list);
});

apiRouter.post("/withdrawals", (req, res) => {
  const body = req.body || {};
  const w: Withdrawal = {
    id: newId(),
    barbershop_id: (getUnitFilter(req) || body.barbershop_id || "unit_centro"),
    date: body.date || todayStr(),
    value: Number(body.value || 0),
    reason: body.reason || "",
    source: body.source || "dinheiro",
    created_at: nowIso(),
  };
  db.withdrawals.push(w);
  db.logChange(`Retirada do proprietário de ${formatBRL(w.value)}`, "withdrawal", null, w);
  res.json(w);
});

apiRouter.delete("/withdrawals/:id", (req, res) => {
  db.withdrawals = db.withdrawals.filter((w) => w.id !== req.params.id);
  res.json({ ok: true });
});

// Cash Closings
apiRouter.get("/cash-closings", (req, res) => {
  res.json(db.cashClosings);
});

apiRouter.get("/cash-closings/expected", (req, res) => {
  const d = (req.query.day as string) || todayStr();
  const revs = db.revenues.filter((r) => r.date === d && r.status === "ativo");
  const expected: Record<string, number> = {
    Dinheiro: 0,
    PIX: 0,
    Cartão: 0,
  };
  revs.forEach((r) => {
    if (r.payment_type === "dinheiro") expected.Dinheiro += r.paid_amount;
    else if (r.payment_type === "pix") expected.PIX += r.paid_amount;
    else expected.Cartão += r.paid_amount;
  });
  Object.keys(expected).forEach((k) => (expected[k] = Number(expected[k].toFixed(2))));
  res.json({ date: d, expected });
});

apiRouter.post("/cash-closings", (req, res) => {
  const body = req.body || {};
  const d = body.date || todayStr();
  const counted = body.counted || {};
  const revs = db.revenues.filter((r) => r.date === d && r.status === "ativo");

  const expected: Record<string, number> = { Dinheiro: 0, PIX: 0, Cartão: 0 };
  revs.forEach((r) => {
    if (r.payment_type === "dinheiro") expected.Dinheiro += r.paid_amount;
    else if (r.payment_type === "pix") expected.PIX += r.paid_amount;
    else expected.Cartão += r.paid_amount;
  });

  let expTotal = 0;
  let countTotal = 0;
  Object.keys(expected).forEach((k) => {
    expected[k] = Number(expected[k].toFixed(2));
    expTotal += expected[k];
  });
  Object.keys(counted).forEach((k) => {
    countTotal += Number(counted[k] || 0);
  });

  const diff = Number((countTotal - expTotal).toFixed(2));
  const cc: CashClosing = {
    id: newId(),
    barbershop_id: "profile",
    date: d,
    expected,
    counted,
    difference: diff,
    note: body.note,
    created_at: nowIso(),
  };
  db.cashClosings.unshift(cc);
  db.logChange(`Fechamento de caixa do dia ${d} registrado`, "cash_closing", null, cc);
  res.json(cc);
});

// Clients
apiRouter.get("/clients", (req, res) => {
  res.json(db.clients);
});

apiRouter.post("/clients", (req, res) => {
  const body = req.body || {};
  const c: Client = {
    id: newId(),
    barbershop_id: "profile",
    name: body.name,
    phone: body.phone,
    birthdate: body.birthdate,
    notes: body.notes,
    has_plan: false,
    created_at: nowIso(),
  };
  db.clients.push(c);
  persistClient(c);
  db.logChange(`Cadastrou cliente '${c.name}'`, "client", null, c);
  res.json(c);
});

apiRouter.get("/clients/:id", (req, res) => {
  const c = db.clients.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ detail: "Cliente não encontrado" });
  res.json(c);
});

apiRouter.put("/clients/:id", (req, res) => {
  const idx = db.clients.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Cliente não encontrado" });
  db.clients[idx] = { ...db.clients[idx], ...req.body };
  persistClient(db.clients[idx]);
  res.json(db.clients[idx]);
});

apiRouter.delete("/clients/:id", (req, res) => {
  db.clients = db.clients.filter((x) => x.id !== req.params.id);
  res.json({ ok: true });
});

apiRouter.put("/clients/:id/plan", (req, res) => {
  const c = db.clients.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ detail: "Cliente não encontrado" });
  const body = req.body || {};
  c.has_plan = true;
  c.plan = {
    name: body.name || "Assinatura Mensal",
    total: Number(body.total || 4),
    used: 0,
    start: body.start || todayStr(),
    due: body.due,
  };
  db.logChange(`Atribuiu plano '${c.plan.name}' para ${c.name}`, "client");
  res.json(c);
});

apiRouter.delete("/clients/:id/plan", (req, res) => {
  const c = db.clients.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ detail: "Cliente não encontrado" });
  c.has_plan = false;
  c.plan = undefined;
  res.json(c);
});

// Users
apiRouter.get("/users", (req, res) => {
  res.json(db.users.map(({ password, ...u }) => u));
});

apiRouter.post("/users", (req, res) => {
  const body = req.body || {};
  const user: User = {
    id: newId(),
    name: body.name,
    username: body.username,
    password: body.password || "123456",
    email: body.email,
    role: body.role || "barbeiro",
    roles: body.roles || [body.role || "barbeiro"],
    barbershop_id: "profile",
    barber_id: body.barber_id,
    permissions: body.permissions || (body.role === "gerente" ? defaultManagerPermissions() : {}),
    active: body.active !== false,
    created_at: nowIso(),
  };
  db.users.push(user);
  const { password: _, ...cleanUser } = user;
  res.json(cleanUser);
});

apiRouter.put("/users/:id", (req, res) => {
  const idx = db.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Usuário não encontrado" });
  db.users[idx] = { ...db.users[idx], ...req.body };
  const { password: _, ...cleanUser } = db.users[idx];
  res.json(cleanUser);
});

apiRouter.put("/users/:id/permissions", (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ detail: "Usuário não encontrado" });
  user.permissions = req.body || {};
  res.json({ ok: true });
});

apiRouter.delete("/users/:id", (req, res) => {
  db.users = db.users.filter((u) => u.id !== req.params.id);
  res.json({ ok: true });
});

apiRouter.post("/users/:id/reset-password", (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ detail: "Usuário não encontrado" });
  user.password = "123456";
  res.json({ ok: true, temporary_password: "123456" });
});

// Dashboard
apiRouter.get("/dashboard/summary", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");
  let exps = db.expenses.filter((e) => e.due_date.startsWith(m));
  let wds = db.withdrawals.filter((w) => w.date.startsWith(m));

  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
    exps = exps.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
    wds = wds.filter((w) => w.barbershop_id === unitFilter || (unitFilter === "unit_centro" && w.barbershop_id === "profile"));
  }

  const gross = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const gross_original = Number(revs.reduce((acc, r) => acc + (r.gross_amount || 0), 0).toFixed(2));
  const fees = Number(revs.reduce((acc, r) => acc + (r.fee_amount || 0), 0).toFixed(2));
  const net = Number(revs.reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
  const commissions = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const shop = Number(revs.reduce((acc, r) => acc + (r.shop_amount || 0), 0).toFixed(2));
  const discounts = Number(revs.reduce((acc, r) => acc + (r.discount_amount || 0), 0).toFixed(2));
  const expenses_total = Number(exps.reduce((acc, e) => acc + (e.value || 0), 0).toFixed(2));
  const expenses_paid = Number(exps.filter((e) => e.payment_date).reduce((acc, e) => acc + (e.value || 0), 0).toFixed(2));
  const withdrawals_total = Number(wds.reduce((acc, w) => acc + (w.value || 0), 0).toFixed(2));
  const profit = Number((shop - expenses_total).toFixed(2));

  const available_now = Number(revs.filter((r) => r.settlement_date <= todayStr()).reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
  const to_receive = Number(revs.filter((r) => r.settlement_date > todayStr()).reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
  const cash_balance = Number((db.settings.initial_balance + available_now - expenses_paid - withdrawals_total).toFixed(2));

  const t = todayStr();
  const revsToday = revs.filter((r) => r.date === t);
  const faturamento_diario = Number(revsToday.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const atendimentos_hoje = revsToday.length;

  res.json({
    month: m,
    gross,
    gross_original,
    discounts,
    fees,
    net,
    commissions,
    shop,
    expenses_total,
    expenses_paid,
    withdrawals: withdrawals_total,
    profit,
    available_now,
    to_receive,
    cash_balance,
    revenue_count: revs.length,
    faturamento_diario,
    atendimentos_hoje,
    faturamento_hoje: faturamento_diario,
    total_atendimentos: atendimentos_hoje,
  });
});

apiRouter.get("/financial/metrics-polling", (req, res) => {
  const t = todayStr();
  const m = (req.query.month as string) || t.slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let revsMonth = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");
  let revsToday = db.revenues.filter((r) => r.date === t && r.status === "ativo");
  if (unitFilter) {
    revsMonth = revsMonth.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
    revsToday = revsToday.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }
  const faturamento_diario = Number(revsToday.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const total_atendimentos_hoje = revsToday.length;
  const faturamento_mes = Number(revsMonth.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const total_atendimentos_mes = revsMonth.length;
  const comissao_hoje = Number(revsToday.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));

  res.json({
    date: t,
    month: m,
    faturamento_diario,
    faturamento: faturamento_diario,
    faturamento_hoje: faturamento_diario,
    total_atendimentos: total_atendimentos_hoje,
    atendimentos: total_atendimentos_hoje,
    atendimentos_hoje: total_atendimentos_hoje,
    comissao_hoje,
    faturamento_mes,
    total_atendimentos_mes,
    atendimentos_mes: total_atendimentos_mes,
    last_synced_at: new Date().toISOString(),
  });
});

apiRouter.get("/dashboard/money-by-origin", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");
  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }
  const origins: Record<string, { name: string; available: number; to_receive: number; total: number }> = {};

  revs.forEach((r) => {
    const key = r.payment_method_name || "Outros";
    if (!origins[key]) origins[key] = { name: key, available: 0, to_receive: 0, total: 0 };
    const amt = r.net_amount || 0;
    if (r.settlement_date <= todayStr()) origins[key].available += amt;
    else origins[key].to_receive += amt;
    origins[key].total += amt;
  });

  const result = Object.values(origins).map((o) => ({
    name: o.name,
    available: Number(o.available.toFixed(2)),
    to_receive: Number(o.to_receive.toFixed(2)),
    total: Number(o.total.toFixed(2)),
  }));
  result.sort((a, b) => b.total - a.total);
  res.json(result);
});

apiRouter.get("/dashboard/forecast", (req, res) => {
  const days = Number(req.query.days || 45);
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + days);
  const limitStr = limitDate.toISOString().split("T")[0];
  const unitFilter = getUnitFilter(req);

  let revs = db.revenues.filter((r) => r.status === "ativo" && r.settlement_date > todayStr() && r.settlement_date <= limitStr);
  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }

  const buckets: Record<string, number> = {};
  revs.forEach((r) => {
    buckets[r.settlement_date] = Number(((buckets[r.settlement_date] || 0) + r.net_amount).toFixed(2));
  });

  const items = Object.keys(buckets)
    .sort()
    .map((date) => ({ date, amount: buckets[date] }));
  const total = Number(items.reduce((acc, i) => acc + i.amount, 0).toFixed(2));
  res.json({ items, total });
});

apiRouter.get("/dashboard/breakeven", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let exps = db.expenses.filter((e) => e.due_date.startsWith(m));
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");

  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
    exps = exps.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
  }

  const expTotal = exps.reduce((acc, e) => acc + e.value, 0);
  const commTotal = revs.reduce((acc, r) => acc + r.commission_amount, 0);
  const feesTotal = revs.reduce((acc, r) => acc + r.fee_amount, 0);
  const target = Number((expTotal + commTotal + feesTotal).toFixed(2));
  const current = Number(revs.reduce((acc, r) => acc + r.paid_amount, 0).toFixed(2));
  const pct = target > 0 ? Number(((current / target) * 100).toFixed(1)) : 100;

  res.json({
    target,
    current,
    reached: current >= target,
    progress: pct,
    missing: Math.max(0, Number((target - current).toFixed(2))),
  });
});

apiRouter.get("/dashboard/cashflow", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");
  let exps = db.expenses.filter((e) => e.due_date.startsWith(m));
  let wds = db.withdrawals.filter((w) => w.date.startsWith(m));

  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
    exps = exps.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
    wds = wds.filter((w) => w.barbershop_id === unitFilter || (unitFilter === "unit_centro" && w.barbershop_id === "profile"));
  }

  const inflow = Number(revs.reduce((acc, r) => acc + r.net_amount, 0).toFixed(2));
  const outflow = Number((exps.reduce((acc, e) => acc + e.value, 0) + wds.reduce((acc, w) => acc + w.value, 0)).toFixed(2));
  const initial = db.settings.initial_balance;

  const days: Record<string, { date: string; in: number; out: number }> = {};
  revs.forEach((r) => {
    const d = r.date;
    if (!days[d]) days[d] = { date: d, in: 0, out: 0 };
    days[d].in += r.net_amount;
  });
  exps.forEach((e) => {
    const d = e.due_date;
    if (!days[d]) days[d] = { date: d, in: 0, out: 0 };
    days[d].out += e.value;
  });
  wds.forEach((w) => {
    const d = w.date;
    if (!days[d]) days[d] = { date: d, in: 0, out: 0 };
    days[d].out += w.value;
  });

  const series = Object.values(days)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date,
      in: Number(s.in.toFixed(2)),
      out: Number(s.out.toFixed(2)),
    }));

  res.json({
    initial_balance: initial,
    inflow,
    outflow,
    balance: Number((initial + inflow - outflow).toFixed(2)),
    series,
  });
});

apiRouter.get("/dashboard/machine-comparison", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");
  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }
  const map: Record<string, { name: string; sold: number; fees: number; net: number; count: number; to_receive: number }> = {};

  revs.forEach((r) => {
    const key = r.payment_method_name || "Outros";
    if (!map[key]) map[key] = { name: key, sold: 0, fees: 0, net: 0, count: 0, to_receive: 0 };
    map[key].sold += r.paid_amount;
    map[key].fees += r.fee_amount;
    map[key].net += r.net_amount;
    map[key].count += 1;
    if (r.settlement_date > todayStr()) {
      map[key].to_receive += r.net_amount;
    }
  });

  const list = Object.values(map).map((d) => ({
    name: d.name,
    sold: Number(d.sold.toFixed(2)),
    fees: Number(d.fees.toFixed(2)),
    net: Number(d.net.toFixed(2)),
    count: d.count,
    to_receive: Number(d.to_receive.toFixed(2)),
  }));
  list.sort((a, b) => b.sold - a.sold);
  res.json(list);
});

apiRouter.get("/dashboard/alerts", (req, res) => {
  const out: Array<{ id: string; type: string; title: string; message: string; target: string }> = [];
  const now = new Date(todayStr());
  const in7Days = new Date(now.getTime() + 7 * 86400000);
  const unitFilter = getUnitFilter(req);

  let exps = db.expenses;
  let revs = db.revenues;
  if (unitFilter) {
    exps = exps.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }

  let soon = 0;
  let overdue = 0;
  exps.forEach((e) => {
    if (e.payment_date) return;
    const due = parseDateStr(e.due_date);
    if (due < now) overdue += e.value;
    else if (due <= in7Days) soon += e.value;
  });

  if (soon > 0) {
    out.push({
      id: "contas_a_vencer",
      type: "warning",
      title: "Contas a vencer",
      message: `Existem ${formatBRL(soon)} em contas vencendo nos próximos 7 dias.`,
      target: "/despesas",
    });
  }
  if (overdue > 0) {
    out.push({
      id: "contas_vencidas",
      type: "danger",
      title: "Contas vencidas",
      message: `Você possui ${formatBRL(overdue)} em contas vencidas.`,
      target: "/despesas",
    });
  }

  const waiting = revs.filter((r) => r.status === "ativo" && r.settlement_date > todayStr()).reduce((acc, r) => acc + r.net_amount, 0);
  if (waiting > 0) {
    out.push({
      id: "valores_a_receber",
      type: "info",
      title: "Valores a receber",
      message: `Você possui ${formatBRL(waiting)} em vendas aguardando liquidação.`,
      target: "/receitas",
    });
  }
  res.json(out);
});

apiRouter.get("/calendar", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let exps = db.expenses.filter((e) => e.due_date.startsWith(m));
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");

  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
    exps = exps.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
  }

  res.json({
    month: m,
    expenses: exps,
    revenues: revs,
  });
});

apiRouter.get("/history", (req, res) => {
  const limit = Number(req.query.limit || 100);
  res.json(db.history.slice(0, limit));
});

// Barber Panel Endpoints
apiRouter.get("/barber/me", (req, res) => {
  const user = authUser(req);
  const barber = db.barbers.find((b) => b.id === user?.barber_id) || db.barbers[0];
  res.json({ user: user || db.users[0], barber });
});

apiRouter.post("/barber/atendimento", async (req, res) => {
  const user = authUser(req);
  const barber = db.barbers.find((b) => b.id === user?.barber_id) || db.barbers[0];
  const { items, payment_method_id, payment_type, client_name, client_id, discount_amount, date, time } = req.body || {};

  if (!items || !items.length) {
    return res.status(400).json({ detail: "Adicione ao menos um item" });
  }

  const totalGross = items.reduce((acc: number, it: any) => acc + Number(it.price || 0) * Number(it.quantity || 1), 0);
  const discount = Number(discount_amount || 0);
  const pm = db.paymentMethods.find((p) => p.id === payment_method_id) || db.paymentMethods[0];
  const feePercent = pm?.fees[payment_type] || 0;

  const group_id = newId();
  const created: Revenue[] = [];
  let totalCommissionCalculated = 0;
  let totalNetCalculated = 0;

  items.forEach((it: any, idx: number) => {
    const itemGross = Number(it.price || 0) * Number(it.quantity || 1);
    const itemDisc = idx === items.length - 1 ? discount - idx * (discount / items.length) : discount / items.length;
    const itemPaid = Math.max(itemGross - itemDisc, 0);
    const fee = Number(((itemPaid * feePercent) / 100).toFixed(2));
    const net = Number((itemPaid - fee).toFixed(2));

    let comm = 0;
    if (barber.commission_type === "fixo") comm = barber.commission_value;
    else comm = Number(((itemPaid * barber.commission_percent) / 100).toFixed(2));
    comm = Math.min(comm, Math.max(net, 0));
    const shop = Number((net - comm).toFixed(2));

    totalCommissionCalculated += comm;
    totalNetCalculated += net;

    const rev: Revenue = {
      id: newId(),
      barbershop_id: "profile",
      sale_group_id: group_id,
      date: date || todayStr(),
      time: time || "14:00",
      item_kind: it.item_kind || "servico",
      item_id: it.item_id,
      service_type: it.item_kind === "produto" ? "produto" : "corte",
      service_name: it.name,
      quantity: Number(it.quantity || 1),
      gross_amount: itemGross,
      discount_amount: itemDisc,
      paid_amount: itemPaid,
      payment_method_id: pm.id,
      payment_method_name: pm.name,
      payment_type: payment_type || "dinheiro",
      barber_id: barber.id,
      barber_name: barber.name,
      client_name,
      client_id,
      fee_amount: fee,
      net_amount: net,
      commission_amount: comm,
      shop_amount: shop,
      settlement_date: date || todayStr(),
      available: true,
      commission_paid: false,
      status: "ativo",
      created_at: nowIso(),
    };
    db.revenues.unshift(rev);
    created.push(rev);
  });

  // Persistência relacional do atendimento na camada de Storage (Multi-tenant)
  const targetOrgId = req.body?.organization_id || user?.barbershop_id || "org_vintage";
  try {
    let resolvedClientId = client_id;
    if (!resolvedClientId && client_name) {
      const existingClients = await storage.getClientsByOrg(targetOrgId);
      const matched = existingClients.find(
        (c) => c.name.toLowerCase() === client_name.trim().toLowerCase()
      );
      if (matched) {
        resolvedClientId = matched.id;
      } else {
        const createdClient = await storage.createClient({
          organization_id: targetOrgId,
          name: client_name.trim(),
        });
        resolvedClientId = createdClient.id;
      }
    }

    await storage.createAppointment({
      id: group_id,
      organization_id: targetOrgId,
      barber_id: barber.user_id || barber.id || "barber_gabriel",
      client_id: resolvedClientId || null,
      total_amount: String(totalGross.toFixed(2)),
      discount: String(discount.toFixed(2)),
      net_amount: String(totalNetCalculated.toFixed(2)),
      commission_amount: String(totalCommissionCalculated.toFixed(2)),
      payment_method: pm?.name || payment_type || "dinheiro",
      status: "concluido",
      date: date || todayStr(),
      time: time || "14:00",
    });
  } catch (storageErr: any) {
    console.error("[Storage] Erro ao persistir atendimento relacional:", storageErr?.message);
  }

  db.logChange(`Barbeiro '${barber.name}' lançou atendimento (${created.length} itens)`, "revenue");
  res.json({
    sale_group_id: group_id,
    items: created,
    total: Number(created.reduce((acc, r) => acc + r.paid_amount, 0).toFixed(2)),
    commission: Number(totalCommissionCalculated.toFixed(2)),
  });
});

apiRouter.get("/barber/atendimentos", (req, res) => {
  const user = authUser(req);
  const barber = db.barbers.find((b) => b.id === user?.barber_id) || db.barbers[0];
  const { start, end } = req.query as { start?: string; end?: string };

  let revs = db.revenues.filter((r) => r.barber_id === barber.id);
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  // Group by sale_group_id or rev id
  const groups: Record<string, any> = {};
  revs.forEach((r) => {
    const gid = r.sale_group_id || r.id;
    if (!groups[gid]) {
      groups[gid] = {
        sale_group_id: gid,
        date: r.date,
        time: r.time,
        client_name: r.client_name,
        payment_method_name: r.payment_method_name,
        payment_type: r.payment_type,
        status: r.status,
        barber_name: r.barber_name,
        items: [],
        gross: 0,
        discount: 0,
        paid: 0,
        commission: 0,
        shop: 0,
      };
    }
    groups[gid].items.push({ name: r.service_name, kind: r.item_kind, quantity: r.quantity, paid: r.paid_amount });
    groups[gid].gross = Number((groups[gid].gross + r.gross_amount).toFixed(2));
    groups[gid].discount = Number((groups[gid].discount + r.discount_amount).toFixed(2));
    groups[gid].paid = Number((groups[gid].paid + r.paid_amount).toFixed(2));
    groups[gid].commission = Number((groups[gid].commission + r.commission_amount).toFixed(2));
    groups[gid].shop = Number((groups[gid].shop + r.shop_amount).toFixed(2));
  });

  const list = Object.values(groups);
  list.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  res.json(list);
});

apiRouter.get("/barber/dashboard", (req, res) => {
  const user = authUser(req);
  let barber: any = db.barbers.find((b) => b.id === user?.barber_id);
  if (!barber && user?.email) {
    barber = db.barbers.find((b) => b.email === user.email);
  }
  if (!barber && user?.name) {
    barber = db.barbers.find((b) => b.name?.toLowerCase() === user.name?.toLowerCase());
  }
  if (!barber) {
    barber = db.barbers[0] || { id: "default_barber", name: user?.name || "Barbeiro", commission_percent: 50 };
  }

  const t = todayStr();
  const m = (req.query.month as string) || t.slice(0, 7);
  const allBarberRevs = db.revenues.filter((r) => r.barber_id === barber.id && r.status === "ativo");
  const revsToday = allBarberRevs.filter((r) => r.date === t);
  const monthRevs = allBarberRevs.filter((r) => r.date.startsWith(m));

  // Métricas do Dia
  const atendimentos_hoje = revsToday.length;
  const faturamento_hoje = Number(revsToday.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const comissao_hoje = Number(revsToday.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const descontos_hoje = Number(revsToday.reduce((acc, r) => acc + (r.discount_amount || 0), 0).toFixed(2));

  // Métricas do Mês (Visão Específica do Barbeiro)
  const comissao_mes = Number(monthRevs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const comissao_paga_mes = Number(monthRevs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const comissao_pendente_mes = Number((comissao_mes - comissao_paga_mes).toFixed(2));
  const atendimentos_mes = monthRevs.length;
  const faturamento_mes = Number(monthRevs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const ticket_medio_mes = atendimentos_mes > 0 ? Number((faturamento_mes / atendimentos_mes).toFixed(2)) : 0;

  // Serviço mais realizado no mês
  const serviceCounts: Record<string, number> = {};
  monthRevs.forEach((r) => {
    const sName = r.service_name || "Serviço";
    serviceCounts[sName] = (serviceCounts[sName] || 0) + (r.quantity || 1);
  });
  let topService = { name: "Nenhum", count: 0 };
  Object.entries(serviceCounts).forEach(([name, count]) => {
    if (count > topService.count) {
      topService = { name, count };
    }
  });

  // Meta pessoal de comissão
  const targetCommission = 3000;
  const meta_pessoal = {
    target: targetCommission,
    current: comissao_mes,
    progress: Math.min(100, Math.round((comissao_mes / targetCommission) * 100)),
    target_atendimentos: 100,
    current_atendimentos: atendimentos_mes,
  };

  // Histórico de atendimentos do barbeiro agrupados e ordenados
  const sortedRevs = [...allBarberRevs].sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  const groups: Record<string, any> = {};
  sortedRevs.forEach((r) => {
    const gid = r.sale_group_id || r.id;
    if (!groups[gid]) {
      groups[gid] = {
        id: gid,
        sale_group_id: gid,
        date: r.date,
        time: r.time || "12:00",
        client_name: r.client_name || "Cliente sem cadastro",
        service_name: r.service_name || "Atendimento",
        gross: 0,
        paid: 0,
        paid_amount: 0,
        commission: 0,
        commission_amount: 0,
        commission_paid: Boolean(r.commission_paid),
        payment_method_name: r.payment_method_name || "Dinheiro / Pix",
        payment_type: r.payment_type || "dinheiro",
        items: [],
      };
    }
    groups[gid].items.push({
      name: r.service_name || "Atendimento",
      kind: r.item_kind || "servico",
      quantity: r.quantity || 1,
      paid: r.paid_amount || 0,
    });
    groups[gid].gross = Number((groups[gid].gross + (r.gross_amount || r.paid_amount || 0)).toFixed(2));
    groups[gid].paid = Number((groups[gid].paid + (r.paid_amount || 0)).toFixed(2));
    groups[gid].paid_amount = groups[gid].paid;
    groups[gid].commission = Number((groups[gid].commission + (r.commission_amount || 0)).toFixed(2));
    groups[gid].commission_amount = groups[gid].commission;
    if (!r.commission_paid) {
      groups[gid].commission_paid = false;
    }
  });

  const ultimos = Object.values(groups).slice(0, 10);

  res.json({
    date: t,
    month: m,
    barber_id: barber.id,
    barber_name: barber.name,
    shop_slug: db.barbershop.slug || db.settings.public_slug || "barbearia-vintage",
    // Hoje
    atendimentos: atendimentos_hoje,
    faturamento: faturamento_hoje,
    comissao: comissao_hoje,
    descontos: descontos_hoje,
    // Mês
    comissao_mes,
    comissao_paga_mes,
    comissao_pendente_mes,
    atendimentos_mes,
    faturamento_mes,
    ticket_medio_mes,
    servico_mais_realizado: topService,
    meta_pessoal,
    ultimos,
  });
});

apiRouter.get("/barber/clientes", (req, res) => {
  const user = authUser(req);
  const barber = db.barbers.find((b) => b.id === user?.barber_id) || db.barbers[0];
  const list = db.clients.map((c) => {
    const revs = db.revenues.filter((r) => (r.client_id === c.id || r.client_name === c.name) && r.barber_id === barber.id);
    return {
      ...c,
      atendimentos: revs.length,
      total: Number(revs.reduce((acc, r) => acc + r.paid_amount, 0).toFixed(2)),
      last_date: revs[0]?.date || null,
    };
  });
  res.json(list);
});

apiRouter.get("/barber/cliente/historico", (req, res) => {
  const { name, client_id } = req.query as { name?: string; client_id?: string };
  const revs = db.revenues.filter((r) => (client_id && r.client_id === client_id) || (name && r.client_name === name));
  res.json(revs);
});

apiRouter.post("/barber/cliente/nota", (req, res) => {
  const { client_id, note } = req.body || {};
  const c = db.clients.find((x) => x.id === client_id);
  if (c) {
    c.notes = note;
  }
  res.json({ ok: true });
});

apiRouter.get("/barber/comissao", (req, res) => {
  const user = authUser(req);
  let barber: any = db.barbers.find((b) => b.id === user?.barber_id);
  if (!barber && user?.email) barber = db.barbers.find((b) => b.email === user.email);
  if (!barber && user?.name) barber = db.barbers.find((b) => b.name?.toLowerCase() === user.name?.toLowerCase());
  if (!barber) barber = db.barbers[0] || { id: "default_barber", name: user?.name || "Barbeiro", commission_percent: 50 };

  const { start, end } = req.query as { start?: string; end?: string };
  let revs = db.revenues.filter((r) => r.barber_id === barber.id && r.status === "ativo");
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  const total = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const paid = Number(revs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const pending = Number((total - paid).toFixed(2));

  // Group by sale_group_id or rev id for detalhamento
  const groups: Record<string, any> = {};
  revs.forEach((r) => {
    const gid = r.sale_group_id || r.id;
    if (!groups[gid]) {
      groups[gid] = {
        sale_group_id: gid,
        date: r.date,
        time: r.time || "12:00",
        client_name: r.client_name || "Cliente sem cadastro",
        payment_method_name: r.payment_method_name || "Dinheiro / Pix",
        payment_type: r.payment_type || "dinheiro",
        status: r.status,
        commission_paid: Boolean(r.commission_paid),
        items: [],
        gross: 0,
        discount: 0,
        paid: 0,
        commission: 0,
      };
    }
    groups[gid].items.push({ name: r.service_name || "Atendimento", kind: r.item_kind || "servico", quantity: r.quantity || 1, paid: r.paid_amount || 0 });
    groups[gid].gross = Number((groups[gid].gross + (r.gross_amount || 0)).toFixed(2));
    groups[gid].discount = Number((groups[gid].discount + (r.discount_amount || 0)).toFixed(2));
    groups[gid].paid = Number((groups[gid].paid + (r.paid_amount || 0)).toFixed(2));
    groups[gid].commission = Number((groups[gid].commission + (r.commission_amount || 0)).toFixed(2));
  });

  const detalhamento = Object.values(groups);
  detalhamento.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));

  // Pagamentos de comissão efetuados
  const paidRevs = revs.filter((r) => r.commission_paid && r.commission_paid_date);
  const byPaidDate: Record<string, number> = {};
  paidRevs.forEach((r) => {
    const d = r.commission_paid_date || r.date;
    byPaidDate[d] = Number(((byPaidDate[d] || 0) + (r.commission_amount || 0)).toFixed(2));
  });
  const historico_pagamentos = Object.entries(byPaidDate).map(([date, amount]) => ({ date, amount }));

  res.json({
    total,
    gerada: total,
    paid,
    paga: paid,
    pending,
    pendente: pending,
    items: revs,
    detalhamento,
    historico_pagamentos,
  });
});

apiRouter.get("/barber/desempenho", (req, res) => {
  const user = authUser(req);
  let barber: any = db.barbers.find((b) => b.id === user?.barber_id);
  if (!barber && user?.email) barber = db.barbers.find((b) => b.email === user.email);
  if (!barber && user?.name) barber = db.barbers.find((b) => b.name?.toLowerCase() === user.name?.toLowerCase());
  if (!barber) barber = db.barbers[0] || { id: "default_barber", name: user?.name || "Barbeiro", commission_percent: 50 };

  const { start, end } = req.query as { start?: string; end?: string };
  let revs = db.revenues.filter((r) => r.barber_id === barber.id && r.status === "ativo");
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  // Group by day for evolution chart
  const byDay: Record<string, { faturamento: number; comissao: number }> = {};
  revs.forEach((r) => {
    if (!byDay[r.date]) byDay[r.date] = { faturamento: 0, comissao: 0 };
    byDay[r.date].faturamento = Number((byDay[r.date].faturamento + (r.paid_amount || 0)).toFixed(2));
    byDay[r.date].comissao = Number((byDay[r.date].comissao + (r.commission_amount || 0)).toFixed(2));
  });

  const evolution = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({
      date,
      faturamento: val.faturamento,
      comissao: val.comissao,
    }));

  // Service breakdown
  const svcMap: Record<string, { quantity: number; total: number }> = {};
  revs.filter((r) => r.item_kind === "servico").forEach((r) => {
    const name = r.service_name || "Serviço";
    if (!svcMap[name]) svcMap[name] = { quantity: 0, total: 0 };
    svcMap[name].quantity += Number(r.quantity || 1);
    svcMap[name].total = Number((svcMap[name].total + (r.paid_amount || 0)).toFixed(2));
  });
  const services_breakdown = Object.entries(svcMap)
    .map(([name, val]) => ({ name, quantity: val.quantity, total: val.total }))
    .sort((a, b) => b.total - a.total);

  // Product breakdown
  const prodMap: Record<string, { quantity: number; total: number }> = {};
  revs.filter((r) => r.item_kind === "produto").forEach((r) => {
    const name = r.service_name || "Produto";
    if (!prodMap[name]) prodMap[name] = { quantity: 0, total: 0 };
    prodMap[name].quantity += Number(r.quantity || 1);
    prodMap[name].total = Number((prodMap[name].total + (r.paid_amount || 0)).toFixed(2));
  });
  const products_breakdown = Object.entries(prodMap)
    .map(([name, val]) => ({ name, quantity: val.quantity, total: val.total }))
    .sort((a, b) => b.total - a.total);

  const faturamento_total = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const comissao_gerada = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const total_atendimentos = revs.length;
  const ticket_medio = total_atendimentos > 0 ? Number((faturamento_total / total_atendimentos).toFixed(2)) : 0;

  // Discounts
  const discounted = revs.filter((r) => (r.discount_amount || 0) > 0);
  const total_descontos = Number(revs.reduce((acc, r) => acc + (r.discount_amount || 0), 0).toFixed(2));
  const valor_original = Number(revs.reduce((acc, r) => acc + (r.gross_amount || r.paid_amount || 0), 0).toFixed(2));
  const discount_stats = {
    total: total_descontos,
    atendimentos_com_desconto: discounted.length,
    desconto_medio: discounted.length > 0 ? Number((total_descontos / discounted.length).toFixed(2)) : 0,
    percentual_vendas_com_desconto: total_atendimentos > 0 ? Number(((discounted.length / total_atendimentos) * 100).toFixed(1)) : 0,
    valor_original,
    valor_final: faturamento_total,
  };

  // Best days
  let melhor_fat = { date: start || todayStr(), value: 0 };
  let melhor_atend = { date: start || todayStr(), value: 0 };
  const dayCounts: Record<string, number> = {};
  revs.forEach((r) => {
    dayCounts[r.date] = (dayCounts[r.date] || 0) + 1;
  });
  Object.entries(byDay).forEach(([d, val]) => {
    if (val.faturamento > melhor_fat.value) melhor_fat = { date: d, value: val.faturamento };
  });
  Object.entries(dayCounts).forEach(([d, cnt]) => {
    if (cnt > melhor_atend.value) melhor_atend = { date: d, value: cnt };
  });

  const uniqueDays = Object.keys(byDay).length;
  const best_days = {
    melhor_faturamento: melhor_fat,
    melhor_atendimentos: melhor_atend,
    media_diaria_atendimentos: uniqueDays > 0 ? Number((total_atendimentos / uniqueDays).toFixed(1)) : 0,
    media_diaria_faturamento: uniqueDays > 0 ? Number((faturamento_total / uniqueDays).toFixed(2)) : 0,
  };

  // Records
  const records = {
    maior_faturamento_dia: melhor_fat.value,
    maior_atendimentos_dia: melhor_atend.value,
    maior_ticket: revs.length > 0 ? Math.max(...revs.map((r) => r.paid_amount || 0)) : 0,
    maior_comissao_dia: Object.values(byDay).length > 0 ? Math.max(...Object.values(byDay).map((v) => v.comissao)) : 0,
  };

  res.json({
    report: {
      faturamento_total,
      comissao_gerada,
      services_breakdown,
      products_breakdown,
    },
    evolution,
    atendimentos: total_atendimentos,
    total_atendimentos,
    ticket_medio,
    total_faturamento: faturamento_total,
    discount_stats,
    best_days,
    records,
    comparison: null,
  });
});

// Admin Demo Actions
apiRouter.post("/admin/seed", (req, res) => {
  db.seed();
  res.json({ ok: true, message: "Dados de demonstração recriados" });
});

apiRouter.post("/admin/clear", (req, res) => {
  db.revenues = [];
  db.expenses = [];
  db.withdrawals = [];
  db.cashClosings = [];
  db.clients = [];
  db.queue = [];
  db.appointments = [];
  db.logChange("Todos os dados foram limpos pelo administrador", "admin");
  res.json({ ok: true, message: "Todos os dados foram limpos" });
});

app.use("/api", apiRouter);

// ----------------------------- Vite Middleware & Startup -----------------------------

async function start() {
  // Inicializa conexão e migrações do PostgreSQL Supabase
  try {
    await initDatabaseWithPg(db);
  } catch (err: any) {
    console.warn("[PostgreSQL Startup Warning]:", err.message);
  }

  // Landing Page Route
  app.get(["/landing", "/landing.html"], (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "landing.html"));
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
