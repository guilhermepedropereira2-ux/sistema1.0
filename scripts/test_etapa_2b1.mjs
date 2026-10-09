import http from "http";
import jwt from "jsonwebtoken";
import { spawnSync } from "child_process";

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const pathStr = options.path.startsWith("/") ? options.path : `/${options.path}`;
    const url = new URL(`http://localhost:3000/api${pathStr}`);
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
  console.log("=================================================================");
  console.log("=== BATERIA DE TESTES: ETAPA 2B.1 (AGENDAMENTO PÚBLICO E JWT) ===");
  console.log("=================================================================\n");

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

  // TESTE 1: PROTEÇÃO DO JWT_SECRET EM PRODUÇÃO
  console.log("--- TESTE 1: Verificação de Inicialização em Produção ---");

  // 1.1 Produção sem JWT_SECRET deve abortar
  const checkNoSecret = spawnSync("npx", [
    "tsx",
    "-e",
    'process.env.NODE_ENV="production"; delete process.env.JWT_SECRET; import("./server/auth.js");',
  ], { encoding: "utf8" });
  assert(
    checkNoSecret.status !== 0 && checkNoSecret.stderr.includes("JWT_SECRET é obrigatório"),
    "Produção sem JWT_SECRET aborta inicialização com código de erro e mensagem explicativa"
  );

  // 1.2 Produção com chave curta (<32 chars) deve abortar
  const checkShortSecret = spawnSync("npx", [
    "tsx",
    "-e",
    'process.env.NODE_ENV="production"; process.env.JWT_SECRET="chave-curta-de-16-caracteres"; import("./server/auth.js");',
  ], { encoding: "utf8" });
  assert(
    checkShortSecret.status !== 0 && checkShortSecret.stderr.includes("mínimo 32 caracteres"),
    "Produção com JWT_SECRET < 32 caracteres aborta inicialização"
  );

  // 1.3 Produção com chave >= 32 chars deve inicializar com sucesso
  const checkValidSecret = spawnSync("npx", [
    "tsx",
    "-e",
    'process.env.NODE_ENV="production"; process.env.JWT_SECRET="chave-super-segura-e-forte-com-mais-de-32-chars-2026"; import("./server/auth.js").then(() => console.log("START_OK"));',
  ], { encoding: "utf8" });
  assert(
    checkValidSecret.status === 0 && checkValidSecret.stdout.includes("START_OK"),
    "Produção com JWT_SECRET >= 32 caracteres inicializa perfeitamente"
  );

  // TESTE 2: PRESERVAÇÃO DO LINK PÚBLICO EXISTENTE
  console.log("\n--- TESTE 2: Funcionamento dos Links Públicos Existentes ---");
  const vintageShopRes = await request({ path: "/public/shop/barbearia-vintage" });
  assert(
    vintageShopRes.status === 200 && vintageShopRes.data.shop && vintageShopRes.data.shop.slug === "barbearia-vintage",
    "Link público da Barbearia Vintage continua acessível e funcional"
  );
  assert(
    Array.isArray(vintageShopRes.data.services) && vintageShopRes.data.services.length > 0,
    "Catálogo público de serviços da barbearia existente carregado corretamente"
  );
  assert(
    Array.isArray(vintageShopRes.data.barbers) && vintageShopRes.data.barbers.length > 0,
    "Equipe pública de barbeiros da barbearia existente carregada corretamente"
  );

  // TESTE 3: ISOLAMENTO ESTRITO ENTRE DUAS BARBEARIAS NO AGENDAMENTO PÚBLICO
  console.log("\n--- TESTE 3: Isolamento de Agendamento Público entre Barbearias ---");
  const suffix = Date.now().toString().slice(-5);

  // Registrar Barbearia X
  const regX = await request({ method: "POST", path: "/auth/register" }, {
    username: `dono_x_${suffix}`,
    password: "SenhaForte123!X",
    name: "Proprietário X",
    shop_name: `Barbearia X ${suffix}`,
  });
  assert(regX.status === 200 && regX.data.token, "Registro da Barbearia X concluído");
  const tokenX = regX.data.token;
  const slugX = regX.data.user.organization?.slug || regX.data.user.barbershop_id;

  // Registrar Barbearia Y
  const regY = await request({ method: "POST", path: "/auth/register" }, {
    username: `dono_y_${suffix}`,
    password: "SenhaForte123!Y",
    name: "Proprietário Y",
    shop_name: `Barbearia Y ${suffix}`,
  });
  assert(regY.status === 200 && regY.data.token, "Registro da Barbearia Y concluído");
  const tokenY = regY.data.token;
  const slugY = regY.data.user.organization?.slug || regY.data.user.barbershop_id;

  // Barbearia X cria serviço e barbeiro
  const srvX = await request(
    { method: "POST", path: "/services", headers: { Authorization: `Bearer ${tokenX}` } },
    { name: `Corte Exclusivo X ${suffix}`, price: 70, duration_min: 30 }
  );
  assert(srvX.status === 200 && srvX.data.id, "Barbearia X cadastrou serviço");
  const serviceXId = srvX.data.id;

  const barbX = await request(
    { method: "POST", path: "/barbers", headers: { Authorization: `Bearer ${tokenX}` } },
    { name: `Barbeiro Oficial X ${suffix}`, phone: "11911112222", commission_percent: 50 }
  );
  assert(barbX.status === 200 && barbX.data.id, "Barbearia X cadastrou barbeiro");
  const barberXId = barbX.data.id;

  // Barbearia Y cria serviço e barbeiro
  const srvY = await request(
    { method: "POST", path: "/services", headers: { Authorization: `Bearer ${tokenY}` } },
    { name: `Barba Terapia Y ${suffix}`, price: 55, duration_min: 30 }
  );
  assert(srvY.status === 200 && srvY.data.id, "Barbearia Y cadastrou serviço");
  const serviceYId = srvY.data.id;

  const barbY = await request(
    { method: "POST", path: "/barbers", headers: { Authorization: `Bearer ${tokenY}` } },
    { name: `Barbeiro Oficial Y ${suffix}`, phone: "11933334444", commission_percent: 45 }
  );
  assert(barbY.status === 200 && barbY.data.id, "Barbearia Y cadastrou barbeiro");
  const barberYId = barbY.data.id;

  // Validar listagem pública de X
  const pubX = await request({ path: `/public/shop/${slugX}` });
  const hasServiceYInX = pubX.data.services.some((s) => s.id === serviceYId);
  const hasBarberYInX = pubX.data.barbers.some((b) => b.id === barberYId);
  assert(!hasServiceYInX, "Link público de X NÃO lista serviços de Y");
  assert(!hasBarberYInX, "Link público de X NÃO lista barbeiros de Y");

  // Validar listagem pública de Y
  const pubY = await request({ path: `/public/shop/${slugY}` });
  const hasServiceXInY = pubY.data.services.some((s) => s.id === serviceXId);
  const hasBarberXInY = pubY.data.barbers.some((b) => b.id === barberXId);
  assert(!hasServiceXInY, "Link público de Y NÃO lista serviços de X");
  assert(!hasBarberXInY, "Link público de Y NÃO lista barbeiros de X");

  // TESTE 4: TENTATIVA DE AGENDAMENTO CRUZADO (ATTACK SCENARIOS)
  console.log("\n--- TESTE 4: Rejeição de Invasão de Serviços e Barbeiros Cruzados ---");

  // 4.1 Cliente tenta agendar em X passando serviço de Y -> DEVE REJEITAR (400)
  const crossServiceBooking = await request(
    { method: "POST", path: `/public/shop/${slugX}/book` },
    {
      client_name: "Cliente Invasor",
      client_phone: "11988887777",
      barber_id: barberXId,
      service_ids: [serviceYId], // Serviço pertencente a Y!
      date: "2026-10-15",
      time: "14:00",
    }
  );
  assert(
    crossServiceBooking.status === 400,
    "Agendamento no link de X com serviço de Y é categoricamente rejeitado com 400"
  );

  // 4.2 Cliente tenta agendar em X passando barbeiro de Y -> DEVE REJEITAR (400)
  const crossBarberBooking = await request(
    { method: "POST", path: `/public/shop/${slugX}/book` },
    {
      client_name: "Cliente Invasor",
      client_phone: "11988887777",
      barber_id: barberYId, // Barbeiro pertencente a Y!
      service_ids: [serviceXId],
      date: "2026-10-15",
      time: "14:30",
    }
  );
  assert(
    crossBarberBooking.status === 400,
    "Agendamento no link de X com barbeiro de Y é categoricamente rejeitado com 400"
  );

  // 4.3 Agendamento legítimo em X -> DEVE CONCLUIR COM SUCESSO (200)
  const validBookingX = await request(
    { method: "POST", path: `/public/shop/${slugX}/book` },
    {
      client_name: "Cliente Legítimo X",
      client_phone: "11999990000",
      barber_id: barberXId,
      service_ids: [serviceXId],
      date: "2026-10-15",
      time: "15:00",
    }
  );
  assert(
    validBookingX.status === 200 && validBookingX.data.success === true,
    "Agendamento legítimo no link de X com serviço e barbeiro próprios concluído com sucesso"
  );

  // 4.4 Agendamento legítimo em Y com 'any' barber -> DEVE ALOCAR SOMENTE BARBEIRO DE Y
  const validBookingY = await request(
    { method: "POST", path: `/public/shop/${slugY}/book` },
    {
      client_name: "Cliente Legítimo Y",
      client_phone: "11988881111",
      barber_id: "any",
      service_ids: [serviceYId],
      date: "2026-10-15",
      time: "16:00",
    }
  );
  assert(
    validBookingY.status === 200 &&
      validBookingY.data.appointment &&
      validBookingY.data.appointment.barber_id === barberYId,
    "Agendamento com barbeiro 'any' em Y alocou estritamente o barbeiro de Y, nunca de X"
  );

  // 4.5 Barbearia Y consulta agendamentos -> NÃO visualiza o agendamento de X
  const aptsY = await request({
    path: "/appointments",
    headers: { Authorization: `Bearer ${tokenY}` },
  });
  const leakedAptInY = (aptsY.data || []).find((a) => a.id === validBookingX.data.appointment.id);
  assert(!leakedAptInY, "Painel interno de Y NÃO tem acesso aos agendamentos gerados no link público de X");

  console.log("\n=======================================================");
  console.log(`TOTAL DE TESTES ETAPA 2B.1: ${passed + failed} | APROVADOS: ${passed} | REPROVADOS: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Erro fatal nos testes:", err);
  process.exit(1);
});
