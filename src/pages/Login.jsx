import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { defaultPanel } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LogIn,
  Globe,
  ArrowUpRight,
  KeyRound,
  ShieldCheck,
  HelpCircle,
  Mail,
  Send,
  Sparkles,
} from "lucide-react";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Não foi possível continuar. Tente novamente.";
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export default function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(true);

  // forgot password dialog
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Auto-redireciona se o usuário já estiver logado
  useEffect(() => {
    if (ready && user) {
      navigate(defaultPanel(user), { replace: true });
    }
  }, [ready, user, navigate]);

  const submitLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      return toast.error("Informe seu usuário ou e-mail de acesso.");
    }
    if (!password) {
      return toast.error("Informe sua senha.");
    }

    setLoading(true);
    try {
      const u = await login(username.trim(), password, keep);
      toast.success(`Bem-vindo de volta, ${u.name}`);
      navigate(defaultPanel(u), { replace: true });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userKey) => {
    setLoading(true);
    try {
      const u = await login(userKey, userKey, true);
      toast.success(`Conectado como ${u.name}`);
      navigate(defaultPanel(u), { replace: true });
    } catch (err) {
      toast.error("Falha ao entrar com perfil de teste.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      return toast.error("Informe o e-mail cadastrado na sua compra.");
    }
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSent(true);
      toast.success("Instruções de redefinição enviadas para o seu e-mail!");
    }, 700);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 bg-[#0A0D14] relative">
      {/* Botão de Atalho para Landing Page / Página de Vendas */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <a
          href="/landing"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#12141F] border border-white/10 hover:border-[#D4AF37]/50 rounded-[4px] transition-colors"
          data-testid="login-landing-link"
        >
          <Globe className="h-3.5 w-3.5 text-[#D4AF37]" />
          <span>Página Oficial Kupola</span>
          <ArrowUpRight className="h-3 w-3 text-slate-500" />
        </a>
      </div>

      <Card
        className="w-full max-w-md p-8 border border-white/10 bg-[#12141F] rounded-[4px] shadow-none"
        data-testid="login-card"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <img
              src="/logo.png"
              alt="Kupola"
              className="h-12 w-12 rounded-full object-cover border border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/15"
              data-testid="login-logo"
            />
            <div className="flex flex-col text-left">
              <span className="font-display font-extrabold text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500">
                Kupola
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Gestão para Barbearias
              </span>
            </div>
          </div>
          <h1 className="mt-1 font-display text-sm font-bold text-slate-200">
            Acesse seu painel
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Entre com suas credenciais de usuário ou e-mail
          </p>
        </div>

        <form onSubmit={submitLogin} className="space-y-4">
          <div>
            <Label className="text-xs text-slate-300">Usuário ou e-mail</Label>
            <Input
              className="rounded-[4px] bg-[#0A0D14] border-white/10 text-white mt-1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seu.usuario ou email@barbearia.com"
              data-testid="login-username"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-300">Senha</Label>
              <button
                type="button"
                className="text-[11px] text-[#D4AF37] hover:underline cursor-pointer"
                data-testid="forgot-password"
                onClick={() => {
                  setForgotSent(false);
                  setForgotOpen(true);
                }}
              >
                Esqueci minha senha
              </button>
            </div>
            <Input
              className="rounded-[4px] bg-[#0A0D14] border-white/10 text-white mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              data-testid="login-password"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <Checkbox checked={keep} onCheckedChange={setKeep} data-testid="login-keep" />
            <span>Manter conectado neste dispositivo</span>
          </label>

          <Button
            type="submit"
            className="w-full gap-2 rounded-[4px] h-10 bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold text-xs uppercase shadow-none cursor-pointer"
            disabled={loading}
            data-testid="login-submit"
          >
            <LogIn className="h-4 w-4" />
            <span>{loading ? "Autenticando..." : "Entrar no Painel"}</span>
          </Button>
        </form>

        {/* Informação sobre Distribuição em Plataformas Externas */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="p-3 rounded-[4px] bg-[#0B0D14] border border-white/5 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-white">
                  Acesso de Novos Clientes & Assinantes
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                  Novas contas de Dono são provisionadas automaticamente após a confirmação da assinatura.
                  Utilize o e-mail e as credenciais enviadas para a sua caixa de entrada.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Atalhos Rápidos para Demonstração / Testes */}
        <div className="mt-4 pt-3 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">
            Perfis de Demonstração Rápidos
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin("1")}
              className="px-2 py-1.5 rounded-[4px] bg-[#0A0D14] hover:bg-white/5 border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer text-center"
              title="Entrar como Dono (usuario 1 / senha 1)"
            >
              <span className="font-bold block text-[#D4AF37]">Dono</span>
              <span className="text-[9px] text-slate-500">Tecla 1</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("2")}
              className="px-2 py-1.5 rounded-[4px] bg-[#0A0D14] hover:bg-white/5 border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer text-center"
              title="Entrar como Gerente (usuario 2 / senha 2)"
            >
              <span className="font-bold block text-blue-400">Gerente</span>
              <span className="text-[9px] text-slate-500">Tecla 2</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("3")}
              className="px-2 py-1.5 rounded-[4px] bg-[#0A0D14] hover:bg-white/5 border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer text-center"
              title="Entrar como Barbeiro (usuario 3 / senha 3)"
            >
              <span className="font-bold block text-emerald-400">Barbeiro</span>
              <span className="text-[9px] text-slate-500">Tecla 3</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Modal de Recuperação de Senha */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-md bg-[#12141F] border border-white/10 text-white rounded-[4px]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-[4px] bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30">
                <KeyRound className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold">
                Recuperação de Acesso
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Informe o e-mail associado à sua conta ou compra na plataforma de checkout.
            </DialogDescription>
          </DialogHeader>

          {forgotSent ? (
            <div className="py-4 space-y-3 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <Mail className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">
                Verifique sua caixa de entrada
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Enviamos um link com as instruções para redefinição de senha para <strong>{forgotEmail}</strong>. Verifique também a pasta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 py-2">
              <div>
                <Label className="text-xs text-slate-300">E-mail de Cadastro</Label>
                <Input
                  type="email"
                  className="rounded-[4px] bg-[#0A0D14] border-white/10 text-white mt-1"
                  placeholder="exemplo@gmail.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Se você é um barbeiro ou colaborador, também pode solicitar a redefinição direta ao Dono ou Gerente da sua barbearia no menu "Equipe & Acessos".
              </p>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForgotOpen(false)}
                  className="rounded-[4px] text-xs text-slate-400"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold text-xs rounded-[4px] gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {forgotLoading ? "Enviando..." : "Enviar Instruções"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {forgotSent && (
            <DialogFooter>
              <Button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="w-full bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold text-xs rounded-[4px]"
              >
                Voltar para o Login
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
