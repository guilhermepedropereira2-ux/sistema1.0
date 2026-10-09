import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { MonthProvider } from "@/context/MonthContext";
import { AuthProvider } from "@/context/AuthContext";
import { UnitProvider } from "@/context/UnitContext";
import { BalcaoProvider } from "@/context/BalcaoContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Receitas from "@/pages/Receitas";
import Despesas from "@/pages/Despesas";
import Maquininhas from "@/pages/Maquininhas";
import Equipe from "@/pages/Equipe";
import BarberReport from "@/pages/BarberReport";
import Servicos from "@/pages/Servicos";
import Produtos from "@/pages/Produtos";
import Usuarios from "@/pages/Usuarios";
import Clientes from "@/pages/Clientes";
import Barbearia from "@/pages/Barbearia";
import Categorias from "@/pages/Categorias";
import FluxoCaixa from "@/pages/FluxoCaixa";
import Calendario from "@/pages/Calendario";
import Fechamento from "@/pages/Fechamento";
import Retiradas from "@/pages/Retiradas";
import Comparacao from "@/pages/Comparacao";
import Historico from "@/pages/Historico";
import Configuracoes from "@/pages/Configuracoes";
import Operacional from "@/pages/Operacional";
import Atendimentos from "@/pages/Atendimentos";
import Relatorios from "@/pages/Relatorios";
import Login from "@/pages/Login";
import BarberLayout from "@/components/BarberLayout";
import BarberHome from "@/pages/barber/BarberHome";
import MeusAtendimentos from "@/pages/barber/MeusAtendimentos";
import MeusClientes from "@/pages/barber/MeusClientes";
import MeuDesempenho from "@/pages/barber/MeuDesempenho";
import MinhaComissao from "@/pages/barber/MinhaComissao";
import MeuPerfil from "@/pages/barber/MeuPerfil";
import AgendamentoPublico from "@/pages/AgendamentoPublico";
import Planos from "@/pages/Planos";
import PlanosClientes from "@/pages/PlanosClientes";
import Comissoes from "@/pages/Comissoes";
import Termos from "@/pages/Termos";
import Privacidade from "@/pages/Privacidade";
import SuperAdmin from "@/pages/SuperAdmin";
import PreviewIndex from "@/pages/preview";
import Welcome from "@/pages/Welcome";
import Onboarding from "@/pages/Onboarding";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/roles";
import { Scissors } from "lucide-react";

function RootRoute() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#05070B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E5C365] flex items-center justify-center text-[#080B10] font-black animate-pulse">
            <Scissors className="w-5 h-5" />
          </div>
          <p className="text-xs text-white/50 animate-pulse">Carregando KUPOLA...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, exibe a Tela de Boas-vindas Oficial KUPOLA
  if (!user) {
    return <Welcome />;
  }

  // Se for barbeiro, direciona para o painel do barbeiro
  if (!isAdmin(user)) {
    return <Navigate to="/barbeiro" replace />;
  }

  // Se for administrador/dono, exibe o layout completo com Dashboard
  return <Layout />;
}

function App() {
  return (
    <div className="App dark min-h-screen bg-background text-foreground">
      <AuthProvider>
        <MonthProvider>
          <UnitProvider>
            <BalcaoProvider>
              <BrowserRouter>
              <Routes>
                {/* Tela Oficial de Boas-Vindas e Onboarding */}
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/onboarding/:stepName" element={<Onboarding />} />

                {/* Rotas Públicas de Agendamento (Multi-Tenant por Slug) */}
                <Route path="/agendar/:barbeariaSlug" element={<AgendamentoPublico />} />
                <Route path="/agendar" element={<AgendamentoPublico />} />

                {/* Preview público de todas as telas (mockup de alta fidelidade) */}
                <Route path="/preview" element={<PreviewIndex />} />
                <Route path="/preview/:screenId" element={<PreviewIndex />} />

                <Route path="/login" element={<Login />} />
                <Route path="/planos" element={<Planos />} />
                <Route path="/checkout/*" element={<Navigate to="/planos" replace />} />
                <Route path="/checkout" element={<Navigate to="/planos" replace />} />
                <Route path="/termos" element={<Termos />} />
                <Route path="/privacidade" element={<Privacidade />} />
                <Route path="/lancar-atendimento" element={<Navigate to="/barbeiro?lancar=true" replace />} />
                <Route path="/barbeiro" element={<BarberLayout />}>
                  <Route index element={<BarberHome />} />
                  <Route path="lancar" element={<Navigate to="/barbeiro?lancar=true" replace />} />
                  <Route path="atendimentos" element={<MeusAtendimentos />} />
                  <Route path="clientes" element={<MeusClientes />} />
                  <Route path="desempenho" element={<MeuDesempenho />} />
                  <Route path="comissao" element={<Navigate to="/barbeiro/desempenho?tab=comissao" replace />} />
                  <Route path="perfil" element={<MeuPerfil />} />
                </Route>
                <Route path="/" element={<RootRoute />}>
                  <Route index element={<Dashboard />} />
                  <Route path="atendimentos" element={<Atendimentos />} />
                  <Route path="operacional" element={<Operacional />} />
                  <Route path="receitas" element={<Navigate to="/relatorios?tab=movimentacao" replace />} />
                  <Route path="despesas" element={<Despesas />} />
                  <Route path="comissoes" element={<Comissoes />} />
                  <Route path="maquininhas" element={<Maquininhas />} />
                  <Route path="formas-pagamento" element={<Navigate to="/maquininhas" replace />} />
                  <Route path="barbearia" element={<Barbearia />} />
                  <Route path="equipe" element={<Equipe />} />
                  <Route path="barbeiros" element={<Navigate to="/equipe" replace />} />
                  <Route path="equipe/:id" element={<BarberReport />} />
                  <Route path="servicos" element={<Servicos />} />
                  <Route path="produtos" element={<Produtos />} />
                  <Route path="usuarios" element={<Usuarios />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="planos-clientes" element={<PlanosClientes />} />
                  <Route path="assinaturas" element={<PlanosClientes />} />
                  <Route path="categorias" element={<Categorias />} />
                  <Route path="relatorios" element={<Relatorios />} />
                  <Route path="financeiro" element={<Navigate to="/relatorios" replace />} />
                  <Route path="fluxo-de-caixa" element={<Navigate to="/relatorios?tab=dre" replace />} />
                  <Route path="calendario" element={<Calendario />} />
                  <Route path="agenda" element={<Navigate to="/calendario" replace />} />
                  <Route path="fechamento" element={<Fechamento />} />
                  <Route path="retiradas" element={<Retiradas />} />
                  <Route path="comparacao" element={<Comparacao />} />
                  <Route path="historico" element={<Historico />} />
                  <Route path="configuracoes" element={<Configuracoes />} />
                  <Route path="superadmin" element={<SuperAdmin />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster position="top-right" richColors />
            </BalcaoProvider>
          </UnitProvider>
        </MonthProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
