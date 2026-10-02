// Dados mockados realistas para o preview de alta fidelidade.
// Mantém o sistema determinístico e visualmente crível para apresentação.

export const SHOP = {
  name: "Barbearia Vintage Club",
  unit: "Unidade Matriz",
  slug: "barbearia-vintage",
  city: "São Paulo, SP",
  owner: "Guilherme Pereira",
  plan: "PRO",
  trial: "5 dias restantes",
  month: "Setembro 2026",
};

export const KPI_OVERVIEW = [
  {
    label: "Faturamento Bruto",
    value: 28450.0,
    delta: "+18.2%",
    positive: true,
    note: "512 atendimentos no mês",
    accent: "white",
    testid: "kpi-faturamento",
  },
  {
    label: "Comissões Apuradas",
    value: 13210.0,
    delta: "+12.4%",
    positive: true,
    note: "5 barbeiros calculados",
    accent: "gold",
    testid: "kpi-comissoes",
  },
  {
    label: "Taxa Maquininhas",
    value: -1360.0,
    delta: "-2.1%",
    positive: true,
    note: "Descontadas na fonte",
    accent: "loss",
    testid: "kpi-taxas",
  },
  {
    label: "Lucro Líquido Real",
    value: 13880.0,
    delta: "+22.6%",
    positive: true,
    note: "Disponível no caixa do dono",
    accent: "profit",
    testid: "kpi-lucro",
  },
];

export const DAILY_FLOW = [
  { day: "Seg", short: "S", value: 850, height: 45 },
  { day: "Ter", short: "T", value: 1020, height: 60 },
  { day: "Qua", short: "Q", value: 1280, height: 75 },
  { day: "Qui", short: "Q", value: 1340, height: 80 },
  { day: "Sex", short: "S", value: 1890, height: 95 },
  { day: "Sáb", short: "S", value: 2150, height: 100, peak: true },
  { day: "Dom", short: "D", value: 680, height: 40 },
];

export const BARBERS = [
  {
    id: "rc",
    initials: "RC",
    name: "Rodrigo Costa",
    role: "Sênior",
    cuts: 154,
    commission: 50,
    commissionValue: 3850.0,
    pixReady: true,
    status: "Ativo",
  },
  {
    id: "ml",
    initials: "ML",
    name: "Matheus Lima",
    role: "Pleno",
    cuts: 128,
    commission: 45,
    commissionValue: 2880.0,
    pixReady: true,
    status: "Ativo",
  },
  {
    id: "ga",
    initials: "GA",
    name: "Gabriel Alves",
    role: "Pleno",
    cuts: 104,
    commission: 45,
    commissionValue: 2340.0,
    pixReady: true,
    status: "Ativo",
  },
  {
    id: "lf",
    initials: "LF",
    name: "Lucas Ferreira",
    role: "Júnior",
    cuts: 78,
    commission: 40,
    commissionValue: 1560.0,
    pixReady: false,
    status: "Folga",
  },
  {
    id: "bv",
    initials: "BV",
    name: "Bruno Vasconcelos",
    role: "Júnior",
    cuts: 48,
    commission: 40,
    commissionValue: 980.0,
    pixReady: false,
    status: "Ativo",
  },
];

export const SERVICES = [
  { id: "s1", name: "Corte Degradê", duration: 30, price: 55, category: "Cabelo", active: true },
  { id: "s2", name: "Corte Clássico", duration: 25, price: 45, category: "Cabelo", active: true },
  { id: "s3", name: "Barba Terapia", duration: 30, price: 50, category: "Barba", active: true },
  { id: "s4", name: "Combo Cabelo + Barba", duration: 55, price: 95, category: "Combo", active: true, featured: true },
  { id: "s5", name: "Sobrancelha", duration: 15, price: 25, category: "Acabamento", active: true },
  { id: "s6", name: "Pigmentação", duration: 45, price: 120, category: "Premium", active: true },
  { id: "s7", name: "Hidratação Capilar", duration: 40, price: 70, category: "Tratamento", active: true },
  { id: "s8", name: "Platinado", duration: 90, price: 180, category: "Premium", active: false },
];

