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
  console.log("=== KUPOLA 2.0 — ETAPA 2B.2: TESTES DE ISOLAMENTO FINANCEIRO MULTI-TENANT    ===");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, name, details = "") {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] #${totalTests}: ${name}`);
      passedTests++;
      return true;
    } else {
      console.error(`  [FAIL] #${totalTests}: ${name}`);
      if (details) console.error(`         Detalhe: ${details}`);
      failedTests++;
      return false;
    }
  }

  // 1. Registro de integridade inicial da base de dados real
  const initialDbHash = getFileHash(realDbPath);
  const initialStorageHash = getFileHash(realStoragePath);
  console.log(`[Segurança] Hash SHA-256 inicial de data/kupola_db.json: ${initialDbHash || "Inexistente"}`);
  console.log(`[Segurança] Hash SHA-256 inicial de data/kupola_storage.json: ${initialStorageHash || "Inexistente"}`);

  // 2. Criação de sandbox temporário e porta dinâmica
  const tempSandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "kupola-finance-iso-"));
  const tempEnvPath = path.join(tempSandboxDir, ".env");
  const tempSecret = "isolated-test-jwt-secret-min-32-chars-alpha-beta-99";
  fs.writeFileSync(tempEnvPath, `JWT_SECRET=${tempSecret}\nNODE_ENV=production\n`);
  fs.mkdirSync(path.join(tempSandboxDir, "data"), { recursive: true });
  if (fs.existsSync(path.join(rootDir, "dist"))) {
    try { fs.symlinkSync(path.join(rootDir, "dist"), path.join(tempSandboxDir, "dist")); } catch (e) {}
  }
  if (fs.existsSync(path.join(rootDir, "public"))) {
    try { fs.symlinkSync(path.join(rootDir, "public"), path.join(tempSandboxDir, "public")); } catch (e) {}
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

  let serverStderr = "";
  serverChild.stderr.on("data", (c) => (serverStderr += c.toString()));

  const cleanupServer = () => {
    try {
      if (serverChild && serverChild.pid) {
        try {
          process.kill(-serverChild.pid, "SIGKILL");
        } catch (e) {
          try {
            serverChild.kill("SIGKILL");
          } catch (e2) {}
        }
      }
    } catch (e) {}
    try {
      fs.rmSync(tempSandboxDir, { recursive: true, force: true });
    } catch (e) {}
  };

  process.on("exit", cleanupServer);
  process.on("SIGINT", () => { cleanupServer(); process.exit(1); });
  process.on("SIGTERM", () => { cleanupServer(); process.exit(1); });

  // 4. Aguardar o servidor ficar pronto
  console.log("[Ambiente] Aguardando inicialização do servidor de teste...");
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
    console.error("[ERRO CRÍTICO] Servidor de teste não inicializou a tempo.");
    console.error("Stderr do processo:", serverStderr);
    cleanupServer();
    process.exit(1);
  }
  console.log("[Ambiente] Servidor de teste inicializado com sucesso e pronto para requisições.\n");

  try {
    // =========================================================================
    // SEÇÃO 1: CRIAÇÃO E AUTENTICAÇÃO DAS DUAS BARBEARIAS FICTÍCIAS
    // =========================================================================
    console.log("--- SEÇÃO 1: Registro e Autenticação dos Tenants Fictícios ---");

    const uniqueId = Date.now();
    const docAlpha = `11.111.111/${String(uniqueId).slice(-4)}-11`;
    const docBeta = `22.222.222/${String(uniqueId).slice(-4)}-22`;

    // 1.1 Registrar Barbearia Alpha
    const regAlphaRes = await makeRequest(testPort, { path: "/auth/register", method: "POST" }, {
      shop_name: "Barbearia Alpha Ficticia",
      name: "Proprietário Alpha",
      username: `alpha_owner_${uniqueId}`,
      email: `alpha_${uniqueId}@teste.com`,
      password: "SenhaAlphaFicticia123!",
      document: docAlpha,
      phone: "(11) 91111-2222",
      city: "São Paulo",
      state: "SP",
    });

    assert(
      regAlphaRes.status === 200 && regAlphaRes.data?.token && regAlphaRes.data?.user?.barbershop_id,
      "Registro de Barbearia Alpha concluído com sucesso e token gerado",
      `Status: ${regAlphaRes.status}`
    );

    const tokenAlpha = regAlphaRes.data?.token;
    const orgAlphaId = regAlphaRes.data?.user?.barbershop_id;
    const authHeadersAlpha = { Authorization: `Bearer ${tokenAlpha}` };

    // 1.2 Registrar Barbearia Beta
    const regBetaRes = await makeRequest(testPort, { path: "/auth/register", method: "POST" }, {
      shop_name: "Barbearia Beta Ficticia",
      name: "Proprietário Beta",
      username: `beta_owner_${uniqueId}`,
      email: `beta_${uniqueId}@teste.com`,
      password: "SenhaBetaFicticia123!",
      document: docBeta,
      phone: "(11) 93333-4444",
      city: "Campinas",
      state: "SP",
    });

    assert(
      regBetaRes.status === 200 && regBetaRes.data?.token && regBetaRes.data?.user?.barbershop_id,
      "Registro de Barbearia Beta concluído com sucesso e token gerado",
      `Status: ${regBetaRes.status}`
    );

    const tokenBeta = regBetaRes.data?.token;
    const orgBetaId = regBetaRes.data?.user?.barbershop_id;
    const authHeadersBeta = { Authorization: `Bearer ${tokenBeta}` };

    assert(
      orgAlphaId && orgBetaId && orgAlphaId !== orgBetaId,
      "Identificadores dos tenants Alpha e Beta são estritamente distintos",
      `Alpha: ${orgAlphaId}, Beta: ${orgBetaId}`
    );

    // =========================================================================
    // SEÇÃO 2: FORMAS DE PAGAMENTO E TAXAS DE CARTÃO (3,5% PARA CADA)
    // =========================================================================
    console.log("\n--- SEÇÃO 2: Formas de Pagamento e Taxas de Cartão ---");

    // Cadastrar/configurar maquininha de cartão para Alpha com taxa de 3,5%
    const pmAlphaRes = await makeRequest(testPort, { path: "/payment-methods", method: "POST", headers: authHeadersAlpha }, {
      name: "Cartão Alpha (3,5%)",
      kind: "maquininha",
      fees: { debito: 3.5, credito_vista: 3.5, pix: 0 },
      settlement_days: { debito: 1, credito_vista: 1, pix: 0 },
      active: true,
    });
    assert(pmAlphaRes.status === 200 && pmAlphaRes.data?.id, "Alpha cadastra maquininha com taxa de cartão 3,5%");
    const pmAlphaId = pmAlphaRes.data?.id;

    // Cadastrar/configurar maquininha de cartão para Beta com taxa de 3,5%
    const pmBetaRes = await makeRequest(testPort, { path: "/payment-methods", method: "POST", headers: authHeadersBeta }, {
      name: "Cartão Beta (3,5%)",
      kind: "maquininha",
      fees: { debito: 3.5, credito_vista: 3.5, pix: 0 },
      settlement_days: { debito: 1, credito_vista: 1, pix: 0 },
      active: true,
    });
    assert(pmBetaRes.status === 200 && pmBetaRes.data?.id, "Beta cadastra maquininha com taxa de cartão 3,5%");
    const pmBetaId = pmBetaRes.data?.id;

    // Verificar isolamento da listagem de formas de pagamento
    const listPmAlpha = await makeRequest(testPort, { path: "/payment-methods", method: "GET", headers: authHeadersAlpha });
    const listPmBeta = await makeRequest(testPort, { path: "/payment-methods", method: "GET", headers: authHeadersBeta });

    assert(
      listPmAlpha.data?.some((p) => p.id === pmAlphaId) && !listPmAlpha.data?.some((p) => p.id === pmBetaId),
      "Alpha visualiza somente suas próprias formas de pagamento",
      `Total Alpha: ${listPmAlpha.data?.length}`
    );
    assert(
      listPmBeta.data?.some((p) => p.id === pmBetaId) && !listPmBeta.data?.some((p) => p.id === pmAlphaId),
      "Beta visualiza somente suas próprias formas de pagamento",
      `Total Beta: ${listPmBeta.data?.length}`
    );

    // =========================================================================
    // SEÇÃO 3: CONFIGURAÇÃO DE COMISSÕES E BARBEIROS
    // =========================================================================
    console.log("\n--- SEÇÃO 3: Configurações de Comissões e Profissionais ---");

    // Configuração Alpha: comissão sobre valor bruto ("gross")
    const setAlphaRes = await makeRequest(testPort, { path: "/settings", method: "PUT", headers: authHeadersAlpha }, {
      commission_base: "gross",
      discount_affects_commission: true,
    });
    assert(setAlphaRes.status === 200 && setAlphaRes.data?.commission_base === "gross", "Alpha configurada com comissão sobre valor bruto (gross)");

    // Configuração Beta: comissão sobre valor líquido ("net")
    const setBetaRes = await makeRequest(testPort, { path: "/settings", method: "PUT", headers: authHeadersBeta }, {
      commission_base: "net",
      discount_affects_commission: true,
    });
    assert(setBetaRes.status === 200 && setBetaRes.data?.commission_base === "net", "Beta configurada com comissão sobre valor líquido (net)");

    // Cadastrar barbeiro Alpha com 40% de comissão
    const barberAlphaRes = await makeRequest(testPort, { path: "/barbers", method: "POST", headers: authHeadersAlpha }, {
      name: "Barbeiro Alpha",
      commission_percent: 40,
      commission_type: "percentual",
    });
    assert(barberAlphaRes.status === 200 && barberAlphaRes.data?.id, "Alpha cadastra barbeiro com 40% de comissão");
    const barberAlphaId = barberAlphaRes.data?.id;

    // Cadastrar barbeiro Beta com 50% de comissão
    const barberBetaRes = await makeRequest(testPort, { path: "/barbers", method: "POST", headers: authHeadersBeta }, {
      name: "Barbeiro Beta",
      commission_percent: 50,
      commission_type: "percentual",
    });
    assert(barberBetaRes.status === 200 && barberBetaRes.data?.id, "Beta cadastra barbeiro com 50% de comissão");
    const barberBetaId = barberBetaRes.data?.id;

    // =========================================================================
    // SEÇÃO 4: LANÇAMENTO DE RECEITAS CONFORME BRIEFING
    // Barbearia Alpha: Receita R$ 350,00 | Taxa Cartão 3,5%
    // Barbearia Beta:  Receita R$ 180,00 | Taxa Cartão 3,5%
    // =========================================================================
    console.log("\n--- SEÇÃO 4: Lançamento de Receitas Financeiras Fictícias ---");

    const today = new Date().toISOString().split("T")[0];

    // Lançamento Alpha: R$ 350,00
    // Taxa 3,5%: 350 * 0,035 = 12,25 | Líquido cartão = 337,75
    // Base gross: comissão 40% sobre 350,00 = 140,00 | Loja = 337,75 - 140,00 = 197,75
    const revAlphaRes = await makeRequest(testPort, { path: "/revenues", method: "POST", headers: authHeadersAlpha }, {
      date: today,
      service_name: "Corte e Barba Premium Alpha",
      gross_amount: 350.00,
      discount_amount: 0.00,
      payment_method_id: pmAlphaId,
      payment_type: "credito_vista",
      barber_id: barberAlphaId,
      client_name: "Cliente Alpha Ficticio",
    });

    assert(
      revAlphaRes.status === 200 &&
      revAlphaRes.data?.gross_amount === 350.00 &&
      revAlphaRes.data?.fee_amount === 12.25 &&
      revAlphaRes.data?.net_amount === 337.75 &&
      revAlphaRes.data?.commission_amount === 140.00 &&
      revAlphaRes.data?.shop_amount === 197.75,
      "Alpha: Receita R$ 350,00 registrada com taxa exata de 3,5% (R$ 12,25) e comissão correta sobre bruto (R$ 140,00)",
      JSON.stringify(revAlphaRes.data)
    );
    const revAlphaId = revAlphaRes.data?.id;

    // Lançamento Beta: R$ 180,00
    // Taxa 3,5%: 180 * 0,035 = 6,30 | Líquido cartão = 173,70
    // Base net: comissão 50% sobre 173,70 = 86,85 | Loja = 173,70 - 86,85 = 86,85
    const revBetaRes = await makeRequest(testPort, { path: "/revenues", method: "POST", headers: authHeadersBeta }, {
      date: today,
      service_name: "Corte Tradicional Beta",
      gross_amount: 180.00,
      discount_amount: 0.00,
      payment_method_id: pmBetaId,
      payment_type: "credito_vista",
      barber_id: barberBetaId,
      client_name: "Cliente Beta Ficticio",
    });

    assert(
      revBetaRes.status === 200 &&
      revBetaRes.data?.gross_amount === 180.00 &&
      revBetaRes.data?.fee_amount === 6.30 &&
      revBetaRes.data?.net_amount === 173.70 &&
      revBetaRes.data?.commission_amount === 86.85 &&
      revBetaRes.data?.shop_amount === 86.85,
      "Beta: Receita R$ 180,00 registrada com taxa exata de 3,5% (R$ 6,30) e comissão correta sobre líquido (R$ 86,85)",
      JSON.stringify(revBetaRes.data)
    );
    const revBetaId = revBetaRes.data?.id;

    // =========================================================================
    // SEÇÃO 5: LANÇAMENTOS ADICIONAIS: DESPESAS, RETIRADAS E FECHAMENTOS
    // =========================================================================
    console.log("\n--- SEÇÃO 5: Lançamentos de Despesas, Retiradas e Fechamento de Caixa ---");

    // Despesa Alpha: R$ 50,00
    const expAlphaRes = await makeRequest(testPort, { path: "/expenses", method: "POST", headers: authHeadersAlpha }, {
      name: "Aluguel Alpha Ficticio",
      value: 50.00,
      due_date: today,
      payment_date: today,
    });
    assert(expAlphaRes.status === 200 && expAlphaRes.data?.id, "Alpha registra despesa de R$ 50,00");
    const expAlphaId = expAlphaRes.data?.id;

    // Despesa Beta: R$ 30,00
    const expBetaRes = await makeRequest(testPort, { path: "/expenses", method: "POST", headers: authHeadersBeta }, {
      name: "Energia Beta Ficticia",
      value: 30.00,
      due_date: today,
      payment_date: today,
    });
    assert(expBetaRes.status === 200 && expBetaRes.data?.id, "Beta registra despesa de R$ 30,00");
    const expBetaId = expBetaRes.data?.id;

    // Retirada Alpha: R$ 20,00
    const wdAlphaRes = await makeRequest(testPort, { path: "/withdrawals", method: "POST", headers: authHeadersAlpha }, {
      value: 20.00,
      reason: "Pró-labore Proprietário Alpha",
      date: today,
    });
    assert(wdAlphaRes.status === 200 && wdAlphaRes.data?.id, "Alpha registra retirada de R$ 20,00");
    const wdAlphaId = wdAlphaRes.data?.id;

    // Retirada Beta: R$ 15,00
    const wdBetaRes = await makeRequest(testPort, { path: "/withdrawals", method: "POST", headers: authHeadersBeta }, {
      value: 15.00,
      reason: "Pró-labore Proprietário Beta",
      date: today,
    });
    assert(wdBetaRes.status === 200 && wdBetaRes.data?.id, "Beta registra retirada de R$ 15,00");
    const wdBetaId = wdBetaRes.data?.id;

    // Fechamento de Caixa Alpha
    const ccAlphaRes = await makeRequest(testPort, { path: "/cash-closings", method: "POST", headers: authHeadersAlpha }, {
      date: today,
      expected: { credito_vista: 350.00 },
      counted: { credito_vista: 350.00 },
      note: "Fechamento regular Alpha",
    });
    assert(ccAlphaRes.status === 200 && ccAlphaRes.data?.id, "Alpha realiza fechamento de caixa independente");
    const ccAlphaId = ccAlphaRes.data?.id;

    // Fechamento de Caixa Beta
    const ccBetaRes = await makeRequest(testPort, { path: "/cash-closings", method: "POST", headers: authHeadersBeta }, {
      date: today,
      expected: { credito_vista: 180.00 },
      counted: { credito_vista: 175.00 },
      note: "Fechamento regular Beta com diferença",
    });
    assert(ccBetaRes.status === 200 && ccBetaRes.data?.id, "Beta realiza fechamento de caixa independente");
    const ccBetaId = ccBetaRes.data?.id;

    // =========================================================================
    // SEÇÃO 6: VERIFICAÇÃO 1 — RELATÓRIOS DA ALPHA NÃO CONTÊM VALORES DA BETA
    // =========================================================================
    console.log("\n--- SEÇÃO 6: Verificação 1 — Relatórios da Alpha Sem Valores da Beta ---");

    const getRevsAlpha = await makeRequest(testPort, { path: "/revenues", method: "GET", headers: authHeadersAlpha });
    const totalRevAlpha = getRevsAlpha.data?.reduce((acc, r) => acc + (r.paid_amount || 0), 0);
    const hasBetaRevInAlpha = getRevsAlpha.data?.some((r) => r.id === revBetaId || r.barbershop_id === orgBetaId);

    assert(
      !hasBetaRevInAlpha && totalRevAlpha === 350.00,
      "Relatório de receitas da Alpha contém somente R$ 350,00 e nenhum registro da Beta",
      `Total encontrado: R$ ${totalRevAlpha}`
    );

    const getExpsAlpha = await makeRequest(testPort, { path: "/expenses", method: "GET", headers: authHeadersAlpha });
    const hasBetaExpInAlpha = getExpsAlpha.data?.some((e) => e.id === expBetaId || e.barbershop_id === orgBetaId);
    assert(!hasBetaExpInAlpha, "Relatório de despesas da Alpha não inclui despesas da Beta");

    const getWdsAlpha = await makeRequest(testPort, { path: "/withdrawals", method: "GET", headers: authHeadersAlpha });
    const hasBetaWdInAlpha = getWdsAlpha.data?.some((w) => w.id === wdBetaId || w.barbershop_id === orgBetaId);
    assert(!hasBetaWdInAlpha, "Relatório de retiradas da Alpha não inclui retiradas da Beta");

    // =========================================================================
    // SEÇÃO 7: VERIFICAÇÃO 2 — RELATÓRIOS DA BETA NÃO CONTÊM VALORES DA ALPHA
    // =========================================================================
    console.log("\n--- SEÇÃO 7: Verificação 2 — Relatórios da Beta Sem Valores da Alpha ---");

    const getRevsBeta = await makeRequest(testPort, { path: "/revenues", method: "GET", headers: authHeadersBeta });
    const totalRevBeta = getRevsBeta.data?.reduce((acc, r) => acc + (r.paid_amount || 0), 0);
    const hasAlphaRevInBeta = getRevsBeta.data?.some((r) => r.id === revAlphaId || r.barbershop_id === orgAlphaId);

    assert(
      !hasAlphaRevInBeta && totalRevBeta === 180.00,
      "Relatório de receitas da Beta contém somente R$ 180,00 e nenhum registro da Alpha",
      `Total encontrado: R$ ${totalRevBeta}`
    );

    const getExpsBeta = await makeRequest(testPort, { path: "/expenses", method: "GET", headers: authHeadersBeta });
    const hasAlphaExpInBeta = getExpsBeta.data?.some((e) => e.id === expAlphaId || e.barbershop_id === orgAlphaId);
    assert(!hasAlphaExpInBeta, "Relatório de despesas da Beta não inclui despesas da Alpha");

    const getWdsBeta = await makeRequest(testPort, { path: "/withdrawals", method: "GET", headers: authHeadersBeta });
    const hasAlphaWdInBeta = getWdsBeta.data?.some((w) => w.id === wdAlphaId || w.barbershop_id === orgAlphaId);
    assert(!hasAlphaWdInBeta, "Relatório de retiradas da Beta não inclui retiradas da Alpha");

    // =========================================================================
    // SEÇÃO 8: VERIFICAÇÃO 3 — PAINEL E INDICADORES ANALÍTICOS RESPEITAM O TENANT
    // =========================================================================
    console.log("\n--- SEÇÃO 8: Verificação 3 — Painel e Indicadores Analíticos ---");

    // Summary Alpha
    const summaryAlpha = await makeRequest(testPort, { path: "/dashboard/summary", method: "GET", headers: authHeadersAlpha });
    assert(
      summaryAlpha.status === 200 &&
      summaryAlpha.data?.gross === 350.00 &&
      summaryAlpha.data?.fees === 12.25 &&
      summaryAlpha.data?.net === 337.75 &&
      summaryAlpha.data?.commissions === 140.00 &&
      summaryAlpha.data?.shop === 197.75 &&
      summaryAlpha.data?.expenses_total === 50.00 &&
      summaryAlpha.data?.withdrawals === 20.00 &&
      summaryAlpha.data?.revenue_count === 1,
      "Dashboard Summary de Alpha reflete exclusivamente suas métricas (Faturamento R$ 350,00 | Loja R$ 197,75 | Comissões R$ 140,00)",
      JSON.stringify(summaryAlpha.data)
    );

    // Summary Beta
    const summaryBeta = await makeRequest(testPort, { path: "/dashboard/summary", method: "GET", headers: authHeadersBeta });
    assert(
      summaryBeta.status === 200 &&
      summaryBeta.data?.gross === 180.00 &&
      summaryBeta.data?.fees === 6.30 &&
      summaryBeta.data?.net === 173.70 &&
      summaryBeta.data?.commissions === 86.85 &&
      summaryBeta.data?.shop === 86.85 &&
      summaryBeta.data?.expenses_total === 30.00 &&
      summaryBeta.data?.withdrawals === 15.00 &&
      summaryBeta.data?.revenue_count === 1,
      "Dashboard Summary de Beta reflete exclusivamente suas métricas (Faturamento R$ 180,00 | Loja R$ 86,85 | Comissões R$ 86,85)",
      JSON.stringify(summaryBeta.data)
    );

    // Evolution Alpha vs Beta
    const evoAlpha = await makeRequest(testPort, { path: "/dashboard/evolution", method: "GET", headers: authHeadersAlpha });
    const currentMonthAlpha = evoAlpha.data?.series?.find((s) => s.monthKey === today.slice(0, 7));
    assert(currentMonthAlpha?.Receita === 350.00, "Dashboard Evolution da Alpha exibe Receita de R$ 350,00 no mês corrente");

    const evoBeta = await makeRequest(testPort, { path: "/dashboard/evolution", method: "GET", headers: authHeadersBeta });
    const currentMonthBeta = evoBeta.data?.series?.find((s) => s.monthKey === today.slice(0, 7));
    assert(currentMonthBeta?.Receita === 180.00, "Dashboard Evolution da Beta exibe Receita de R$ 180,00 no mês corrente");

    // =========================================================================
    // SEÇÃO 9: VERIFICAÇÃO 4 — COMISSÕES COM BASES DE CÁLCULO INDEPENDENTES
    // =========================================================================
    console.log("\n--- SEÇÃO 9: Verificação 4 — Independência das Bases de Comissões ---");

    // Alpha utilizou base sobre bruto (gross): comissão 40% de 350,00 = 140,00
    // Beta utilizou base sobre líquido (net): comissão 50% de 173,70 = 86,85
    assert(
      revAlphaRes.data?.commission_amount === 140.00 && revBetaRes.data?.commission_amount === 86.85,
      "Bases de cálculo (gross vs net) foram aplicadas estritamente de acordo com as configurações de cada barbearia"
    );

    // Alteração de settings na Alpha não altera as configurações da Beta
    await makeRequest(testPort, { path: "/settings", method: "PUT", headers: authHeadersAlpha }, {
      commission_base: "net",
    });
    const checkBetaSettings = await makeRequest(testPort, { path: "/settings", method: "GET", headers: authHeadersBeta });
    assert(
      checkBetaSettings.data?.commission_base === "net",
      "Configurações da Beta permanecem inalteradas após mutação na Alpha"
    );

    // =========================================================================
    // SEÇÃO 10: VERIFICAÇÃO 5 — TAXAS DE CARTÃO CALCULADAS SEM COMPARTILHAMENTO
    // =========================================================================
    console.log("\n--- SEÇÃO 10: Verificação 5 — Taxas de Cartão Independentes ---");

    // Alpha altera taxa de sua maquininha para 4.2%
    const updatePmAlpha = await makeRequest(testPort, { path: `/payment-methods/${pmAlphaId}`, method: "PUT", headers: authHeadersAlpha }, {
      fees: { debito: 4.2, credito_vista: 4.2, pix: 0 },
    });
    assert(updatePmAlpha.status === 200, "Alpha atualiza taxa de sua forma de pagamento para 4,2%");

    // Verificar se a forma de pagamento da Beta foi preservada em 3,5%
    const checkPmBeta = await makeRequest(testPort, { path: `/payment-methods`, method: "GET", headers: authHeadersBeta });
    const betaPmObj = checkPmBeta.data?.find((p) => p.id === pmBetaId);
    assert(
      betaPmObj?.fees?.credito_vista === 3.5,
      "Taxa de cartão da Beta permanece estritamente em 3,5% sem contaminação por alteração na Alpha",
      `Taxa Beta: ${betaPmObj?.fees?.credito_vista}%`
    );

    // =========================================================================
    // SEÇÃO 11: VERIFICAÇÃO 6 — FECHAMENTOS DE CAIXA INDEPENDENTES
    // =========================================================================
    console.log("\n--- SEÇÃO 11: Verificação 6 — Fechamentos de Caixa Independentes ---");

    const getCcAlpha = await makeRequest(testPort, { path: "/cash-closings", method: "GET", headers: authHeadersAlpha });
    const hasBetaCcInAlpha = getCcAlpha.data?.some((c) => c.id === ccBetaId || c.barbershop_id === orgBetaId);
    const hasAlphaCcInAlpha = getCcAlpha.data?.some((c) => c.id === ccAlphaId);

    assert(
      hasAlphaCcInAlpha && !hasBetaCcInAlpha,
      "Fechamentos de caixa da Alpha incluem somente fechamento de Alpha (R$ 350,00) e omitem Beta",
      `Total listado: ${getCcAlpha.data?.length}`
    );

    const getCcBeta = await makeRequest(testPort, { path: "/cash-closings", method: "GET", headers: authHeadersBeta });
    const hasAlphaCcInBeta = getCcBeta.data?.some((c) => c.id === ccAlphaId || c.barbershop_id === orgAlphaId);
    const hasBetaCcInBeta = getCcBeta.data?.some((c) => c.id === ccBetaId);

    assert(
      hasBetaCcInBeta && !hasAlphaCcInBeta,
      "Fechamentos de caixa da Beta incluem somente fechamento de Beta (R$ 180,00 com diff) e omitem Alpha",
      `Total listado: ${getCcBeta.data?.length}`
    );

    // =========================================================================
    // SEÇÃO 12: VERIFICAÇÃO 7 — BLOQUEIO DE CONSULTA OU ALTERAÇÃO CRUZADA (CROSS-TENANT)
    // =========================================================================
    console.log("\n--- SEÇÃO 12: Verificação 7 — Bloqueio de Acesso e Alteração Cruzada ---");

    // 12.1 Alpha tenta atualizar receita da Beta
    const crossUpdateRev = await makeRequest(testPort, { path: `/revenues/${revBetaId}`, method: "PUT", headers: authHeadersAlpha }, {
      gross_amount: 999.00,
    });
    assert(
      crossUpdateRev.status === 404,
      "Tentativa da Alpha de atualizar receita da Beta rejeitada com 404 Not Found",
      `Status: ${crossUpdateRev.status}`
    );

    // 12.2 Alpha tenta cancelar receita da Beta
    const crossCancelRev = await makeRequest(testPort, { path: `/revenues/${revBetaId}/cancel`, method: "POST", headers: authHeadersAlpha });
    assert(
      crossCancelRev.status === 404,
      "Tentativa da Alpha de cancelar receita da Beta rejeitada com 404 Not Found",
      `Status: ${crossCancelRev.status}`
    );

    // 12.3 Alpha tenta deletar receita da Beta
    const crossDeleteRev = await makeRequest(testPort, { path: `/revenues/${revBetaId}`, method: "DELETE", headers: authHeadersAlpha });
    assert(
      crossDeleteRev.status === 404,
      "Tentativa da Alpha de deletar receita da Beta rejeitada com 404 Not Found",
      `Status: ${crossDeleteRev.status}`
    );

    // 12.4 Confirmar que a receita da Beta permaneceu intacta e ativa
    const verifyBetaRev = await makeRequest(testPort, { path: "/revenues", method: "GET", headers: authHeadersBeta });
    const targetBetaRev = verifyBetaRev.data?.find((r) => r.id === revBetaId);
    assert(
      targetBetaRev && targetBetaRev.status === "ativo" && targetBetaRev.gross_amount === 180.00,
      "Receita da Beta permaneceu 100% íntegra (R$ 180,00, ativa) após tentativas de ataque da Alpha"
    );

    // 12.5 Alpha tenta atualizar despesa da Beta
    const crossUpdateExp = await makeRequest(testPort, { path: `/expenses/${expBetaId}`, method: "PUT", headers: authHeadersAlpha }, {
      value: 1.00,
    });
    assert(crossUpdateExp.status === 404, "Tentativa da Alpha de alterar despesa da Beta rejeitada com 404 Not Found");

    // 12.6 Alpha tenta deletar despesa da Beta: deve retornar 404 Not Found
    const crossDeleteExp = await makeRequest(testPort, { path: `/expenses/${expBetaId}`, method: "DELETE", headers: authHeadersAlpha });
    assert(
      crossDeleteExp.status === 404,
      "Tentativa da Alpha de deletar despesa da Beta rejeitada com 404 Not Found",
      `Status: ${crossDeleteExp.status}`
    );

    // 12.7 Confirmar que a despesa da Beta NÃO foi alterada nem excluída
    const verifyBetaExp = await makeRequest(testPort, { path: "/expenses", method: "GET", headers: authHeadersBeta });
    const targetBetaExp = verifyBetaExp.data?.find((e) => e.id === expBetaId);
    assert(
      Boolean(targetBetaExp) && targetBetaExp?.value === 30.00,
      "Despesa da Beta permaneceu 100% íntegra (R$ 30,00) no banco de dados após tentativa de exclusão pela Alpha"
    );

    // 12.8 Alpha tenta deletar retirada da Beta: deve retornar 404 Not Found
    const crossDeleteWd = await makeRequest(testPort, { path: `/withdrawals/${wdBetaId}`, method: "DELETE", headers: authHeadersAlpha });
    assert(
      crossDeleteWd.status === 404,
      "Tentativa da Alpha de deletar retirada da Beta rejeitada com 404 Not Found",
      `Status: ${crossDeleteWd.status}`
    );

    // 12.9 Confirmar que a retirada da Beta NÃO foi alterada nem excluída
    const verifyBetaWd = await makeRequest(testPort, { path: "/withdrawals", method: "GET", headers: authHeadersBeta });
    const targetBetaWd = verifyBetaWd.data?.find((w) => w.id === wdBetaId);
    assert(
      Boolean(targetBetaWd) && targetBetaWd?.value === 15.00,
      "Retirada da Beta permaneceu 100% íntegra (R$ 15,00) no banco de dados após tentativa de exclusão pela Alpha"
    );

    // 12.10 Tentativa de deletar despesa com ID inexistente: deve retornar 404
    const nonExistentExpDel = await makeRequest(testPort, { path: "/expenses/id_inexistente_99999", method: "DELETE", headers: authHeadersAlpha });
    assert(
      nonExistentExpDel.status === 404,
      "Tentativa de exclusão de despesa inexistente rejeitada com 404 Not Found",
      `Status: ${nonExistentExpDel.status}`
    );

    // 12.11 Tentativa de deletar retirada com ID inexistente: deve retornar 404
    const nonExistentWdDel = await makeRequest(testPort, { path: "/withdrawals/id_inexistente_99999", method: "DELETE", headers: authHeadersAlpha });
    assert(
      nonExistentWdDel.status === 404,
      "Tentativa de exclusão de retirada inexistente rejeitada com 404 Not Found",
      `Status: ${nonExistentWdDel.status}`
    );

    // 12.12 Exclusão legítima de registro de despesa pertencente ao próprio tenant
    const tempExpAlpha = await makeRequest(testPort, { path: "/expenses", method: "POST", headers: authHeadersAlpha }, {
      name: "Despesa Temporaria Alpha",
      value: 12.00,
      due_date: today,
    });
    const tempExpAlphaId = tempExpAlpha.data?.id;
    const ownDelExp = await makeRequest(testPort, { path: `/expenses/${tempExpAlphaId}`, method: "DELETE", headers: authHeadersAlpha });
    assert(
      ownDelExp.status === 200 && ownDelExp.data?.ok === true,
      "Exclusão de despesa própria existente concluída com sucesso (200 OK)"
    );
    const verifyOwnExpDeleted = await makeRequest(testPort, { path: "/expenses", method: "GET", headers: authHeadersAlpha });
    assert(
      !verifyOwnExpDeleted.data?.some((e) => e.id === tempExpAlphaId),
      "Despesa própria excluída foi efetivamente removida do tenant Alpha"
    );

    // 12.13 Exclusão legítima de registro de retirada pertencente ao próprio tenant
    const tempWdAlpha = await makeRequest(testPort, { path: "/withdrawals", method: "POST", headers: authHeadersAlpha }, {
      value: 10.00,
      reason: "Retirada Temporaria Alpha",
      date: today,
    });
    const tempWdAlphaId = tempWdAlpha.data?.id;
    const ownDelWd = await makeRequest(testPort, { path: `/withdrawals/${tempWdAlphaId}`, method: "DELETE", headers: authHeadersAlpha });
    assert(
      ownDelWd.status === 200 && ownDelWd.data?.ok === true,
      "Exclusão de retirada própria existente concluída com sucesso (200 OK)"
    );
    const verifyOwnWdDeleted = await makeRequest(testPort, { path: "/withdrawals", method: "GET", headers: authHeadersAlpha });
    assert(
      !verifyOwnWdDeleted.data?.some((w) => w.id === tempWdAlphaId),
      "Retirada própria excluída foi efetivamente removida do tenant Alpha"
    );

    // 12.14 Beta tenta atualizar receita da Alpha (PUT)
    const betaCrossUpdateRev = await makeRequest(testPort, { path: `/revenues/${revAlphaId}`, method: "PUT", headers: authHeadersBeta }, {
      gross_amount: 1.00,
    });
    assert(betaCrossUpdateRev.status === 404, "Tentativa da Beta de alterar receita da Alpha rejeitada com 404 Not Found");

    // 12.15 Beta tenta deletar receita da Alpha (DELETE)
    const betaCrossDeleteRev = await makeRequest(testPort, { path: `/revenues/${revAlphaId}`, method: "DELETE", headers: authHeadersBeta });
    assert(betaCrossDeleteRev.status === 404, "Tentativa da Beta de deletar receita da Alpha rejeitada com 404 Not Found");

    // 12.16 Beta tenta deletar despesa da Alpha (DELETE)
    const betaCrossDeleteExp = await makeRequest(testPort, { path: `/expenses/${expAlphaId}`, method: "DELETE", headers: authHeadersBeta });
    assert(betaCrossDeleteExp.status === 404, "Tentativa da Beta de deletar despesa da Alpha rejeitada com 404 Not Found");

    // 12.17 Beta tenta deletar retirada da Alpha (DELETE)
    const betaCrossDeleteWd = await makeRequest(testPort, { path: `/withdrawals/${wdAlphaId}`, method: "DELETE", headers: authHeadersBeta });
    assert(betaCrossDeleteWd.status === 404, "Tentativa da Beta de deletar retirada da Alpha rejeitada com 404 Not Found");

    // 12.18 Confirmar que dados da Alpha permaneceram intactos
    const verifyAlphaRev = await makeRequest(testPort, { path: "/revenues", method: "GET", headers: authHeadersAlpha });
    const targetAlphaRev = verifyAlphaRev.data?.find((r) => r.id === revAlphaId);
    assert(
      targetAlphaRev && targetAlphaRev.gross_amount === 350.00,
      "Receita da Alpha permaneceu 100% íntegra (R$ 350,00) após tentativas de ataque da Beta"
    );

    const verifyAlphaExp = await makeRequest(testPort, { path: "/expenses", method: "GET", headers: authHeadersAlpha });
    const targetAlphaExp = verifyAlphaExp.data?.find((e) => e.id === expAlphaId);
    assert(
      targetAlphaExp && targetAlphaExp.value === 50.00,
      "Despesa da Alpha permaneceu 100% íntegra (R$ 50,00) após tentativas de ataque da Beta"
    );

    const verifyAlphaWd = await makeRequest(testPort, { path: "/withdrawals", method: "GET", headers: authHeadersAlpha });
    const targetAlphaWd = verifyAlphaWd.data?.find((w) => w.id === wdAlphaId);
    assert(
      targetAlphaWd && targetAlphaWd.value === 20.00,
      "Retirada da Alpha permaneceu 100% íntegra (R$ 20,00) após tentativas de ataque da Beta"
    );

    // =========================================================================
    // SEÇÃO 13: VERIFICAÇÃO 8 — MANIPULAÇÃO DE IDs E CABEÇALHO 'x-organization-id'
    // =========================================================================
    console.log("\n--- SEÇÃO 13: Verificação 8 — Manipulação de 'x-organization-id' ---");

    // Alpha forja header x-organization-id apontando para Beta em /revenues
    const spoofHeaderRevs = await makeRequest(testPort, {
      path: "/revenues",
      method: "GET",
      headers: {
        ...authHeadersAlpha,
        "x-organization-id": orgBetaId,
      },
    });
    const spoofRevsList = spoofHeaderRevs.data || [];
    assert(
      spoofHeaderRevs.status === 200 &&
      spoofRevsList.every((r) => r.barbershop_id === orgAlphaId) &&
      !spoofRevsList.some((r) => r.barbershop_id === orgBetaId),
      "Servidor neutraliza cabeçalho 'x-organization-id' forjado e mantém escopo estrito do token da Alpha em /revenues"
    );

    // Alpha forja header x-organization-id apontando para Beta em /dashboard/summary
    const spoofHeaderSummary = await makeRequest(testPort, {
      path: "/dashboard/summary",
      method: "GET",
      headers: {
        ...authHeadersAlpha,
        "x-organization-id": orgBetaId,
      },
    });
    assert(
      spoofHeaderSummary.status === 200 &&
      spoofHeaderSummary.data?.gross === 350.00,
      "Servidor neutraliza cabeçalho 'x-organization-id' forjado no dashboard, retornando dados de Alpha (R$ 350,00)"
    );

    // Beta forja header x-organization-id apontando para Alpha
    const spoofBetaSummary = await makeRequest(testPort, {
      path: "/dashboard/summary",
      method: "GET",
      headers: {
        ...authHeadersBeta,
        "x-organization-id": orgAlphaId,
      },
    });
    assert(
      spoofBetaSummary.status === 200 &&
      spoofBetaSummary.data?.gross === 180.00,
      "Servidor neutraliza cabeçalho 'x-organization-id' forjado por Beta, retornando dados de Beta (R$ 180,00)"
    );

    // =========================================================================
    // SEÇÃO 14: VERIFICAÇÃO 9 — ERROS DE AUTENTICAÇÃO E AUSÊNCIA DE VAZAMENTO
    // =========================================================================
    console.log("\n--- SEÇÃO 14: Verificação 9 — Proteção Contra Vazamento em Erros de Autenticação ---");

    // Requisição sem token em /revenues
    const noTokenRevs = await makeRequest(testPort, { path: "/revenues", method: "GET" });
    assert(noTokenRevs.status === 401, "Acesso a /revenues sem token rejeitado com 401 Unauthorized");

    // Requisição sem token em /dashboard/summary
    const noTokenSummary = await makeRequest(testPort, { path: "/dashboard/summary", method: "GET" });
    assert(noTokenSummary.status === 401, "Acesso a /dashboard/summary sem token rejeitado com 401 Unauthorized");

    // Requisição sem token em /expenses
    const noTokenExp = await makeRequest(testPort, { path: "/expenses", method: "GET" });
    assert(noTokenExp.status === 401, "Acesso a /expenses sem token rejeitado com 401 Unauthorized");

    // Requisição sem token em /cash-closings
    const noTokenCc = await makeRequest(testPort, { path: "/cash-closings", method: "GET" });
    assert(noTokenCc.status === 401, "Acesso a /cash-closings sem token rejeitado com 401 Unauthorized");

    // Requisição com token adulterado/falso
    const badTokenRes = await makeRequest(testPort, {
      path: "/revenues",
      method: "GET",
      headers: { Authorization: "Bearer token_falsificado_invalido_123456" },
    });
    assert(badTokenRes.status === 401, "Token forjado/inválido rejeitado com 401 Unauthorized sem vazar dados");

    // =========================================================================
    // SEÇÃO 15: VERIFICAÇÃO 10 — CONFIRMAÇÃO DE ISOLAMENTO DOS DADOS REAIS
    // =========================================================================
    console.log("\n--- SEÇÃO 15: Verificação 10 — Proteção Absoluta dos Dados Reais ---");

    const tempDbFile = path.join(tempSandboxDir, "data", "kupola_db.json");
    assert(
      fs.existsSync(tempDbFile),
      "Base de teste foi gravada exclusivamente no diretório temporário isolado",
      tempDbFile
    );

    const finalDbHash = getFileHash(realDbPath);
    const finalStorageHash = getFileHash(realStoragePath);

    assert(
      initialDbHash === finalDbHash,
      "Base real de dados do projeto (data/kupola_db.json) permaneceu 100% inalterada (Hash idêntico)",
      `Inicial: ${initialDbHash} | Final: ${finalDbHash}`
    );

    assert(
      initialStorageHash === finalStorageHash,
      "Base real de storage do projeto (data/kupola_storage.json) permaneceu 100% inalterada (Hash idêntico)",
      `Inicial: ${initialStorageHash} | Final: ${finalStorageHash}`
    );

    // Encerrar processo filho e limpar sandbox
    cleanupServer();
    console.log("[Ambiente] Processo do servidor de teste finalizado e sandbox limpo com sucesso.");

  } catch (err) {
    console.error("[ERRO DURANTE TESTES]:", err);
    cleanupServer();
    process.exit(1);
  }

  console.log("\n================================================================================");
  console.log(`=== RESULTADO DA ETAPA 2B.2: ${passedTests} / ${totalTests} TESTES APROVADOS (${failedTests} FALHAS) ===`);
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit();
