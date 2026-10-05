import { getDbPool, testConnection } from "./client.js";
import { runMigrations } from "./migrate.js";

let isPgReady = false;
let lastPgStatus: {
  connected: boolean;
  engine: string;
  database: string;
  host: string;
  latencyMs?: number;
  tables?: Record<string, number>;
  lastChecked: string;
  error?: string;
} = {
  connected: false,
  engine: "In-Memory Store (Active)",
  database: "local_memory",
  host: "local",
  lastChecked: new Date().toISOString(),
};

export function getPgHealth() {
  return lastPgStatus;
}

export async function initDatabaseWithPg(dbStore: any) {
  const pool = getDbPool();
  if (!pool) {
    console.log("[Database Sync] DATABASE_URL não informada. Armazenamento em memória local ativo com dados completos.");
    return;
  }

  try {
    const start = Date.now();
    console.log("[PostgreSQL Sync] Inicializando integração com PostgreSQL...");
    
    // 1. Executa migrações
    const migResult = await runMigrations();
    const latency = Date.now() - start;

    isPgReady = true;
    lastPgStatus = {
      connected: true,
      engine: "PostgreSQL",
      database: "postgres",
      host: "connected",
      latencyMs: latency,
      tables: migResult.tables,
      lastChecked: new Date().toISOString(),
    };

    console.log(`[PostgreSQL Sync] Conexão ativa (${latency}ms). Carregando dados persistidos...`);
    await loadFromPg(dbStore);
    console.log("[PostgreSQL Sync] Dados sincronizados com o PostgreSQL com sucesso!");
  } catch (err: any) {
    console.warn("[PostgreSQL Sync Warning]:", err.message);
    lastPgStatus = {
      connected: false,
      engine: "In-Memory Store (Active)",
      database: "local_memory",
      host: "local",
      lastChecked: new Date().toISOString(),
      error: err.message,
    };
  }
}