export const CATEGORIES = [
  { id: "c1", name: "Cabelo", count: 12, color: "#D4AF37" },
  { id: "c2", name: "Barba", count: 6, color: "#10B981" },
  { id: "c3", name: "Combo", count: 4, color: "#3B82F6" },
  { id: "c4", name: "Acabamento", count: 3, color: "#A855F7" },
  { id: "c5", name: "Premium", count: 5, color: "#EF4444" },
  { id: "c6", name: "Tratamento", count: 4, color: "#06B6D4" },
];

export const PRODUCTS = [
  { id: "p1", name: "Pomada Modeladora 120g", sku: "POM-120", stock: 14, min: 10, price: 45, category: "Styling" },
  { id: "p2", name: "Shampoo Antiqueda 250ml", sku: "SHA-250", stock: 6, min: 8, price: 38, category: "Tratamento", low: true },
  { id: "p3", name: "Óleo para Barba 60ml", sku: "OLE-060", stock: 22, min: 10, price: 32, category: "Barba" },
  { id: "p4", name: "Pós-barba Hidratante", sku: "POS-100", stock: 18, min: 8, price: 28, category: "Barba" },
  { id: "p5", name: "Cera Matte 80g", sku: "CER-080", stock: 3, min: 10, price: 42, category: "Styling", low: true },
  { id: "p6", name: "Tônico Capilar 100ml", sku: "TON-100", stock: 12, min: 6, price: 56, category: "Tratamento" },
];

export const CLIENTS = [
  { id: "u1", name: "Lucas Marques", phone: "(11) 98765-4321", visits: 18, lastVisit: "20/09/2026", plan: "VIP", ltv: 1850 },
  { id: "u2", name: "Felipe Tavares", phone: "(11) 99812-7766", visits: 24, lastVisit: "22/09/2026", plan: "Mensal", ltv: 2380 },
  { id: "u3", name: "Rafael Mendes", phone: "(11) 97654-3210", visits: 7, lastVisit: "15/09/2026", plan: "Avulso", ltv: 580 },
  { id: "u4", name: "Marcos Vinícius", phone: "(11) 98123-4567", visits: 31, lastVisit: "23/09/2026", plan: "VIP", ltv: 3120 },
  { id: "u5", name: "Henrique Souza", phone: "(11) 99000-1122", visits: 12, lastVisit: "18/09/2026", plan: "Mensal", ltv: 1240 },
  { id: "u6", name: "Diego Oliveira", phone: "(11) 98444-5566", visits: 4, lastVisit: "10/09/2026", plan: "Avulso", ltv: 220 },
  { id: "u7", name: "André Lima", phone: "(11) 97222-3344", visits: 19, lastVisit: "21/09/2026", plan: "VIP", ltv: 1980 },
  { id: "u8", name: "Caio Pereira", phone: "(11) 96666-7788", visits: 9, lastVisit: "19/09/2026", plan: "Mensal", ltv: 870 },
];

export const REVENUES = [
  { id: "r1", date: "23/09/2026", client: "Lucas Marques", service: "Corte Degradê", barber: "Rodrigo Costa", gross: 55, fee: 1.6, net: 53.4, method: "PIX" },
  { id: "r2", date: "23/09/2026", client: "Marcos Vinícius", service: "Combo Cabelo + Barba", barber: "Matheus Lima", gross: 95, fee: 2.85, net: 92.15, method: "Crédito" },
  { id: "r3", date: "23/09/2026", client: "Felipe Tavares", service: "Barba Terapia", barber: "Gabriel Alves", gross: 50, fee: 1.5, net: 48.5, method: "Débito" },
  { id: "r4", date: "22/09/2026", client: "André Lima", service: "Corte Clássico", barber: "Rodrigo Costa", gross: 45, fee: 1.35, net: 43.65, method: "Dinheiro" },
  { id: "r5", date: "22/09/2026", client: "Henrique Souza", service: "Corte Degradê", barber: "Lucas Ferreira", gross: 55, fee: 1.6, net: 53.4, method: "PIX" },
];

