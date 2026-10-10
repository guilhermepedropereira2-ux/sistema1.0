import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import crypto from "crypto";
import net from "net";

const rootDir = process.cwd();
const realDbPath = path.join(rootDir, "data", "kupola_db.json");
const realStoragePath = path.join(rootDir, "data", "kupola_storage.json");

function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function makeRequest(port, options, body = null) {
  return new Promise((resolve, reject) => {
    const pathStr = options.path.startsWith("/") ? options.path : `/${options.path}`;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api${pathStr}`,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw });
        });
      }
    );
    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runAudit() {
  console.log("================================================================================");
  console.log("=== KUPOLA 2.0 — ETAPA 2B.3: AUDITORIA DE PERMISSÕES E CONTROLE DE ACESSO    ===");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const auditFindings = [];

  function recordTest(passed, name, details = "", severity = null) {
    totalTests++;
    if (passed) {
      console.log(`  [PASS] #${totalTests}: ${name}`);
      passedTests++;
      return true;
    } else {
      console.error(`  [ACHADO/FALHA] #${totalTests}: ${name}`);
      if (details) console.error(`         Evidência: ${details}`);
      failedTests++;
      if (severity) {
        auditFindings.push({ id: totalTests, name, details, severity });
      }
      return false;
    }
  }

  // 1. Integridade inicial
  const initialDbHash = getFileHash(realDbPath);
  const initialStorageHash = getFileHash(realStoragePath);
  console.log(`[Segurança] Hash SHA-256 inicial de data/kupola_db.json: ${initialDbHash || "Inexistente"}`);

  // 2. Sandbox isolado
  const tempSandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "kupola-rbac-iso-"));
  const tempEnvPath = path.join(tempSandboxDir, ".env");
  const tempSecret = "rbac-audit-test-secret-min-32-chars-alpha-beta-superadmin-99";
  fs.writeFileSync(tempEnvPath, `JWT_SECRET=${tempSecret}\nNODE_ENV=production\n`);
  fs.mkdirSync(path.join(tempSandboxDir, "data"), { recursive: true });

  if (fs.existsSync(path.join(rootDir, "dist"))) {
    try { fs.symlinkSync(path.join(rootDir, "dist"), path.join(tempSandboxDir, "dist")); } catch (e) {}
  }

  const testPort = await getFreePort();
  console.log(`[Ambiente] Sandbox temporário: ${tempSandboxDir}`);
  console.log(`[Ambiente] Porta dinâmica alocada: ${testPort}`);

  // 3. Inicialização do servidor em sandbox
  const serverChild = spawn("npx", ["tsx", path.join(rootDir, "server.ts")], {
    cwd: tempSandboxDir,
    detached: true,
    env: {
      ...process.env,
      PORT: testPort.toString(),
      NODE_ENV: "production",
      DOTENV_CONFIG_PATH: tempEnvPath,
      JWT_SECRET: tempSecret,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const cleanupServer = () => {
    try {
      if (serverChild && serverChild.pid) {
        try { process.kill(-serverChild.pid, "SIGKILL"); } catch (e) {
          try { serverChild.kill("SIGKILL"); } catch (e2) {}
        }
      }
    } catch (e) {}
    try { fs.rmSync(tempSandboxDir, { recursive: true, force: true }); } catch (e) {}
  };

  process.on("exit", cleanupServer);
  process.on("SIGINT", () => { cleanupServer(); process.exit(1); });
  process.on("SIGTERM", () => { cleanupServer(); process.exit(1); });

  // 4. Aguardar servidor
  console.log("[Ambiente] Aguardando inicialização do servidor de auditoria...");
  let serverReady = false;
  const startWait = Date.now();
  while (Date.now() - startWait < 20000) {
    try {
      const res = await makeRequest(testPort, { path: "/health", method: "GET" });
      if (res.status === 200 && res.data?.status === "ok") {
        serverReady = true;
        break;
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  if (!serverReady) {
    console.error("[ERRO CRÍTICO] Servidor não inicializou.");
    cleanupServer();
    process.exit(1);
  }
  console.log("[Ambiente] Servidor pronto. Executando testes de auditoria de controle de acesso.\n");

  try {
    const timestamp = Date.now();

    // =========================================================================
    // SEÇÃO 1: DEFINIÇÃO, AUTENTICAÇÃO E VALIDAÇÃO DE CADA PERFIL
    // =========================================================================
    console.log("--- SEÇÃO 1: Autenticação e Validação de Perfis ---");

    // 1.1 SuperAdmin padrão
    const loginSuper = await makeRequest(testPort, { path: "/auth/login", method: "POST" }, {
      username: "superadmin",
      password: "superadmin123",
    });
    recordTest(
      loginSuper.status === 200 && loginSuper.data?.token && loginSuper.data?.user?.is_superadmin === true,
      "SuperAdmin autenticado com sucesso e flag is_superadmin=true confirmada"
    );
    const tokenSuper = loginSuper.data?.token;
    const authSuper = { Authorization: `Bearer ${tokenSuper}` };

    // 1.2 Dono Alpha
    const regDonoAlpha = await makeRequest(testPort, { path: "/auth/register", method: "POST" }, {
      shop_name: "Barbearia Alpha RBAC",
      name: "Dono Alpha",
      username: `dono_alpha_${timestamp}`,
      email: `dono_alpha_${timestamp}@teste.com`,
      password: "SenhaDonoAlpha123!",
      document: `11.111.111/0001-${String(timestamp).slice(-2)}`,
      city: "São Paulo",
      state: "SP",
    });
    recordTest(
      regDonoAlpha.status === 200 && regDonoAlpha.data?.token && regDonoAlpha.data?.user?.role === "dono",
      "Dono da barbearia registrado com role='dono' e token emitido"
    );
    const tokenDonoAlpha = regDonoAlpha.data?.token;
    const orgAlphaId = regDonoAlpha.data?.user?.barbershop_id;
    const donoAlphaId = regDonoAlpha.data?.user?.id;
    const authDonoAlpha = { Authorization: `Bearer ${tokenDonoAlpha}` };

    // 1.3 Gerente Alpha
    const createGerente = await makeRequest(testPort, { path: "/users", method: "POST", headers: authDonoAlpha }, {
      name: "Gerente Alpha",
      username: `gerente_alpha_${timestamp}`,
      email: `gerente_alpha_${timestamp}@teste.com`,
      password: "SenhaGerente123!",
      role: "gerente",
      roles: ["gerente"],
    });
    recordTest(createGerente.status === 200 && createGerente.data?.id, "Dono Alpha provisiona Gerente");
    const gerenteId = createGerente.data?.id;

    const loginGerente = await makeRequest(testPort, { path: "/auth/login", method: "POST" }, {
      username: `gerente_alpha_${timestamp}`,
      password: "SenhaGerente123!",
    });
    recordTest(loginGerente.status === 200 && loginGerente.data?.user?.role === "gerente", "Gerente autenticado com role='gerente'");
    const tokenGerente = loginGerente.data?.token;
    const authGerente = { Authorization: `Bearer ${tokenGerente}` };

    // 1.4 Barbeiro Alpha
    const createBarbeiro = await makeRequest(testPort, { path: "/barbers", method: "POST", headers: authDonoAlpha }, {
      name: "Barbeiro Carlos Alpha",
      username: `barbeiro_alpha_${timestamp}`,
      password: "SenhaBarbeiro123!",
      email: `barbeiro_alpha_${timestamp}@teste.com`,
      commission_percent: 40,
    });
    recordTest(createBarbeiro.status === 200 && createBarbeiro.data?.id, "Dono Alpha provisiona Barbeiro e conta de acesso");
    const barberCarlosId = createBarbeiro.data?.id;

    const loginBarbeiro = await makeRequest(testPort, { path: "/auth/login", method: "POST" }, {
      username: `barbeiro_alpha_${timestamp}`,
      password: "SenhaBarbeiro123!",
    });
    recordTest(loginBarbeiro.status === 200 && loginBarbeiro.data?.user?.role === "barbeiro", "Barbeiro autenticado com role='barbeiro'");
    const tokenBarbeiro = loginBarbeiro.data?.token;
    const barbeiroUserId = loginBarbeiro.data?.user?.id;
    const authBarbeiro = { Authorization: `Bearer ${tokenBarbeiro}` };

    // 1.5 Caixa / Recepção Alpha
    const createCaixa = await makeRequest(testPort, { path: "/users", method: "POST", headers: authDonoAlpha }, {
      name: "Recepcao Caixa Alpha",
      username: `caixa_alpha_${timestamp}`,
      email: `caixa_alpha_${timestamp}@teste.com`,
      password: "SenhaCaixa123!",
      role: "caixa",
      roles: ["caixa"],
    });
    recordTest(createCaixa.status === 200 && createCaixa.data?.id, "Dono Alpha provisiona operador Caixa / Recepção");
    const loginCaixa = await makeRequest(testPort, { path: "/auth/login", method: "POST" }, {
      username: `caixa_alpha_${timestamp}`,
      password: "SenhaCaixa123!",
    });
    const tokenCaixa = loginCaixa.data?.token;
    const authCaixa = { Authorization: `Bearer ${tokenCaixa}` };

    // 1.6 Tenant Beta (para testes de isolamento cruzado)
    const regDonoBeta = await makeRequest(testPort, { path: "/auth/register", method: "POST" }, {
      shop_name: "Barbearia Beta RBAC",
      name: "Dono Beta",
      username: `dono_beta_${timestamp}`,
      email: `dono_beta_${timestamp}@teste.com`,
      password: "SenhaDonoBeta123!",
      document: `22.222.222/0001-${String(timestamp).slice(-2)}`,
      city: "Campinas",
      state: "SP",
    });
    const tokenDonoBeta = regDonoBeta.data?.token;
    const orgBetaId = regDonoBeta.data?.user?.barbershop_id;
    const donoBetaId = regDonoBeta.data?.user?.id;
    const authDonoBeta = { Authorization: `Bearer ${tokenDonoBeta}` };

    // =========================================================================
    // SEÇÃO 2: VERIFICAÇÃO 3 — ISOLAMENTO ADMINISTRATIVO CRUZADO (DONO LEGÍTIMO)
    // =========================================================================
    console.log("\n--- SEÇÃO 2: Verificação de Isolamento Administrativo Cruzado ---");

    // 2.1 Dono Alpha tenta listar usuários da Beta
    const donoAlphaListUsers = await makeRequest(testPort, { path: "/users", method: "GET", headers: authDonoAlpha });
    const hasBetaUsersInAlphaList = donoAlphaListUsers.data?.some((u) => u.barbershop_id === orgBetaId);
    recordTest(
      !hasBetaUsersInAlphaList,
      "Dono Alpha não tem acesso à lista de usuários da Barbearia Beta em GET /users"
    );

    // 2.2 Dono Alpha tenta editar usuário da Beta via PUT /users/:id
    const crossEditUser = await makeRequest(testPort, { path: `/users/${donoBetaId}`, method: "PUT", headers: authDonoAlpha }, {
      name: "Nome Infiltrado por Alpha",
    });
    recordTest(
      crossEditUser.status === 404,
      "Dono Alpha bloqueado de editar usuário da Barbearia Beta (404 Not Found)",
      `Status: ${crossEditUser.status}`
    );

    // 2.3 Dono Alpha tenta alterar permissões de usuário da Beta
    const crossPermsUser = await makeRequest(testPort, { path: `/users/${donoBetaId}/permissions`, method: "PUT", headers: authDonoAlpha }, {
      ver_financeiro: false,
    });
    recordTest(
      crossPermsUser.status === 404,
      "Dono Alpha bloqueado de alterar permissões de usuário da Barbearia Beta (404)",
      `Status: ${crossPermsUser.status}`
    );

    // 2.4 Dono Alpha tenta excluir usuário da Beta
    const crossDeleteUser = await makeRequest(testPort, { path: `/users/${donoBetaId}`, method: "DELETE", headers: authDonoAlpha });
    recordTest(
      crossDeleteUser.status === 404,
      "Dono Alpha bloqueado de excluir usuário da Barbearia Beta (404)",
      `Status: ${crossDeleteUser.status}`
    );

    // 2.5 Dono Alpha tenta resetar senha de usuário da Beta
    const crossResetPassword = await makeRequest(testPort, { path: `/users/${donoBetaId}/reset-password`, method: "POST", headers: authDonoAlpha });
    recordTest(
      crossResetPassword.status === 404,
      "Dono Alpha bloqueado de resetar senha de usuário da Barbearia Beta (404)",
      `Status: ${crossResetPassword.status}`
    );

    // 2.6 Dono Alpha tenta realizar switch para usuário da Beta
    const crossSwitchUser = await makeRequest(testPort, { path: "/auth/switch", method: "POST", headers: authDonoAlpha }, {
      userId: donoBetaId,
    });
    recordTest(
      crossSwitchUser.status === 404,
      "Dono Alpha bloqueado de realizar login/switch em usuário da Barbearia Beta (404)",
      `Status: ${crossSwitchUser.status}`
    );

    // =========================================================================
    // SEÇÃO 3: VERIFICAÇÃO 4 — ROTAS E PRIVILÉGIOS DE SUPERADMIN
    // =========================================================================
    console.log("\n--- SEÇÃO 3: Verificação das Rotas de SuperAdmin ---");

    // 3.1 SuperAdmin acessa rotas globais com sucesso
    const superCheck = await makeRequest(testPort, { path: "/superadmin/check", method: "GET", headers: authSuper });
    recordTest(superCheck.status === 200 && superCheck.data?.is_superadmin === true, "SuperAdmin reconhecido em /superadmin/check (200)");

    const superMetrics = await makeRequest(testPort, { path: "/superadmin/metrics", method: "GET", headers: authSuper });
    recordTest(superMetrics.status === 200, "SuperAdmin acessa métricas globais do SaaS em /superadmin/metrics (200)");

    const superOrgs = await makeRequest(testPort, { path: "/superadmin/organizations", method: "GET", headers: authSuper });
    recordTest(superOrgs.status === 200 && Array.isArray(superOrgs.data), "SuperAdmin lista barbearias em /superadmin/organizations (200)");

    const superAction = await makeRequest(testPort, { path: `/superadmin/organizations/${orgAlphaId}/action`, method: "POST", headers: authSuper }, {
      action: "extend_trial",
      days: 7,
    });
    recordTest(superAction.status === 200, "SuperAdmin executa ação administrativa global em /action (200)");

    // 3.2 Dono legítimo é bloqueado com 403 Forbidden nas rotas de SuperAdmin
    const donoTryCheck = await makeRequest(testPort, { path: "/superadmin/check", method: "GET", headers: authDonoAlpha });
    recordTest(donoTryCheck.status === 403, "Dono bloqueado de acessar /superadmin/check com 403 Forbidden");

    const donoTryMetrics = await makeRequest(testPort, { path: "/superadmin/metrics", method: "GET", headers: authDonoAlpha });
    recordTest(donoTryMetrics.status === 403, "Dono bloqueado de acessar /superadmin/metrics com 403 Forbidden");

    const donoTryOrgs = await makeRequest(testPort, { path: "/superadmin/organizations", method: "GET", headers: authDonoAlpha });
    recordTest(donoTryOrgs.status === 403, "Dono bloqueado de acessar /superadmin/organizations com 403 Forbidden");

    const donoTryAction = await makeRequest(testPort, { path: `/superadmin/organizations/${orgBetaId}/action`, method: "POST", headers: authDonoAlpha }, {
      action: "change_plan",
      plan: "premium",
    });
    recordTest(donoTryAction.status === 403, "Dono bloqueado de executar ações de SuperAdmin com 403 Forbidden");

    const donoTryLegOrgs = await makeRequest(testPort, { path: "/organizations", method: "GET", headers: authDonoAlpha });
    recordTest(donoTryLegOrgs.status === 403, "Dono bloqueado de acessar /organizations com 403 Forbidden");

    // =========================================================================
    // SEÇÃO 4: VERIFICAÇÃO 2 & 5 — MANIPULAÇÃO DE PERFIL E ESCALAÇÃO DE PRIVILÉGIOS
    // =========================================================================
    console.log("\n--- SEÇÃO 4: Auditoria de Manipulação de Perfil e Escalação de Privilégios ---");

    // 4.1 Barbeiro tenta alterar sua própria role para 'dono'
    const barberTrySelfRole = await makeRequest(testPort, { path: `/users/${barbeiroUserId}`, method: "PUT", headers: authBarbeiro }, {
      role: "dono",
      roles: ["dono"],
    });
    recordTest(
      barberTrySelfRole.data?.role === "barbeiro",
      "Barbeiro é bloqueado de alterar sua própria role para 'dono' em PUT /users/:id"
    );

    // 4.2 Barbeiro tenta injetar permissões administrativas em si mesmo
    const barberTrySelfPerms = await makeRequest(testPort, { path: `/users/${barbeiroUserId}`, method: "PUT", headers: authBarbeiro }, {
      permissions: { ver_financeiro: true, excluir_lancamentos: true },
    });
    recordTest(
      !barberTrySelfPerms.data?.permissions?.ver_financeiro,
      "Barbeiro é bloqueado de injetar permissões administrativas em si mesmo"
    );

    // 4.3 Barbeiro tenta acessar PUT /users/:id/permissions
    const barberTryPermsRoute = await makeRequest(testPort, { path: `/users/${barbeiroUserId}/permissions`, method: "PUT", headers: authBarbeiro }, {
      ver_financeiro: true,
    });
    recordTest(barberTryPermsRoute.status === 403, "Barbeiro bloqueado de acessar PUT /users/:id/permissions (403)");

    // 4.4 Gerente tenta alterar sua role para 'dono'
    const gerenteTrySelfRole = await makeRequest(testPort, { path: `/users/${gerenteId}`, method: "PUT", headers: authGerente }, {
      role: "dono",
      roles: ["dono"],
    });
    recordTest(gerenteTrySelfRole.data?.role === "gerente", "Gerente bloqueado de alterar sua role para 'dono' em PUT /users/:id");

    // 4.5 [AUDITORIA CRÍTICA]: Dono de barbearia tenta elevar sua role para 'superadmin' ou injetar is_superadmin=true
    // Criamos um tenant de teste isolado para testar essa vulnerabilidade sem poluir o Dono Alpha
    const regDonoProbe = await makeRequest(testPort, { path: "/auth/register", method: "POST" }, {
      shop_name: "Barbearia Probe Escalation",
      name: "Dono Probe",
      username: `dono_probe_${timestamp}`,
      email: `dono_probe_${timestamp}@teste.com`,
      password: "SenhaDonoProbe123!",
      document: `44.444.444/0001-${String(timestamp).slice(-2)}`,
    });
    const probeToken = regDonoProbe.data?.token;
    const probeUserId = regDonoProbe.data?.user?.id;
    const authProbe = { Authorization: `Bearer ${probeToken}` };

    const probeEscalateReq = await makeRequest(testPort, { path: `/users/${probeUserId}`, method: "PUT", headers: authProbe }, {
      role: "superadmin",
      roles: ["superadmin"],
      is_superadmin: true,
    });
    const checkProbeMe = await makeRequest(testPort, { path: "/auth/me", method: "GET", headers: authProbe });
    const probeEscalated = checkProbeMe.data?.is_superadmin === true || checkProbeMe.data?.role === "superadmin";

    recordTest(
      !probeEscalated,
      "Vulnerabilidade: Dono de barbearia NÃO deve conseguir se auto-promover a SuperAdmin via PUT /users/:id",
      `is_superadmin=${checkProbeMe.data?.is_superadmin}, role=${checkProbeMe.data?.role} em auth.ts:436`,
      "CRÍTICA"
    );

    // 4.6 [AUDITORIA ALTA]: Dono de barbearia provisiona usuário com role='superadmin' em POST /users
    const probeCreateSuper = await makeRequest(testPort, { path: "/users", method: "POST", headers: authProbe }, {
      name: "Sub-SuperAdmin Probe",
      username: `sub_super_${timestamp}`,
      email: `sub_super_${timestamp}@teste.com`,
      password: "SenhaSubSuper123!",
      role: "superadmin",
      roles: ["superadmin"],
    });
    const subSuperCreated = probeCreateSuper.data?.role === "superadmin";
    recordTest(
      !subSuperCreated,
      "Vulnerabilidade: Dono de barbearia NÃO deve conseguir provisionar usuários com role='superadmin' em POST /users",
      `Role retornada: ${probeCreateSuper.data?.role} em auth.ts:389`,
      "ALTA"
    );

    // 4.7 [AUDITORIA CRÍTICA]: Registro público com e-mail hardcoded de SuperAdmin ('admin@kupola.app')
    const regHardcodedAdmin = await makeRequest(testPort, { path: "/auth/register", method: "POST" }, {
      shop_name: "Barbearia Invasora Email",
      name: "Invasor Admin",
      username: `admin_infiltrator_${timestamp}`,
      email: "admin@kupola.app",
      password: "SenhaInvasor123!",
      document: `55.555.555/0001-${String(timestamp).slice(-2)}`,
    });
    let adminEmailEscalated = false;
    if (regHardcodedAdmin.status === 200 && regHardcodedAdmin.data?.token) {
      const checkAdminMe = await makeRequest(testPort, {
        path: "/auth/me",
        method: "GET",
        headers: { Authorization: `Bearer ${regHardcodedAdmin.data.token}` },
      });
      adminEmailEscalated = checkAdminMe.data?.is_superadmin === true;
    }
    recordTest(
      !adminEmailEscalated,
      "Cadastro público com 'admin@kupola.app' NÃO concede permissões de SuperAdmin Master",
      `is_superadmin: ${adminEmailEscalated}`
    );

    // 4.7.1 [NOVO]: Registro público com e-mail 'superadmin@kupola.app'
    const regHardcodedSuper = await makeRequest(testPort, { path: "/auth/register", method: "POST" }, {
      shop_name: "Barbearia Invasora Super",
      name: "Invasor Super",
      username: `super_infiltrator_${timestamp}`,
      email: "superadmin@kupola.app",
      password: "SenhaInvasorSuper123!",
      document: `66.666.666/0001-${String(timestamp).slice(-2)}`,
    });
    let superEmailEscalated = false;
    if (regHardcodedSuper.status === 200 && regHardcodedSuper.data?.token) {
      const checkSuperMe = await makeRequest(testPort, {
        path: "/auth/me",
        method: "GET",
        headers: { Authorization: `Bearer ${regHardcodedSuper.data.token}` },
      });
      superEmailEscalated = checkSuperMe.data?.is_superadmin === true;
    }
    recordTest(
      !superEmailEscalated,
      "Cadastro público com 'superadmin@kupola.app' NÃO concede privilégios de SuperAdmin",
      `is_superadmin: ${superEmailEscalated}`
    );

    // 4.8 Token com assinatura forjada é rejeitado (401 ou 403)
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3Jfc3VwZXJhZG1pbiIsImlzX3N1cGVyYWRtaW4iOnRydWV9.forged_signature_123";
    const reqFakeJwt = await makeRequest(testPort, { path: "/superadmin/metrics", method: "GET", headers: { Authorization: `Bearer ${fakeToken}` } });
    recordTest(
      reqFakeJwt.status === 401 || reqFakeJwt.status === 403,
      `Token forjado com assinatura inválida é bloqueado pelo backend (${reqFakeJwt.status})`
    );

    // 4.9 Cabeçalhos falsos de bypass (x-is-superadmin, x-role)
    const reqHeaderBypass = await makeRequest(testPort, {
      path: "/superadmin/metrics",
      method: "GET",
      headers: {
        ...authDonoAlpha,
        "x-is-superadmin": "true",
        "x-role": "superadmin",
      },
    });
    recordTest(reqHeaderBypass.status === 403, "Tentativa de bypass via cabeçalhos falsos neutralizada (403 Forbidden)");

    // =========================================================================
    // SEÇÃO 5: VERIFICAÇÃO 6 — PROTEÇÃO DE CONTAS PRIVILEGIADAS
    // =========================================================================
    console.log("\n--- SEÇÃO 5: Proteção de Contas Privilegiadas ---");

    const superUserId = loginSuper.data?.user?.id || "usr_superadmin";

    // 5.1 Tentativa de excluir conta do SuperAdmin por um Dono
    const tryDeleteSuper = await makeRequest(testPort, { path: `/users/${superUserId}`, method: "DELETE", headers: authDonoAlpha });
    recordTest(
      tryDeleteSuper.status === 404 || tryDeleteSuper.status === 403,
      "Tentativa de exclusão do SuperAdmin por Dono é bloqueada (404/403)",
      `Status: ${tryDeleteSuper.status}`
    );

    // 5.2 Tentativa de resetar senha do SuperAdmin por um Dono
    const tryResetSuper = await makeRequest(testPort, { path: `/users/${superUserId}/reset-password`, method: "POST", headers: authDonoAlpha });
    recordTest(
      tryResetSuper.status === 404,
      "Tentativa de reset de senha do SuperAdmin por Dono é bloqueada (404 Not Found)",
      `Status: ${tryResetSuper.status}`
    );

    // 5.3 Dono tenta excluir a própria conta logada
    const tryDeleteSelf = await makeRequest(testPort, { path: `/users/${donoAlphaId}`, method: "DELETE", headers: authDonoAlpha });
    recordTest(tryDeleteSelf.status === 400, "Dono é impedido de excluir sua própria conta de sessão ativa (400)");

    // =========================================================================
    // SEÇÃO 6: VERIFICAÇÃO 7 & 8 — ENDPOINTS COM PERMISSÕES INSUFICIENTES E DEFESA EM PROFUNDIDADE
    // =========================================================================
    console.log("\n--- SEÇÃO 6: Auditoria de Endpoints com Permissões Insuficientes ---");

    // 6.1 [AUDITORIA ALTA]: GET /calendar acessível por Barbeiro sem permissão financeira
    const barberCalendarRes = await makeRequest(testPort, { path: "/calendar", method: "GET", headers: authBarbeiro });
    const leaksCalendar = barberCalendarRes.status === 200 && Array.isArray(barberCalendarRes.data?.revenues);
    recordTest(
      !leaksCalendar,
      "Vulnerabilidade: GET /calendar NÃO deve expor dados financeiros para Barbeiro sem 'ver_financeiro'",
      `Status: ${barberCalendarRes.status} em system.ts:365`,
      "ALTA"
    );

    // 6.2 [AUDITORIA MÉDIA]: GET /units expõe faturamento e lucro da rede para Barbeiro
    const barberUnitsRes = await makeRequest(testPort, { path: "/units", method: "GET", headers: authBarbeiro });
    const leaksUnitsMetrics = barberUnitsRes.status === 200 && barberUnitsRes.data?.network_summary?.total_gross !== undefined;
    recordTest(
      !leaksUnitsMetrics,
      "Vulnerabilidade: GET /units NÃO deve expor faturamento bruto e lucro para Barbeiros sem permissão",
      `Status: ${barberUnitsRes.status} em system.ts:127`,
      "MÉDIA"
    );

    // 6.3 [AUDITORIA MÉDIA]: GET /history expõe logs do sistema para Barbeiro
    const barberHistoryRes = await makeRequest(testPort, { path: "/history", method: "GET", headers: authBarbeiro });
    const leaksHistory = barberHistoryRes.status === 200 && Array.isArray(barberHistoryRes.data);
    recordTest(
      !leaksHistory,
      "Vulnerabilidade: GET /history NÃO deve expor logs de auditoria do sistema para Barbeiros",
      `Status: ${barberHistoryRes.status} em system.ts:385`,
      "MÉDIA"
    );

    // 6.4 [AUDITORIA MÉDIA]: GET /barbers/:id/report permite que um Barbeiro veja relatório de outro barbeiro
    const createBarber2 = await makeRequest(testPort, { path: "/barbers", method: "POST", headers: authDonoAlpha }, {
      name: "Segundo Barbeiro Alpha",
      username: `barbeiro2_${timestamp}`,
      password: "SenhaBarbeiro2_123!",
      commission_percent: 50,
    });
    const barber2Id = createBarber2.data?.id;

    const barberViewsOtherReport = await makeRequest(testPort, { path: `/barbers/${barber2Id}/report`, method: "GET", headers: authBarbeiro });
    const leaksOtherBarberReport = barberViewsOtherReport.status === 200 && barberViewsOtherReport.data?.atendimentos !== undefined;
    recordTest(
      !leaksOtherBarberReport,
      "Vulnerabilidade: GET /barbers/:id/report NÃO deve permitir que um Barbeiro consulte relatórios de outros barbeiros",
      `Status: ${barberViewsOtherReport.status} em barbers.ts:171`,
      "MÉDIA"
    );

    // 6.5 [AUDITORIA BAIXA]: PUT /queue/:id sem exigir 'gerenciar_fila'
    const queueAdd = await makeRequest(testPort, { path: "/queue", method: "POST", headers: authDonoAlpha }, {
      client_name: "Cliente Fila Teste RBAC",
      service_ids: ["svc_1"],
    });
    const queueItemId = queueAdd.data?.id;
    const barberMutateQueue = await makeRequest(testPort, { path: `/queue/${queueItemId}`, method: "PUT", headers: authBarbeiro }, {
      status: "finalizado",
    });
    const queuePermMissing = barberMutateQueue.status === 200;
    recordTest(
      !queuePermMissing,
      "Vulnerabilidade: PUT /queue/:id deve exigir permissão 'gerenciar_fila' em vez de apenas requireAuth",
      `Status: ${barberMutateQueue.status} em operations.ts:164`,
      "BAIXA"
    );

    // 6.6 [VERIFICAÇÃO P2]: GET /onboarding/state não expõe dados privados de outros cadastros
    const noAuthOnboarding = await makeRequest(testPort, { path: "/onboarding/state", method: "GET" });
    const hasExposedData = noAuthOnboarding.data?.data && Object.keys(noAuthOnboarding.data.data).length > 0;
    const hasExposedBarbershop = Boolean(noAuthOnboarding.data?.barbershop?.name);
    recordTest(
      noAuthOnboarding.status === 200 && !hasExposedData && !hasExposedBarbershop,
      "Endpoint de onboarding público não expõe dados privados nem cadastros anteriores",
      `Status: ${noAuthOnboarding.status}, PrivateData: ${hasExposedData}`
    );

    // =========================================================================
    // SEÇÃO 7: VERIFICAÇÃO 9 — PERMISSÕES FINANCEIRAS, CONFIGURAÇÕES E ASSINATURA
    // =========================================================================
    console.log("\n--- SEÇÃO 7: Permissões Financeiras, Configurações e Assinaturas ---");

    // 7.1 Barbeiro bloqueado em GET /revenues
    const bRevs = await makeRequest(testPort, { path: "/revenues", method: "GET", headers: authBarbeiro });
    recordTest(bRevs.status === 403, "Barbeiro bloqueado em GET /revenues com 403 PERMISSION_DENIED");

    // 7.2 Barbeiro bloqueado em GET /expenses
    const bExps = await makeRequest(testPort, { path: "/expenses", method: "GET", headers: authBarbeiro });
    recordTest(bExps.status === 403, "Barbeiro bloqueado em GET /expenses com 403 Forbidden");

    // 7.3 Barbeiro bloqueado em GET /withdrawals
    const bWds = await makeRequest(testPort, { path: "/withdrawals", method: "GET", headers: authBarbeiro });
    recordTest(bWds.status === 403, "Barbeiro bloqueado em GET /withdrawals com 403 Forbidden");

    // 7.4 Barbeiro bloqueado em GET /cash-closings
    const bCc = await makeRequest(testPort, { path: "/cash-closings", method: "GET", headers: authBarbeiro });
    recordTest(bCc.status === 403, "Barbeiro bloqueado em GET /cash-closings com 403 Forbidden");

    // 7.5 Barbeiro bloqueado em PUT /settings
    const bSettings = await makeRequest(testPort, { path: "/settings", method: "PUT", headers: authBarbeiro }, {
      commission_base: "net",
    });
    recordTest(bSettings.status === 403, "Barbeiro bloqueado em PUT /settings com 403 Forbidden");

    // 7.6 Barbeiro bloqueado em PUT /subscription
    const bSub = await makeRequest(testPort, { path: "/subscription", method: "PUT", headers: authBarbeiro }, {
      plan_id: "premium",
    });
    recordTest(bSub.status === 403, "Barbeiro bloqueado em PUT /subscription com 403 DONO_REQUIRED");

    // 7.7 [AUDITORIA ALTA]: Dono realiza upgrade de assinatura autônomo sem gateway ou SuperAdmin
    const donoUpgradeSub = await makeRequest(testPort, { path: "/subscription", method: "PUT", headers: authDonoAlpha }, {
      plan_id: "premium",
      status: "active",
    });
    const subSelfApproved = donoUpgradeSub.status === 200 && donoUpgradeSub.data?.plan_id === "premium" && donoUpgradeSub.data?.status === "active";
    recordTest(
      !subSelfApproved,
      "Vulnerabilidade: PUT /subscription não deve permitir autoativação de plano Premium sem gateway de pagamento ou SuperAdmin",
      `Plan: ${donoUpgradeSub.data?.plan_id}, Status: ${donoUpgradeSub.data?.status} em system.ts:80`,
      "ALTA"
    );

    // =========================================================================
    // FINALIZAÇÃO E LIMPEZA
    // =========================================================================
    cleanupServer();
    console.log("\n[Ambiente] Processo de teste encerrado e sandbox limpo com sucesso.");

    const finalDbHash = getFileHash(realDbPath);
    recordTest(
      initialDbHash === finalDbHash,
      "Proteção da base real: data/kupola_db.json permaneceu 100% inalterado (Hash SHA-256 intacto)"
    );

  } catch (err) {
    console.error("[ERRO CRÍTICO NA AUDITORIA]:", err);
    cleanupServer();
    process.exit(1);
  }

  console.log("\n================================================================================");
  console.log(`=== RESUMO FINAL DA AUDITORIA DE PERMISSÕES KUPOLA 2.0 ===`);
  console.log(`=== TESTES EXECUTADOS: ${totalTests} | VERIFICAÇÕES CONFORME: ${passedTests} | VULNERABILIDADES DETECTADAS: ${failedTests} ===`);
  console.log("================================================================================\n");

  if (auditFindings.length > 0) {
    console.log("--- QUADRO CONSOLIDADO DE VULNERABILIDADES (ORDEM DE CRITICIDADE) ---");
    auditFindings.forEach((f) => {
      console.log(`[${f.severity}] #${f.id}: ${f.name}`);
      console.log(`       Evidência: ${f.details}\n`);
    });
  }
}

runAudit();
