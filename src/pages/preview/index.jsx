import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PreviewShell, { PREVIEW_SECTIONS } from "./PreviewShell";

import Dashboard from "./screens/Dashboard";
import Operacional from "./screens/Operacional";
import Calendario from "./screens/Calendario";
import FluxoCaixa from "./screens/FluxoCaixa";
import Receitas from "./screens/Receitas";
import Despesas from "./screens/Despesas";
import Comissoes from "./screens/Comissoes";
import Retiradas from "./screens/Retiradas";
import Fechamento from "./screens/Fechamento";
import Barbearia from "./screens/Barbearia";
import Equipe from "./screens/Equipe";
import BarberReport from "./screens/BarberReport";
import Clientes from "./screens/Clientes";
import PlanosClientes from "./screens/PlanosClientes";
import Servicos from "./screens/Servicos";
import Produtos from "./screens/Produtos";
import Categorias from "./screens/Categorias";
import Usuarios from "./screens/Usuarios";
import Comparacao from "./screens/Comparacao";
import Maquininhas from "./screens/Maquininhas";
import Historico from "./screens/Historico";
import Configuracoes from "./screens/Configuracoes";
import SuperAdmin from "./screens/SuperAdmin";
import BarbeiroApp from "./screens/BarbeiroApp";

// Mapa central de telas por id; permite trocar a rota ativa sem imports manuais.
const SCREENS = {
  dashboard: Dashboard,
  operacional: Operacional,
  calendario: Calendario,
  "fluxo-caixa": FluxoCaixa,
  receitas: Receitas,
  despesas: Despesas,
  comissoes: Comissoes,
  retiradas: Retiradas,
  fechamento: Fechamento,
  barbearia: Barbearia,
  equipe: Equipe,
  "barbeiro-relatorio": BarberReport,
  clientes: Clientes,
  "planos-clientes": PlanosClientes,
  servicos: Servicos,
  produtos: Produtos,
  categorias: Categorias,
  usuarios: Usuarios,
  comparacao: Comparacao,
  maquininhas: Maquininhas,
  historico: Historico,
  configuracoes: Configuracoes,
  superadmin: SuperAdmin,
  "barbeiro-app": BarbeiroApp,
};

export default function PreviewIndex() {
  // Primeiro id da primeira seção é o ponto de partida natural.
  const initialId = PREVIEW_SECTIONS[0].items[0].id;
  const { screenId } = useParams();
  const navigate = useNavigate();
  const [active, setActive] = useState(screenId && SCREENS[screenId] ? screenId : initialId);

  // Quando o usuário clica em um item da sidebar, atualizamos a URL também.
  useEffect(() => {
    if (screenId && SCREENS[screenId] && screenId !== active) {
      setActive(screenId);
    }
  }, [screenId, active]);

  const handleNavigate = useCallback(
    (id) => {
      if (SCREENS[id]) {
        setActive(id);
        navigate(`/preview/${id}`, { replace: true });
      }
    },
    [navigate]
  );

  const ActiveScreen = useMemo(() => SCREENS[active] || Dashboard, [active]);

  return (
    <PreviewShell active={active} onNavigate={handleNavigate}>
      <ActiveScreen onNavigate={handleNavigate} active={active} />
    </PreviewShell>
  );
}