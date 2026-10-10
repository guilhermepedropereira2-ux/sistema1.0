import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import net from "net";
import http from "http";
import jwt from "jsonwebtoken";

const rootDir = process.cwd();

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

function request(port, options, body = null) {
  return new Promise((resolve, reject) => {
    const pathStr = options.path.startsWith("/") ? options.path : `/${options.path}`;
    const url = new URL(`http://127.0.0.1:${port}/api${pathStr}`);
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {}
          resolve({ status: res.statusCode, data: parsed });
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

async function runTests() {
  console.log("=========================================================================");
  console.log("=== BATERIA DE TESTES: ETAPA 2B.1.1 (UNIFICAÇÃO JWT & DISPONIBILIDADE) ===");
  console.log("=========================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  // TESTE 1: INICIALIZAÇÃO DA APLICAÇÃO EM PRODUÇÃO (server.ts)
  console.log("--- TESTE 1: Inicialização em Produção via server.ts ---");

  // 1.1 Produção sem JWT_SECRET
  const checkNoSecret = spawnSync("npx", [
    "tsx",
    "-e",
    'process.env.NODE_ENV="production"; delete process.env.JWT_SECRET; import("./server.ts");',
  ], { encoding: "utf8" });
  assert(
    checkNoSecret.status !== 0 && checkNoSecret.stderr.includes("JWT_SECRET é obrigatório"),
    "Aplicação em produção aborta imediatamente se JWT_SECRET estiver ausente"
  );

  // 1.2 Produção com chave curta (<32 chars)
  const checkShortSecret = spawnSync("npx", [
    "tsx",
    "-e",
    'process.env.NODE_ENV="production"; process.env.JWT_SECRET="chave-curta-insuficiente-123"; import("./server.ts");',
  ], { encoding: "utf8" });
  assert(
    checkShortSecret.status !== 0 && checkShortSecret.stderr.includes("mínimo 32 caracteres"),
    "Aplicação em produção aborta imediatamente se JWT_SECRET for inferior a 32 caracteres"
  );

  // 1.3 Produção com chave válida (>=32 chars)
  const checkValidSecret = spawnSync("npx", [
    "tsx",
    "-e",
    'process.env.NODE_ENV="production"; process.env.JWT_SECRET="chave-super-segura-e-forte-com-mais-de-32-chars-2026"; import("./server/jwt.js").then(() => console.log("JWT_PROD_OK"));',
  ], { encoding: "utf8" });
  assert(
    checkValidSecret.status === 0 && checkValidSecret.stdout.includes("JWT_PROD_OK"),
    "Aplicação em produção aceita inicialização com chave >= 32 caracteres"
  );

  // SETUP SANDBOX PARA O SERVIDOR DE TESTE EM PORTA DINÂMICA
  const tempSandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "kupola-etapa2b11-iso-"));
  const tempEnvPath = path.join(tempSandboxDir, ".env");
  const tempSecret = "secret-key-com-mais-de-32-caracteres-para-teste-etapa-2b1-1-ok";
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

  console.log("[Ambiente] Aguardando inicialização do servidor...");
  let serverReady = false;
  const startWait = Date.now();
  while (Date.now() - startWait < 20000) {
    try {
      const res = await request(testPort, { path: "/health", method: "GET" });
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  if (!serverReady) {
    console.error("[ERRO CRÍTICO] Servidor de teste não inicializou em sandbox.");
    cleanupServer();
    process.exit(1);
  }

  try {
    // TESTE 2: REJEIÇÃO DE TOKENS FORJADOS E ASSINADOS COM OUTRA CHAVE
    console.log("\n--- TESTE 2: Rejeição de JWT Forjado e Assinado com Outra Chave ---");
    const fakeToken = jwt.sign({ userId: "usr_dono" }, "chave-atacante-completamente-diferente-123456");
    const resFake = await request(testPort, {
      path: "/settings",
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    assert(resFake.status === 401, "Token assinado com chave de terceiro é rejeitado com 401");

    const resMalformed = await request(testPort, {
      path: "/settings",
      headers: { Authorization: "Bearer token.completamente.corrompido" },
    });
    assert(resMalformed.status === 401, "Token JWT malformado é rejeitado com 401");

    const resNoAuth = await request(testPort, { path: "/settings" });
    assert(resNoAuth.status === 401, "Requisição sem token de autenticação é rejeitada com 401");

    // TESTE 3: ISOLAMENTO DE DISPONIBILIDADE E AGENDAMENTO PÚBLICO
    console.log("\n--- TESTE 3: Disponibilidade e Agendamento Público Isolados ---");
    const suffix = Date.now().toString().slice(-5);

    // Registrar Barbearia A
    const regA = await request(testPort, { method: "POST", path: "/auth/register" }, {
      username: `prop_a_${suffix}`,
      password: "SenhaForte123!A",
      name: "Proprietário Alpha",
      shop_name: `Barbearia Alpha ${suffix}`,
    });
    assert(regA.status === 200 && regA.data.token, "Registro da Barbearia Alpha concluído");
    const tokenA = regA.data.token;
    const slugA = regA.data.user.organization?.slug || regA.data.user.barbershop_id;

    // Registrar Barbearia B
    const regB = await request(testPort, { method: "POST", path: "/auth/register" }, {
      username: `prop_b_${suffix}`,
      password: "SenhaForte123!B",
      name: "Proprietário Beta",
      shop_name: `Barbearia Beta ${suffix}`,
    });
    assert(regB.status === 200 && regB.data.token, "Registro da Barbearia Beta concluído");
    const tokenB = regB.data.token;
    const slugB = regB.data.user.organization?.slug || regB.data.user.barbershop_id;

    // Barbearia Alpha cadastra serviço e barbeiro
    const srvA = await request(
      testPort,
      { method: "POST", path: "/services", headers: { Authorization: `Bearer ${tokenA}` } },
      { name: `Corte Alpha ${suffix}`, price: 75, duration_min: 30 }
    );
    assert(srvA.status === 200 && srvA.data.id, "Barbearia Alpha cadastrou serviço próprio");
    const serviceAId = srvA.data.id;

    const barbA = await request(
      testPort,
      { method: "POST", path: "/barbers", headers: { Authorization: `Bearer ${tokenA}` } },
      { name: `Barbeiro Alpha ${suffix}`, phone: "11911112222", commission_percent: 50 }
    );
    assert(barbA.status === 200 && barbA.data.id, "Barbearia Alpha cadastrou barbeiro próprio");
    const barberAId = barbA.data.id;

    // Barbearia Beta cadastra serviço e barbeiro
    const srvB = await request(
      testPort,
      { method: "POST", path: "/services", headers: { Authorization: `Bearer ${tokenB}` } },
      { name: `Corte Beta ${suffix}`, price: 60, duration_min: 30 }
    );
    assert(srvB.status === 200 && srvB.data.id, "Barbearia Beta cadastrou serviço próprio");
    const serviceBId = srvB.data.id;

    const barbB = await request(
      testPort,
      { method: "POST", path: "/barbers", headers: { Authorization: `Bearer ${tokenB}` } },
      { name: `Barbeiro Beta ${suffix}`, phone: "11933334444", commission_percent: 45 }
    );
    assert(barbB.status === 200 && barbB.data.id, "Barbearia Beta cadastrou barbeiro próprio");
    const barberBId = barbB.data.id;

    // 3.1 Consulta de disponibilidade de Alpha com barbeiro próprio -> 200 OK
    const availOwn = await request(testPort, {
      path: `/public/shop/${slugA}/availability?barber_id=${barberAId}`,
    });
    assert(
      availOwn.status === 200 && Array.isArray(availOwn.data.slots),
      "Consulta de disponibilidade de Alpha com barbeiro da própria Alpha retorna 200 com horários"
    );

    // 3.2 Consulta de disponibilidade de Alpha com barbeiro de Beta -> 400 REJEITADO
    const availForeign = await request(testPort, {
      path: `/public/shop/${slugA}/availability?barber_id=${barberBId}`,
    });
    assert(
      availForeign.status === 400 && availForeign.data.detail.includes("não pertence a esta barbearia"),
      "Consulta de disponibilidade de Alpha com barbeiro de Beta é rejeitada com 400"
    );

    // 3.3 Consulta de disponibilidade de Beta com barbeiro de Alpha -> 400 REJEITADO
    const availForeignRev = await request(testPort, {
      path: `/public/shop/${slugB}/availability?barber_id=${barberAId}`,
    });
    assert(
      availForeignRev.status === 400 && availForeignRev.data.detail.includes("não pertence a esta barbearia"),
      "Consulta de disponibilidade de Beta com barbeiro de Alpha é rejeitada com 400"
    );

    // 3.4 Tentativa de agendamento em Alpha passando barbeiro de Beta -> 400 REJEITADO
    const bookForeignBarber = await request(
      testPort,
      { method: "POST", path: `/public/shop/${slugA}/book` },
      {
        client_name: "Cliente Teste",
        client_phone: "11999998888",
        barber_id: barberBId, // Barbeiro de Beta!
        service_ids: [serviceAId],
        date: "2026-10-18",
        time: "10:00",
      }
    );
    assert(
      bookForeignBarber.status === 400,
      "Tentativa de agendamento em Alpha com barbeiro de Beta rejeitada com 400"
    );

    // 3.5 Tentativa de agendamento em Alpha passando serviço de Beta -> 400 REJEITADO
    const bookForeignService = await request(
      testPort,
      { method: "POST", path: `/public/shop/${slugA}/book` },
      {
        client_name: "Cliente Teste",
        client_phone: "11999998888",
        barber_id: barberAId,
        service_ids: [serviceBId], // Serviço de Beta!
        date: "2026-10-18",
        time: "10:30",
      }
    );
    assert(
      bookForeignService.status === 400,
      "Tentativa de agendamento em Alpha com serviço de Beta rejeitada com 400"
    );

    // 3.6 Agendamento legítimo em Alpha com próprios recursos -> 200 SUCESSO
    const bookLegit = await request(
      testPort,
      { method: "POST", path: `/public/shop/${slugA}/book` },
      {
        client_name: "Cliente Legítimo Alpha",
        client_phone: "11977776666",
        barber_id: barberAId,
        service_ids: [serviceAId],
        date: "2026-10-18",
        time: "11:00",
      }
    );
    assert(
      bookLegit.status === 200 && bookLegit.data.success === true,
      "Agendamento legítimo em Alpha concluído com sucesso (200)"
    );

    // 3.7 Verificação de agendamento ativo bloqueando horário
    const availAfterBook = await request(testPort, {
      path: `/public/shop/${slugA}/availability?barber_id=${barberAId}&date=2026-10-18`,
    });
    const slot11 = availAfterBook.data.slots.find((s) => s.time === "11:00");
    assert(
      slot11 && slot11.available === false && slot11.reason === "Ocupado",
      "Horário agendado (11:00) fica registrado como Ocupado na disponibilidade em tempo real"
    );

    // 3.8 Preservação do link público padrão existente (Barbearia Vintage)
    const vintageAvail = await request(testPort, {
      path: "/public/shop/barbearia-vintage/availability",
    });
    assert(
      vintageAvail.status === 200 && Array.isArray(vintageAvail.data.slots),
      "Link público padrão (barbearia-vintage) continua respondendo disponibilidade com 200"
    );

  } catch (err) {
    console.error("Erro durante os testes:", err);
    failed++;
  } finally {
    cleanupServer();
  }

  console.log("\n=========================================================");
  console.log(`TOTAL DE TESTES ETAPA 2B.1.1: ${passed + failed} | APROVADOS: ${passed} | REPROVADOS: ${failed}`);
  console.log("=========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Erro fatal nos testes:", err);
  process.exit(1);
});
