export const rolesOf = (u) => (u?.roles?.length ? u.roles : u?.role ? [u.role] : []);
export const hasRole = (u, r) => rolesOf(u).includes(r);
export const isDono = (u) => hasRole(u, "dono") || hasRole(u, "admin");
export const isGerente = (u) => hasRole(u, "gerente") && !isDono(u);
export const isCaixa = (u) => hasRole(u, "caixa") || hasRole(u, "recepcao");
export const isAdmin = (u) => hasRole(u, "dono") || hasRole(u, "admin") || hasRole(u, "gerente") || hasRole(u, "caixa");
export const isBarber = (u) => hasRole(u, "barbeiro");
export const defaultPanel = (u) => (isCaixa(u) ? "/operacional" : isAdmin(u) ? "/" : "/barbeiro");

export const ROLE_LABEL = {
  dono: "Dono",
  gerente: "Gerente",
  barbeiro: "Barbeiro",
  admin: "Dono",
  caixa: "Caixa (Balcão)",
  recepcao: "Recepção",
};
export const rolesLabel = (u) => rolesOf(u).map((r) => ROLE_LABEL[r] || r).join(" + ");

// Module-level access for the ADM panel. Dono = full; Gerente = operational only; Caixa = safe operational counter.
export const canAccess = (user, item) => {
  if (!user) return true;
  if (isDono(user)) return true;
  if (!item) return true;
  if (item.donoOnly) return false;
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


