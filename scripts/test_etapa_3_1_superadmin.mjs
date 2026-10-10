import http from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import net from "net";
import { spawn } from "child_process";

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

console.log("==================================================================================");
console.log("       KUPOLA 2.0 — ETAPA 3.1: PAINEL EXCLUSIVO DO PROPRIETÁRIO DO SAAS          ");
console.log("==================================================================================");

const initialDbHash = getFileHash(realDbPath);
const initialStorageHash = getFileHash(realStoragePath);
console.log(`[Segurança] Hash SHA-256 inicial de data/kupola_db.json: ${initialDbHash}`);

// 2. Sandbox isolado
const tempSandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "kupola-superadmin-iso-"));
const tempEnvPath = path.join(tempSandboxDir, ".env");
const tempSecret = "superadmin-etapa31-secret-min-32-chars-test-env-auth-key-99";
fs.writeFileSync(tempEnvPath, `JWT_SECRET=${tempSecret}\nNODE_ENV=production\n`);
fs.mkdirSync(path.join(tempSandboxDir, "data"), { recursive: true });

if (fs.existsSync(path.join(rootDir, "dist"))) {
  try { fs.symlinkSync(path.join(rootDir, "dist"), path.join(tempSandboxDir, "dist")); } catch (e) {}
}

const testPort = await getFreePort();
console.log(`[Ambiente] Sandbox temporário: ${tempSandboxDir}`);
console.log(`[Ambiente] Porta dinâmica alocada: ${testPort}`);

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

function makeRequest(port, method, reqPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api${reqPath.startsWith("/") ? reqPath : "/" + reqPath}`,
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {
            json = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw });
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

let passedCount = 0;
let failedCount = 0;

function assert(condition, testId, desc, details = "") {
  if (condition) {
    console.log(`  [PASS] #${testId}: ${desc}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] #${testId}: ${desc} — ${details}`);
    failedCount++;
  }
}

