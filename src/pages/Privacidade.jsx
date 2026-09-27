import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-200 antialiased selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0F121C]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="KingPro"
              className="h-9 w-9 rounded-full object-cover border border-[#D4AF37]/40 shadow-sm"
            />
            <span className="font-display font-extrabold text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500">
              KingPro
            </span>
          </Link>
          <span className="hidden sm:inline-block text-xs text-slate-500">|</span>
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-400">Política de Privacidade</span>
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
            <Lock className="h-3.5 w-3.5" />
            Conformidade LGPD (Lei 13.709/2018)
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Política de Privacidade do KingPro
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Última atualização: Setembro de 2026 • Transparência no tratamento de dados para barbearias e clientes.
          </p>
        </div>

        <div className="prose prose-invert prose-sm sm:prose-base max-w-none space-y-8 text-slate-300 leading-relaxed">
          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37]" /> 1. Compromisso com a Privacidade
            </h2>
            <p className="text-xs sm:text-sm">
              No <strong>KingPro</strong>, a privacidade e a segurança dos dados dos proprietários de barbearias, dos profissionais barbeiros e dos consumidores finais são prioridades inegociáveis. Esta Política descreve de forma clara e objetiva como coletamos, tratamos, armazenamos e protegemos suas informações pessoais.
            </p>
          </section>

          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37]" /> 2. Dados Coletados e Finalidade
            </h2>
            <p className="text-xs sm:text-sm mb-3">
              O <strong>KingPro</strong> coleta apenas as informações estritamente necessárias para a prestação dos serviços contratados:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-300">
              <li><strong>Dados da Barbearia & Administrador:</strong> Nome da empresa, CNPJ/CPF, e-mail, telefone/WhatsApp de contato, endereço e dados de faturamento.</li>
              <li><strong>Dados dos Barbeiros:</strong> Nome profissional, percentual ou valor contratual de comissão e credenciais de acesso ao Hub do Barbeiro.</li>
              <li><strong>Dados dos Clientes Finais:</strong> Nome e telefone (WhatsApp) fornecidos voluntariamente para agendamento online, confirmação e histórico de atendimentos.</li>
            </ul>
          </section>

          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37]" /> 3. Tratamento de Pagamentos e Gateway
            </h2>
            <p className="text-xs sm:text-sm">
              As transações financeiras de assinatura do software <strong>KingPro</strong> são processadas de forma segura e tokenizada através da instituição de pagamento homologada <em>Mercado Pago</em>. O <strong>KingPro</strong> não armazena dados de cartão de crédito em seus servidores de aplicação, garantindo total conformidade com o padrão PCI-DSS.
            </p>
          </section>

          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37]" /> 4. Não Compartilhamento com Terceiros
            </h2>
            <p className="text-xs sm:text-sm">
              O <strong>KingPro</strong> <strong>jamais vende, aluga ou compartilha</strong> os dados de clientes, histórico de faturamento ou contatos das barbearias com corretores de dados, parceiros publicitários ou terceiros sem autorização expressa.
            </p>
          </section>

          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37]" /> 5. Direitos dos Titulares de Dados (LGPD)
            </h2>
            <p className="text-xs sm:text-sm">
              Nos termos da Lei Geral de Proteção de Dados (LGPD), qualquer titular pode solicitar ao <strong>KingPro</strong> ou ao administrador da barbearia a confirmação de tratamento, acesso, correção ou eliminação definitiva dos seus registros da base do sistema.
            </p>
          </section>

          <section className="p-5 rounded-[6px] bg-[#12141F] border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37]" /> 6. Canal de Contato com o DPO / Suporte
            </h2>
            <p className="text-xs sm:text-sm">
              Em caso de dúvidas referentes à privacidade ou para exercer seus direitos sob a LGPD, o titular poderá entrar em contato através do canal oficial de privacidade do <strong>KingPro</strong> no painel de suporte ao cliente.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 KingPro — Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/termos" className="hover:text-slate-300 transition-colors">
              Termos de Uso
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
