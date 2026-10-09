import express, { Request, Response } from "express";
import { db, enrichClient, getTenantId } from "../db.js";
import { newId, nowIso, todayStr, formatBRL, Category, Service, Product, CustomerPlan, Client } from "../types.js";
import { persistClient } from "../../src/db/sync.js";
import { requireAuth, requirePermission } from "../auth.js";

const router = express.Router();

// ==========================================
// 1. CATEGORIAS
// ==========================================
router.get("/categories", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const list = db.categories.filter((c) => c.barbershop_id === tenantId);
  res.json(list);
});

router.post("/categories", requireAuth, requirePermission("gerenciar_servicos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  const cat: Category = {
    id: newId(),
    barbershop_id: tenantId,
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

router.put("/categories/:id", requireAuth, requirePermission("gerenciar_servicos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.categories.findIndex((c) => c.id === req.params.id && c.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Categoria não encontrada" });
  db.categories[idx] = { ...db.categories[idx], ...req.body, barbershop_id: tenantId };
  res.json(db.categories[idx]);
});

router.delete("/categories/:id", requireAuth, requirePermission("gerenciar_servicos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  db.categories = db.categories.filter((c) => !(c.id === req.params.id && c.barbershop_id === tenantId));
  res.json({ ok: true });
});

// ==========================================
// 2. SERVIÇOS
// ==========================================
router.get("/services", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const list = db.services.filter((s) => s.barbershop_id === tenantId);
  res.json(list);
});

router.post("/services", requireAuth, requirePermission("gerenciar_servicos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  const svc: Service = {
    id: newId(),
    barbershop_id: tenantId,
    name: body.name,
    price: Number(body.price || 0),
    duration_min: Number(body.duration_min || 30),
    icon: body.icon || "corte_tradicional",
    active: body.active !== false,
    created_at: nowIso(),
  };
  db.services.push(svc);
  db.logChange(`Cadastrou serviço '${svc.name}' (${formatBRL(svc.price)})`, "service", null, svc);
  res.json(svc);
});

router.put("/services/:id", requireAuth, requirePermission("gerenciar_servicos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.services.findIndex((s) => s.id === req.params.id && s.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Serviço não encontrado" });
  db.services[idx] = { ...db.services[idx], ...req.body, barbershop_id: tenantId };
  res.json(db.services[idx]);
});

router.delete("/services/:id", requireAuth, requirePermission("gerenciar_servicos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  db.services = db.services.filter((s) => !(s.id === req.params.id && s.barbershop_id === tenantId));
  res.json({ ok: true });
});

// ==========================================
// 3. PRODUTOS
// ==========================================
router.get("/products", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const list = db.products.filter((p) => p.barbershop_id === tenantId);
  res.json(list);
});

router.post("/products", requireAuth, requirePermission("gerenciar_produtos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  const prod: Product = {
    id: newId(),
    barbershop_id: tenantId,
    name: body.name,
    price: Number(body.price || 0),
    cost: Number(body.cost || 0),
    stock: Number(body.stock || 0),
    icon: body.icon || "produto",
    active: body.active !== false,
    created_at: nowIso(),
  };
  db.products.push(prod);
  db.logChange(`Cadastrou produto '${prod.name}'`, "product", null, prod);
  res.json(prod);
});

router.put("/products/:id", requireAuth, requirePermission("gerenciar_produtos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.products.findIndex((p) => p.id === req.params.id && p.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Produto não encontrado" });
  db.products[idx] = { ...db.products[idx], ...req.body, barbershop_id: tenantId };
  res.json(db.products[idx]);
});

router.delete("/products/:id", requireAuth, requirePermission("gerenciar_produtos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  db.products = db.products.filter((p) => !(p.id === req.params.id && p.barbershop_id === tenantId));
  res.json({ ok: true });
});

