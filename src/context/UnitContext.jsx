import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { PLANS, getPlan, canAccessFeature } from "@/lib/plans";

const UnitContext = createContext(null);

export function UnitProvider({ children }) {
  const [activeUnitId, setActiveUnitId] = useState(() => {
    return localStorage.getItem("active_unit_id") || "matriz";
  });

  const [units, setUnits] = useState([]);
  const [networkStats, setNetworkStats] = useState(null);
  const [subscription, setSubscription] = useState({
    plan_id: "pro",
    status: "trialing",
    max_barbers: 4,
    multi_unit: false,
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
    return getPlan(subscription?.plan_id || "pro");
  }, [subscription?.plan_id]);

  // Carregar unidades e assinatura do backend
  const loadUnitsAndSubscription = useCallback(async () => {
    try {
      const [unitsRes, subRes] = await Promise.all([
        api.get("/units").catch(() => null),
        api.get("/subscription").catch(() => null),
      ]);

      if (unitsRes?.units) {
        setUnits(unitsRes.units);
        setNetworkStats(unitsRes.network_summary || null);
        if (unitsRes.units.length > 0 && !unitsRes.units.some((u) => u.id === activeUnitId)) {
          const main = unitsRes.units.find((u) => u.is_main) || unitsRes.units[0];
          if (main) setActiveUnitId(main.id);
        }
      }
      if (subRes?.plan_id) {
        setSubscription(subRes);
      }
    } catch {
      // Ignorar erros de rede momentâneos
    }
  }, [activeUnitId]);

  useEffect(() => {
    loadUnitsAndSubscription();
  }, [loadUnitsAndSubscription]);

  // Trocar de unidade
  const switchUnit = useCallback((unitId) => {
    localStorage.setItem("active_unit_id", unitId);
    setActiveUnitId(unitId);
    window.dispatchEvent(new CustomEvent("refresh-dashboard-data"));
  }, []);

  // Alterar plano de assinatura (Upgrade / Downgrade)
  const changePlan = useCallback(async (newPlanId) => {
    try {
      const res = await api.put("/subscription", { plan_id: newPlanId, status: "active" });
      setSubscription(res);
      setTrialExpiredEvent(false);
      if (newPlanId !== "premium") {
        const mainUnit = units.find((u) => u.is_main) || units[0];
        if (mainUnit) switchUnit(mainUnit.id);
      }
      window.dispatchEvent(new CustomEvent("refresh-dashboard-data"));
      return res;
    } catch (err) {
      setSubscription((s) => ({ ...s, plan_id: newPlanId, status: "active", subscriptionStatus: "active", subscription_status: "active" }));
      setTrialExpiredEvent(false);
      window.dispatchEvent(new CustomEvent("refresh-dashboard-data"));
    }
  }, [units, switchUnit]);

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
    return units.find((u) => u.id === activeUnitId) || units[0] || null;
  }, [activeUnitId, units]);

  // Checagem de permissão por plano
  const canUse = useCallback(
    (featureKey) => {
      return canAccessFeature(subscription?.plan_id || "pro", featureKey);
    },
    [subscription?.plan_id]
  );

  const isPremium = useMemo(() => {
    return (subscription?.plan_id || "").toLowerCase() === "premium" && !isSubscriptionExpired;
  }, [subscription?.plan_id, isSubscriptionExpired]);

  const isPro = useMemo(() => {
    const pid = (subscription?.plan_id || "").toLowerCase();
    return (pid === "pro" || pid === "premium") && !isSubscriptionExpired;
  }, [subscription?.plan_id, isSubscriptionExpired]);

  return (
    <UnitContext.Provider
      value={{
        units,
        activeUnitId,
        activeUnit,
        switchUnit,
        networkStats,
        plan,
        subscription,
        isSubscriptionExpired,
        isPremium,
        isPro,
        canUse,
        openUpgradeModal,
        closeUpgradeModal,
        upgradeModalOpen,
        upgradePayload,
        refreshUnits: loadUnitsAndSubscription,
        changePlan,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const ctx = useContext(UnitContext);
  if (!ctx) {
    throw new Error("useUnit deve ser utilizado dentro de um UnitProvider");
  }
  return ctx;
}
