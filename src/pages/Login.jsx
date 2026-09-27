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
import { ScissorsSquare, ArrowLeft, LogIn, Store, Globe, ArrowUpRight } from "lucide-react";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Não foi possível continuar. Tente novamente.";
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export default function Login() {
  const { user, ready, login, register } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [mode, setMode] = useState("login"); // login | register
  const [loading, setLoading] = useState(false);

  // Auto-redireciona se o usuário já estiver logado
  useEffect(() => {
    if (ready && user) {
      navigate(defaultPanel(user), { replace: true });
    }
  }, [ready, user, navigate]);

  // login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(true);

  // register state
  const [reg, setReg] = useState({
    name: "", email: "", document: "", phone: "", username: "", password: "", confirm: "",
    shop_name: "", city: "", state: "", shop_phone: "",
  });
  const setR = (k) => (e) => setReg((r) => ({ ...r, [k]: e.target.value }));

  useEffect(() => { api.get("/barbershop").then(setShop).catch(() => {}); }, []);

  const submitLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(username.trim(), password, keep);
      toast.success(`Bem-vindo, ${u.name}`);
      navigate(defaultPanel(u), { replace: true });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    if (!reg.name || !reg.username || !reg.password || !reg.shop_name) {
      return toast.error("Preencha os campos obrigatórios");
    }
    if (!reg.document || reg.document.trim().length < 11) {
      return toast.error("Informe um CPF ou CNPJ válido para ativar o período de testes");
    }
    if (reg.password !== reg.confirm) return toast.error("As senhas não conferem");
    if (reg.password.length < 6) return toast.error("A senha deve ter ao menos 6 caracteres");
    setLoading(true);
    try {
      const u = await register({
        name: reg.name.trim(),
        email: reg.email.trim() || null,
        document: reg.document.trim(),
        phone: reg.phone.trim() || null,
        username: reg.username.trim(),
        password: reg.password,
        shop_name: reg.shop_name.trim(),
        city: reg.city.trim() || null,
        state: reg.state.trim() || null,
        shop_phone: reg.shop_phone.trim() || null,
      });
      toast.success(`Barbearia cadastrada com 7 dias grátis! Bem-vindo ao KingPro, ${u.name}`);
      // Redireciona para escolha de planos com 7 dias de trial grátis
      navigate("/planos", { state: { fromRegister: true } });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
      toast.error(formatApiErrorDetail(msg));
    } finally { setLoading(false); }
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
          <span>Início / Página de Vendas</span>
          <ArrowUpRight className="h-3 w-3 text-slate-500" />
        </a>
      </div>

      <Card className="w-full max-w-md p-8 border border-white/10 bg-[#12141F] rounded-[4px] shadow-none" data-testid="login-card">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <img 
              src="/logo.png" 
              alt="KingPro" 
              className="h-12 w-12 rounded-full object-cover border border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/15" 
              data-testid="login-logo" 
            />
            <div className="flex flex-col text-left">
              <span className="font-display font-extrabold text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500">
                KingPro
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Gestão para Barbearias
              </span>
            </div>
          </div>
          <h1 className="mt-1 font-display text-sm font-bold text-slate-200">
            {mode === "register" ? "Criar minha barbearia (7 dias grátis)" : "Acesse sua conta"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "register" ? "Cadastre você e sua barbearia para começar" : "Entre com seu usuário e senha"}
          </p>
        </div>

        {mode === "login" ? (
          <form onSubmit={submitLogin} className="space-y-4">
            <div>
              <Label>Usuário ou e-mail</Label>
              <Input className="rounded-[4px]" value={username} onChange={(e) => setUsername(e.target.value)} data-testid="login-username" autoFocus />
            </div>
            <div>
              <Label>Senha</Label>
              <Input className="rounded-[4px]" type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <Checkbox checked={keep} onCheckedChange={setKeep} data-testid="login-keep" /> Manter conectado
            </label>
            <Button type="submit" className="w-full gap-2 rounded-[4px] shadow-none" disabled={loading} data-testid="login-submit">
              <LogIn className="h-4 w-4" /> {loading ? "Entrando..." : "Entrar"}
            </Button>
            <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground cursor-pointer" data-testid="forgot-password"
              onClick={() => toast.info("Para redefinir sua senha, procure o Dono/Gerente da sua barbearia.")}>
              Esqueci minha senha
            </button>
            <div className="border-t border-white/10 pt-4">
              <Button type="button" variant="secondary" className="w-full gap-2 rounded-[4px] shadow-none" onClick={() => setMode("register")} data-testid="go-register">
                <Store className="h-4 w-4" /> Criar minha barbearia
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitRegister} className="space-y-4">
            <p className="text-sm font-semibold text-primary">Dados do responsável</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome completo *</Label><Input className="rounded-[4px]" value={reg.name} onChange={setR("name")} data-testid="reg-name" /></div>
              <div><Label>E-mail</Label><Input className="rounded-[4px]" type="email" value={reg.email} onChange={setR("email")} data-testid="reg-email" /></div>
              <div><Label>Telefone</Label><Input className="rounded-[4px]" value={reg.phone} onChange={setR("phone")} data-testid="reg-phone" /></div>
              <div><Label>Usuário *</Label><Input className="rounded-[4px]" value={reg.username} onChange={setR("username")} data-testid="reg-username" /></div>
              <div />
              <div><Label>Senha *</Label><Input className="rounded-[4px]" type="password" value={reg.password} onChange={setR("password")} data-testid="reg-password" /></div>
              <div><Label>Confirmar senha *</Label><Input className="rounded-[4px]" type="password" value={reg.confirm} onChange={setR("confirm")} data-testid="reg-confirm" /></div>
            </div>
            <p className="pt-2 text-sm font-semibold text-primary">Dados da barbearia</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome da barbearia *</Label><Input className="rounded-[4px]" value={reg.shop_name} onChange={setR("shop_name")} data-testid="reg-shopname" /></div>
              <div className="sm:col-span-2">
                <Label>CPF ou CNPJ (Documento) *</Label>
                <Input
                  className="rounded-[4px]"
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  value={reg.document}
                  onChange={setR("document")}
                  data-testid="reg-document"
                />
                <span className="text-[11px] text-muted-foreground">Necessário para ativação dos 7 dias grátis (único por barbearia/documento).</span>
              </div>
              <div><Label>Cidade</Label><Input className="rounded-[4px]" value={reg.city} onChange={setR("city")} data-testid="reg-city" /></div>
              <div><Label>Estado</Label><Input className="rounded-[4px]" value={reg.state} onChange={setR("state")} data-testid="reg-state" /></div>
              <div className="sm:col-span-2"><Label>Telefone da barbearia</Label><Input className="rounded-[4px]" value={reg.shop_phone} onChange={setR("shop_phone")} data-testid="reg-shopphone" /></div>
            </div>
            <Button type="submit" className="w-full gap-2 rounded-[4px] shadow-none" disabled={loading} data-testid="reg-submit">
              <Store className="h-4 w-4" /> {loading ? "Criando..." : "Criar barbearia e entrar"}
            </Button>
            <Button type="button" variant="ghost" className="w-full gap-2 text-muted-foreground rounded-[4px]" onClick={() => setMode("login")} data-testid="reg-back">
              <ArrowLeft className="h-4 w-4" /> Voltar para o login
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
