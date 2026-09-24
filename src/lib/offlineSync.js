import { api } from "@/lib/api";

export const BARBER_OFFLINE_QUEUE_KEY = "barber_offline_atendimentos_queue";
export const BARBER_METADATA_CACHE_PREFIX = "barber_cache_";

/**
 * Retorna a lista atual de atendimentos pendentes armazenados no localStorage.
 */
export function getOfflineQueue() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(BARBER_OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Erro ao ler fila offline do localStorage:", e);
    return [];
  }
}

/**
 * Salva a fila atualizada no localStorage e notifica os componentes.
 */
function setOfflineQueue(queue) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(BARBER_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(
      new CustomEvent("barber-offline-queue-changed", {
        detail: { count: queue.length, queue },
      })
    );
  } catch (e) {
    console.error("Erro ao salvar fila offline no localStorage:", e);
  }
}

/**
 * Armazena um atendimento localmente para sincronização futura.
 * Retorna um objeto de atendimento com campos formatados para renderização otimista imediata.
 */
export function saveToOfflineQueue(payload, extraInfo = {}) {
  const currentQueue = getOfflineQueue();
  const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const gross = items.reduce(
    (acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0
  );
  const discount = Number(payload?.discount_amount) || 0;
  const paid = Math.max(0, gross - discount);

  // Estimativa de comissão baseada em percentual médio caso o barbeiro não esteja conectado
  const barberCommPct = extraInfo?.commission_percent ?? 50;
  const commission = Number(((paid * barberCommPct) / 100).toFixed(2));

  const now = new Date();
  const dateStr = payload?.date || now.toISOString().slice(0, 10);
  const timeStr = payload?.time || now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const offlineItem = {
    id: tempId,
    temp_id: tempId,
    sale_group_id: tempId,
    payload,
    created_at: now.toISOString(),
    date: dateStr,
    time: timeStr,
    client_id: payload?.client_id || null,
    client_name: payload?.client_name || "Cliente avulso (Offline)",
    payment_method_id: payload?.payment_method_id,
    payment_method_name: extraInfo?.payment_method_name || "Pagamento registrado offline",
    payment_type: payload?.payment_type || "dinheiro",
    items: items.map((it, idx) => ({
      id: `${tempId}_item_${idx}`,
      name: it.name || "Serviço",
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      item_kind: it.item_kind || "servico",
    })),
    gross_amount: gross,
    discount_amount: discount,
    paid_amount: paid,
    paid,
    total: paid,
    commission_amount: commission,
    commission,
    commission_paid: false,
    status: "ativo",
    is_offline: true,
    synced: false,
  };

  const updated = [offlineItem, ...currentQueue];
  setOfflineQueue(updated);

  return offlineItem;
}

/**
 * Remove um atendimento da fila offline pelo ID ou temp_id.
 */
export function removeFromOfflineQueue(id) {
  const currentQueue = getOfflineQueue();
  const updated = currentQueue.filter((item) => item.id !== id && item.temp_id !== id);
  setOfflineQueue(updated);
}

/**
 * Limpa todos os itens da fila offline.
 */
export function clearOfflineQueue() {
  setOfflineQueue([]);
}

let isSyncInProgress = false;

/**
 * Sincroniza todos os atendimentos pendentes da fila com o servidor backend.
 */
export async function syncOfflineQueue() {
  if (isSyncInProgress) {
    return { success: false, inProgress: true };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { success: false, reason: "offline" };
  }

  const queue = getOfflineQueue();
  if (!queue.length) {
    return { success: true, syncedCount: 0, remainingCount: 0 };
  }

  isSyncInProgress = true;
  let syncedCount = 0;
  const remaining = [];
  const syncedItems = [];

  try {
    for (const item of queue) {
      try {
        const res = await api.post("/barber/atendimento", item.payload);
        syncedCount++;
        syncedItems.push(res);
      } catch (err) {
        // Se for erro de validação (ex: 400 Bad Request com payload incorreto), descarta para não travar a fila
        const status = err?.response?.status;
        const isNetworkError = !err?.response || err?.code === "ERR_NETWORK" || err?.message?.toLowerCase().includes("network");

        if (isNetworkError) {
          // Servidor ainda inacessível: preserva o item e interrompe tentativa atual
          remaining.push(item);
          break;
        } else if (status >= 400 && status < 500) {
          console.warn("Item inválido descartado da fila offline:", item, err?.response?.data);
        } else {
          // Erro 5xx no servidor: tenta novamente no próximo ciclo
          remaining.push(item);
        }
      }
    }

    setOfflineQueue(remaining);

    if (syncedCount > 0) {
      // Dispara evento global para que todas as telas atualizem dados do servidor
      window.dispatchEvent(
        new CustomEvent("barber-atendimento-created", {
          detail: { syncedBatch: syncedItems, syncedCount },
        })
      );
      window.dispatchEvent(
        new CustomEvent("barber-offline-sync-completed", {
          detail: { syncedCount, remainingCount: remaining.length },
        })
      );
    }

    return {
      success: true,
      syncedCount,
      remainingCount: remaining.length,
    };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Cache de metadados (serviços, produtos, formas de pagamento e clientes) para
 * permitir o preenchimento completo do formulário mesmo sem internet.
 */
export function cacheBarberMetadata(key, data) {
  if (typeof window === "undefined" || !window.localStorage || !data) return;
  try {
    localStorage.setItem(`${BARBER_METADATA_CACHE_PREFIX}${key}`, JSON.stringify(data));
  } catch (e) {
    console.error("Erro ao salvar metadados offline no cache:", e);
  }
}

export function getCachedBarberMetadata(key, fallback = null) {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const raw = localStorage.getItem(`${BARBER_METADATA_CACHE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Inicia escuta automática do evento 'online' do navegador para sincronização imediata
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    // Pequeno delay para garantir estabilização da conexão antes do envio
    setTimeout(() => {
      syncOfflineQueue();
    }, 1500);
  });
}
