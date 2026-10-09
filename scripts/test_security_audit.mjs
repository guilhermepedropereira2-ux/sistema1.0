import http from "http";
import jwt from "jsonwebtoken";

const BASE_URL = "http://localhost:3000/api";

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
  console.log("=== INICIANDO BATERIA DE TESTES DE SEGURANÇA E ISOLAMENTO ===");
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

  // TESTE 1: REJEIÇÃO DE TOKENS FORJADOS E BACKDOORS
  console.log("\n--- TESTE 1: Autenticação e Tokens Inválidos ---");
  const resNoAuth = await request({ path: "/settings" });
  assert(resNoAuth.status === 401, "Acesso sem token retorna 401");

  const resFakeToken = await request({
    path: "/settings",
    headers: { Authorization: "Bearer fake-token-usr_dono" },
  });
  assert(resFakeToken.status === 401, "Tentativa de bypass fake-token é rejeitada com 401");

  const fakeJwt = jwt.sign({ userId: "usr_dono" }, "chave-falsa-invasor-999");
  const resBadJwt = await request({
    path: "/settings",
    headers: { Authorization: `Bearer ${fakeJwt}` },
  });
  assert(resBadJwt.status === 401, "JWT assinado com chave inválida é rejeitado com 401");

  // TESTE 2: CRIAÇÃO DE DOIS TENANTS ISOLADOS
  console.log("\n--- TESTE 2: Isolamento Estrito entre Barbearias ---");
  const suffix = Date.now().toString().slice(-5);
  const userA = {
    username: `dono_a_${suffix}`,
    password: "SenhaForteTenantA123!",
    name: "Dono Barbearia Alpha",
    shop_name: `Barbearia Alpha ${suffix}`,
  };
  const regA = await request({ method: "POST", path: "/auth/register" }, userA);
  assert(regA.status === 200 && regA.data.token, "Registro do Tenant Alpha concluído");
  const tokenA = regA.data.token;
  const tenantAId = regA.data.user.barbershop_id;

  const userB = {
    username: `dono_b_${suffix}`,
    password: "SenhaForteTenantB456!",
    name: "Dono Barbearia Beta",
    shop_name: `Barbearia Beta ${suffix}`,
  };
  const regB = await request({ method: "POST", path: "/auth/register" }, userB);
  assert(regB.status === 200 && regB.data.token, "Registro do Tenant Beta concluído");
  const tokenB = regB.data.token;
  const tenantBId = regB.data.user.barbershop_id;

  assert(tenantAId !== tenantBId, "Identificadores de tenant são distintos e únicos");

  // Tenant A cria um serviço
  const srvA = await request(
    {
      method: "POST",
      path: "/services",
      headers: { Authorization: `Bearer ${tokenA}` },
    },
    { name: `Corte Alpha Especial ${suffix}`, price: 85, duration_min: 45 }
  );
  assert(srvA.status === 200 && srvA.data.id, "Tenant Alpha cadastrou serviço");
  const serviceAId = srvA.data.id;

  // Tenant B lista serviços -> NÃO pode ver o serviço do Tenant A
  const srvListB = await request({
    path: "/services",
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const leakedService = (srvListB.data || []).find((s) => s.id === serviceAId);
  assert(!leakedService, "Tenant Beta NÃO visualiza os serviços do Tenant Alpha");

  // Tenant B tenta alterar ou excluir o serviço do Tenant A
  const updateAttempt = await request(
    {
      method: "PUT",
      path: `/services/${serviceAId}`,
      headers: { Authorization: `Bearer ${tokenB}` },
    },
    { name: "Tentativa de Alteração Invasora", price: 10 }
  );
  assert(updateAttempt.status === 404, "Tenant Beta é impedido de alterar serviço do Tenant Alpha (404)");

  const deleteAttempt = await request({
    method: "DELETE",
    path: `/services/${serviceAId}`,
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(deleteAttempt.status === 404, "Tenant Beta é impedido de excluir serviço do Tenant Alpha (404)");

  // Tenant B tenta forjar header x-organization-id com o id do Tenant A
  const spoofAttempt = await request({
    path: "/services",
    headers: {
      Authorization: `Bearer ${tokenB}`,
      "x-organization-id": tenantAId,
    },
  });
  const spoofLeaked = (spoofAttempt.data || []).find((s) => s.id === serviceAId);
  assert(!spoofLeaked, "Tenant Beta NÃO consegue forjar tenant via x-organization-id (Anti-Spoofing)");

  // TESTE 3: PERMISSÕES NO BACKEND (RBAC)
  console.log("\n--- TESTE 3: Permissões e Perfis Restritos (RBAC) ---");
  // Tenant A cria um usuário barbeiro comum sem permissões de gestão
  const createBarberUser = await request(
    {
      method: "POST",
      path: "/users",
      headers: { Authorization: `Bearer ${tokenA}` },
    },
    {
      name: "Barbeiro Teste",
      username: `barbeiro_${suffix}`,
      password: "BarbeiroSenha123!",
      role: "barbeiro",
      permissions: {},
    }
  );
  assert(createBarberUser.status === 200, "Dono Alpha cadastrou usuário barbeiro");

  // Login como barbeiro
  const loginBarber = await request(
    { method: "POST", path: "/auth/login" },
    { username: `barbeiro_${suffix}`, password: "BarbeiroSenha123!" }
  );
  assert(loginBarber.status === 200 && loginBarber.data.token, "Login do barbeiro autenticado com sucesso");
  const tokenBarber = loginBarber.data.token;

  // Barbeiro tenta realizar fechamento de caixa -> DEVE RETORNAR 403
  const cashClosingAttempt = await request(
    {
      method: "POST",
      path: "/cash-closings",
      headers: { Authorization: `Bearer ${tokenBarber}` },
    },
    { expected: { Dinheiro: 100 }, counted: { Dinheiro: 100 } }
  );
  assert(cashClosingAttempt.status === 403, "Barbeiro sem permissão é bloqueado de fechar caixa (403)");

  // Barbeiro tenta alterar configurações gerais -> DEVE RETORNAR 403
  const settingsAttempt = await request(
    {
      method: "PUT",
      path: "/settings",
      headers: { Authorization: `Bearer ${tokenBarber}` },
    },
    { commission_base: "gross" }
  );
  assert(settingsAttempt.status === 403, "Barbeiro é bloqueado de alterar configurações do sistema (403)");

  // TESTE 4: VALIDAÇÃO DE SENHA NO ONBOARDING
  console.log("\n--- TESTE 4: Validação de Senha Forte no Onboarding ---");
  const onboardingWeakPassword = await request(
    { method: "POST", path: "/onboarding/complete" },
    {
      barbershop: { name: "Barbearia Fraca", city: "São Paulo" },
      profile: { name: "Teste", email: `teste_${suffix}@barbearia.com`, password: "123" },
    }
  );
  assert(onboardingWeakPassword.status === 400, "Onboarding rejeita senha fraca/curta com 400");

  // TESTE 5: PERSISTÊNCIA EM ARQUIVO
  console.log("\n--- TESTE 5: Persistência Real de Dados ---");
  const fs = await import("fs");
  const path = await import("path");
  const dbFile = path.join(process.cwd(), "data", "kupola_db.json");
  const rawDb = fs.readFileSync(dbFile, "utf-8");
  const parsedDb = JSON.parse(rawDb);

  const foundUserInFile = parsedDb.users.some((u) => u.username === userA.username);
  const foundShopInFile = parsedDb.barbershops.some((b) => b.id === tenantAId);
  const foundServiceInFile = parsedDb.services.some((s) => s.id === serviceAId);

  assert(foundUserInFile, "Novo usuário do Tenant Alpha está gravado no arquivo kupola_db.json");
  assert(foundShopInFile, "Nova barbearia do Tenant Alpha está gravada no arquivo kupola_db.json");
  assert(foundServiceInFile, "Serviço criado pelo Tenant Alpha está gravado no arquivo kupola_db.json");

  console.log("\n=======================================================");
  console.log(`TOTAL DE TESTES: ${passed + failed} | APROVADOS: ${passed} | REPROVADOS: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Erro fatal nos testes:", err);
  process.exit(1);
});
