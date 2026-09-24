import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { PLANS, getPlan, canAccessFeature } from "@/lib/plans";

const UnitContext = createContext(null);

const DEFAULT_UNITS = [
  {
    id: "unit_centro",
    name: "Unidade Centro (Matriz)",
    short_name: "Centro",
    slug: "barbearia-vintage-centro",
    address: "Rua Augusta, 1200 - Consolação, São Paulo - SP",
    phone: "(11) 99999-8888",
    city: "São Paulo",
    state: "SP",
    is_main: true,
  },
  {
    id: "unit_shopping",
    name: "Unidade Shopping (Filial)",
    short_name: "Shopping",
    slug: "barbearia-vintage-shopping",
    address: "Av. Brigadeiro Faria Lima, 2232 - Shopping Iguatemi, São Paulo - SP",
    phone: "(11) 98888-7777",
    city: "São Paulo",
    state: "SP",
    is_main: false,
  },
];

export function UnitProvider({ children }) {
  // Unidade ativa armazenada no localStorage (padrão: "unit_centro")
  const [activeUnitId, setActiveUnitId] = useState(() => {
    return localStorage.getItem("active_unit_id") || "unit_centro";
  });

  const [units, setUnits] = useState(DEFAULT_UNITS);
  const [networkStats, setNetworkStats] = useState(null);
  const [subscription, setSubscription] = useState({
    plan_id: "premium",
    status: "active",
    max_barbers: 10,
    multi_unit: true,
  });
  const [trialExpiredEvent, setTrialExpiredEvent] = useState(false);

  // Escuta evento global de TRIAL_EXPIRED disparado pelo interceptor da API
  useEffect(() => {
    const handleTrialExpired = () => {
      setTrialExpiredEvent(true);
      setSubscription((s) => ({
        ...s,
        status: "expired",
        subscriptionStatus: "expired",
        subscription_status: "expired",
      }));
    };
    window.addEventListener("trial_expired", handleTrialExpired);
    return () => window.removeEventListener("trial_expired", handleTrialExpired);
  }, []);

  const isSubscriptionExpired = useMemo(() => {
    if (trialExpiredEvent) return true;
    if (subscription?.status === "expired" || subscription?.subscriptionStatus === "expired") return true;
    if (subscription?.subscription_status === "expired") return true;
    if (
      subscription?.subscription_status === "trial" &&
      subscription?.trial_ends_at &&
      new Date(subscription.trial_ends_at) < new Date()
    ) {
      return true;
    }
    if (subscription?.subscriptionExpiresAt && new Date(subscription.subscriptionExpiresAt) < new Date()) {
      return true;
    }
    return false;
  }, [trialExpiredEvent, subscription]);

  // Modal de Upgrade Centralizado
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradePayload, setUpgradePayload] = useState({
    title: "",
    message: "",
    targetPlan: "pro",
    feature: "",
  });

  const plan = useMemo(() => {
    return getPlan(subscription?.plan_id || "premium");
  }, [subscription?.plan_id]);

  // Carregar unidades e assinatura do backend
  const loadUnitsAndSubscription = useCallback(async () => {
    try {
      const [unitsRes, subRes] = await Promise.all([
        api.get("/units").catch(() => null),
        api.get("/subscription").catch(() => null),
      ]);

      if (unitsRes?.units?.length) {
        setUnits(unitsRes.units);
        setNetworkStats(unitsRes.network_summary || null);
      }
      if (subRes?.plan_id) {
        setSubscription(subRes);
      }
    } catch {
      // Manter fallbacks pré-definidos caso backend inicialize
    }
  }, []);

  useEffect(() => {
    loadUnitsAndSubscription();
  }, [loadUnitsAndSubscription]);

  // Trocar de unidade
  const switchUnit = useCallback((unitId) => {
    localStorage.setItem("active_unit_id", unitId);
    setActiveUnitId(unitId);
    // Disparar evento para que useApi e listas recarreguem os dados
    window.dispatchEvent(new CustomEvent("refresh-dashboard-data"));
  }, []);

  // Alterar plano de assinatura (Upgrade / Downgrade para testes ou contratação)
  const changePlan = useCallback(async (newPlanId) => {
    try {
      const res = await api.put("/subscription", { plan_id: newPlanId, status: "active" });
      setSubscription(res);
      setTrialExpiredEvent(false);
      // Se não for premium e estava com visão consolidada ou unidade secundária, volta para matriz
      if (newPlanId !== "premium") {
        switchUnit("unit_centro");
      }
      window.dispatchEvent(new CustomEvent("refresh-dashboard-data"));
      return res;
    } catch (err) {
      // Fallback local se erro
      setSubscription((s) => ({ ...s, plan_id: newPlanId, status: "active", subscriptionStatus: "active", subscription_status: "active" }));
      setTrialExpiredEvent(false);
      if (newPlanId !== "premium") {
        switchUnit("unit_centro");
      }
      window.dispatchEvent(new CustomEvent("refresh-dashboard-data"));
    }
  }, [switchUnit]);

  // Gatilho do Modal de Upgrade
  const openUpgradeModal = useCallback(({ title, message, targetPlan = "pro", feature = "" }) => {
    setUpgradePayload({
      title: title || "Eleve o Nível da sua Barbearia",
      message: message || "Faça o upgrade de plano para desbloquear este recurso exclusivo.",
      targetPlan,
      feature,
    });
    setUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(false);
  }, []);

  // Objeto da unidade ativa resolvida
  const activeUnit = useMemo(() => {
    if (activeUnitId === "all") {
      return {
        id: "all",
        name: "Visão Consolidada (Rede)",
        short_name: "Rede Consolidada",
        is_consolidated: true,
        slug: "rede-consolidada",
        address: "Todas as Unidades da Rede",
      };
    }
    return units.find((u) => u.id === activeUnitId) || units[0] || DEFAULT_UNITS[0];
  }, [activeUnitId, units]);

  // Checagem de permissão por plano
  const canUse = useCallback(
    (featureKey) => {
      return canAccessFeature(plan.id, featureKey);
    },
    [plan.id]
  );

  return (
    <UnitContext.Provider
      value={{
        units,
        activeUnitId,
        activeUnit,
        switchUnit,
        subscription,
        plan,
        isPremium: plan.id === "premium",
        isPro: plan.id === "pro" || plan.id === "premium",
        isStarter: plan.id === "starter",
        changePlan,
        canUse,
        networkStats,
        refreshUnits: loadUnitsAndSubscription,
        // Modal
        upgradeModalOpen,
        upgradePayload,
        openUpgradeModal,
        closeUpgradeModal,
        isSubscriptionExpired,
        setTrialExpired: setTrialExpiredEvent,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
}

export const useUnit = () => {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error("useUnit deve ser usado dentro de um UnitProvider");
  }
  return context;
};
