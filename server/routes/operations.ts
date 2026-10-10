import express, { Request, Response } from "express";
import { db, authUser, getUnitFilter, getTenantId } from "../db.js";
import { newId, nowIso, todayStr, parseDateStr, formatBRL, QueueItem, Appointment, Revenue } from "../types.js";
import { persistQueue, persistAppointment, persistRevenue } from "../../src/db/sync.js";
import { calculateCommission } from "../services/commissionService.js";
import { requireAuth, requirePermission } from "../auth.js";

const router = express.Router();

function recordAttendanceRevenue({
  tenantId,
  gross,
  discount = 0,
  payment_method_id,
  payment_type = "dinheiro",
  payment_channel,
  payment_method,
  barber_id,
  client_name,
  client_id,
  service_name,
  date,
  time,
}: {
  tenantId: string;
  gross: number;
  discount?: number;
  payment_method_id?: string;
  payment_type?: string;
  payment_channel?: string;
  payment_method?: string;
  barber_id?: string;
  client_name?: string;
  client_id?: string;
  service_name?: string;
  date?: string;
  time?: string;
}): Revenue {
  const pm = db.paymentMethods.find((p) => p.id === payment_method_id && p.barbershop_id === tenantId) ||
    db.paymentMethods.find((p) => p.barbershop_id === tenantId);
  const barber = db.barbers.find((b) => b.id === barber_id && b.barbershop_id === tenantId);
  const feePercent = pm?.fees?.[payment_type] || 0;

  const calc = calculateCommission({
    gross,
    discount,
    feePercent,
    barber,
    settings: db.getSettings(tenantId),
  });

  const paid = calc.paidAmount;
  const fee = calc.feeAmount;
  const net = calc.netAmount;
  const comm = calc.commissionAmount;
  const shop = calc.shopAmount;

  const settlementDays = pm?.settlement_days?.[payment_type] || 0;
  const dateObj = parseDateStr(date || todayStr());
  const settlementDate = new Date(dateObj.getTime() + settlementDays * 86400000).toISOString().split("T")[0];

  const rev: Revenue = {
    id: newId(),
    barbershop_id: tenantId,
    unit_id: tenantId,
    date: date || todayStr(),
    time: time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    item_kind: "servico",
    service_type: "cabelo",
    service_name: service_name || "Atendimento Operacional",
    quantity: 1,
    gross_amount: gross,
    discount_amount: discount,
    paid_amount: paid,
    payment_method_id: pm?.id || "pm_default",
    payment_method_name: pm?.name || "Dinheiro",
    payment_type: payment_type || "dinheiro",
    payment_channel: payment_channel || "presencial",
    payment_method: payment_method || pm?.name || "Dinheiro",
    fee_percent: feePercent,
    fee_amount: fee,
    net_amount: net,
    barber_id: barber?.id,
    barber_name: barber?.name,
    commission_percent: calc.effectivePercent,
    commission_amount: comm,
    shop_amount: shop,
    client_id,
    client_name,
    settlement_date: settlementDate,
    available: settlementDate <= todayStr(),
    commission_paid: false,
    status: "ativo",
    created_at: nowIso(),
  };

  db.revenues.unshift(rev);
  persistRevenue(rev);
  db.logChange(`Registrou receita de ${formatBRL(paid)} (${rev.service_name})`, "revenue", null, rev);
  return rev;
}

// ----------------------------- Fila (Queue) -----------------------------
router.get("/queue", requireAuth, (req: Request, res: Response) => {
  const { date } = req.query as { date?: string };
  const d = date || todayStr();
  const tenantId = getTenantId(req);
  const unitFilter = getUnitFilter(req);

  let list = db.queue.filter((q) => q.barbershop_id === tenantId && (!date || q.date === d) && q.status !== "cancelado");
  if (unitFilter) {
    list = list.filter((q) => q.unit_id === unitFilter || q.barbershop_id === unitFilter);
  }
  res.json(list);
});

router.post("/queue", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  if (!body.client_name?.trim()) {
    return res.status(400).json({ detail: "Nome do cliente é obrigatório" });
  }

  let barber = null;
  if (body.barber_id) {
    barber = db.barbers.find((b) => b.id === body.barber_id && b.barbershop_id === tenantId);
  }

  const service_ids = Array.isArray(body.service_ids) ? body.service_ids : [];
  const selectedSvcs = db.services.filter((s) => s.barbershop_id === tenantId && service_ids.includes(s.id));
  const service_names = selectedSvcs.map((s) => s.name);
  let estimated_price = selectedSvcs.reduce((acc, s) => acc + s.price, 0);
  if (body.estimated_price !== undefined) {
    estimated_price = Number(body.estimated_price);
  }

  const assignedUnit = getUnitFilter(req) || body.unit_id || tenantId;

  const item: QueueItem = {
    id: newId(),
    barbershop_id: tenantId,
    unit_id: assignedUnit,
    client_name: body.client_name.trim(),
    client_phone: body.client_phone || undefined,
    client_id: body.client_id || undefined,
    barber_id: barber?.id,
    barber_name: barber?.name,
    service_ids,
    service_names: service_names.length ? service_names : [body.service_name || "Corte Tradicional"],
    estimated_price: estimated_price || 50,
    status: "espera",
    arrival_time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    date: todayStr(),
    notes: body.notes || undefined,
    created_at: nowIso(),
  };

  db.queue.push(item);
  persistQueue(item);
  db.logChange(`Adicionou '${item.client_name}' à fila de espera`, "queue", null, item);
  res.json(item);
});

