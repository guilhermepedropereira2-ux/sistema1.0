import express, { Request, Response } from "express";
import { db, authUser, getUnitFilter } from "../db.js";
import { newId, nowIso, todayStr, parseDateStr, formatBRL, QueueItem, Appointment, Revenue } from "../types.js";
import { persistQueue, persistAppointment, persistRevenue } from "../../src/db/sync.js";
import { storage } from "../storage.js";
import { calculateCommission } from "../services/commissionService.js";

const router = express.Router();

function recordAttendanceRevenue({
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
  const pm = db.paymentMethods.find((p) => p.id === payment_method_id) || db.paymentMethods[0];
  const barber = db.barbers.find((b) => b.id === barber_id);
  const feePercent = pm?.fees?.[payment_type] || 0;

  const calc = calculateCommission({
    gross,
    discount,
    feePercent,
    barber,
    settings: db.settings,
  });

  const paid = calc.paidAmount;
  const fee = calc.feeAmount;
  const net = calc.netAmount;
  const comm = calc.commissionAmount;
  const shop = calc.shopAmount;

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
    payment_channel: payment_channel || "Caixa Físico / Gaveta",
    payment_method: payment_method || (payment_type === "dinheiro" ? "Dinheiro" : payment_type === "pix" ? "PIX" : "Cartão"),
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

router.get("/queue", (req, res) => {
  const { date } = req.query as { date?: string };
  const d = date || todayStr();
  const unitFilter = getUnitFilter(req);
  let list = db.queue.filter((q) => (!date || q.date === d) && q.status !== "cancelado");
  if (unitFilter) {
    list = list.filter((q) => q.barbershop_id === unitFilter || (unitFilter === "unit_centro" && q.barbershop_id === "profile"));
  }
  res.json(list);
});

router.post("/queue", (req, res) => {
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

router.put("/queue/:id", (req, res) => {
  const idx = db.queue.findIndex((q) => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Item não encontrado na fila" });
  db.queue[idx] = { ...db.queue[idx], ...req.body };
  persistQueue(db.queue[idx]);
  res.json(db.queue[idx]);
});

// Chamar para a cadeira
router.post("/queue/:id/call", (req, res) => {
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
router.post("/queue/:id/finish", (req, res) => {
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
      payment_channel: body.payment_channel,
      payment_method: body.payment_method,
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

router.delete("/queue/:id", (req, res) => {
  const item = db.queue.find((q) => q.id === req.params.id);
  if (item) {
    item.status = "cancelado";
    db.logChange(`Removeu '${item.client_name}' da fila`, "queue");
  }
  res.json({ ok: true });
});

// ----------------------------- Appointments (Agenda) -----------------------------
router.get("/appointments", (req, res) => {
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

router.post("/appointments", (req, res) => {
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

router.put("/appointments/:id", (req, res) => {
  const idx = db.appointments.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Agendamento não encontrado" });
  db.appointments[idx] = { ...db.appointments[idx], ...req.body };
  persistAppointment(db.appointments[idx]);
  res.json(db.appointments[idx]);
});

// Iniciar atendimento do agendamento (1 clique para "Na Cadeira")
router.post("/appointments/:id/start-chair", (req, res) => {
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
router.post("/appointments/:id/finish", (req, res) => {
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
      payment_channel: body.payment_channel,
      payment_method: body.payment_method,
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

router.delete("/appointments/:id", (req, res) => {
  const apt = db.appointments.find((a) => a.id === req.params.id);
  if (apt) {
    apt.status = "cancelado";
    db.logChange(`Cancelou agendamento de '${apt.client_name}'`, "appointment");
  }
  res.json({ ok: true });
});


export default router;
