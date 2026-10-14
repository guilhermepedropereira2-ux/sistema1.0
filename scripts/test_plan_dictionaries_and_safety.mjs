import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { generateCleanupManifest, classifyOrganization, WHITELISTED_ORGS } from "./plan_reversible_cleanup.mjs";

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

console.log("================================================================================");
console.log("=== KUPOLA 2.0 — ETAPA 3.6C.1: TESTES ISOLADOS DE SEGURANÇA E DICIONÁRIOS   ===");
console.log("================================================================================\n");

const testDir = path.join(os.tmpdir(), `kupola_test_plan_${Date.now()}`);
fs.mkdirSync(testDir, { recursive: true });

let allPassed = true;
function assert(condition, message) {
  if (!condition) {
    console.error(`[FALHA] ${message}`);
    allPassed = false;
    throw new Error(`Falha de asserção: ${message}`);
  } else {
    console.log(`[PASS] ${message}`);
  }
}

// Gerador de dados sintéticos para testes
function createBaseSyntheticData() {
  const db = {
    barbershops: [
      { id: "demo_vintage", name: "Barbearia Vintage Club" },
      { id: "org_1791511054173_svoq", name: "Barbearia Alpha 54170" },
      { id: "org_1791511110080_mijn", name: "Barbearia Beta 11008" },
    ],
    users: [
      { id: "usr_dono", name: "Dono Vintage", barbershop_id: "demo_vintage" },
      { id: "usr_1791511054173_qrp7", name: "User Test 1", barbershop_id: "org_1791511054173_svoq" },
    ],
    units: [
      { id: "unit_centro", name: "Matriz Centro", barbershop_id: "demo_vintage" },
      { id: "unit_shopping", name: "Filial Shopping", barbershop_id: "demo_vintage" },
      { id: "unit_1791511054173_svoq", name: "Unidade Alpha", barbershop_id: "org_1791511054173_svoq" },
    ],
    subscriptions: {
      demo_vintage: { plan_id: "premium", status: "active", max_barbers: 10 },
      org_1791511054173_svoq: { plan_id: "pro", status: "trialing", max_barbers: 4 },
      org_1791511110080_mijn: { plan_id: "pro", status: "trialing", max_barbers: 4 },
    },
    settingsMap: {
      demo_vintage: { id: "settings_demo", barbershop_id: "demo_vintage", shop_name: "Barbearia Vintage Club" },
      org_1791511054173_svoq: { id: "settings_svoq", barbershop_id: "org_1791511054173_svoq", shop_name: "Barbearia Alpha 54170" },
      org_1791511110080_mijn: { id: "settings_mijn", barbershop_id: "org_1791511110080_mijn", shop_name: "Barbearia Beta 11008" },
    },
    subscription: { plan_id: "premium", status: "active" },
    settings: { id: "settings_global", barbershop_id: "demo_vintage" },
    barbershop: { id: "demo_vintage", name: "Barbearia Vintage Club" },
    onboarding: { completed: true },
  };

  const storage = {
    organizations: [
      ["org_vintage", { name: "Barbearia Vintage Club" }],
      ["org_1791511054173_svoq", { name: "Barbearia Alpha 54170" }],
      ["org_1791511110080_mijn", { name: "Barbearia Beta 11008" }],
    ],
    users: [
      ["usr_owner", { name: "Owner Vintage", organization_id: "org_vintage" }],
      ["usr_1791511054173_qrp7", { name: "User Test 1", organization_id: "org_1791511054173_svoq" }],
    ],
  };

  return { db, storage };
}

