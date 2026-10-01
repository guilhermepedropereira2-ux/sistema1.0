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

function App() {
  return (
    <div className="App dark min-h-screen bg-background text-foreground">
      <AuthProvider>
        <MonthProvider>
          <UnitProvider>
            <BalcaoProvider>
              <BrowserRouter>
              <Routes>
                {/* Rotas Públicas de Agendamento (Multi-Tenant por Slug) */}
                <Route path="/agendar/:barbeariaSlug" element={<AgendamentoPublico />} />
                <Route path="/agendar" element={<AgendamentoPublico />} />

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
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="atendimentos" element={<Operacional />} />
                  <Route path="operacional" element={<Operacional />} />
                  <Route path="receitas" element={<Receitas />} />
                  <Route path="despesas" element={<Despesas />} />
                  <Route path="comissoes" element={<Comissoes />} />
                  <Route path="maquininhas" element={<Maquininhas />} />
                  <Route path="barbearia" element={<Barbearia />} />
                  <Route path="equipe" element={<Equipe />} />
                  <Route path="equipe/:id" element={<BarberReport />} />
                  <Route path="servicos" element={<Servicos />} />
                  <Route path="produtos" element={<Produtos />} />
                  <Route path="usuarios" element={<Usuarios />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="planos-clientes" element={<PlanosClientes />} />
                  <Route path="assinaturas" element={<PlanosClientes />} />
                  <Route path="categorias" element={<Categorias />} />
                  <Route path="fluxo-de-caixa" element={<FluxoCaixa />} />
                  <Route path="calendario" element={<Calendario />} />
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
