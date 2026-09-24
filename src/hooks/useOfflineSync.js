import { useState, useEffect, useCallback } from "react";
import {
  getOfflineQueue,
  saveToOfflineQueue,
  syncOfflineQueue,
  cacheBarberMetadata,
  getCachedBarberMetadata,
} from "@/lib/offlineSync";
import { toast } from "sonner";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });

  const [queue, setQueue] = useState(() => getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  // Sincroniza estado da conexão e fila local
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Conexão com a internet restabelecida. Sincronizando dados...", {
        duration: 3500,
      });
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Você está sem conexão com a internet. O modo offline foi ativado automaticamente.", {
        duration: 4500,
      });
    };

    const handleQueueChange = () => {
      setQueue(getOfflineQueue());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("barber-offline-queue-changed", handleQueueChange);

    // Se estiver online e houver pendências na montagem, sincroniza
    if (typeof navigator !== "undefined" && navigator.onLine && getOfflineQueue().length > 0) {
      triggerSync();
    }

    // Intervalo de verificação a cada 20 segundos para envio de pendências
    const interval = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine && getOfflineQueue().length > 0) {
        triggerSync();
      }
    }, 20000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("barber-offline-queue-changed", handleQueueChange);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { success: false, reason: "offline" };
    }
    const current = getOfflineQueue();
    if (!current.length) return { success: true, syncedCount: 0 };

    setIsSyncing(true);
    try {
      const res = await syncOfflineQueue();
      if (res?.syncedCount > 0) {
        toast.success(
          `${res.syncedCount} atendimento(s) salvo(s) offline foram sincronizados com sucesso!`
        );
      }
      setQueue(getOfflineQueue());
      return res;
    } catch (err) {
      console.error("Falha ao sincronizar atendimentos offline:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isOnline,
    queue,
    pendingCount: queue.length,
    isSyncing,
    syncNow: triggerSync,
    saveOffline: saveToOfflineQueue,
    cacheMetadata: cacheBarberMetadata,
    getCachedMetadata: getCachedBarberMetadata,
  };
}

export default useOfflineSync;
