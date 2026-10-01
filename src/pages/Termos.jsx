import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Termos() {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-200 antialiased selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0F121C]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Kupola"
              className="h-9 w-9 rounded-full object-cover border border-[#D4AF37]/40 shadow-sm"
            />
            <span className="font-display font-extrabold text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500">
              Kupola
            </span>
          </Link>
          <span className="hidden sm:inline-block text-xs text-slate-500">|</span>
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-400">Termos Gerais de Uso</span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/landing">
            <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-[4px] gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Início
            </Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold text-xs rounded-[4px] shadow-none">
              Acessar Painel
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-8 pb-6 border-b border-white/[0.08]">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold uppercase tracking-wider mb-3">
            <FileText className="h-3.5 w-3.5" />
            Contrato de Licenciamento de Software (SaaS)
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Termos de Uso do Kupola
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Última atualização: Setembro de 2026 • Válido para todas as barbearias, profissionais e usuários da plataforma.
          </p>
        </div>

        <div className="prose prose-invert prose-sm sm:prose-base max-w-none space-y-8 text-slate-300 leading-relaxed">
          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" /> 1. Aceitação dos Termos
            </h2>
            <p className="text-xs sm:text-sm">
              Ao acessar, registrar uma conta ou utilizar qualquer funcionalidade do <strong>Kupola</strong> (disponível via plataforma web e aplicativos correlatos), você expressamente concorda com estes Termos de Uso e com nossa Política de Privacidade. Caso não concorde com qualquer disposição aqui estabelecida, solicitamos que interrompa imediatamente o uso do sistema.
            </p>
          </section>

          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" /> 2. Descrição e Escopo do Serviço
            </h2>
            <p className="text-xs sm:text-sm mb-3">
              O <strong>Kupola</strong> é uma plataforma SaaS (Software como Serviço) voltada à gestão operacional, financeira e de agendamentos para barbearias, estúdios masculinos e profissionais de beleza. O escopo abrange:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-300">
              <li>Módulo de Atendimentos Rápidos e Comanda Operacional em tempo real.</li>
              <li>Controle de Fila de Espera, Balcão Seguro e Agendamento Público Online.</li>
              <li>Cálculo e Liquidação Automática de Comissões de Barbeiros (Percentuais e Valores Fixos).</li>
              <li>Fluxo de Caixa, DRE Gerencial, Gestão de Despesas e Retiradas de Sócios.</li>
              <li>Hub exclusivo do Barbeiro com relatórios individuais de produtividade.</li>
            </ul>
          </section>

          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" /> 3. Período de Testes (Trial de 7 Dias) e Assinaturas
            </h2>
            <p className="text-xs sm:text-sm">
              Novas contas cadastradas no <strong>Kupola</strong> desfrutam de um período de degustação gratuita de 7 (sete) dias corridos com acesso aos recursos do plano selecionado. Após o encerramento do trial, a continuidade irrestrita das rotinas operacionais e relatórios gerenciais fica condicionada à subscrição ativa de um dos planos mensais ou anuais oficiais do <strong>Kupola</strong>, processados com total segurança através do nosso portal oficial e homologado de pagamentos.
            </p>
          </section>

          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" /> 4. Responsabilidades do Usuário e da Barbearia
            </h2>
            <p className="text-xs sm:text-sm">
              A barbearia contratante é a única responsável pela veracidade e exatidão das informações financeiras inseridas, tabelas de comissão aplicadas à equipe e dados cadastrais dos clientes. As credenciais de login e senhas dos colaboradores devem ser geridas com zelo, sendo vedado o compartilhamento indevido com terceiros.
            </p>
          </section>

          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" /> 5. Disponibilidade, Segurança e Backup
            </h2>
            <p className="text-xs sm:text-sm">
              O <strong>Kupola</strong> adota as melhores práticas de infraestrutura em nuvem, garantindo alta disponibilidade (SLA de 99.8%), rotinas automáticas de backup de caixa e criptografia em trânsito (SSL/TLS). Em hipótese de manutenção programada, envidaremos esforços razoáveis para realizá-la fora dos horários de pico comercial das barbearias.
            </p>
          </section>

          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" /> 6. Cancelamento e Encerramento de Conta
            </h2>
            <p className="text-xs sm:text-sm">
              O contratante pode cancelar sua assinatura do <strong>Kupola</strong> a qualquer momento diretamente no painel gerencial ou via suporte oficial, sem multas rescisórias ocultas. Os dados operacionais serão preservados com confidencialidade conforme os parâmetros da LGPD (Lei Geral de Proteção de Dados).
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Kupola — Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacidade" className="hover:text-slate-300 transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/landing" className="hover:text-slate-300 transition-colors">
              Página de Vendas
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