// ==========================================
// 4. PLANOS DE ASSINATURA DE CLIENTES
// ==========================================
router.get("/customer-plans", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const plans = db.customerPlans
    .filter((p) => p.barbershop_id === tenantId)
    .map((p) => {
      const subscribers_count = db.clients.filter(
        (c) =>
          c.barbershop_id === tenantId &&
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

router.post("/customer-plans", requireAuth, requirePermission("alterar_configuracoes"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  if (!body.name?.trim())
    return res.status(400).json({ detail: "Nome do plano é obrigatório" });
  const price = Number(body.price || 0);
  if (price < 0) return res.status(400).json({ detail: "Preço inválido" });

  const isUnlimited = Boolean(body.is_unlimited);
  const plan: CustomerPlan = {
    id: `cplan_${newId().slice(0, 8)}`,
    barbershop_id: tenantId,
    name: body.name.trim(),
    price,
    billing_cycle: body.billing_cycle || "mensal",
    is_unlimited: isUnlimited,
    total_services_per_month: isUnlimited
      ? 999
      : Number(body.total_services_per_month || 4),
    allowed_services: Array.isArray(body.allowed_services)
      ? body.allowed_services
      : [],
    service_limits: Array.isArray(body.service_limits)
      ? body.service_limits
      : [],
    notes: body.notes || "",
    active: body.active !== false,
    created_at: nowIso(),
  };

  db.customerPlans.push(plan);
  db.logChange(`Criou plano de assinatura de cliente '${plan.name}' (${formatBRL(plan.price)})`, "customer_plan", null, plan);
  res.json(plan);
});

router.put("/customer-plans/:id", requireAuth, requirePermission("alterar_configuracoes"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.customerPlans.findIndex((p) => p.id === req.params.id && p.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Plano não encontrado" });

  const body = req.body || {};
  db.customerPlans[idx] = {
    ...db.customerPlans[idx],
    ...body,
    barbershop_id: tenantId,
  };
  db.logChange(`Atualizou plano de assinatura '${db.customerPlans[idx].name}'`, "customer_plan", null, db.customerPlans[idx]);
  res.json(db.customerPlans[idx]);
});

router.delete("/customer-plans/:id", requireAuth, requirePermission("alterar_configuracoes"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const plan = db.customerPlans.find((p) => p.id === req.params.id && p.barbershop_id === tenantId);
  db.customerPlans = db.customerPlans.filter((p) => !(p.id === req.params.id && p.barbershop_id === tenantId));
  if (plan) db.logChange(`Excluiu plano de assinatura '${plan.name}'`, "customer_plan", plan, null);
  res.json({ ok: true });
});

// ==========================================
// 5. CLIENTES
// ==========================================
router.get("/clients", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const list = db.clients.filter((c) => c.barbershop_id === tenantId);
  const enriched = list.map(enrichClient);
  enriched.sort((a, b) => a.name.localeCompare(b.name));
  res.json(enriched);
});

router.get("/clients/:id", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const client = db.clients.find((c) => c.id === req.params.id && c.barbershop_id === tenantId);
  if (!client) return res.status(404).json({ detail: "Cliente não encontrado" });
  res.json(enrichClient(client));
});

router.post("/clients", requireAuth, requirePermission("gerenciar_clientes"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  if (!body.name?.trim())
    return res.status(400).json({ detail: "Nome do cliente é obrigatório" });

  const client: Client = {
    id: newId(),
    barbershop_id: tenantId,
    name: body.name.trim(),
    phone: body.phone,
    email: body.email,
    cpf: body.cpf,
    photo: body.photo,
    avatar: body.avatar,
    birthdate: body.birthdate,
    notes: body.notes,
    has_plan: Boolean(body.has_plan),
    plan: body.plan,
    created_at: nowIso(),
  };

  db.clients.push(client);
  persistClient(client);
  db.logChange(`Cadastrou cliente '${client.name}'`, "client", null, client);
  res.json(enrichClient(client));
});

router.put("/clients/:id", requireAuth, requirePermission("gerenciar_clientes"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.clients.findIndex((c) => c.id === req.params.id && c.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Cliente não encontrado" });

  const body = req.body || {};
  db.clients[idx] = {
    ...db.clients[idx],
    ...body,
    barbershop_id: tenantId,
  };

  persistClient(db.clients[idx]);
  db.logChange(`Atualizou cadastro do cliente '${db.clients[idx].name}'`, "client", null, db.clients[idx]);
  res.json(enrichClient(db.clients[idx]));
});

router.delete("/clients/:id", requireAuth, requirePermission("gerenciar_clientes"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const client = db.clients.find((c) => c.id === req.params.id && c.barbershop_id === tenantId);
  db.clients = db.clients.filter((c) => !(c.id === req.params.id && c.barbershop_id === tenantId));
  if (client) db.logChange(`Excluiu cliente '${client.name}'`, "client", client, null);
  res.json({ ok: true });
});

export default router;
