import express, { Request, Response } from "express";
import { db, authUser, enrichClient } from "../db.js";
import { newId, nowIso, todayStr, formatBRL, Category, Service, Product, CustomerPlan, Client } from "../types.js";
import { persistClient } from "../../src/db/sync.js";

const router = express.Router();

router.get("/categories", (req, res) => {
  res.json(db.categories);
});

router.post("/categories", (req, res) => {
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

router.put("/categories/:id", (req, res) => {
  const idx = db.categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Categoria não encontrada" });
  db.categories[idx] = { ...db.categories[idx], ...req.body };
  res.json(db.categories[idx]);
});

router.delete("/categories/:id", (req, res) => {
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  res.json({ ok: true });
});

// Services & Products
router.get("/services", (req, res) => {
  res.json(db.services);
});

router.post("/services", (req, res) => {
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

router.put("/services/:id", (req, res) => {
  const idx = db.services.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Serviço não encontrado" });
  db.services[idx] = { ...db.services[idx], ...req.body };
  res.json(db.services[idx]);
});

router.delete("/services/:id", (req, res) => {
  db.services = db.services.filter((s) => s.id !== req.params.id);
  res.json({ ok: true });
});

router.get("/products", (req, res) => {
  res.json(db.products);
});

router.post("/products", (req, res) => {
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

router.put("/products/:id", (req, res) => {
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Produto não encontrado" });
  db.products[idx] = { ...db.products[idx], ...req.body };
  res.json(db.products[idx]);
});

router.delete("/products/:id", (req, res) => {
  db.products = db.products.filter((p) => p.id !== req.params.id);
  res.json({ ok: true });
});

// Helper to record revenue from an attendance (queue or appointment)
router.get("/customer-plans", (req, res) => {
  const plans = db.customerPlans.map((p) => {
    const subscribers_count = db.clients.filter(
      (c) =>
        c.has_plan &&
        (c.plan?.plan_id === p.id ||
          c.plan?.name?.toLowerCase() === p.name.toLowerCase())
    ).length;
    return {
      ...p,
      subscribers_count,
    };
  });
  res.json(plans);
});

router.post("/customer-plans", (req, res) => {
  const body = req.body || {};
  if (!body.name?.trim())
    return res.status(400).json({ detail: "Nome do plano é obrigatório" });
  const price = Number(body.price || 0);
  if (price < 0) return res.status(400).json({ detail: "Preço inválido" });

  const isUnlimited = Boolean(body.is_unlimited);
  const plan: CustomerPlan = {
    id: `cplan_${newId().slice(0, 8)}`,
    barbershop_id: "profile",
    name: body.name.trim(),
    price,
    billing_cycle: body.billing_cycle || "mensal",
    is_unlimited: isUnlimited,
    total_credits: isUnlimited ? 999 : Number(body.total_credits || 4),
    services: Array.isArray(body.services) ? body.services : [],
    notes: body.notes || "",
    active: body.active !== false,
    created_at: nowIso(),
  };

  db.customerPlans.push(plan);
  db.logChange(
    `Cadastrou novo plano de clientes '${plan.name}' (${formatBRL(price)}/mês)`,
    "customer_plan",
    null,
    plan
  );
  res.json(plan);
});

router.put("/customer-plans/:id", (req, res) => {
  const idx = db.customerPlans.findIndex((p) => p.id === req.params.id);
  if (idx === -1)
    return res.status(404).json({ detail: "Plano não encontrado" });
  const body = req.body || {};
  const isUnlimited =
    body.is_unlimited !== undefined
      ? Boolean(body.is_unlimited)
      : db.customerPlans[idx].is_unlimited;

  db.customerPlans[idx] = {
    ...db.customerPlans[idx],
    ...body,
    is_unlimited: isUnlimited,
    total_credits: isUnlimited
      ? 999
      : body.total_credits
      ? Number(body.total_credits)
      : db.customerPlans[idx].total_credits,
  };
  db.logChange(
    `Atualizou o plano de clientes '${db.customerPlans[idx].name}'`,
    "customer_plan"
  );
  res.json(db.customerPlans[idx]);
});

router.delete("/customer-plans/:id", (req, res) => {
  const idx = db.customerPlans.findIndex((p) => p.id === req.params.id);
  if (idx === -1)
    return res.status(404).json({ detail: "Plano não encontrado" });
  const planName = db.customerPlans[idx].name;
  db.customerPlans.splice(idx, 1);
  db.logChange(`Excluiu o plano de clientes '${planName}'`, "customer_plan");
  res.json({ ok: true });
});

// Clients
router.get("/clients", (req, res) => {
  res.json(db.clients.map(enrichClient));
});

router.post("/clients", (req, res) => {
  const body = req.body || {};
  if (!body.name?.trim()) {
    return res.status(400).json({ detail: "Nome é obrigatório" });
  }

  let planData = undefined;
  let hasPlan = false;

  if (body.plan_id) {
    const cp = db.customerPlans.find((p) => p.id === body.plan_id);
    if (cp) {
      hasPlan = true;
      const today = todayStr();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const dueStr = dueDate.toISOString().slice(0, 10);
      planData = {
        plan_id: cp.id,
        name: cp.name,
        price: cp.price,
        billing_cycle: cp.billing_cycle,
        is_unlimited: cp.is_unlimited,
        total: cp.is_unlimited ? 999 : cp.total_credits || 4,
        used: 0,
        start: today,
        due: dueStr,
      };
    }
  } else if (body.plan && body.plan.name) {
    hasPlan = true;
    planData = {
      plan_id: body.plan.plan_id,
      name: body.plan.name,
      price: Number(body.plan.price || 0),
      billing_cycle: body.plan.billing_cycle || "mensal",
      is_unlimited: Boolean(body.plan.is_unlimited),
      total: body.plan.is_unlimited ? 999 : Number(body.plan.total || 4),
      used: Number(body.plan.used || 0),
      start: body.plan.start || todayStr(),
      due: body.plan.due,
    };
  }

  const c: Client = {
    id: newId(),
    barbershop_id: "profile",
    name: body.name.trim(),
    phone: body.phone?.trim() || null,
    birthdate: body.birthdate || null,
    notes: body.notes || null,
    has_plan: hasPlan,
    plan: planData,
    created_at: nowIso(),
  };
  db.clients.unshift(c);
  persistClient(c);
  db.logChange(`Cadastrou cliente '${c.name}'`, "client", null, c);
  res.json(enrichClient(c));
});

router.get("/clients/:id", (req, res) => {
  const c = db.clients.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ detail: "Cliente não encontrado" });

  const clientRevenues = db.revenues
    .filter(
      (r) =>
        (r.client_id && r.client_id === c.id) ||
        (r.client_name && r.client_name.toLowerCase() === c.name.toLowerCase())
    )
    .map((r) => ({
      sale_group_id: r.id,
      date: r.date,
      time: r.time,
      barber_name: r.barber_name,
      paid: r.paid_amount,
      discount: r.discount_amount,
      payment_method_name: r.payment_method_name,
      status: r.status,
      items: [{ name: r.service_name, quantity: r.quantity }],
      plan_used: Boolean(
        r.note?.includes("plano") || r.note?.includes("assinatura")
      ),
    }));

  res.json({
    ...enrichClient(c),
    history: clientRevenues,
  });
});

router.put("/clients/:id", (req, res) => {
  const idx = db.clients.findIndex((x) => x.id === req.params.id);
  if (idx === -1)
    return res.status(404).json({ detail: "Cliente não encontrado" });
  db.clients[idx] = { ...db.clients[idx], ...req.body };
  persistClient(db.clients[idx]);
  res.json(enrichClient(db.clients[idx]));
});

router.delete("/clients/:id", (req, res) => {
  db.clients = db.clients.filter((x) => x.id !== req.params.id);
  res.json({ ok: true });
});

router.put("/clients/:id/plan", (req, res) => {
  const c = db.clients.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ detail: "Cliente não encontrado" });
  const body = req.body || {};
  const isUnlimited = Boolean(body.is_unlimited);
  const total = isUnlimited ? 999 : Number(body.total || 4);
  const used =
    body.used != null
      ? Number(body.used)
      : c.plan?.name === body.name
      ? c.plan?.used || 0
      : 0;

  let due = body.due;
  if (!due) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    due = d.toISOString().slice(0, 10);
  }

  c.has_plan = true;
  c.plan = {
    plan_id: body.plan_id || c.plan?.plan_id,
    name: body.name || "Assinatura Mensal",
    price: body.price != null ? Number(body.price) : c.plan?.price,
    billing_cycle: body.billing_cycle || c.plan?.billing_cycle || "mensal",
    is_unlimited: isUnlimited,
    total,
    used,
    start: body.start || c.plan?.start || todayStr(),
    due,
  };
  persistClient(c);
  db.logChange(`Atribuiu plano '${c.plan.name}' para ${c.name}`, "client");
  res.json(enrichClient(c));
});

router.post("/clients/:id/plan/renew", (req, res) => {
  const c = db.clients.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ detail: "Cliente não encontrado" });
  if (!c.plan)
    return res
      .status(400)
      .json({ detail: "Cliente não possui plano para renovar" });

  const today = todayStr();
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  const newDue = nextMonth.toISOString().slice(0, 10);

  c.plan.used = 0;
  c.plan.start = today;
  c.plan.due = newDue;
  c.has_plan = true;
  persistClient(c);
  db.logChange(
    `Renovou o plano '${c.plan.name}' do cliente ${c.name} até ${newDue}`,
    "client"
  );
  res.json(enrichClient(c));
});

router.delete("/clients/:id/plan", (req, res) => {
  const c = db.clients.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ detail: "Cliente não encontrado" });
  const oldPlanName = c.plan?.name || "Plano";
  c.has_plan = false;
  c.plan = undefined;
  persistClient(c);
  db.logChange(
    `Removeu o plano '${oldPlanName}' do cliente ${c.name}`,
    "client"
  );
  res.json(enrichClient(c));
});

// Users

export default router;