export async function loadFromPg(dbStore: any) {
  const pool = getDbPool();
  if (!pool || !isPgReady) return;

  const client = await pool.connect();
  try {
    // Units
    const unitsRes = await client.query("SELECT * FROM units ORDER BY is_main DESC, name ASC;");
    if (unitsRes.rows.length > 0) {
      dbStore.units = unitsRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        short_name: r.short_name,
        slug: r.slug,
        address: r.address,
        phone: r.phone,
        city: r.city,
        state: r.state,
        is_main: r.is_main,
        operational_mode: r.operational_mode,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Barbershop
    const shopRes = await client.query("SELECT * FROM barbershop LIMIT 1;");
    if (shopRes.rows.length > 0) {
      const s = shopRes.rows[0];
      dbStore.barbershop = {
        id: s.id,
        name: s.name,
        slug: s.slug,
        document: s.document,
        phone: s.phone,
        address: s.address,
        logo_url: s.logo_url || "",
        opening_hours: s.opening_hours,
        city: s.city,
        state: s.state,
        shop_phone: s.shop_phone,
        operational_mode: s.operational_mode,
      };
    }

    // Settings
    const setRes = await client.query("SELECT * FROM settings LIMIT 1;");
    if (setRes.rows.length > 0) {
      const st = setRes.rows[0];
      dbStore.settings = {
        id: st.id,
        barbershop_id: st.barbershop_id,
        commission_on: st.commission_on,
        initial_balance: Number(st.initial_balance) || 3000.0,
        shop_name: st.shop_name,
        operational_mode: st.operational_mode,
        public_slug: st.public_slug,
      };
    }

    // Subscription
    const subRes = await client.query("SELECT * FROM subscription LIMIT 1;");
    if (subRes.rows.length > 0) {
      const sb = subRes.rows[0];
      dbStore.subscription = {
        plan_id: sb.plan_id,
        status: sb.status,
        max_barbers: Number(sb.max_barbers) || 10,
        multi_unit: Boolean(sb.multi_unit),
        updated_at: sb.updated_at ? new Date(sb.updated_at).toISOString() : new Date().toISOString(),
      };
    }

    // Services
    const svcRes = await client.query("SELECT * FROM services ORDER BY name ASC;");
    if (svcRes.rows.length > 0) {
      dbStore.services = svcRes.rows.map((r) => ({
        id: r.id,
        barbershop_id: r.barbershop_id,
        name: r.name,
        price: Number(r.price),
        duration_min: Number(r.duration_min),
        active: Boolean(r.active),
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Products
    const prodRes = await client.query("SELECT * FROM products ORDER BY name ASC;");
    if (prodRes.rows.length > 0) {
      dbStore.products = prodRes.rows.map((r) => ({
        id: r.id,
        barbershop_id: r.barbershop_id,
        name: r.name,
        price: Number(r.price),
        cost: Number(r.cost),
        stock: Number(r.stock),
        active: Boolean(r.active),
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Barbers
    const barbRes = await client.query("SELECT * FROM barbers ORDER BY name ASC;");
    if (barbRes.rows.length > 0) {
      dbStore.barbers = barbRes.rows.map((r) => ({
        id: r.id,
        barbershop_id: r.barbershop_id,
        name: r.name,
        commission_percent: Number(r.commission_percent),
        commission_type: r.commission_type || "percent",
        commission_value: Number(r.commission_value) || 0,
        commission_overrides: r.commission_overrides || {},
        phone: r.phone || "",
        email: r.email || "",
        photo_url: r.photo_url || "",
        join_date: r.join_date ? new Date(r.join_date).toISOString().split("T")[0] : "",
        authorized_services: Array.isArray(r.authorized_services) ? r.authorized_services : [],
        authorized_products: Array.isArray(r.authorized_products) ? r.authorized_products : [],
        user_id: r.user_id,
        active: Boolean(r.active),
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Payment Methods
    const pmRes = await client.query("SELECT * FROM payment_methods ORDER BY name ASC;");
    if (pmRes.rows.length > 0) {
      dbStore.paymentMethods = pmRes.rows.map((r) => ({
        id: r.id,
        barbershop_id: r.barbershop_id,
        name: r.name,
        kind: r.kind,
        fees: r.fees || {},
        settlement_days: r.settlement_days || {},
        active: Boolean(r.active),
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Categories
    const catRes = await client.query("SELECT * FROM categories ORDER BY name ASC;");
    if (catRes.rows.length > 0) {
      dbStore.categories = catRes.rows.map((r) => ({
        id: r.id,
        barbershop_id: r.barbershop_id,
        name: r.name,
        group: r.group,
        type: r.type,
        color: r.color,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Clients
    const cliRes = await client.query("SELECT * FROM clients ORDER BY name ASC;");
    if (cliRes.rows.length > 0) {
      dbStore.clients = cliRes.rows.map((r) => ({
        id: r.id,
        barbershop_id: r.barbershop_id,
        name: r.name,
        phone: r.phone,
        birthdate: r.birthdate ? new Date(r.birthdate).toISOString().split("T")[0] : "",
        notes: r.notes,
        has_plan: Boolean(r.has_plan),
        plan: r.plan,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Appointments
    const aptRes = await client.query("SELECT * FROM appointments ORDER BY date DESC, time DESC LIMIT 200;");
    if (aptRes.rows.length > 0) {
      dbStore.appointments = aptRes.rows.map((r) => ({
        id: r.id,
        barbershop_id: r.barbershop_id,
        client_name: r.client_name,
        client_phone: r.client_phone,
        client_id: r.client_id,
        barber_id: r.barber_id,
        barber_name: r.barber_name,
        service_ids: Array.isArray(r.service_ids) ? r.service_ids : [],
        service_names: Array.isArray(r.service_names) ? r.service_names : [],
        date: r.date ? new Date(r.date).toISOString().split("T")[0] : "",
        time: r.time,
        duration_min: Number(r.duration_min),
        price: Number(r.price),
        status: r.status,
        notes: r.notes,
        revenue_id: r.revenue_id,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Revenues
    const revRes = await client.query("SELECT * FROM revenues ORDER BY date DESC, time DESC LIMIT 500;");
    if (revRes.rows.length > 0) {
      dbStore.revenues = revRes.rows.map((r) => ({
        id: r.id,
        barbershop_id: r.barbershop_id,
        date: r.date ? new Date(r.date).toISOString().split("T")[0] : "",
        time: r.time,
        item_kind: r.item_kind,
        item_id: r.item_id,
        sale_group_id: r.sale_group_id,
        weekday: r.weekday,
        service_type: r.service_type,
        service_name: r.service_name,
        quantity: Number(r.quantity) || 1,
        gross_amount: Number(r.gross_amount),
        discount_amount: Number(r.discount_amount),
        paid_amount: Number(r.paid_amount),
        payment_method_id: r.payment_method_id,
        payment_method_name: r.payment_method_name,
        payment_type: r.payment_type,
        barber_id: r.barber_id,
        barber_name: r.barber_name,
        client_name: r.client_name,
        client_id: r.client_id,
        plan_used: Boolean(r.plan_used),
        fee_amount: Number(r.fee_amount),
        net_amount: Number(r.net_amount),
        commission_amount: Number(r.commission_amount),
        shop_amount: Number(r.shop_amount),
        settlement_date: r.settlement_date ? new Date(r.settlement_date).toISOString().split("T")[0] : "",
        available: Boolean(r.available),
        commission_paid: Boolean(r.commission_paid),
        commission_paid_date: r.commission_paid_date ? new Date(r.commission_paid_date).toISOString().split("T")[0] : "",
        status: r.status,
        note: r.note,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Expenses
    const expRes = await client.query("SELECT * FROM expenses ORDER BY due_date DESC LIMIT 300;");
    if (expRes.rows.length > 0) {
      dbStore.expenses = expRes.rows.map((r) => ({
        id: r.id,
        barbershop_id: r.barbershop_id,
        name: r.name,
        value: Number(r.value),
        category_id: r.category_id,
        category_name: r.category_name,
        type: r.type,
        due_date: r.due_date ? new Date(r.due_date).toISOString().split("T")[0] : "",
        recurrence: r.recurrence,
        occurrences: r.occurrences,
        payment_method: r.payment_method,
        payment_date: r.payment_date ? new Date(r.payment_date).toISOString().split("T")[0] : "",
        status: r.status,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Queue
    const qRes = await client.query("SELECT * FROM queue WHERE status IN ('espera', 'cadeira') ORDER BY arrival_time ASC;");
    if (qRes.rows.length > 0) {
      dbStore.queue = qRes.rows.map((r) => ({
        id: r.id,
        barbershop_id: r.barbershop_id,
        client_name: r.client_name,
        client_phone: r.client_phone,
        client_id: r.client_id,
        barber_id: r.barber_id,
        barber_name: r.barber_name,
        service_ids: Array.isArray(r.service_ids) ? r.service_ids : [],
        service_names: Array.isArray(r.service_names) ? r.service_names : [],
        estimated_price: Number(r.estimated_price),
        status: r.status,
        arrival_time: r.arrival_time,
        called_time: r.called_time,
        finished_time: r.finished_time,
        date: r.date ? new Date(r.date).toISOString().split("T")[0] : "",
        notes: r.notes,
        revenue_id: r.revenue_id,
        appointment_id: r.appointment_id,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    }
  } finally {
    client.release();
  }
}

export async function persistRevenue(rev: any) {
  const pool = getDbPool();
  if (!pool || !isPgReady) return;
  try {
    await pool.query(`
      INSERT INTO revenues (
        id, barbershop_id, date, time, item_kind, item_id, sale_group_id, weekday,
        service_type, service_name, quantity, gross_amount, discount_amount, paid_amount,
        payment_method_id, payment_method_name, payment_type, barber_id, barber_name,
        client_name, client_id, plan_used, fee_amount, net_amount, commission_amount,
        shop_amount, settlement_date, available, commission_paid, commission_paid_date,
        status, note
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31, $32
      )
      ON CONFLICT (id) DO UPDATE SET
        paid_amount = EXCLUDED.paid_amount,
        status = EXCLUDED.status,
        commission_paid = EXCLUDED.commission_paid,
        commission_paid_date = EXCLUDED.commission_paid_date,
        available = EXCLUDED.available;
    `, [
      rev.id, rev.barbershop_id || "profile", rev.date, rev.time, rev.item_kind, rev.item_id, rev.sale_group_id, rev.weekday,
      rev.service_type, rev.service_name, rev.quantity || 1, rev.gross_amount, rev.discount_amount || 0, rev.paid_amount,
      rev.payment_method_id, rev.payment_method_name, rev.payment_type, rev.barber_id, rev.barber_name,
      rev.client_name, rev.client_id, rev.plan_used || false, rev.fee_amount || 0, rev.net_amount || 0, rev.commission_amount || 0,
      rev.shop_amount || 0, rev.settlement_date, rev.available ?? true, rev.commission_paid ?? false, rev.commission_paid_date || null,
      rev.status || "concluido", rev.note || null
    ]);
  } catch (err: any) {
    console.error("[PostgreSQL persistRevenue Error]:", err.message);
  }
}

export async function persistExpense(exp: any) {
  const pool = getDbPool();
  if (!pool || !isPgReady) return;
  try {
    await pool.query(`
      INSERT INTO expenses (
        id, barbershop_id, name, value, category_id, category_name, type,
        due_date, recurrence, occurrences, payment_method, payment_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        value = EXCLUDED.value,
        payment_date = EXCLUDED.payment_date,
        status = EXCLUDED.status;
    `, [
      exp.id, exp.barbershop_id || "profile", exp.name, exp.value, exp.category_id, exp.category_name, exp.type || "variavel",
      exp.due_date, exp.recurrence || "mensal", exp.occurrences || null, exp.payment_method || null, exp.payment_date || null, exp.status || "pendente"
    ]);
  } catch (err: any) {
    console.error("[PostgreSQL persistExpense Error]:", err.message);
  }
}

export async function persistAppointment(apt: any) {
  const pool = getDbPool();
  if (!pool || !isPgReady) return;
  try {
    await pool.query(`
      INSERT INTO appointments (
        id, barbershop_id, client_name, client_phone, client_id, barber_id, barber_name,
        service_ids, service_names, date, time, duration_min, price, status, notes, revenue_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        notes = EXCLUDED.notes,
        revenue_id = EXCLUDED.revenue_id;
    `, [
      apt.id, apt.barbershop_id || "profile", apt.client_name, apt.client_phone || null, apt.client_id || null, apt.barber_id, apt.barber_name,
      JSON.stringify(apt.service_ids || []), JSON.stringify(apt.service_names || []), apt.date, apt.time,
      apt.duration_min || 30, apt.price || 0, apt.status || "pendente", apt.notes || null, apt.revenue_id || null
    ]);
  } catch (err: any) {
    console.error("[PostgreSQL persistAppointment Error]:", err.message);
  }
}

export async function persistQueue(q: any) {
  const pool = getDbPool();
  if (!pool || !isPgReady) return;
  try {
    await pool.query(`
      INSERT INTO queue (
        id, barbershop_id, client_name, client_phone, client_id, barber_id, barber_name,
        service_ids, service_names, estimated_price, status, arrival_time, called_time, finished_time, date, notes, revenue_id, appointment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        called_time = EXCLUDED.called_time,
        finished_time = EXCLUDED.finished_time,
        revenue_id = EXCLUDED.revenue_id;
    `, [
      q.id, q.barbershop_id || "profile", q.client_name, q.client_phone || null, q.client_id || null, q.barber_id || null, q.barber_name || null,
      JSON.stringify(q.service_ids || []), JSON.stringify(q.service_names || []), q.estimated_price || 0, q.status || "espera",
      q.arrival_time, q.called_time || null, q.finished_time || null, q.date, q.notes || null, q.revenue_id || null, q.appointment_id || null
    ]);
  } catch (err: any) {
    console.error("[PostgreSQL persistQueue Error]:", err.message);
  }
}

export async function persistBarber(b: any) {
  const pool = getDbPool();
  if (!pool || !isPgReady) return;
  try {
    await pool.query(`
      INSERT INTO barbers (
        id, barbershop_id, name, commission_percent, commission_type, commission_value, commission_overrides,
        phone, email, photo_url, join_date, authorized_services, authorized_products, user_id, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        commission_percent = EXCLUDED.commission_percent,
        commission_type = EXCLUDED.commission_type,
        commission_value = EXCLUDED.commission_value,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        photo_url = EXCLUDED.photo_url,
        active = EXCLUDED.active,
        authorized_services = EXCLUDED.authorized_services,
        authorized_products = EXCLUDED.authorized_products;
    `, [
      b.id, b.barbershop_id || "profile", b.name, b.commission_percent || 0, b.commission_type || "percent", b.commission_value || 0,
      JSON.stringify(b.commission_overrides || {}), b.phone || null, b.email || null, b.photo_url || null, b.join_date || null,
      JSON.stringify(b.authorized_services || []), JSON.stringify(b.authorized_products || []), b.user_id || null, b.active ?? true
    ]);
  } catch (err: any) {
    console.error("[PostgreSQL persistBarber Error]:", err.message);
  }
}

export async function persistClient(c: any) {
  const pool = getDbPool();
  if (!pool || !isPgReady) return;
  try {
    await pool.query(`
      INSERT INTO clients (id, barbershop_id, name, phone, birthdate, notes, has_plan, plan)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        birthdate = EXCLUDED.birthdate,
        notes = EXCLUDED.notes,
        has_plan = EXCLUDED.has_plan,
        plan = EXCLUDED.plan;
    `, [
      c.id, c.barbershop_id || "profile", c.name, c.phone || null, c.birthdate || null, c.notes || null,
      c.has_plan || false, c.plan ? JSON.stringify(c.plan) : null
    ]);
  } catch (err: any) {
    console.error("[PostgreSQL persistClient Error]:", err.message);
  }
}

export async function persistSubscription(sub: any) {
  const pool = getDbPool();
  if (!pool || !isPgReady) return;
  try {
    await pool.query(`
      INSERT INTO subscription (plan_id, status, max_barbers, multi_unit, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (plan_id) DO UPDATE SET
        status = EXCLUDED.status,
        max_barbers = EXCLUDED.max_barbers,
        multi_unit = EXCLUDED.multi_unit,
        updated_at = NOW();
    `, [sub.plan_id, sub.status || "active", sub.max_barbers || 10, sub.multi_unit ?? true]);
  } catch (err: any) {
    console.error("[PostgreSQL persistSubscription Error]:", err.message);
  }
}
