import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

/**
 * Hook customizado para polling leve a cada 30 segundos das métricas financeiras.
 *
 * Características:
 * - Intervalo configurável (padrão: 30 segundos = 30.000ms).
 * - Sincronização em segundo plano sem recarregar a página (silent revalidation).
 * - Inteligente para economia de recursos: pausa quando a aba está inativa e
 *   executa revalidação imediata quando o usuário retorna à aba.
 * - Suporta endpoint customizado ou função assíncrona customizada.
 * - Retorna métricas essenciais normalizadas (faturamentoDiario, totalAtendimentos, etc.).
 *
 * @param {Object} options
 * @param {number} [options.interval=30000] - Intervalo de polling em milissegundos
 * @param {string} [options.endpoint="/financial/metrics-polling"] - Endpoint a ser consultado
 * @param {Function} [options.fetcher] - Função customizada de busca (recebe instância da api)
 * @param {boolean} [options.enabled=true] - Habilitar/desabilitar polling
 * @param {Function} [options.onUpdate] - Callback executado a cada atualização com sucesso
 * @param {Array} [options.deps=[]] - Dependências extras para reiniciar o ciclo
 */
export function useFinancialMetricsPolling(options = {}) {
  const {
    interval = 30000,
    endpoint = "/financial/metrics-polling",
    fetcher,
    enabled = true,
    onUpdate,
    deps = [],
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const isMountedRef = useRef(true);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Função central de requisição
  const executeFetch = useCallback(
    async (isSilent = false) => {
      if (!enabled) return;

      if (!isSilent) {
        setLoading(true);
      } else {
        setIsSyncing(true);
      }

      try {
        let result;
        if (typeof fetcher === "function") {
          result = await fetcher(api);
        } else {
          result = await api.get(endpoint);
        }

        if (isMountedRef.current) {
          setData(result);
          setError(null);
          const now = new Date();
          setLastUpdated(now);
          onUpdateRef.current?.(result);
        }
        return result;
      } catch (err) {
        if (isMountedRef.current) {
          setError(err);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setIsSyncing(false);
        }
      }
    },
    [enabled, endpoint, fetcher]
  );

  // Recarrega manualmente sob demanda
  const reload = useCallback(() => {
    return executeFetch(true);
  }, [executeFetch]);

  useEffect(() => {
    isMountedRef.current = true;

    // Busca inicial ao montar ou trocar dependências
    executeFetch(false);

    // Configura o ciclo de polling leve
    const startPolling = () => {
      stopPolling();
      if (!enabled || interval <= 0) return;

      timerRef.current = setInterval(() => {
        // Pausa polling se a aba do navegador estiver oculta (anti-lag & economia de CPU/GPU/rede)
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          return;
        }
        executeFetch(true);
      }, interval);
    };

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    startPolling();

    // Sincroniza imediatamente quando o usuário volta a focar na aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        executeFetch(true);
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, enabled, executeFetch, ...deps]);

  // Normalização padronizada de métricas para suportar diferentes estruturas de API
  const faturamentoDiario = Number(
    data?.faturamento_diario ??
      data?.faturamento_hoje ??
      data?.faturamento ??
      data?.daily_gross ??
      0
  );

  const totalAtendimentos = Number(
    data?.total_atendimentos ??
      data?.atendimentos_hoje ??
      data?.atendimentos ??
      data?.revenue_count ??
      0
  );

  const comissaoDiaria = Number(
    data?.comissao_hoje ?? data?.comissao ?? 0
  );

  const faturamentoMes = Number(
    data?.faturamento_mes ?? data?.gross ?? 0
  );

  const totalAtendimentosMes = Number(
    data?.total_atendimentos_mes ?? data?.atendimentos_mes ?? data?.revenue_count ?? 0
  );

  const metrics = {
    faturamentoDiario,
    totalAtendimentos,
    comissaoDiaria,
    faturamentoMes,
    totalAtendimentosMes,
    lastUpdated,
  };

  return {
    data,
    metrics,
    faturamentoDiario,
    totalAtendimentos,
    comissaoDiaria,
    faturamentoMes,
    totalAtendimentosMes,
    loading,
    isSyncing,
    lastUpdated,
    error,
    reload,
  };
}

export const usePollingMetrics = useFinancialMetricsPolling;
export default useFinancialMetricsPolling;
