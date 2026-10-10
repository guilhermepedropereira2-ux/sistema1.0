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
console.log("   KUPOLA 2.0 — ETAPA 3.3: VALIDAÇÃO DAS CORREÇÕES DE MÉTRICAS DO SUPERADMIN      ");
console.log("==================================================================================");

const initialDbHash = getFileHash(realDbPath);
const initialStorageHash = getFileHash(realStoragePath);
console.log(`[Segurança] Hash SHA-256 inicial de data/kupola_db.json: ${initialDbHash}`);
console.log(`[Segurança] Hash SHA-256 inicial de data/kupola_storage.json: ${initialStorageHash}`);

// Criação de sandbox isolado
const tempSandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "kupola-metrics-iso-"));
const tempEnvPath = path.join(tempSandboxDir, ".env");
const tempSecret = "superadmin-etapa33-metrics-audit-secret-key-min-32-chars-test";
fs.writeFileSync(tempEnvPath, `JWT_SECRET=${tempSecret}\nNODE_ENV=production\n`);
fs.mkdirSync(path.join(tempSandboxDir, "data"), { recursive: true });

// Criar base de dados customizada no sandbox para testar todas as variações de planos e status
const testOrganizationsMap = [
  // 1. Assinatura ativa Pro (preço oficial: R$ 79,90)
  ["org_vintage", {
    id: "org_vintage",
    name: "Barbearia Vintage Club",
    slug: "barbearia-vintage",
    plan: "pro",
    status: "active",
    subscription_status: "active",
    subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  }],
  // 2. Assinatura ativa Basic (preço oficial: R$ 39,90)
  ["org_basic_active", {
    id: "org_basic_active",
    name: "Barbearia Solo Basic",
    slug: "barbearia-solo",
    plan: "basic",
    status: "active",
    subscription_status: "active",
    subscription_expires_at: new Date(Date.now() + 20 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  }],
  // 3. Assinatura ativa Premium (preço oficial: R$ 129,90)
  ["org_premium_active", {
    id: "org_premium_active",
    name: "Rede Barbearia Premium",
    slug: "barbearia-rede",
    plan: "premium",
    status: "active",
    subscription_status: "active",
    subscription_expires_at: new Date(Date.now() + 45 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  }],
  // 4. Conta em Trial (NÃO deve somar no MRR principal, mas soma no potencial hipotético: R$ 79,90)
  ["org_trial_pro", {
    id: "org_trial_pro",
    name: "Barbearia Nova Trial",
    slug: "barbearia-trial",
    plan: "pro",
    status: "active",
    subscription_status: "trial",
    subscription_expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  }],
  // 5. Conta com Assinatura Expirada (NÃO deve somar no MRR)
  ["org_expired", {
    id: "org_expired",
    name: "Barbearia Vencida",
    slug: "barbearia-vencida",
    plan: "pro",
    status: "active",
    subscription_status: "expired",
    subscription_expires_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  }],
  // 6. Conta Suspensa/Bloqueada (NÃO deve somar no MRR)
  ["org_suspended", {
    id: "org_suspended",
    name: "Barbearia Bloqueada",
    slug: "barbearia-bloqueada",
    plan: "premium",
    status: "suspended",
    subscription_status: "canceled",
    subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  }],
  // 7. Conta Ativa com Plano Desconhecido (NÃO deve somar no MRR; deve registrar unknownPlansCount)
  ["org_unknown_plan", {
    id: "org_unknown_plan",
    name: "Barbearia Plano Customizado",
    slug: "barbearia-custom",
    plan: "plano_inexistente_xyz",
    status: "active",
    subscription_status: "active",
    subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  }],
];

const sandboxStorage = {
  organizations: testOrganizationsMap,
  users: [],
  clients: [],
  servicesProducts: [],
  appointments: [],
  subscriptionTransactions: [],
};

fs.writeFileSync(
  path.join(tempSandboxDir, "data", "kupola_storage.json"),
  JSON.stringify(sandboxStorage, null, 2)
);

// Copiar dados de usuários e a barbearia demo 'demo_vintage' para o sandbox (para testar a deduplicação exata)
if (fs.existsSync(realDbPath)) {
  const dbData = JSON.parse(fs.readFileSync(realDbPath, "utf-8"));
  dbData.barbershops = [
    {
      id: "demo_vintage",
      name: "Barbearia Vintage Club",
      slug: "barbearia-vintage",
    },
  ];
  fs.writeFileSync(
    path.join(tempSandboxDir, "data", "kupola_db.json"),
    JSON.stringify(dbData, null, 2)
  );
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

async function runTests() {
  try {
    console.log("[Ambiente] Aguardando inicialização do servidor...");
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

    console.log("[Ambiente] Servidor pronto. Executando testes da Etapa 3.3.\n");

    // Login do SuperAdmin
    const loginSuper = await makeRequest(testPort, "POST", "/auth/login", {}, {
      username: "superadmin",
      password: "superadmin123",
    });
    assert(loginSuper.status === 200 && loginSuper.body?.token, 1, "SuperAdmin autentica no sandbox");
    const superToken = loginSuper.body?.token;
    const authHeaders = { Authorization: `Bearer ${superToken}` };

    // =========================================================================
    // SEÇÃO 1: Deduplicação de 'demo_vintage' vs 'org_vintage'
    // =========================================================================
    console.log("--- SEÇÃO 1: Deduplicação de 'demo_vintage' vs 'org_vintage' ---");

    const resMetrics = await makeRequest(testPort, "GET", "/superadmin/metrics", authHeaders);
    assert(resMetrics.status === 200, 2, "GET /superadmin/metrics retorna 200 OK");
    // O array tem 7 organizações no storage. No db legado havia demo_vintage.
    // Com deduplicação, total deve ser exatamente 7 (demo_vintage NÃO deve ser adicionada como 8ª).
    assert(resMetrics.body?.totalOrganizations === 7, 3, "Deduplicação em metrics: totalOrganizations é 7 (sem duplicata demo_vintage)", `Obtido: ${resMetrics.body?.totalOrganizations}`);

    const resOrgs = await makeRequest(testPort, "GET", "/superadmin/organizations", authHeaders);
    assert(resOrgs.status === 200, 4, "GET /superadmin/organizations retorna 200 OK");
    assert(Array.isArray(resOrgs.body) && resOrgs.body.length === 7, 5, "Deduplicação em organizations: listagem possui exatamente 7 organizações");

    const vintageEntries = resOrgs.body.filter((o) => o.id === "org_vintage" || o.id === "demo_vintage");
    assert(vintageEntries.length === 1 && vintageEntries[0].id === "org_vintage", 6, "Barbearia Vintage Club aparece exatamente 1 vez com ID 'org_vintage'");

    // =========================================================================
    // SEÇÃO 2: Cálculo Estrito de MRR e ARR com Preços Oficiais
    // =========================================================================
    console.log("\n--- SEÇÃO 2: Cálculo de MRR e ARR com Preços Oficiais ---");

    // No cenário configurado:
    // 1. org_vintage (Pro) = R$ 79,90
    // 2. org_basic_active (Basic) = R$ 39,90
    // 3. org_premium_active (Premium) = R$ 129,90
    // Total MRR esperado = 79.90 + 39.90 + 129.90 = R$ 249,70
    // ARR esperado = 249.70 * 12 = R$ 2.996,40
    const mrr = resMetrics.body?.estimatedMRR;
    const arr = resMetrics.body?.estimatedARR;
    assert(mrr === 249.7, 7, "MRR soma exatamente os assinantes ativos pagantes (R$ 249,70)", `Obtido: ${mrr}`);
    assert(arr === 2996.4, 8, "ARR é exatamente MRR * 12 (R$ 2.996,40)", `Obtido: ${arr}`);

    // =========================================================================
    // SEÇÃO 3: Exclusão de Trials, Expiradas e Suspensas do MRR
    // =========================================================================
    console.log("\n--- SEÇÃO 3: Exclusão de Trials, Expiradas e Suspensas do MRR ---");

    // org_trial_pro (Pro: 79.90) NÃO deve estar no MRR
    assert(mrr !== 329.6, 9, "Contas em período Trial NÃO são somadas no MRR principal");

    // org_expired (Pro: 79.90) NÃO deve estar no MRR
    // org_suspended (Premium: 129.90) NÃO deve estar no MRR
    assert(resMetrics.body?.subscriptionStatus?.trial === 1, 10, "subscriptionStatus.trial é exatamente 1");
    assert(resMetrics.body?.subscriptionStatus?.expired === 1, 11, "subscriptionStatus.expired é exatamente 1");
    assert(resMetrics.body?.subscriptionStatus?.canceled === 1, 12, "subscriptionStatus.canceled é exatamente 1");
    assert(resMetrics.body?.accountStatus?.blocked === 1, 13, "accountStatus.blocked é exatamente 1 (org suspensa)");
    assert(resMetrics.body?.accountStatus?.active === 6, 14, "accountStatus.active é exatamente 6 (7 - 1 suspensa)");

    // =========================================================================
    // SEÇÃO 4: Planos Desconhecidos e Transparência
    // =========================================================================
    console.log("\n--- SEÇÃO 4: Tratamento de Planos Desconhecidos ---");

    assert(resMetrics.body?.planDistribution?.unknown === 1, 15, "planDistribution.unknown registra 1 plano desconhecido");
    assert(resMetrics.body?.financialSummary?.unknownPlansCount === 1, 16, "financialSummary.unknownPlansCount registra 1 inconsistência observável");
    assert(resMetrics.body?.financialSummary?.confirmedRevenue === 0, 17, "financialSummary.confirmedRevenue permanece estritamente em zero");
    assert(resMetrics.body?.financialSummary?.hasConfirmedGateway === false, 18, "financialSummary.hasConfirmedGateway permanece false");

    // =========================================================================
    // SEÇÃO 5: Potencial em Trial (Hipotético) Separado
    // =========================================================================
    console.log("\n--- SEÇÃO 5: Potencial em Trial Separado do MRR ---");

    // 1 trial no plano Pro = R$ 79,90 potencial hipotético
    const potentialTrial = resMetrics.body?.financialSummary?.potentialTrialMonthlyRate;
    assert(potentialTrial === 79.9, 19, "potentialTrialMonthlyRate é calculado separadamente (R$ 79,90)", `Obtido: ${potentialTrial}`);
    assert(typeof resMetrics.body?.financialSummary?.potentialTrialNote === "string", 20, "Nota explicativa de potencial hipotético em trial está presente");

    // =========================================================================
    // SEÇÃO 6: Integridade Absoluta dos Dados de Produção
    // =========================================================================
    console.log("\n--- SEÇÃO 6: Integridade da Base Real de Dados ---");

    const finalDbHash = getFileHash(realDbPath);
    const finalStorageHash = getFileHash(realStoragePath);
    assert(initialDbHash === finalDbHash, 21, "data/kupola_db.json permaneceu 100% inalterado (Hash idêntico)");
    assert(initialStorageHash === finalStorageHash, 22, "data/kupola_storage.json permaneceu 100% inalterado (Hash idêntico)");

    console.log("\n==================================================================================");
    console.log(` RESUMO DOS TESTES ETAPA 3.3: ${passedCount} PASS | ${failedCount} FAIL`);
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

runTests();
