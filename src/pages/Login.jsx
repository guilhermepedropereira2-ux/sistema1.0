import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  KeyRound,
  ShieldCheck,
  Mail,
  Send,
  ArrowRight,
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

  const handleForgotPasswordSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      return toast.error("Informe o e-mail cadastrado na sua conta.");
    }
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSent(true);
      toast.success("Instruções de redefinição enviadas para o seu e-mail!");
    }, 700);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 bg-[#05070B] relative select-none">
      {/* Background Decorativo */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-20"
        style={{ backgroundImage: "url('/hero-barbershop-v2.jpg')" }}
      />
      <div className="absolute inset-0 bg-[#05070B]/85 pointer-events-none" />

      <Card
        className="relative z-10 w-full max-w-md p-6 sm:p-8 border border-white/10 bg-[#0A0E17]/95 rounded-2xl shadow-2xl backdrop-blur-xl"
        data-testid="login-card"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          {/* Coroa Dourada */}
          <div className="mb-2 text-[#E5C365]">
            <svg
              viewBox="0 0 48 32"
              fill="none"
              className="w-10 h-7 drop-shadow-[0_0_10px_rgba(229,195,101,0.4)]"
            >
              <path
                d="M4 26h40M4 26L9 7l15 13L39 7l5 19"
                stroke="url(#crownGoldGradLogin)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="crownGoldGradLogin" x1="4" y1="7" x2="44" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFDF0" />
                  <stop offset="0.4" stopColor="#F3CE72" />
                  <stop offset="1" stopColor="#D4AF37" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <span className="font-['Outfit',sans-serif] tracking-[0.25em] text-[20px] font-black uppercase bg-gradient-to-r from-[#FFFDF0] via-[#F3CE72] to-[#D4AF37] bg-clip-text text-transparent">
            KUPOLA
          </span>
          <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase mt-0.5 mb-3">
            GESTÃO PARA BARBEARIAS
          </span>

          <h1 className="font-display text-sm font-bold text-slate-200">
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
              className="rounded-xl bg-[#070A10] border-white/10 text-white mt-1 h-11 focus:border-[#E5C365]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário ou e-mail"
              data-testid="login-username"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-300">Senha</Label>
              <button
                type="button"
                className="text-[11px] text-[#E5C365] hover:underline cursor-pointer"
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
              className="rounded-xl bg-[#070A10] border-white/10 text-white mt-1 h-11 focus:border-[#E5C365]"
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
            className="w-full gap-2 rounded-xl h-11 bg-gradient-to-r from-[#F3CE72] via-[#E5C365] to-[#D4AF37] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-[#D4AF37]/20"
            disabled={loading}
            data-testid="login-submit"
          >
            <LogIn className="h-4 w-4" />
            <span>{loading ? "Autenticando..." : "Entrar no Painel"}</span>
          </Button>
        </form>

        {/* Divisor com link para Novo Cadastro / Onboarding */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <p className="text-xs text-slate-400 mb-2">
            Ainda não tem uma conta?
          </p>
          <Link
            to="/welcome"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E5C365] hover:underline cursor-pointer"
          >
            <span>Começar configuração da barbearia</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>

      {/* Modal de Recuperação de Senha */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-md bg-[#0D121B] border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30">
                <KeyRound className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold">
                Recuperação de Acesso
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Informe o e-mail cadastrado na sua conta do KUPOLA.
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
                  className="rounded-xl bg-[#070A10] border-white/10 text-white mt-1 h-10"
                  placeholder="seuemail@exemplo.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Se você é um barbeiro ou colaborador, também pode solicitar a redefinição direta ao Dono da sua barbearia no menu "Barbeiros & Equipe".
              </p>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForgotOpen(false)}
                  className="rounded-lg text-xs text-slate-400"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold text-xs rounded-lg gap-1.5"
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
                className="w-full bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold text-xs rounded-lg"
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
