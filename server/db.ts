import { Request } from "express";
import {
  User,
  Barber,
  PaymentMethod,
  Service,
  Product,
  Category,
  Revenue,
  Expense,
  Withdrawal,
  CashClosing,
  CommissionPayment,
  CustomerPlan,
  Client,
  QueueItem,
  Appointment,
  ChangeHistory,
  Unit,
  Subscription,
  BarbershopInfo,
  PERMISSIONS_CATALOG,
  defaultManagerPermissions,
  newId,
  nowIso,
  todayStr,
} from "./types.js";

export class Database {
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
  customerPlans: CustomerPlan[] = [];
  commissionPayments: CommissionPayment[] = [];
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
    this.commissionPayments = [];
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
        id: "usr_superadmin",
        name: "Guilherme Pereira (Master)",
        username: "superadmin",
        password: "superadmin123",
        email: "guilhermepedropereira2@gmail.com",
        role: "superadmin",
        roles: ["superadmin", "dono"],
        barbershop_id: "profile",
        permissions: allPerms,
        active: true,
        is_superadmin: true,
        subscriptionStatus: "active",
        subscriptionExpiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
        created_at: nowIso(),
      },
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
        is_superadmin: true,
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
      { id: "cat_comissoes", barbershop_id: "profile", name: "Comissões dos Barbeiros", group: "Pessoal", type: "despesa", color: "#10b981", created_at: nowIso() },
    ];
    this.categories = cats;

    // Customer Plans & Subscriptions (Clube de Assinaturas da Barbearia)
    this.customerPlans = [
      {
        id: "cplan_1",
        barbershop_id: "profile",
        name: "Corte Livre (Uso Ilimitado)",
        price: 99.90,
        billing_cycle: "mensal",
        is_unlimited: true,
        total_credits: 999,
        services: [{ service_name: "Corte de Cabelo", limit: 999 }],
        notes: "Assinatura mensal para cortes à vontade durante todo o mês.",
        active: true,
        created_at: nowIso(),
      },
      {
        id: "cplan_2",
        barbershop_id: "profile",
        name: "VIP Mensal (4 Cortes + 2 Barbas)",
        price: 149.00,
        billing_cycle: "mensal",
        is_unlimited: false,
        total_credits: 6,
        services: [
          { service_name: "Corte de Cabelo", limit: 4 },
          { service_name: "Barba Completa", limit: 2 },
        ],
        notes: "Combo completo com cortes e barbas inclusos no mês.",
        active: true,
        created_at: nowIso(),
      },
      {
        id: "cplan_3",
        barbershop_id: "profile",
        name: "Clube da Barba",
        price: 79.90,
        billing_cycle: "mensal",
        is_unlimited: false,
        total_credits: 4,
        services: [{ service_name: "Barba Completa", limit: 4 }],
        notes: "4 manutenções completas de barba por mês.",
        active: true,
        created_at: nowIso(),
      },
    ];

    // Clients
    this.clients = [
      {
        id: "cli_1",
        barbershop_id: "profile",
        name: "João Pedro Silva",
        phone: "(11) 98765-4321",
        notes: "Prefere degradê navalhado",
        has_plan: true,
        plan: {
          plan_id: "cplan_2",
          name: "VIP Mensal (4 Cortes + 2 Barbas)",
          price: 149.00,
          billing_cycle: "mensal",
          is_unlimited: false,
          total: 4,
          used: 2,
          start: "2026-09-01",
          due: "2026-10-01",
        },
        created_at: nowIso(),
      },
      {
        id: "cli_2",
        barbershop_id: "profile",
        name: "Lucas Fernandes",
        phone: "(11) 97777-6666",
        notes: "Corte tradicional tesoura",
        has_plan: false,
        created_at: nowIso(),
      },
      {
        id: "cli_3",
        barbershop_id: "profile",
        name: "Marcos Vinicius",
        phone: "(11) 96666-5555",
        notes: "Assinante do plano ilimitado",
        has_plan: true,
        plan: {
          plan_id: "cplan_1",
          name: "Corte Livre (Uso Ilimitado)",
          price: 99.90,
          billing_cycle: "mensal",
          is_unlimited: true,
          total: 999,
          used: 3,
          start: "2026-09-05",
          due: "2026-10-05",
        },
        created_at: nowIso(),
      },
      {
        id: "cli_4",
        barbershop_id: "profile",
        name: "Bruno Henrique",
        phone: "(11) 95555-4444",
        notes: "",
        has_plan: false,
        created_at: nowIso(),
      },
      {
        id: "cli_5",
        barbershop_id: "profile",
        name: "Lucas Mendes",
        phone: "(11) 94444-3333",
        notes: "Cliente VIP Mensal",
        has_plan: true,
        plan: {
          plan_id: "cplan_2",
          name: "VIP Mensal",
          price: 149.00,
          billing_cycle: "mensal",
          is_unlimited: false,
          total: 4,
          used: 2,
          start: "2026-09-01",
          due: "2026-10-01",
        },
        created_at: nowIso(),
      },
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

        const pChannel = pType === "dinheiro" ? "Caixa Físico / Gaveta" : (s % 3 === 0 ? "InfinitePay" : s % 3 === 1 ? "Stone" : "Terminal Balcão");
        const pMethod = pType === "dinheiro" ? "Dinheiro" : pType === "pix" ? "Pix no Terminal" : pType === "debito" ? "Cartão de Débito" : "Cartão de Crédito";

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
          payment_channel: pChannel,
          payment_method: pMethod,
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
// Helper to enrich client with real-time stats, history and plan progress
function enrichClient(c: Client): any {
  const clientRevenues = db.revenues.filter(
    (r) =>
      (r.client_id && r.client_id === c.id) ||
      (r.client_name && r.client_name.toLowerCase() === c.name.toLowerCase())
  );
  const visits = clientRevenues.length;
  const total_spent = Number(
    clientRevenues.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2)
  );
  const last_visit = clientRevenues[0]?.date || null;

  let enrichedPlan = undefined;
  if (c.has_plan && c.plan) {
    const isUnlimited = Boolean(c.plan.is_unlimited);
    const total = isUnlimited ? 999 : Number(c.plan.total || 4);
    const used = Number(c.plan.used || 0);
    const remainingCount = isUnlimited ? 999 : Math.max(0, total - used);
    const remaining = isUnlimited ? "Ilimitado" : remainingCount;

    let status: "ativo" | "vencido" | "esgotado" = "ativo";
    if (c.plan.due && c.plan.due < todayStr()) {
      status = "vencido";
    } else if (!isUnlimited && used >= total) {
      status = "esgotado";
    }

    const statusLabel =
      status === "ativo" ? "Ativo" : status === "vencido" ? "Vencido" : "Esgotado";
    const remainingText = isUnlimited
      ? "Assinatura Ativa · Cortes Ilimitados"
      : `Restam ${remainingCount} de ${total} cortes no mês`;

    enrichedPlan = {
      ...c.plan,
      is_unlimited: isUnlimited,
      total,
      used,
      remaining,
      remaining_count: remainingCount,
      remainingServices: remaining,
      totalServices: total,
      remaining_text: remainingText,
      status,
      status_label: statusLabel,
    };
  }

  return {
    ...c,
    visits,
    total_spent,
    last_visit,
    plan: enrichedPlan,
  };
}

export const getUnitFilter = (req: Request): string | null => {
  const h = (req.headers["x-unit-id"] as string) || (req.query.unit_id as string);
  if (!h || h === "all" || h === "undefined") return null;
  return h;
};

export const isUserSuperAdmin = (u: any): boolean => {
  if (!u) return false;
  if (u.is_superadmin === true) return true;
  if (u.role === "superadmin" || (Array.isArray(u.roles) && u.roles.includes("superadmin"))) return true;
  const email = (u.email || "").toLowerCase().trim();
  const username = (u.username || "").toLowerCase().trim();
  return (
    email === "guilhermepedropereira2@gmail.com" ||
    email === "admin@kupola.app" ||
    email === "superadmin@kupola.app" ||
    username === "superadmin" ||
    email === "dono@barbearia.com"
  );
};

export { db, authUser, enrichClient };
