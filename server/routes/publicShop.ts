import express, { Request, Response } from "express";
import { db, DEMO_TENANT_ID } from "../db.js";
import { newId, nowIso, todayStr, Appointment } from "../types.js";
import { persistAppointment } from "../../src/db/sync.js";

const router = express.Router();

router.get("/public/shop/:slug", (req, res) => {
  const { slug } = req.params;
  const shop = db.barbershops.find(
    (b) => b.slug === slug || b.id === slug || (slug === "default" && b.id === DEMO_TENANT_ID)
  ) || (slug === db.barbershop.slug || slug === db.barbershop.id ? db.barbershop : null);

  // Verificar se o slug bate com a barbearia cadastrada
  if (!shop) {
    return res.status(404).json({ detail: "Barbearia não encontrada com o link informado." });
  }

  const shopSettings = db.getSettings(shop.id);

  // Carregar serviços ativos da barbearia
  const services = db.services
    .filter((s) => s.barbershop_id === shop.id && s.active !== false)
    .map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration_min: s.duration_min || 30,
    }));

  // Carregar barbeiros ativos da barbearia
  const barbers = db.barbers
    .filter((b) => b.barbershop_id === shop.id && b.active !== false)
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
      slug: shop.slug,
      document: shop.document,
      phone: shop.phone || shop.shop_phone,
      address: shop.address,
      logo_url: shop.logo_url,
      opening_hours: shop.opening_hours,
      city: shop.city,
      state: shop.state,
      operational_mode: shopSettings?.operational_mode || shop.operational_mode || "hibrido",
    },
    services,
    barbers,
  });
});

// Disponibilidade de horários em tempo real para o cliente
router.get("/public/shop/:slug/availability", (req, res) => {
  const { slug } = req.params;
  const shop = db.barbershops.find(
    (b) => b.slug === slug || b.id === slug || (slug === "default" && b.id === DEMO_TENANT_ID)
  ) || (slug === db.barbershop.slug || slug === db.barbershop.id ? db.barbershop : null);

  if (!shop) {
    return res.status(404).json({ detail: "Barbearia não encontrada" });
  }

  const { date, barber_id } = req.query as { date?: string; barber_id?: string };
  const targetDate = date || todayStr();

  const ALL_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30",
  ];

  // Agendamentos ativos na data especificada para este tenant
  const existingApts = db.appointments.filter(
    (a) => a.barbershop_id === shop.id && a.date === targetDate && a.status !== "cancelado"
  );

  // Barbeiros ativos aptos para agendamento
  const activeBarbers = db.barbers.filter(
    (b) => b.barbershop_id === shop.id && b.active !== false
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
router.post("/public/shop/:slug/book", (req, res) => {
  const { slug } = req.params;
  const shop = db.barbershops.find(
    (b) => b.slug === slug || b.id === slug || (slug === "default" && b.id === DEMO_TENANT_ID)
  ) || (slug === db.barbershop.slug || slug === db.barbershop.id ? db.barbershop : null);

  if (!shop) {
    return res.status(404).json({ detail: "Barbearia não encontrada" });
  }
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

  // Validar serviços selecionados estritamente para esta barbearia
  const svcs = db.services.filter(
    (s) => s.barbershop_id === shop.id && s.active !== false && service_ids.includes(s.id)
  );
  if (svcs.length === 0 || svcs.length !== service_ids.length) {
    return res.status(400).json({ detail: "Um ou mais serviços selecionados são inválidos ou não pertencem a esta barbearia." });
  }

  // Definir ou alocar barbeiro ativo estritamente desta barbearia
  const activeBarbers = db.barbers.filter(
    (b) => b.barbershop_id === shop.id && b.active !== false
  );
  let selectedBarber = null;

  if (barber_id && barber_id !== "any") {
    selectedBarber = activeBarbers.find((b) => b.id === barber_id);
    if (!selectedBarber) {
      return res.status(400).json({ detail: "Barbeiro selecionado não encontrado ou não pertence a esta barbearia." });
    }
  } else {
    const busyBarberIds = db.appointments
      .filter((a) => a.barbershop_id === shop.id && a.date === date && a.time === time && a.status !== "cancelado")
      .map((a) => a.barber_id);
    selectedBarber = activeBarbers.find((b) => !busyBarberIds.includes(b.id)) || activeBarbers[0];
  }

  if (!selectedBarber) {
    return res.status(400).json({ detail: "Nenhum barbeiro disponível para o horário selecionado nesta barbearia." });
  }

  // Verificar conflito de horário
  const conflict = db.appointments.find(
    (a) =>
      a.barbershop_id === shop.id &&
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
      c.barbershop_id === shop.id &&
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
    barbershop_id: shop.id,
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
    "Cliente Online",
    shop.id
  );
  db.scheduleSave();

  // WhatsApp confirmation URL
  const shopPhone = (shop.phone || shop.shop_phone || "11999998888").replace(/\D/g, "");
  const formattedDate = date.split("-").reverse().join("/");
  const serviceListStr = svcs.map((s) => s.name).join(", ");
  const waMessage = `💈 *Comprovante de Agendamento - ${shop.name} | Kupola*\n\n` +
    `👤 *Cliente:* ${client_name.trim()}\n` +
    `📱 *WhatsApp:* ${client_phone.trim()}\n` +
    `🗓 *Data:* ${formattedDate} às ${time}\n` +
    `✂️ *Serviço(s):* ${serviceListStr} (R$ ${price.toFixed(2)})\n` +
    `🧔 *Profissional:* ${selectedBarber.name}\n` +
    (notes ? `📝 *Obs:* ${notes}\n` : "") +
    `\n✅ Agendamento registrado com sucesso via *Kupola*!\nOlá! Confirmo meu agendamento na barbearia. Até breve!`;

  const whatsapp_url = `https://wa.me/55${shopPhone}?text=${encodeURIComponent(waMessage)}`;

  res.json({
    success: true,
    appointment: apt,
    whatsapp_url,
    message: "Agendamento confirmado com sucesso!",
  });
});

export default router;
