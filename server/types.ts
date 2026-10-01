// Helper functions
export const newId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
export const nowIso = () => new Date().toISOString();
export const todayStr = () => new Date().toISOString().split("T")[0];

export const parseDateStr = (s: string) => {
  if (!s) return new Date();
  const clean = s.includes("T") ? s.split("T")[0] : s;
  return new Date(clean + "T12:00:00Z");
};

export const formatBRL = (val: number) => {
  return "R$ " + (Number(val) || 0).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Types & Interfaces
export interface User {
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
  is_superadmin?: boolean;
}

export interface Barber {
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

export interface PaymentMethod {
  id: string;
  barbershop_id: string;
  name: string;
  kind: string;
  fees: Record<string, number>;
  settlement_days: Record<string, number>;
  active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  barbershop_id: string;
  name: string;
  price: number;
  duration_min: number;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  barbershop_id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  barbershop_id: string;
  name: string;
  group: string;
  type: string;
  color: string;
  created_at: string;
}

export interface Revenue {
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
  payment_channel?: string;
  payment_method?: string;
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

export interface Expense {
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

export interface Withdrawal {
  id: string;
  barbershop_id: string;
  date: string;
  value: number;
  reason: string;
  source: string;
  created_at: string;
}

export interface CashClosing {
  id: string;
  barbershop_id: string;
  date: string;
  expected: Record<string, number>;
  counted: Record<string, number>;
  difference: number;
  note?: string;
  created_at: string;
}

export interface CommissionPayment {
  id: string;
  barbershop_id: string;
  barber_id: string;
  barber_name: string;
  amount: number;
  payment_method: string;
  date: string;
  notes?: string;
  paid_count?: number;
  period_start?: string;
  period_end?: string;
  expense_id?: string;
  created_at: string;
}

export interface CustomerPlan {
  id: string;
  barbershop_id: string;
  name: string;
  price: number;
  billing_cycle: "mensal" | "quinzenal" | "anual";
  is_unlimited: boolean;
  total_credits?: number;
  services?: {
    service_id?: string;
    service_name: string;
    limit: number;
  }[];
  notes?: string;
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  barbershop_id: string;
  name: string;
  phone?: string;
  birthdate?: string;
  notes?: string;
  has_plan: boolean;
  plan?: {
    plan_id?: string;
    name: string;
    price?: number;
    billing_cycle?: "mensal" | "quinzenal" | "anual";
    is_unlimited?: boolean;
    total: number;
    used: number;
    remaining?: number | string;
    services_limit?: { service_name: string; limit: number }[];
    start?: string;
    due?: string;
    status?: "ativo" | "vencido" | "esgotado";
  };
  created_at: string;
}

export interface QueueItem {
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

export interface Appointment {
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

export interface ChangeHistory {
  id: string;
  barbershop_id: string;
  user: string;
  timestamp: string;
  action: string;
  entity: string;
  before?: any;
  after?: any;
}

export interface Unit {
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

export interface Subscription {
  plan_id: "starter" | "pro" | "premium";
  status: "trialing" | "active" | "expired" | "canceled";
  subscriptionStatus?: "trialing" | "active" | "expired" | "canceled";
  subscriptionExpiresAt?: string;
  max_barbers: number;
  multi_unit: boolean;
  updated_at: string;
}

export interface BarbershopInfo {
  id: string;
  name: string;
  slug: string;
  document: string;
  phone: string;
  address: string;
  logo_url: string;
  opening_hours: string;
  city: string;
  state: string;
  shop_phone: string;
  operational_mode: string;
}

export const PERMISSIONS_CATALOG = [
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

export const defaultManagerPermissions = () => {
  const map: Record<string, boolean> = {};
  PERMISSIONS_CATALOG.forEach((p) => {
    map[p.key] = !p.sensitive && p.group !== "Futuro";
  });
  return map;
};
