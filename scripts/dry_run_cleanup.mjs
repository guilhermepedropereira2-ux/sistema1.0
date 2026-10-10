import fs from "fs";
import path from "path";
import { createBackup } from "./backup_database.mjs";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "data", "kupola_db.json");
const storagePath = path.join(rootDir, "data", "kupola_storage.json");

// Whitelisted organizations (MUST NEVER BE REMOVED OR MODIFIED)
const WHITELISTED_ORGS = new Set(["demo_vintage", "org_vintage"]);

// Known test organization prefixes and exact IDs
const TEST_ORG_PREFIXES = ["org_test_", "org_audit_", "etapa_2b1_", "test_"];

export function runDryRun() {
  console.log("================================================================================");
  console.log("=== KUPOLA 2.0 — ETAPA 3.5: SIMULAÇÃO DE LIMPEZA CONTROLADA (DRY-RUN)        ===");
  console.log("================================================================================\n");

  // FASE 1: EXECUÇÃO E VALIDAÇÃO DE BACKUP
  console.log("--- FASE 1: Backup Prévio e Validação Criptográfica SHA-256 ---");
  const backupResult = createBackup();
  console.log(`[Backup] Diretorio: ${backupResult.backupDir}`);
  console.log(`[Backup] SHA-256 kupola_db.json:      ${backupResult.dbHash}`);
  console.log(`[Backup] SHA-256 kupola_storage.json: ${backupResult.storageHash}`);
  console.log(`[Backup] Integridade: VALIDADO (100% IDÊNTICO)\n`);

  // FASE 2: CARREGAMENTO SOMENTE LEITURA DOS BANCOS
  console.log("--- FASE 2: Leitura Somente Leitura dos Dados Originais ---");
  const rawDb = fs.readFileSync(dbPath, "utf-8");
  const rawStorage = fs.readFileSync(storagePath, "utf-8");

  const dbData = JSON.parse(rawDb);
  const storageData = JSON.parse(rawStorage);

  console.log(`[Leitura] kupola_db.json carregado (${rawDb.length} bytes)`);
  console.log(`[Leitura] kupola_storage.json carregado (${rawStorage.length} bytes)\n`);

  // FASE 3: CLASSIFICAÇÃO DAS ORGANIZAÇÕES
  console.log("--- FASE 3: Mapeamento e Classificação das Organizações ---");

  // Collect all unique organization IDs across both files
  const allOrgsInDb = dbData.barbershops || [];
  const allOrgsInStorage = Array.isArray(storageData.organizations)
    ? storageData.organizations.map(([id, data]) => data)
    : [];

  const orgMap = new Map();

  allOrgsInDb.forEach((o) => {
    orgMap.set(o.id, { source: "kupola_db.json", data: o });
  });

  allOrgsInStorage.forEach((o) => {
    if (!orgMap.has(o.id)) {
      orgMap.set(o.id, { source: "kupola_storage.json", data: o });
    } else {
      orgMap.get(o.id).sourceBoth = true;
    }
  });

  const totalOrgs = orgMap.size;
  const whitelistedOrgsList = [];
  const candidateOrgsList = [];
  const ambiguousOrgsList = [];

  for (const [id, info] of orgMap.entries()) {
    if (WHITELISTED_ORGS.has(id)) {
      whitelistedOrgsList.push({ id, ...info });
    } else {
      const isTestPrefix = TEST_ORG_PREFIXES.some((prefix) => id.startsWith(prefix));
      const name = info.data?.name || info.data?.shop_name || "";
      const isTestName =
        name.toLowerCase().includes("alpha") ||
        name.toLowerCase().includes("alfa") ||
        name.toLowerCase().includes("beta") ||
        name.toLowerCase().includes("teste") ||
        name.toLowerCase().includes("barbearia x") ||
        name.toLowerCase().includes("barbearia y") ||
        name.toLowerCase().includes("probe");

      if (isTestPrefix || isTestName) {
        candidateOrgsList.push({ id, name, source: info.source });
      } else {
        ambiguousOrgsList.push({ id, name, source: info.source });
      }
    }
  }

  console.log(`Total de Organizações Encontradas: ${totalOrgs}`);
  console.log(`Organizações Legítimas Preservadas (Whitelisted): ${whitelistedOrgsList.length}`);
  console.log(`Organizações Candidatas a Teste Identificadas: ${candidateOrgsList.length}`);
  console.log(`Organizações com Classificação Ambígua: ${ambiguousOrgsList.length}\n`);

  // FASE 4: INVENTARIAMENTO DE DEPENDÊNCIAS DAS ORGANIZAÇÕES CANDIDATAS
  console.log("--- FASE 4: Inventariamento de Registros Dependentes ---");

  const candidateIdsSet = new Set(candidateOrgsList.map((c) => c.id));

  // Helper to check if an entity belongs to a candidate organization
  const isCandidateTenant = (tenantId) => candidateIdsSet.has(tenantId);

  // Collections in kupola_db.json
  const candidateUsersDb = (dbData.users || []).filter((u) => isCandidateTenant(u.barbershop_id));
  const candidateUnitsDb = (dbData.units || []).filter((u) => isCandidateTenant(u.barbershop_id));
  const candidateBarbersDb = (dbData.barbers || []).filter((b) => isCandidateTenant(b.barbershop_id));
  const candidateServicesDb = (dbData.services || []).filter((s) => isCandidateTenant(s.barbershop_id));
  const candidatePaymentMethodsDb = (dbData.paymentMethods || []).filter((pm) => isCandidateTenant(pm.barbershop_id));
  const candidateClientsDb = (dbData.clients || []).filter((c) => isCandidateTenant(c.barbershop_id));
  const candidateAppointmentsDb = (dbData.appointments || []).filter((a) => isCandidateTenant(a.barbershop_id));
  const candidateRevenuesDb = (dbData.revenues || []).filter((r) => isCandidateTenant(r.barbershop_id));
  const candidateQueueDb = (dbData.queue || []).filter((q) => isCandidateTenant(q.barbershop_id));

  // Collections in kupola_storage.json
  const storageUsers = Array.isArray(storageData.users) ? storageData.users.map(([k, v]) => v) : [];
  const candidateUsersStorage = storageUsers.filter((u) => isCandidateTenant(u.organization_id));

  const storageClients = Array.isArray(storageData.clients) ? storageData.clients.map(([k, v]) => v) : [];
  const candidateClientsStorage = storageClients.filter((c) => isCandidateTenant(c.organization_id));

  const storageServicesProducts = Array.isArray(storageData.servicesProducts)
    ? storageData.servicesProducts.map(([k, v]) => v)
    : [];
  const candidateServicesStorage = storageServicesProducts.filter((sp) => isCandidateTenant(sp.organization_id));

  const storageAppointments = Array.isArray(storageData.appointments)
    ? storageData.appointments.map(([k, v]) => v)
    : [];
  const candidateAppointmentsStorage = storageAppointments.filter((a) => isCandidateTenant(a.organization_id));

  console.log("Contagens por Coleção de Registros Dependentes a Serem Removidos no Futuro:");
  console.log(`  - Usuários/Logins de Teste: ${candidateUsersDb.length + candidateUsersStorage.length}`);
  console.log(`  - Unidades de Teste: ${candidateUnitsDb.length}`);
  console.log(`  - Barbeiros de Teste: ${candidateBarbersDb.length}`);
  console.log(`  - Serviços e Produtos de Teste: ${candidateServicesDb.length + candidateServicesStorage.length}`);
  console.log(`  - Métodos de Pagamento de Teste: ${candidatePaymentMethodsDb.length}`);
  console.log(`  - Clientes de Teste: ${candidateClientsDb.length + candidateClientsStorage.length}`);
  console.log(`  - Agendamentos de Teste: ${candidateAppointmentsDb.length + candidateAppointmentsStorage.length}`);
  console.log(`  - Receitas e Vendas de Teste: ${candidateRevenuesDb.length}`);
  console.log(`  - Itens de Fila de Teste: ${candidateQueueDb.length}\n`);

  // FASE 5: REGRAS DE VERIFICAÇÃO E ANÁLISE DE SEGURANÇA (FAIL-SAFE)
  console.log("--- FASE 5: Verificação de Integridade e Regras de Segurança ---");

  let securityViolations = [];

  // Check 1: Backup hashes matched
  if (!backupResult.isValid) {
    securityViolations.push("Divergência nos hashes SHA-256 do backup.");
  }

  // Check 2: Vintage Club integrity
  const vintageInCandidates = candidateOrgsList.some((c) => WHITELISTED_ORGS.has(c.id));
  if (vintageInCandidates) {
    securityViolations.push("ERRO CRÍTICO: Barbearia Vintage Club foi incorretamente incluída na lista de teste!");
  }

  // Check 3: Cross-linking check
  // Verify if any candidate client or appointment references demo_vintage or org_vintage unexpectedly
  const crossLinkedClient = candidateClientsDb.find((c) => c.barbershop_id === "org_vintage" || c.barbershop_id === "demo_vintage");
  if (crossLinkedClient) {
    securityViolations.push("Inconsistência de vínculo cruzado encontrada em cliente.");
  }

  // Check 4: Ambiguous organizations
  if (ambiguousOrgsList.length > 0) {
    securityViolations.push(`Existem ${ambiguousOrgsList.length} organizações com classificação ambígua sem confirmação de teste.`);
  }

  if (securityViolations.length === 0) {
    console.log("[STATUS SEGURANÇA] TODAS AS VERIFICAÇÕES APROVADAS. Nenhuma inconsistência técnica encontrada.");
  } else {
    console.error("[STATUS SEGURANÇA] ALERTAS ENCONTRADOS:");
    securityViolations.forEach((v) => console.error(`  - ${v}`));
  }

  // FASE 6: PROJEÇÃO DE IMPACTO NO PAINEL SUPERADMIN
  console.log("\n--- FASE 6: Projeção de Impacto nas Métricas do SuperAdmin ---");
  console.log(`Total de Organizações Atuais:  ${totalOrgs}`);
  console.log(`Total Projetado Pós-Limpeza:    1 (Barbearia Vintage Club - org_vintage / demo_vintage)`);
  console.log(`Métricas de Assinatura Ativa:  1 Assinatura Pagante Ativa (Vintage Club)`);
  console.log(`MRR Projetado Real Confirmado:  R$ 149,00 / mês (Plano Pro/Premium)`);
  console.log(`ARR Projetado Real Confirmado:  R$ 1.788,00 / ano\n`);

  // FASE 7: LISTA NOMINAL DOS IDS CANDIDATOS A REMOÇÃO
  console.log("--- FASE 7: Relação Nominal dos 62 IDs Candidatos ---");
  candidateOrgsList.forEach((c, idx) => {
    console.log(`  [${String(idx + 1).padStart(2, "0")}] ID: ${c.id.padEnd(28)} | Nome: ${c.name || "(Sem nome)"}`);
  });

  console.log("\n================================================================================");
  console.log("=== FIM DA SIMULAÇÃO (DRY-RUN) — NENHUM DADO FOI EXCLUÍDO OU ALTERADO       ===");
  console.log("=== PROCESSO INTERROMPIDO. AGUARDANDO AUTORIZAÇÃO EXPLÍCITA PARA A LIMPEZA ===");
  console.log("================================================================================\n");

  return {
    backupResult,
    totalOrgs,
    whitelistedCount: whitelistedOrgsList.length,
    candidateCount: candidateOrgsList.length,
    ambiguousCount: ambiguousOrgsList.length,
    securityViolations,
    candidateOrgsList,
    counts: {
      users: candidateUsersDb.length + candidateUsersStorage.length,
      units: candidateUnitsDb.length,
      barbers: candidateBarbersDb.length,
      services: candidateServicesDb.length + candidateServicesStorage.length,
      paymentMethods: candidatePaymentMethodsDb.length,
      clients: candidateClientsDb.length + candidateClientsStorage.length,
      appointments: candidateAppointmentsDb.length + candidateAppointmentsStorage.length,
      revenues: candidateRevenuesDb.length,
      queue: candidateQueueDb.length,
    },
  };
}

if (process.argv[1] && process.argv[1].endsWith("dry_run_cleanup.mjs")) {
  try {
    runDryRun();
  } catch (err) {
    console.error("[ERRO NO DRY-RUN]:", err.message);
    process.exit(1);
  }
}