router.put("/queue/:id", requireAuth, requirePermission("gerenciar_fila"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.queue.findIndex((q) => q.id === req.params.id && q.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Item da fila não encontrado" });

  db.queue[idx] = { ...db.queue[idx], ...req.body, barbershop_id: tenantId };
  persistQueue(db.queue[idx]);
  res.json(db.queue[idx]);
});

router.post("/queue/:id/finish", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const item = db.queue.find((q) => q.id === req.params.id && q.barbershop_id === tenantId);
  if (!item) return res.status(404).json({ detail: "Item da fila não encontrado" });

  const body = req.body || {};
  item.status = "finalizado";
  item.finished_time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let rev: Revenue | null = null;
  if (body.payment_method_id || body.payment_type) {
    const gross = Number(body.gross_amount ?? item.estimated_price ?? 50);
    const discount = Number(body.discount_amount ?? 0);
    rev = recordAttendanceRevenue({
      tenantId,
      gross,
      discount,
      payment_method_id: body.payment_method_id,
      payment_type: body.payment_type || "dinheiro",
      payment_channel: body.payment_channel,
      payment_method: body.payment_method,
      barber_id: item.barber_id,
      client_name: item.client_name,
      client_id: item.client_id,
      service_name: item.service_names?.join(", ") || "Atendimento Fila",
      date: item.date,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    });
    item.revenue_id = rev.id;
  }

  persistQueue(item);
  db.logChange(`Finalizou atendimento de '${item.client_name}' da fila`, "queue", null, item);
  res.json({ item, revenue: rev });
});

router.delete("/queue/:id", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const item = db.queue.find((q) => q.id === req.params.id && q.barbershop_id === tenantId);
  if (item) {
    item.status = "cancelado";
    persistQueue(item);
  }
  res.json({ ok: true });
});

// ----------------------------- Agendamentos (Appointments) -----------------------------
router.get("/appointments", requireAuth, (req: Request, res: Response) => {
  const { date, month, barber_id } = req.query as { date?: string; month?: string; barber_id?: string };
  const tenantId = getTenantId(req);
  const unitFilter = getUnitFilter(req);

  let list = db.appointments.filter((a) => a.barbershop_id === tenantId);

  if (unitFilter) {
    list = list.filter((a) => a.unit_id === unitFilter || a.barbershop_id === unitFilter);
  }
  if (date) list = list.filter((a) => a.date === date);
  if (month) list = list.filter((a) => a.date.startsWith(month));
  if (barber_id) list = list.filter((a) => a.barber_id === barber_id);

  list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  res.json(list);
});

router.post("/appointments", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  if (!body.client_name?.trim()) return res.status(400).json({ detail: "Nome do cliente é obrigatório" });
  if (!body.barber_id) return res.status(400).json({ detail: "Barbeiro é obrigatório" });
  if (!body.date || !body.time) return res.status(400).json({ detail: "Data e horário são obrigatórios" });

  const barber = db.barbers.find((b) => b.id === body.barber_id && b.barbershop_id === tenantId);
  const service_ids = Array.isArray(body.service_ids) ? body.service_ids : [];
  const selectedSvcs = db.services.filter((s) => s.barbershop_id === tenantId && service_ids.includes(s.id));
  const service_names = selectedSvcs.map((s) => s.name);
  const price = Number(body.price ?? selectedSvcs.reduce((acc, s) => acc + s.price, 0) ?? 50);
  const duration = Number(body.duration_min ?? selectedSvcs.reduce((acc, s) => acc + s.duration_min, 0) ?? 30);

  const assignedUnit = getUnitFilter(req) || body.unit_id || tenantId;

  const appt: Appointment = {
    id: newId(),
    barbershop_id: tenantId,
    unit_id: assignedUnit,
    client_name: body.client_name.trim(),
    client_phone: body.client_phone,
    client_id: body.client_id,
    barber_id: barber?.id || body.barber_id,
    barber_name: barber?.name || "Barbeiro",
    service_ids,
    service_names: service_names.length ? service_names : [body.service_name || "Corte Tradicional"],
    date: body.date,
    time: body.time,
    duration_min: duration,
    price,
    status: body.status || "confirmado",
    notes: body.notes,
    created_at: nowIso(),
  };

  db.appointments.push(appt);
  persistAppointment(appt);
  db.logChange(`Agendou '${appt.client_name}' para ${appt.date} às ${appt.time}`, "appointment", null, appt);
  res.json(appt);
});

router.put("/appointments/:id", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.appointments.findIndex((a) => a.id === req.params.id && a.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Agendamento não encontrado" });

  db.appointments[idx] = { ...db.appointments[idx], ...req.body, barbershop_id: tenantId };
  persistAppointment(db.appointments[idx]);
  res.json(db.appointments[idx]);
});

router.delete("/appointments/:id", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const appt = db.appointments.find((a) => a.id === req.params.id && a.barbershop_id === tenantId);
  if (appt) {
    appt.status = "cancelado";
    persistAppointment(appt);
  }
  res.json({ ok: true });
});

export default router;