export const EXPENSES = [
  { id: "d1", date: "20/09/2026", category: "Aluguel", description: "Aluguel da sala 02", amount: 2800, recurring: true },
  { id: "d2", date: "18/09/2026", category: "Insumos", description: "Pomada, cera e óleos", amount: 460, recurring: false },
  { id: "d3", date: "15/09/2026", category: "Marketing", description: "Tráfego pago Meta Ads", amount: 350, recurring: true },
  { id: "d4", date: "12/09/2026", category: "Contas", description: "Conta de luz", amount: 420, recurring: true },
  { id: "d5", date: "10/09/2026", category: "Folha", description: "Vale para Lucas F.", amount: 200, recurring: false },
];

export const MACHINES = [
  { id: "m1", name: "Stone - Principal", debit: 1.49, creditVista: 2.79, creditParcelado: 4.49, anticipation: 1.5, status: "Ativa" },
  { id: "m2", name: "Cielo - Loja 01", debit: 1.39, creditVista: 2.69, creditParcelado: 4.39, anticipation: 1.5, status: "Ativa" },
  { id: "m3", name: "Mercado Pago", debit: 1.59, creditVista: 2.89, creditParcelado: 4.59, anticipation: 1.5, status: "Ativa" },
  { id: "m4", name: "PagSeguro", debit: 1.69, creditVista: 2.99, creditParcelado: 4.69, anticipation: 1.5, status: "Em revisão" },
];

export const APPOINTMENTS_TODAY = [
  { time: "09:00", client: "Lucas Marques", service: "Corte Degradê", barber: "Rodrigo Costa", status: "Concluído" },
  { time: "09:45", client: "Marcos Vinícius", service: "Combo Cabelo + Barba", barber: "Matheus Lima", status: "Em andamento", live: true },
  { time: "10:30", client: "Felipe Tavares", service: "Barba Terapia", barber: "Gabriel Alves", status: "Aguardando" },
  { time: "11:15", client: "André Lima", service: "Corte Clássico", barber: "Rodrigo Costa", status: "Aguardando" },
  { time: "13:30", client: "Henrique Souza", service: "Corte Degradê", barber: "Lucas Ferreira", status: "Aguardando" },
  { time: "14:15", client: "Diego Oliveira", service: "Sobrancelha", barber: "Bruno Vasconcelos", status: "Aguardando" },
  { time: "15:30", client: "Caio Pereira", service: "Pigmentação", barber: "Rodrigo Costa", status: "Aguardando" },
  { time: "16:30", client: "Pedro Henrique", service: "Combo Cabelo + Barba", barber: "Matheus Lima", status: "Aguardando" },
];

export const QUEUE_LIVE = [
  { pos: 1, client: "Marcos Vinícius", barber: "Matheus Lima", start: "09:50", eta: "10:25", progress: 60 },
  { pos: 2, client: "Felipe Tavares", barber: "Gabriel Alves", start: "10:05", eta: "10:35", progress: 25 },
  { pos: 3, client: "André Lima", barber: "Rodrigo Costa", start: "—", eta: "10:55", progress: 0 },
];

export const COMMISSION_TABLE = [
  { barber: "Rodrigo Costa", cuts: 154, gross: 8470, commPct: 50, commValue: 4314.7, fees: 254.1, net: 4060.6 },
  { barber: "Matheus Lima", cuts: 128, gross: 7040, commPct: 45, commValue: 3168.0, fees: 211.2, net: 2956.8 },
  { barber: "Gabriel Alves", cuts: 104, gross: 5720, commPct: 45, commValue: 2574.0, fees: 171.6, net: 2402.4 },
  { barber: "Lucas Ferreira", cuts: 78, gross: 4290, commPct: 40, commValue: 1716.0, fees: 128.7, net: 1587.3 },
  { barber: "Bruno Vasconcelos", cuts: 48, gross: 2640, commPct: 40, commValue: 1056.0, fees: 79.2, net: 976.8 },
];

