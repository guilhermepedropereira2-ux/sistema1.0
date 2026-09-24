-- ============================================================
-- SCHEMA DDL: Barbearia App (PostgreSQL / Supabase)
-- ============================================================

CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  slug VARCHAR(150),
  address TEXT,
  phone VARCHAR(50),
  city VARCHAR(100),
  state VARCHAR(50),
  is_main BOOLEAN DEFAULT false,
  operational_mode VARCHAR(50) DEFAULT 'hibrido',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barbershop (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  document VARCHAR(50),
  phone VARCHAR(50),
  address TEXT,
  logo_url TEXT,
  opening_hours TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  shop_phone VARCHAR(50),
  operational_mode VARCHAR(50) DEFAULT 'hibrido'
);

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  commission_on VARCHAR(50) DEFAULT 'pago',
  initial_balance NUMERIC(12,2) DEFAULT 3000.0,
  shop_name VARCHAR(255) DEFAULT 'Barbearia Vintage Club',
  operational_mode VARCHAR(50) DEFAULT 'hibrido',
  public_slug VARCHAR(150) DEFAULT 'barbearia-vintage'
);

CREATE TABLE IF NOT EXISTS subscription (
  plan_id VARCHAR(50) PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'active',
  max_barbers INTEGER DEFAULT 10,
  multi_unit BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  roles JSONB DEFAULT '[]',
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  barber_id VARCHAR(100),
  permissions JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barbers (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  name VARCHAR(255) NOT NULL,
  commission_percent NUMERIC(5,2) DEFAULT 0,
  commission_type VARCHAR(50) DEFAULT 'percent',
  commission_value NUMERIC(10,2) DEFAULT 0,
  commission_overrides JSONB DEFAULT '{}',
  phone VARCHAR(50),
  email VARCHAR(255),
  photo_url TEXT,
  join_date DATE,
  authorized_services JSONB DEFAULT '[]',
  authorized_products JSONB DEFAULT '[]',
  user_id VARCHAR(100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  name VARCHAR(100) NOT NULL,
  kind VARCHAR(50) NOT NULL,
  fees JSONB DEFAULT '{}',
  settlement_days JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_min INTEGER NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  name VARCHAR(100) NOT NULL,
  "group" VARCHAR(50),
  type VARCHAR(50),
  color VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revenues (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  date DATE NOT NULL,
  time VARCHAR(10),
  item_kind VARCHAR(50),
  item_id VARCHAR(100),
  sale_group_id VARCHAR(100),
  weekday INTEGER,
  service_type VARCHAR(100),
  service_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  gross_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  payment_method_id VARCHAR(100),
  payment_method_name VARCHAR(100),
  payment_type VARCHAR(50),
  barber_id VARCHAR(100),
  barber_name VARCHAR(255),
  client_name VARCHAR(255),
  client_id VARCHAR(100),
  plan_used BOOLEAN DEFAULT false,
  fee_amount NUMERIC(12,2) DEFAULT 0,
  net_amount NUMERIC(12,2) DEFAULT 0,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  shop_amount NUMERIC(12,2) DEFAULT 0,
  settlement_date DATE,
  available BOOLEAN DEFAULT true,
  commission_paid BOOLEAN DEFAULT false,
  commission_paid_date DATE,
  status VARCHAR(50) DEFAULT 'concluido',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  name VARCHAR(255) NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  category_id VARCHAR(100),
  category_name VARCHAR(100),
  type VARCHAR(50) DEFAULT 'variavel',
  due_date DATE,
  recurrence VARCHAR(50) DEFAULT 'mensal',
  occurrences INTEGER,
  payment_method VARCHAR(100),
  payment_date DATE,
  status VARCHAR(50) DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  date DATE NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  source VARCHAR(100) DEFAULT 'caixa',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_closings (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  date DATE NOT NULL,
  expected JSONB DEFAULT '{}',
  counted JSONB DEFAULT '{}',
  difference NUMERIC(12,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  birthdate DATE,
  notes TEXT,
  has_plan BOOLEAN DEFAULT false,
  plan JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS queue (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  client_id VARCHAR(100),
  barber_id VARCHAR(100),
  barber_name VARCHAR(255),
  service_ids JSONB DEFAULT '[]',
  service_names JSONB DEFAULT '[]',
  estimated_price NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'espera',
  arrival_time VARCHAR(20),
  called_time VARCHAR(20),
  finished_time VARCHAR(20),
  date DATE,
  notes TEXT,
  revenue_id VARCHAR(100),
  appointment_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  client_id VARCHAR(100),
  barber_id VARCHAR(100),
  barber_name VARCHAR(255),
  service_ids JSONB DEFAULT '[]',
  service_names JSONB DEFAULT '[]',
  date DATE NOT NULL,
  time VARCHAR(10) NOT NULL,
  duration_min INTEGER DEFAULT 30,
  price NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pendente',
  notes TEXT,
  revenue_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS history (
  id VARCHAR(100) PRIMARY KEY,
  barbershop_id VARCHAR(100) NOT NULL DEFAULT 'profile',
  "user" VARCHAR(100) DEFAULT 'Administrador',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL,
  entity VARCHAR(100),
  before JSONB,
  after JSONB
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues (date);
CREATE INDEX IF NOT EXISTS idx_revenues_barbershop ON revenues (barbershop_id);
CREATE INDEX IF NOT EXISTS idx_revenues_barber ON revenues (barber_id);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses (due_date);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (date);
CREATE INDEX IF NOT EXISTS idx_queue_date ON queue (date);

-- ============================================================
-- TABELAS MULTI-TENANT (DRIZZLE ORM / DUAL STORAGE)
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  document VARCHAR(50),
  plan VARCHAR(50) NOT NULL DEFAULT 'pro',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS services_products (
  id VARCHAR(100) PRIMARY KEY,
  organization_id VARCHAR(100) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_transactions (
  id VARCHAR(100) PRIMARY KEY,
  organization_id VARCHAR(100) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id VARCHAR(150) NOT NULL,
  status VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