try {
  // ============================================================================
  // TESTE 1 & 2 & 3: IDENTIFICAÇÃO EM SUBSCRIPTIONS, SETTINGSMAP E PRESERVAÇÃO DE DEMO_VINTAGE
  // ============================================================================
  console.log("--- Executando Teste 1, 2 e 3: Suporte a Dicionários e Preservação da Whitelist ---");
  const case1Dir = path.join(testDir, "case1");
  fs.mkdirSync(case1Dir, { recursive: true });
  const case1DbPath = path.join(case1Dir, "kupola_db.json");
  const case1StoragePath = path.join(case1Dir, "kupola_storage.json");

  const { db: data1Db, storage: data1Storage } = createBaseSyntheticData();
  fs.writeFileSync(case1DbPath, JSON.stringify(data1Db, null, 2), "utf-8");
  fs.writeFileSync(case1StoragePath, JSON.stringify(data1Storage, null, 2), "utf-8");

  const hash1DbBefore = sha256(case1DbPath);
  const hash1StorageBefore = sha256(case1StoragePath);

  const res1 = generateCleanupManifest({
    rootDir: case1Dir,
    dbPath: case1DbPath,
    storagePath: case1StoragePath,
    writeManifest: false,
  });

  const records = res1.manifest.manifestRecords;

  // 1. Identificação de subscriptions
  const subCandidates = records.filter((r) => r.collection === "subscriptions");
  assert(subCandidates.length === 2, `Identificadas exatamente 2 chaves candidatas em subscriptions (encontradas: ${subCandidates.length})`);
  assert(subCandidates.some((r) => r.id === "org_1791511054173_svoq"), "Chave org_1791511054173_svoq identificada em subscriptions");
  assert(subCandidates.some((r) => r.id === "org_1791511110080_mijn"), "Chave org_1791511110080_mijn identificada em subscriptions");

  // 2. Identificação de settingsMap
  const setCandidates = records.filter((r) => r.collection === "settingsMap");
  assert(setCandidates.length === 2, `Identificadas exatamente 2 chaves candidatas em settingsMap (encontradas: ${setCandidates.length})`);
  assert(setCandidates.some((r) => r.id === "org_1791511054173_svoq"), "Chave org_1791511054173_svoq identificada em settingsMap");
  assert(setCandidates.some((r) => r.id === "org_1791511110080_mijn"), "Chave org_1791511110080_mijn identificada em settingsMap");

  // 3. Preservação de demo_vintage
  const demoInManifest = records.filter((r) => r.id === "demo_vintage" || r.ownerOrgId === "demo_vintage");
  assert(demoInManifest.length === 0, `Entidade demo_vintage preservada integralmente (ocorrências no manifesto: ${demoInManifest.length})`);

  // ============================================================================
  // TESTE 4: BLOQUEIO IMEDIATO DE CHAVES AMBÍGUAS EM DICIONÁRIOS
  // ============================================================================
  console.log("\n--- Executando Teste 4: Bloqueio de Chaves Ambíguas ---");
  const case4Dir = path.join(testDir, "case4");
  fs.mkdirSync(case4Dir, { recursive: true });
  const case4DbPath = path.join(case4Dir, "kupola_db.json");
  const case4StoragePath = path.join(case4Dir, "kupola_storage.json");

  const { db: data4Db, storage: data4Storage } = createBaseSyntheticData();
  // Injeta uma chave ambígua (não whitelisted e sem padrão de teste) em subscriptions
  data4Db.subscriptions["org_misteriosa_desconhecida"] = { plan_id: "custom" };
  fs.writeFileSync(case4DbPath, JSON.stringify(data4Db, null, 2), "utf-8");
  fs.writeFileSync(case4StoragePath, JSON.stringify(data4Storage, null, 2), "utf-8");

  let blockedAmbiguous = false;
  try {
    generateCleanupManifest({
      rootDir: case4Dir,
      dbPath: case4DbPath,
      storagePath: case4StoragePath,
      writeManifest: false,
    });
  } catch (err) {
    if (err.message.includes("entradas ambíguas") || err.message.includes("sem vínculo com whitelist")) {
      blockedAmbiguous = true;
    }
  }
  assert(blockedAmbiguous, "Planejador bloqueou com sucesso ao encontrar chave ambígua em dicionário");

  // ============================================================================
  // TESTE 5: IDENTIFICAÇÃO INEQUÍVOCA POR ARQUIVO, ESTRUTURA E CHAVE
  // ============================================================================
  console.log("\n--- Executando Teste 5: Identificação Inequívoca das Entidades ---");
  const sampleDictRecord = subCandidates[0];
  assert(sampleDictRecord.file.includes("kupola_db.json"), "Arquivo de origem especificado corretamente");
  assert(sampleDictRecord.collection === "subscriptions", "Coleção especificada corretamente");
  assert(sampleDictRecord.structureType === "dictionary", "structureType classificado como 'dictionary'");
  assert(sampleDictRecord.entityType === "organization_setting_entry", "entityType classificado como 'organization_setting_entry'");
  assert(sampleDictRecord.physicalPath === "subscriptions.org_1791511054173_svoq", "physicalPath gerado como subscriptions.key");
  assert(sampleDictRecord.ownerOrgId === "org_1791511054173_svoq", "ownerOrgId comprovado e associado");

  // ============================================================================
  // TESTE 6: DETECÇÃO DE CAMINHOS DUPLICADOS
  // ============================================================================
  console.log("\n--- Executando Teste 6: Detecção e Bloqueio de Caminhos Duplicados ---");
  const case6Dir = path.join(testDir, "case6");
  fs.mkdirSync(case6Dir, { recursive: true });
  const case6DbPath = path.join(case6Dir, "kupola_db.json");
  const case6StoragePath = path.join(case6Dir, "kupola_storage.json");

  const { db: data6Db, storage: data6Storage } = createBaseSyntheticData();
  // Injeta dois registros com ID idêntico na mesma coleção de array para gerar colisão de caminho
  data6Db.users.push({ id: "usr_1791511054173_qrp7", name: "Duplicate User", barbershop_id: "org_1791511054173_svoq" });
  fs.writeFileSync(case6DbPath, JSON.stringify(data6Db, null, 2), "utf-8");
  fs.writeFileSync(case6StoragePath, JSON.stringify(data6Storage, null, 2), "utf-8");

  let blockedDuplicate = false;
  try {
    generateCleanupManifest({
      rootDir: case6Dir,
      dbPath: case6DbPath,
      storagePath: case6StoragePath,
      writeManifest: false,
    });
  } catch (err) {
    if (err.message.includes("caminhos duplicados detectados")) {
      blockedDuplicate = true;
    }
  }
  assert(blockedDuplicate, "Planejador detectou e bloqueou colisão de caminhos físicos duplicados");

  // ============================================================================
  // TESTE 7: PRESERVAÇÃO DOS DADOS ORIGINAIS USADOS COMO REFERÊNCIA
  // ============================================================================
  console.log("\n--- Executando Teste 7: Integridade Criptográfica dos Arquivos de Teste ---");
  const hash1DbAfter = sha256(case1DbPath);
  const hash1StorageAfter = sha256(case1StoragePath);
  assert(hash1DbBefore === hash1DbAfter, "Hash SHA-256 do arquivo DB inalterado pós-planejamento");
  assert(hash1StorageBefore === hash1StorageAfter, "Hash SHA-256 do arquivo Storage inalterado pós-planejamento");

  // ============================================================================
  // TESTE 8: COMPORTAMENTO SEGURO COM ESTRUTURAS DE FORMATO INESPERADO
  // ============================================================================
  console.log("\n--- Executando Teste 8: Bloqueio contra Formatos Inesperados ---");
  const case8Dir = path.join(testDir, "case8");
  fs.mkdirSync(case8Dir, { recursive: true });
  const case8DbPath = path.join(case8Dir, "kupola_db.json");
  const case8StoragePath = path.join(case8Dir, "kupola_storage.json");

  const { db: data8Db, storage: data8Storage } = createBaseSyntheticData();
  // Injeta uma coleção inesperada (não reconhecida) com tipo incompatível
  data8Db.unrecognized_structure = "uma_string_estranha";
  fs.writeFileSync(case8DbPath, JSON.stringify(data8Db, null, 2), "utf-8");
  fs.writeFileSync(case8StoragePath, JSON.stringify(data8Storage, null, 2), "utf-8");

  let blockedUnexpected = false;
  try {
    generateCleanupManifest({
      rootDir: case8Dir,
      dbPath: case8DbPath,
      storagePath: case8StoragePath,
      writeManifest: false,
    });
  } catch (err) {
    if (err.message.includes("estruturas inesperadas detectadas") || err.message.includes("Estrutura desconhecida")) {
      blockedUnexpected = true;
    }
  }
  assert(blockedUnexpected, "Planejador bloqueou com sucesso ao encontrar estrutura de formato inesperado");

  // ============================================================================
  // TESTE 9: REJEIÇÃO DE FALSOS POSITIVOS DE NOMES POR PREFIXO (AMBIGUOUS)
  // ============================================================================
  console.log("\n--- Executando Teste 9: Rejeição de Falsos Positivos por Prefixo ---");
  const falsePositiveNames = [
    "Barbearia Testemunha",
    "Barbearia Alphaville",
    "Barbearia Betamax",
    "Barbearia Xerox",
    "Barbearia Yugoslavia",
    "Barbearia X-Men",
    "Barbearia Testing",
    "Barbearia Testosterona",
    "Testemunha",
    "Testamento",
    "Testar",
    "Org Testemunha",
    "Organization Testamento",
  ];

  const validTestId = "org_1791511054173_svoq";
  for (const name of falsePositiveNames) {
    const classification = classifyOrganization(validTestId, name);
    assert(
      classification.status === "AMBIGUOUS",
      `Falso positivo '${name}' foi classificado como AMBIGUOUS (status obtido: '${classification.status}')`
    );
  }

  // ============================================================================
  // TESTE 10: PRESERVAÇÃO DE CASOS LEGÍTIMOS DE TESTE (TEST_CANDIDATE)
  // ============================================================================
  console.log("\n--- Executando Teste 10: Preservação de Nomes de Teste Válidos ---");
  const legitimateTestNames = [
    "Barbearia Alpha",
    "Barbearia Alpha 54170",
    "Barbearia Alpha 1",
    "Barbearia Beta",
    "Barbearia Beta 10078",
    "Barbearia Beta 2",
    "Barbearia X",
    "Barbearia X 29977",
    "Barbearia Y",
    "Barbearia Y 57296",
    "Barbearia Alfa Persistente",
    "Barbearia Teste",
    "Barbearia Teste 1",
    "Barbearia Teste Alpha 1",
    "Barbearia Test",
    "Barbearia Test 1",
    "Teste 1",
    "Teste",
    "Test 1",
    "Test",
    "Org Test 1",
    "Org Test",
    "Organization Teste 1",
    "Organization Teste",
  ];

  for (const name of legitimateTestNames) {
    const classification = classifyOrganization(validTestId, name);
    assert(
      classification.status === "TEST_CANDIDATE",
      `Nome legítimo de teste '${name}' classificado como TEST_CANDIDATE`
    );
  }

  // ============================================================================
  // TESTE 11: PRECEDÊNCIA ABSOLUTA DA WHITELIST SOBRE PADRÕES DE NOME
  // ============================================================================
  console.log("\n--- Executando Teste 11: Precedência Absoluta da Whitelist ---");
  const whitelistedIds = ["demo_vintage", "org_vintage", "unit_shopping"];
  const suspiciousOrTestNames = [
    "Barbearia Testemunha",
    "Barbearia Alphaville",
    "Barbearia Teste 1",
    "Barbearia Alpha 54170",
    "Qualquer Nome Suspeito",
  ];

  for (const wId of whitelistedIds) {
    for (const name of suspiciousOrTestNames) {
      const classification = classifyOrganization(wId, name);
      assert(
        classification.status === "LEGITIMATE",
        `Entidade da Whitelist '${wId}' com nome '${name}' classificada como LEGITIMATE`
      );
    }
  }

  // ============================================================================
  // TESTE 12: SEGURANÇA DO PLANNER: BLOQUEIO DIANTE DE ORGANIZAÇÃO AMBÍGUA
  // ============================================================================
  console.log("\n--- Executando Teste 12: Segurança do Planner contra Organizações Ambíguas ---");
  const case12Dir = path.join(testDir, "case12");
  fs.mkdirSync(case12Dir, { recursive: true });
  const case12DbPath = path.join(case12Dir, "kupola_db.json");
  const case12StoragePath = path.join(case12Dir, "kupola_storage.json");

  const { db: data12Db, storage: data12Storage } = createBaseSyntheticData();
  // Injeta organização com id sintático válido mas nome de falso positivo por prefixo
  data12Db.barbershops.push({
    id: "org_1791512398817_v9ga",
    name: "Barbearia Alphaville",
  });
  fs.writeFileSync(case12DbPath, JSON.stringify(data12Db, null, 2), "utf-8");
  fs.writeFileSync(case12StoragePath, JSON.stringify(data12Storage, null, 2), "utf-8");

  let blockedAmbiguousOrg = false;
  try {
    generateCleanupManifest({
      rootDir: case12Dir,
      dbPath: case12DbPath,
      storagePath: case12StoragePath,
      writeManifest: false,
    });
  } catch (err) {
    if (err.message.includes("organizações ambíguas sem classificação inequívoca") || err.message.includes("PLANEJAMENTO BLOQUEADO")) {
      blockedAmbiguousOrg = true;
    }
  }
  assert(
    blockedAmbiguousOrg,
    "Planner bloqueia com sucesso e aborta ao detectar organização ambígua ('Barbearia Alphaville')"
  );

  console.log("\n================================================================================");
  console.log("=== RESULTADO: TODOS OS 12 TESTES ISOLADOS PASSARAM COM 100% DE SUCESSO!    ===");
  console.log("================================================================================\n");
} finally {
  // Limpeza de segurança: remove o diretório de testes temporário
  fs.rmSync(testDir, { recursive: true, force: true });
}