async function runTestSuite() {
  try {
    console.log("[Ambiente] Aguardando inicialização do servidor de testes...");
    let serverReady = false;
    const startWait = Date.now();
    while (Date.now() - startWait < 20000) {
      try {
        const res = await makeRequest(testPort, "GET", "/health");
        if (res.status === 200 && res.body?.status === "ok") {
          serverReady = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (!serverReady) {
      console.error("[ERRO CRÍTICO] Servidor não inicializou no sandbox.");
      cleanupServer();
      process.exit(1);
    }

    console.log("[Ambiente] Servidor pronto. Iniciando verificações da Etapa 3.1.\n");
    const timestamp = Date.now();

    // =========================================================================
    // SEÇÃO 1: Autenticação do SuperAdmin e Provisionamento de Contas
    // =========================================================================
    console.log("--- SEÇÃO 1: Autenticação do SuperAdmin e Perfis do Sistema ---");

    // 1.1 Login SuperAdmin legítimo seed
    const loginSuper = await makeRequest(testPort, "POST", "/auth/login", {}, {
      username: "superadmin",
      password: "superadmin123",
    });
    assert(loginSuper.status === 200, 1, "SuperAdmin Master autentica com sucesso (200)");
    assert(loginSuper.body?.user?.is_superadmin === true, 2, "Flag is_superadmin=true confirmada no SuperAdmin");
    const superToken = loginSuper.body?.token;

    // 1.2 Registro de Dono de Barbearia
    const regDono = await makeRequest(testPort, "POST", "/auth/register", {}, {
      shop_name: "Barbearia Imperial",
      name: "Dono Imperial",
      username: `dono_imp_${timestamp}`,
      email: `dono_imp_${timestamp}@teste.com`,
      password: "SenhaForteDono123!",
      document: `22.222.222/0001-${String(timestamp).slice(-2)}`,
      city: "Curitiba",
      state: "PR",
    });
    assert(regDono.status === 200, 3, "Dono de barbearia registrado com role='dono' (200)");
    assert(regDono.body?.user?.is_superadmin === false || !regDono.body?.user?.is_superadmin, 4, "Dono de barbearia NÃO possui privilégios de SuperAdmin");
    const donoToken = regDono.body?.token;

    // 1.3 Dono provisiona Gerente
    const createGerente = await makeRequest(testPort, "POST", "/users", { Authorization: `Bearer ${donoToken}` }, {
      name: "Gerente Operacional",
      username: `gerente_${timestamp}`,
      password: "SenhaForteGerente123!",
      email: `gerente_${timestamp}@teste.com`,
      role: "gerente",
      roles: ["gerente"],
    });
    assert(createGerente.status === 200 || createGerente.status === 201, 5, "Dono cadastra Gerente com sucesso");

    const loginGerente = await makeRequest(testPort, "POST", "/auth/login", {}, {
      username: `gerente_${timestamp}`,
      password: "SenhaForteGerente123!",
    });
    const gerenteToken = loginGerente.body?.token;
    assert(loginGerente.status === 200 && loginGerente.body?.user?.role === "gerente", 6, "Gerente autentica com role='gerente'");

    // 1.4 Dono provisiona Barbeiro
    const createBarber = await makeRequest(testPort, "POST", "/barbers", { Authorization: `Bearer ${donoToken}` }, {
      name: "Barbeiro Staff",
      username: `barbeiro_${timestamp}`,
      password: "SenhaForteBarbeiro123!",
      email: `barbeiro_${timestamp}@teste.com`,
      commission_percent: 45,
    });
    assert(createBarber.status === 200 || createBarber.status === 201, 7, "Dono cadastra Barbeiro com sucesso");

    const loginBarber = await makeRequest(testPort, "POST", "/auth/login", {}, {
      username: `barbeiro_${timestamp}`,
      password: "SenhaForteBarbeiro123!",
    });
    const barberToken = loginBarber.body?.token;
    assert(loginBarber.status === 200 && loginBarber.body?.user?.role === "barbeiro", 8, "Barbeiro autentica com role='barbeiro'");

    // 1.5 Dono provisiona Caixa
    const createCaixa = await makeRequest(testPort, "POST", "/users", { Authorization: `Bearer ${donoToken}` }, {
      name: "Operador Caixa",
      username: `caixa_${timestamp}`,
      password: "SenhaForteCaixa123!",
      email: `caixa_${timestamp}@teste.com`,
      role: "caixa",
      roles: ["caixa"],
    });
    assert(createCaixa.status === 200 || createCaixa.status === 201, 9, "Dono cadastra Caixa / Balcão");

    const loginCaixa = await makeRequest(testPort, "POST", "/auth/login", {}, {
      username: `caixa_${timestamp}`,
      password: "SenhaForteCaixa123!",
    });
    const caixaToken = loginCaixa.body?.token;
    assert(loginCaixa.status === 200 && loginCaixa.body?.user?.role === "caixa", 10, "Caixa autentica com role='caixa'");

    // =========================================================================
    // SEÇÃO 2: Acesso Permitido Exclusivo ao SuperAdmin Provisionado
    // =========================================================================
    console.log("\n--- SEÇÃO 2: Acesso Permitido Exclusivo ao SuperAdmin ---");

    // 2.1 Verificação de autorização em GET /api/superadmin/check
    const checkSuper = await makeRequest(testPort, "GET", "/superadmin/check", { Authorization: `Bearer ${superToken}` });
    assert(checkSuper.status === 200, 11, "SuperAdmin acessa /superadmin/check (200 OK)");
    assert(checkSuper.body?.is_superadmin === true, 12, "/superadmin/check retorna { is_superadmin: true }");
    assert(checkSuper.body?.user?.email === "superadmin@kupola.app", 13, "Dados da conta SuperAdmin legítima confirmados");

    // 2.2 Métricas globais da plataforma em GET /api/superadmin/metrics
    const metricsSuper = await makeRequest(testPort, "GET", "/superadmin/metrics", { Authorization: `Bearer ${superToken}` });
    assert(metricsSuper.status === 200, 14, "SuperAdmin acessa /superadmin/metrics (200 OK)");
    assert(typeof metricsSuper.body?.totalOrganizations === "number" && metricsSuper.body?.totalOrganizations >= 1, 15, "Métricas contêm totalOrganizations como número");
    assert(typeof metricsSuper.body?.accountStatus?.active === "number", 16, "Métricas contêm accountStatus.active");
    assert(typeof metricsSuper.body?.accountStatus?.blocked === "number", 17, "Métricas contêm accountStatus.blocked");
    assert(typeof metricsSuper.body?.subscriptionStatus?.trial === "number", 18, "Métricas contêm subscriptionStatus.trial");
    assert(typeof metricsSuper.body?.subscriptionStatus?.active === "number", 19, "Métricas contêm subscriptionStatus.active");
    assert(typeof metricsSuper.body?.subscriptionStatus?.expired === "number", 20, "Métricas contêm subscriptionStatus.expired");
    assert(typeof metricsSuper.body?.subscriptionStatus?.canceled === "number", 21, "Métricas contêm subscriptionStatus.canceled");
    assert(metricsSuper.body?.planDistribution && typeof metricsSuper.body?.planDistribution?.pro === "number", 22, "Métricas contêm planDistribution (basic, pro, premium)");
    assert(typeof metricsSuper.body?.estimatedMRR === "number", 23, "Métricas contêm estimatedMRR calculado");
    assert(typeof metricsSuper.body?.estimatedARR === "number", 24, "Métricas contêm estimatedARR calculado");
    assert(metricsSuper.body?.financialSummary?.hasConfirmedGateway === false, 25, "Transparência financeira: hasConfirmedGateway=false explícito");
    assert(metricsSuper.body?.financialSummary?.confirmedRevenue === 0, 26, "Transparência financeira: confirmedRevenue=0 explícito");
    assert(typeof metricsSuper.body?.financialSummary?.statusNote === "string", 27, "Nota explicativa de gateway pendente presente");

    // 2.3 Lista de barbearias em GET /api/superadmin/organizations
    const orgsSuper = await makeRequest(testPort, "GET", "/superadmin/organizations", { Authorization: `Bearer ${superToken}` });
    assert(orgsSuper.status === 200, 28, "SuperAdmin acessa /superadmin/organizations (200 OK)");
    assert(Array.isArray(orgsSuper.body), 29, "Lista de organizações retornada como Array");
    assert(orgsSuper.body.length > 0, 30, "Organizações cadastradas encontradas na listagem executiva");

    const firstOrg = orgsSuper.body[0];
    assert(Boolean(firstOrg?.id && firstOrg?.name), 31, "Organização possui id e name definidos");
    assert(Boolean(firstOrg?.account_status), 32, "Organização possui account_status ('ativa' | 'bloqueada')");
    assert(Boolean(firstOrg?.subscription_status), 33, "Organização possui subscription_status ('ativa' | 'teste' | 'vencida' | 'cancelada')");
    assert(Boolean(firstOrg?.plan), 34, "Organização possui plano associado");
    assert(Boolean(firstOrg?.owner_email), 35, "Organização possui owner_email para contato executivo");

    // =========================================================================
    // SEÇÃO 3: Bloqueio Rigoroso de Perfis Não-SuperAdmin (403 Forbidden)
    // =========================================================================
    console.log("\n--- SEÇÃO 3: Bloqueio Rigoroso de Acesso de Perfis Não-Autorizados ---");

    // 3.1 Dono de barbearia é bloqueado em todas as rotas de SuperAdmin
    const donoCheck = await makeRequest(testPort, "GET", "/superadmin/check", { Authorization: `Bearer ${donoToken}` });
    assert(donoCheck.status === 403, 36, "Dono de barbearia bloqueado em /superadmin/check com 403 Forbidden");

    const donoMetrics = await makeRequest(testPort, "GET", "/superadmin/metrics", { Authorization: `Bearer ${donoToken}` });
    assert(donoMetrics.status === 403, 37, "Dono de barbearia bloqueado em /superadmin/metrics com 403 Forbidden");

    const donoOrgs = await makeRequest(testPort, "GET", "/superadmin/organizations", { Authorization: `Bearer ${donoToken}` });
    assert(donoOrgs.status === 403, 38, "Dono de barbearia bloqueado em /superadmin/organizations com 403 Forbidden");

    // 3.2 Gerente é bloqueado
    const gerenteCheck = await makeRequest(testPort, "GET", "/superadmin/check", { Authorization: `Bearer ${gerenteToken}` });
    assert(gerenteCheck.status === 403, 39, "Gerente bloqueado em /superadmin/check com 403 Forbidden");

    const gerenteMetrics = await makeRequest(testPort, "GET", "/superadmin/metrics", { Authorization: `Bearer ${gerenteToken}` });
    assert(gerenteMetrics.status === 403, 40, "Gerente bloqueado em /superadmin/metrics com 403 Forbidden");

    const gerenteOrgs = await makeRequest(testPort, "GET", "/superadmin/organizations", { Authorization: `Bearer ${gerenteToken}` });
    assert(gerenteOrgs.status === 403, 41, "Gerente bloqueado em /superadmin/organizations com 403 Forbidden");

    // 3.3 Barbeiro é bloqueado
    const barberCheck = await makeRequest(testPort, "GET", "/superadmin/check", { Authorization: `Bearer ${barberToken}` });
    assert(barberCheck.status === 403, 42, "Barbeiro bloqueado em /superadmin/check com 403 Forbidden");

    const barberMetrics = await makeRequest(testPort, "GET", "/superadmin/metrics", { Authorization: `Bearer ${barberToken}` });
    assert(barberMetrics.status === 403, 43, "Barbeiro bloqueado em /superadmin/metrics com 403 Forbidden");

    const barberOrgs = await makeRequest(testPort, "GET", "/superadmin/organizations", { Authorization: `Bearer ${barberToken}` });
    assert(barberOrgs.status === 403, 44, "Barbeiro bloqueado em /superadmin/organizations com 403 Forbidden");

    // 3.4 Operador Caixa é bloqueado
    const caixaCheck = await makeRequest(testPort, "GET", "/superadmin/check", { Authorization: `Bearer ${caixaToken}` });
    assert(caixaCheck.status === 403, 45, "Operador Caixa bloqueado em /superadmin/check com 403 Forbidden");

    const caixaMetrics = await makeRequest(testPort, "GET", "/superadmin/metrics", { Authorization: `Bearer ${caixaToken}` });
    assert(caixaMetrics.status === 403, 46, "Operador Caixa bloqueado em /superadmin/metrics com 403 Forbidden");

    const caixaOrgs = await makeRequest(testPort, "GET", "/superadmin/organizations", { Authorization: `Bearer ${caixaToken}` });
    assert(caixaOrgs.status === 403, 47, "Operador Caixa bloqueado em /superadmin/organizations com 403 Forbidden");

    // 3.5 Requisição não autenticada (sem token)
    const noAuthCheck = await makeRequest(testPort, "GET", "/superadmin/check");
    assert(noAuthCheck.status === 403 || noAuthCheck.status === 401, 48, "Acesso anônimo a /superadmin/check rejeitado com 403/401");

    const noAuthMetrics = await makeRequest(testPort, "GET", "/superadmin/metrics");
    assert(noAuthMetrics.status === 403 || noAuthMetrics.status === 401, 49, "Acesso anônimo a /superadmin/metrics rejeitado com 403/401");

    const noAuthOrgs = await makeRequest(testPort, "GET", "/superadmin/organizations");
    assert(noAuthOrgs.status === 403 || noAuthOrgs.status === 401, 50, "Acesso anônimo a /superadmin/organizations rejeitado com 403/401");

    // =========================================================================
    // SEÇÃO 4: Tentativas de Bypass, Spoofing e Forjamento de Tokens
    // =========================================================================
    console.log("\n--- SEÇÃO 4: Tentativas de Forjamento e Injeção de Privilégios ---");

    // 4.1 Token com assinatura forjada
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3Jfc3VwZXJhZG1pbiIsImlzX3N1cGVyYWRtaW4iOnRydWV9.forged_signature_xyz";
    const fakeTokenRes = await makeRequest(testPort, "GET", "/superadmin/metrics", { Authorization: `Bearer ${fakeToken}` });
    assert(fakeTokenRes.status === 401 || fakeTokenRes.status === 403, 51, "Token com assinatura forjada é rejeitado (401/403)");

    // 4.2 Cabeçalhos forjados x-organization-id ou x-superadmin
    const spoofHeaderRes = await makeRequest(testPort, "GET", "/superadmin/metrics", {
      Authorization: `Bearer ${donoToken}`,
      "x-superadmin": "true",
      "x-is-superadmin": "true",
      "x-user-role": "superadmin",
    });
    assert(spoofHeaderRes.status === 403, 52, "Injeção de cabeçalhos privileged é totalmente ignorada (403 Forbidden)");

    // =========================================================================
    // SEÇÃO 5: Proteção de Dados Operacionais e Isolamento Multi-Tenant
    // =========================================================================
    console.log("\n--- SEÇÃO 5: Proteção de Dados Operacionais Privados de Barbearias ---");

    // 5.1 /superadmin/organizations NÃO expõe clientes privados
    const hasClientLeak = orgsSuper.body.some((o) => o.clients || o.customers || o.client_list);
    assert(!hasClientLeak, 53, "Nenhuma lista de clientes privados é exposta no painel SuperAdmin");

    // 5.2 /superadmin/organizations NÃO expõe atendimentos privados
    const hasAppointmentsLeak = orgsSuper.body.some((o) => o.appointments || o.atendimentos || o.services_executed);
    assert(!hasAppointmentsLeak, 54, "Nenhum histórico operacional de atendimentos privados é exposto");

    // 5.3 /superadmin/organizations NÃO expõe comissões individuais
    const hasCommissionsLeak = orgsSuper.body.some((o) => o.commissions || o.comissoes);
    assert(!hasCommissionsLeak, 55, "Nenhum dado salarial ou comissão de barbeiro individual é vazado");

    // =========================================================================
    // SEÇÃO 6: Integridade Absoluta da Base Real de Dados
    // =========================================================================
    console.log("\n--- SEÇÃO 6: Integridade Absoluta da Base Real ---");

    const finalDbHash = getFileHash(realDbPath);
    const finalStorageHash = getFileHash(realStoragePath);
    assert(initialDbHash === finalDbHash, 56, "Arquivo de produção data/kupola_db.json permaneceu 100% inalterado (Hash idêntico)");
    assert(initialStorageHash === finalStorageHash, 57, "Arquivo de produção data/kupola_storage.json permaneceu 100% inalterado (Hash idêntico)");

    console.log("\n==================================================================================");
    console.log(` RESUMO DOS TESTES ETAPA 3.1: ${passedCount} PASS | ${failedCount} FAIL`);
    console.log("==================================================================================");

    cleanupServer();

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Erro fatal durante a execução dos testes:", err);
    cleanupServer();
    process.exit(1);
  }
}

runTestSuite();