export const WITHDRAWALS = [
  { id: "w1", date: "22/09/2026", amount: 4000, note: "Pró-labore semanal", method: "PIX" },
  { id: "w2", date: "15/09/2026", amount: 3500, note: "Pró-labore", method: "PIX" },
  { id: "w3", date: "08/09/2026", amount: 5000, note: "Investimento em marketing", method: "Transferência" },
  { id: "w4", date: "01/09/2026", amount: 3000, note: "Pró-labore", method: "PIX" },
];

export const HISTORY = [
  { time: "10:42", user: "Rodrigo Costa", action: "Lançou atendimento de Lucas Marques (R$ 55,00)" },
  { time: "10:35", user: "Sistema", action: "Backup automático concluído" },
  { time: "10:18", user: "Guilherme Pereira", action: "Aprovou comissão de Matheus Lima" },
  { time: "09:50", user: "Sistema", action: "Início do expediente (5 cadeiras ativas)" },
  { time: "09:30", user: "Gabriel Alves", action: "Entrou no turno" },
  { time: "09:00", user: "Sistema", action: "Fechamento do caixa anterior validado" },
];

export const USERS = [
  { name: "Guilherme Pereira", email: "dono@vintage.com", role: "Dono", status: "Ativo", lastLogin: "Hoje, 09:14" },
  { name: "Rodrigo Costa", email: "rodrigo@vintage.com", role: "Barbeiro", status: "Ativo", lastLogin: "Hoje, 09:50" },
  { name: "Matheus Lima", email: "matheus@vintage.com", role: "Barbeiro", status: "Ativo", lastLogin: "Hoje, 09:48" },
  { name: "Camila Ribeiro", email: "caixa@vintage.com", role: "Caixa", status: "Ativo", lastLogin: "Hoje, 09:01" },
  { name: "André Soares", email: "gerente@vintage.com", role: "Gerente", status: "Suspenso", lastLogin: "12/09/2026" },
];

export const CLIENT_PLANS = [
  { client: "Lucas Marques", plan: "VIP", status: "Ativo", since: "01/03/2026", renews: "01/10/2026", value: 199 },
  { client: "Felipe Tavares", plan: "Mensal", status: "Ativo", since: "15/06/2026", renews: "15/10/2026", value: 89 },
  { client: "Marcos Vinícius", plan: "VIP", status: "Ativo", since: "01/01/2026", renews: "01/10/2026", value: 199 },
  { client: "Henrique Souza", plan: "Mensal", status: "Atrasado", since: "10/05/2026", renews: "10/09/2026", value: 89 },
  { client: "Caio Pereira", plan: "Mensal", status: "Ativo", since: "20/07/2026", renews: "20/10/2026", value: 89 },
];

export const SUPERADMIN_ORGS = [
  { name: "Barbearia Vintage Club", plan: "PRO", status: "Trial", mrr: 0, users: 7, region: "SP" },
  { name: "Studio Dom Barber", plan: "PREMIUM", status: "Ativa", mrr: 299, users: 12, region: "RJ" },
  { name: "Corte & Cultura", plan: "BASIC", status: "Ativa", mrr: 89, users: 3, region: "MG" },
  { name: "Barbearia do Zé", plan: "PRO", status: "Atrasada", mrr: 149, users: 5, region: "BA" },
  { name: "Old School Cuts", plan: "PREMIUM", status: "Ativa", mrr: 299, users: 9, region: "RS" },
];

// Helpers de formatação BRL consistente com o restante do sistema.
export const BRL = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });