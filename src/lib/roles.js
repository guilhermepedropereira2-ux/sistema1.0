export const rolesOf = (u) => (u?.roles?.length ? u.roles : u?.role ? [u.role] : []);
export const hasRole = (u, r) => rolesOf(u).includes(r);
export const isDono = (u) => hasRole(u, "dono") || hasRole(u, "admin") || hasRole(u, "owner");
export const isGerente = (u) => (hasRole(u, "gerente") || hasRole(u, "manager")) && !isDono(u);
export const isCaixa = (u) => hasRole(u, "caixa") || hasRole(u, "recepcao");
export const isAdmin = (u) => hasRole(u, "dono") || hasRole(u, "admin") || hasRole(u, "owner") || hasRole(u, "gerente") || hasRole(u, "manager") || hasRole(u, "caixa");
export const isBarber = (u) => hasRole(u, "barbeiro") || hasRole(u, "barber");
export const canManagePaymentMethods = (u) => (isDono(u) || isGerente(u)) && !isBarber(u);
export const defaultPanel = (u) => (isCaixa(u) ? "/operacional" : isAdmin(u) ? "/" : "/barbeiro");

export const ROLE_LABEL = {
  dono: "Dono",
  owner: "Dono",
  gerente: "Gerente",
  manager: "Gerente",
  barbeiro: "Barbeiro",
  barber: "Barbeiro",
  admin: "Dono",
  caixa: "Caixa (Balcão)",
  recepcao: "Recepção",
};
export const rolesLabel = (u) => rolesOf(u).map((r) => ROLE_LABEL[r] || r).join(" + ");

// Module-level access for the ADM panel. Dono/Manager = full/operational; Caixa = safe operational counter; Barber = restricted to barber portal.
export const canAccess = (user, item) => {
  if (!user) return true;
  if (isDono(user)) return true;
  if (!item) return true;
  if (isBarber(user)) return false; // Barbeiro can never access admin modules
  if (item.donoOnly && !isDono(user)) return false;
  if (isCaixa(user)) {
    // Modo Caixa: acesso estritamente operacional (atendimentos, receitas/vendas, clientes, servicos)
    const allowedForCaixa = ["/atendimentos", "/receitas", "/clientes", "/servicos", "/produtos"];
    if (item.to && !allowedForCaixa.includes(item.to) && item.action !== "novo_atendimento") {
      return false;
    }
  }
  if (!item.perm || item.perm.length === 0) return true;
  const perms = user.permissions || {};
  return item.perm.some((k) => perms[k]);
};
