import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { verifyManifestAndRollback, sha256 } from "./verify_manifest_and_rollback.mjs";
import { WHITELISTED_ORGS } from "./plan_reversible_cleanup.mjs";

console.log("================================================================================");
console.log("=== KUPOLA 2.0 — ETAPA C.9: TESTES DE SEGURANÇA E REGRESSÃO DO VERIFICADOR   ===");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Teste ${totalTests}: ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Teste ${totalTests}: ${message}`);
    throw new Error(`Falha de asserção: ${message}`);
  }
}

// Cria ambiente de teste isolado em /tmp
const sandboxBase = path.join(os.tmpdir(), `kupola_c9_test_${Date.now()}`);
fs.mkdirSync(sandboxBase, { recursive: true });

function createBaseFixture(subDir) {
  const dir = path.join(sandboxBase, subDir);
  const dataDir = path.join(dir, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const dbData = {
    barbershops: [
      { id: "demo_vintage", name: "Barbearia Vintage Club Matriz" },
      { id: "org_vintage", name: "Barbearia Vintage Club Filial" },
      { id: "unit_shopping", name: "Vintage Shopping" },
      { id: "org_test_c9_1", name: "Barbearia Teste Alfa C9" },
      { id: "org_test_c9_2", name: "Barbearia Teste Beta C9" },
    ],
    users: [
      { id: "usr_legit_1", name: "Admin Vintage", barbershop_id: "demo_vintage" },
      { id: "usr_cand_1", name: "User Alfa 1", barbershop_id: "org_test_c9_1" },
      { id: "usr_cand_2", name: "User Beta 1", barbershop_id: "org_test_c9_2" },
    ],
    subscriptions: {
      demo_vintage: { plan: "pro", active: true },
      org_vintage: { plan: "enterprise", active: true },
      org_test_c9_1: { plan: "basic", active: false },
      org_test_c9_2: { plan: "starter", active: false },
    },
    settingsMap: {
      demo_vintage: { theme: "dark" },
      org_vintage: { theme: "light" },
      org_test_c9_1: { theme: "test" },
      org_test_c9_2: { theme: "custom" },
    },
  };

  const storageData = {
    organizations: [
      ["demo_vintage", { id: "demo_vintage", name: "Barbearia Vintage Club Matriz" }],
      ["org_vintage", { id: "org_vintage", name: "Barbearia Vintage Club Filial" }],
      ["unit_shopping", { id: "unit_shopping", name: "Vintage Shopping" }],
      ["org_test_c9_1", { id: "org_test_c9_1", name: "Barbearia Teste Alfa C9" }],
      ["org_test_c9_2", { id: "org_test_c9_2", name: "Barbearia Teste Beta C9" }],
    ],
  };

  const dbPath = path.join(dataDir, "kupola_db.json");
  const storagePath = path.join(dataDir, "kupola_storage.json");
  const manifestPath = path.join(dataDir, "cleanup_manifest.json");

  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), "utf8");
  fs.writeFileSync(storagePath, JSON.stringify(storageData, null, 2), "utf8");

  const dbHash = sha256(dbPath);
  const storageHash = sha256(storagePath);

  // Baseline manifest com as 7 ocorrências candidatas reais:
  // db.barbershops[3] (org_test_c9_1), db.barbershops[4] (org_test_c9_2)
  // db.users[1] (usr_cand_1), db.users[2] (usr_cand_2)
  // db.subscriptions.org_test_c9_1, db.subscriptions.org_test_c9_2
  // db.settingsMap.org_test_c9_1, db.settingsMap.org_test_c9_2
  // storage.organizations[3] (org_test_c9_1), storage.organizations[4] (org_test_c9_2)
  const baseManifest = {
    metadata: {
      generatedAt: new Date().toISOString(),
      generator: "kupola-test-c9",
      hashesPreCleanup: {
        "data/kupola_db.json": dbHash,
        "data/kupola_storage.json": storageHash,
      },
    },
    candidateOrgs: [
      { id: "org_test_c9_1", name: "Barbearia Teste Alfa C9" },
      { id: "org_test_c9_2", name: "Barbearia Teste Beta C9" },
    ],
    manifestRecords: [
      {
        id: "org_test_c9_1",
        file: "data/kupola_db.json",
        collection: "barbershops",
        structureType: "array",
        ownerOrgId: "org_test_c9_1",
        physicalPath: "barbershops[3]",
      },
      {
        id: "org_test_c9_2",
        file: "data/kupola_db.json",
        collection: "barbershops",
        structureType: "array",
        ownerOrgId: "org_test_c9_2",
        physicalPath: "barbershops[4]",
      },
      {
        id: "usr_cand_1",
        file: "data/kupola_db.json",
        collection: "users",
        structureType: "array",
        ownerOrgId: "org_test_c9_1",
        physicalPath: "users[1]",
      },
      {
        id: "usr_cand_2",
        file: "data/kupola_db.json",
        collection: "users",
        structureType: "array",
        ownerOrgId: "org_test_c9_2",
        physicalPath: "users[2]",
      },
      {
        id: "org_test_c9_1",
        file: "data/kupola_db.json",
        collection: "subscriptions",
        structureType: "dictionary",
        ownerOrgId: "org_test_c9_1",
        physicalPath: "subscriptions.org_test_c9_1",
      },
      {
        id: "org_test_c9_2",
        file: "data/kupola_db.json",
        collection: "subscriptions",
        structureType: "dictionary",
        ownerOrgId: "org_test_c9_2",
        physicalPath: "subscriptions.org_test_c9_2",
      },
      {
        id: "org_test_c9_1",
        file: "data/kupola_db.json",
        collection: "settingsMap",
        structureType: "dictionary",
        ownerOrgId: "org_test_c9_1",
        physicalPath: "settingsMap.org_test_c9_1",
      },
      {
        id: "org_test_c9_2",
        file: "data/kupola_db.json",
        collection: "settingsMap",
        structureType: "dictionary",
        ownerOrgId: "org_test_c9_2",
        physicalPath: "settingsMap.org_test_c9_2",
      },
      {
        id: "org_test_c9_1",
        file: "data/kupola_storage.json",
        collection: "organizations",
        structureType: "array",
        ownerOrgId: "org_test_c9_1",
        physicalPath: "organizations[3]",
      },
      {
        id: "org_test_c9_2",
        file: "data/kupola_storage.json",
        collection: "organizations",
        structureType: "array",
        ownerOrgId: "org_test_c9_2",
        physicalPath: "organizations[4]",
      },
    ],
  };

  fs.writeFileSync(manifestPath, JSON.stringify(baseManifest, null, 2), "utf8");

  return { dir, dataDir, dbPath, storagePath, manifestPath, dbData, storageData, baseManifest };
}

try {
  // ---------------------------------------------------------------------------
  // TESTE 1: Baseline Válido (Deve ser Aprovado com 0 Falhas)
  // ---------------------------------------------------------------------------
  console.log("--- Executando Teste 1: Baseline Válido ---");
  const f1 = createBaseFixture("case1_baseline");
  const res1 = verifyManifestAndRollback({
    rootDir: f1.dir,
    dbPath: f1.dbPath,
    storagePath: f1.storagePath,
    manifestPath: f1.manifestPath,
  });
  assert(res1.success === true && res1.verdict === "APROVADO", "Baseline sintético válido é aprovado com 0 falhas");

  // ---------------------------------------------------------------------------
  // TESTE 2: Detecção e Bloqueio de Caminhos Físicos Duplicados no Manifesto
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 2: Caminhos Físicos Duplicados no Manifesto ---");
  const f2 = createBaseFixture("case2_dup_phys_path");
  const man2 = JSON.parse(fs.readFileSync(f2.manifestPath, "utf8"));
  // Adiciona duplicata com o MESMO physicalPath: users[1]
  man2.manifestRecords.push({
    id: "usr_cand_1_clone",
    file: "data/kupola_db.json",
    collection: "users",
    structureType: "array",
    ownerOrgId: "org_test_c9_1",
    physicalPath: "users[1]",
  });
  fs.writeFileSync(f2.manifestPath, JSON.stringify(man2, null, 2), "utf8");
  const res2 = verifyManifestAndRollback({
    rootDir: f2.dir,
    dbPath: f2.dbPath,
    storagePath: f2.storagePath,
    manifestPath: f2.manifestPath,
  });
  assert(
    res2.success === false &&
      res2.verdict === "REPROVADO" &&
      res2.failures.some((f) => f.includes("caminhos físicos duplicados no manifesto")),
    "Bloqueia manifesto com caminhos físicos duplicados apontando para a mesma posição"
  );

  // ---------------------------------------------------------------------------
  // TESTE 3: Aceitação de IDs Lógicos Repetidos em Posições Físicas Distintas
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 3: IDs Lógicos Repetidos em Posições Distintas ---");
  const f3 = createBaseFixture("case3_repeated_logical_id");
  // No banco real, adiciona um segundo usuário na mesma organização com ID idêntico mas em users[3]
  f3.dbData.users.push({
    id: "usr_cand_1", // mesmo ID que users[1]
    name: "User Alfa 1 Repetido",
    barbershop_id: "org_test_c9_1",
  });
  fs.writeFileSync(f3.dbPath, JSON.stringify(f3.dbData, null, 2), "utf8");
  const newDb3Hash = sha256(f3.dbPath);

  const man3 = JSON.parse(fs.readFileSync(f3.manifestPath, "utf8"));
  man3.metadata.hashesPreCleanup["data/kupola_db.json"] = newDb3Hash;
  // Catalogar ambas as posições físicas: users[1] e users[3]
  man3.manifestRecords.push({
    id: "usr_cand_1",
    file: "data/kupola_db.json",
    collection: "users",
    structureType: "array",
    ownerOrgId: "org_test_c9_1",
    physicalPath: "users[3]", // posição física distinta
  });
  fs.writeFileSync(f3.manifestPath, JSON.stringify(man3, null, 2), "utf8");

  const res3 = verifyManifestAndRollback({
    rootDir: f3.dir,
    dbPath: f3.dbPath,
    storagePath: f3.storagePath,
    manifestPath: f3.manifestPath,
  });
  assert(
    res3.success === true &&
      res3.verdict === "APROVADO" &&
      res3.metrics.repeatedLogicalCount >= 1,
    "IDs lógicos repetidos em posições físicas distintas são aceitos e identificados pela identidade física correta"
  );

  // ---------------------------------------------------------------------------
  // TESTE 4: Bloqueio de Registro Candidato com Referência a Entidade Protegida em Array do DB
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 4: Referência Semântica a Entidade Protegida no DB Array ---");
  const f4 = createBaseFixture("case4_ref_db_array");
  // O usuário candidato users[1] referencia a whitelist "demo_vintage"
  f4.dbData.users[1].invited_by = "demo_vintage";
  fs.writeFileSync(f4.dbPath, JSON.stringify(f4.dbData, null, 2), "utf8");
  const newDb4Hash = sha256(f4.dbPath);

  const man4 = JSON.parse(fs.readFileSync(f4.manifestPath, "utf8"));
  man4.metadata.hashesPreCleanup["data/kupola_db.json"] = newDb4Hash;
  fs.writeFileSync(f4.manifestPath, JSON.stringify(man4, null, 2), "utf8");

  const res4 = verifyManifestAndRollback({
    rootDir: f4.dir,
    dbPath: f4.dbPath,
    storagePath: f4.storagePath,
    manifestPath: f4.manifestPath,
  });
  assert(
    res4.success === false &&
      res4.verdict === "REPROVADO" &&
      res4.failures.some((f) => f.includes("VIOLAÇÃO CRÍTICA") && f.includes("referência a entidade protegida")),
    "Bloqueia candidato em DB array com referência semântica a entidade protegida da Whitelist"
  );

  // ---------------------------------------------------------------------------
  // TESTE 5: Bloqueio de Referência Semântica a Entidade Protegida em Dicionário do DB
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 5: Referência Semântica no DB Dicionário ---");
  const f5 = createBaseFixture("case5_ref_db_dict");
  f5.dbData.subscriptions.org_test_c9_1.referred_by = "org_vintage";
  fs.writeFileSync(f5.dbPath, JSON.stringify(f5.dbData, null, 2), "utf8");
  const newDb5Hash = sha256(f5.dbPath);

  const man5 = JSON.parse(fs.readFileSync(f5.manifestPath, "utf8"));
  man5.metadata.hashesPreCleanup["data/kupola_db.json"] = newDb5Hash;
  fs.writeFileSync(f5.manifestPath, JSON.stringify(man5, null, 2), "utf8");

  const res5 = verifyManifestAndRollback({
    rootDir: f5.dir,
    dbPath: f5.dbPath,
    storagePath: f5.storagePath,
    manifestPath: f5.manifestPath,
  });
  assert(
    res5.success === false &&
      res5.verdict === "REPROVADO" &&
      res5.failures.some((f) => f.includes("VIOLAÇÃO CRÍTICA") && f.includes("referencia entidade protegida")),
    "Bloqueia candidato em DB dicionário com referência semântica a entidade protegida"
  );

  // ---------------------------------------------------------------------------
  // TESTE 6: Bloqueio de Referência Semântica a Entidade Protegida em Array do Storage
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 6: Referência Semântica no Storage Array ---");
  const f6 = createBaseFixture("case6_ref_storage");
  f6.storageData.organizations[3][1].parent_organization = "unit_shopping";
  fs.writeFileSync(f6.storagePath, JSON.stringify(f6.storageData, null, 2), "utf8");
  const newStorage6Hash = sha256(f6.storagePath);

  const man6 = JSON.parse(fs.readFileSync(f6.manifestPath, "utf8"));
  man6.metadata.hashesPreCleanup["data/kupola_storage.json"] = newStorage6Hash;
  fs.writeFileSync(f6.manifestPath, JSON.stringify(man6, null, 2), "utf8");

  const res6 = verifyManifestAndRollback({
    rootDir: f6.dir,
    dbPath: f6.dbPath,
    storagePath: f6.storagePath,
    manifestPath: f6.manifestPath,
  });
  assert(
    res6.success === false &&
      res6.verdict === "REPROVADO" &&
      res6.failures.some((f) => f.includes("VIOLAÇÃO CRÍTICA") && f.includes("referência a entidade protegida")),
    "Bloqueia candidato em Storage com referência semântica a entidade protegida"
  );

  // ---------------------------------------------------------------------------
  // TESTE 7: Bloqueio de Referência Semântica em Metadados do Próprio Manifesto
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 7: Referência Semântica no Registro do Manifesto ---");
  const f7 = createBaseFixture("case7_ref_in_manifest");
  const man7 = JSON.parse(fs.readFileSync(f7.manifestPath, "utf8"));
  man7.manifestRecords[0].parent_entity = "demo_vintage";
  fs.writeFileSync(f7.manifestPath, JSON.stringify(man7, null, 2), "utf8");

  const res7 = verifyManifestAndRollback({
    rootDir: f7.dir,
    dbPath: f7.dbPath,
    storagePath: f7.storagePath,
    manifestPath: f7.manifestPath,
  });
  assert(
    res7.success === false &&
      res7.verdict === "REPROVADO" &&
      res7.failures.some((f) => f.includes("VIOLAÇÃO CRÍTICA DA WHITELIST") && f.includes("referenciam entidades protegidas")),
    "Bloqueia registro de manifesto que contenha propriedade referenciando entidade protegida"
  );

  // ---------------------------------------------------------------------------
  // TESTE 8: Bloqueio de Caminho Físico Conflitante / Sintaxe Malformada
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 8: Sintaxe de physicalPath Malformada ---");
  const f8 = createBaseFixture("case8_malformed_path");
  const man8 = JSON.parse(fs.readFileSync(f8.manifestPath, "utf8"));
  man8.manifestRecords[2].physicalPath = "users[invalid_index]";
  fs.writeFileSync(f8.manifestPath, JSON.stringify(man8, null, 2), "utf8");

  const res8 = verifyManifestAndRollback({
    rootDir: f8.dir,
    dbPath: f8.dbPath,
    storagePath: f8.storagePath,
    manifestPath: f8.manifestPath,
  });
  assert(
    res8.success === false &&
      res8.verdict === "REPROVADO" &&
      res8.failures.some((f) => f.includes("Caminho físico inválido")),
    "Bloqueia manifesto com sintaxe malformada de physicalPath"
  );

  // ---------------------------------------------------------------------------
  // TESTE 9: Bloqueio de Conflito entre physicalPath e Coleção Declarada
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 9: physicalPath Incompatível com a Coleção ---");
  const f9 = createBaseFixture("case9_col_mismatch");
  const man9 = JSON.parse(fs.readFileSync(f9.manifestPath, "utf8"));
  // collection = "users", mas physicalPath aponta para "barbershops[1]"
  man9.manifestRecords[2].physicalPath = "barbershops[1]";
  fs.writeFileSync(f9.manifestPath, JSON.stringify(man9, null, 2), "utf8");

  const res9 = verifyManifestAndRollback({
    rootDir: f9.dir,
    dbPath: f9.dbPath,
    storagePath: f9.storagePath,
    manifestPath: f9.manifestPath,
  });
  assert(
    res9.success === false &&
      res9.verdict === "REPROVADO" &&
      res9.failures.some((f) => f.includes("Caminho físico inválido")),
    "Bloqueia manifesto com conflito de coleção entre physicalPath e collection"
  );

  // ---------------------------------------------------------------------------
  // TESTE 10: Bloqueio de physicalPath com Índice Fora dos Limites (Out of Bounds)
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 10: physicalPath com Índice Fora dos Limites ---");
  const f10 = createBaseFixture("case10_out_of_bounds");
  const man10 = JSON.parse(fs.readFileSync(f10.manifestPath, "utf8"));
  man10.manifestRecords[2].physicalPath = "users[999]";
  fs.writeFileSync(f10.manifestPath, JSON.stringify(man10, null, 2), "utf8");

  const res10 = verifyManifestAndRollback({
    rootDir: f10.dir,
    dbPath: f10.dbPath,
    storagePath: f10.storagePath,
    manifestPath: f10.manifestPath,
  });
  assert(
    res10.success === false &&
      res10.verdict === "REPROVADO" &&
      res10.failures.some((f) => f.includes("Caminho físico inexistente") && f.includes("fora dos limites")),
    "Bloqueia manifesto com physicalPath apontando para índice inexistente"
  );

  // ---------------------------------------------------------------------------
  // TESTE 11: Bloqueio de physicalPath com Inconsistência de ID
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 11: physicalPath com ID Divergente ---");
  const f11 = createBaseFixture("case11_id_mismatch");
  const man11 = JSON.parse(fs.readFileSync(f11.manifestPath, "utf8"));
  // rec.id é usr_fake, mas em users[1] o id real é usr_cand_1
  man11.manifestRecords[2].id = "usr_fake_adulterado";
  fs.writeFileSync(f11.manifestPath, JSON.stringify(man11, null, 2), "utf8");

  const res11 = verifyManifestAndRollback({
    rootDir: f11.dir,
    dbPath: f11.dbPath,
    storagePath: f11.storagePath,
    manifestPath: f11.manifestPath,
  });
  assert(
    res11.success === false &&
      res11.verdict === "REPROVADO" &&
      res11.failures.some((f) => f.includes("Inconsistência de caminho físico") && f.includes("ID diferente")),
    "Bloqueia manifesto onde o ID no physicalPath difere do ID declarado no manifesto"
  );

  // ---------------------------------------------------------------------------
  // TESTE 12: Bloqueio de physicalPath com Inconsistência de Tenant/OwnerOrgId
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 12: Inconsistência de ownerOrgId ---");
  const f12 = createBaseFixture("case12_owner_mismatch");
  const man12 = JSON.parse(fs.readFileSync(f12.manifestPath, "utf8"));
  // rec.ownerOrgId adulterado para org_test_c9_2, mas users[1] pertence a org_test_c9_1
  man12.manifestRecords[2].ownerOrgId = "org_test_c9_2";
  fs.writeFileSync(f12.manifestPath, JSON.stringify(man12, null, 2), "utf8");

  const res12 = verifyManifestAndRollback({
    rootDir: f12.dir,
    dbPath: f12.dbPath,
    storagePath: f12.storagePath,
    manifestPath: f12.manifestPath,
  });
  assert(
    res12.success === false &&
      res12.verdict === "REPROVADO" &&
      res12.failures.some((f) => f.includes("Inconsistência de ownerOrgId")),
    "Bloqueia manifesto com divergência de ownerOrgId entre declarado e fonte real"
  );

  // ---------------------------------------------------------------------------
  // TESTE 13: Bloqueio de Registro Extra no Manifesto Apontando para Registro Não Candidato
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 13: Registro Extra Não Candidato ---");
  const f13 = createBaseFixture("case13_extra_non_candidate");
  const man13 = JSON.parse(fs.readFileSync(f13.manifestPath, "utf8"));
  // Adiciona users[0], que pertence a demo_vintage (protegido)
  man13.manifestRecords.push({
    id: "usr_legit_1",
    file: "data/kupola_db.json",
    collection: "users",
    structureType: "array",
    ownerOrgId: "demo_vintage",
    physicalPath: "users[0]",
  });
  fs.writeFileSync(f13.manifestPath, JSON.stringify(man13, null, 2), "utf8");

  const res13 = verifyManifestAndRollback({
    rootDir: f13.dir,
    dbPath: f13.dbPath,
    storagePath: f13.storagePath,
    manifestPath: f13.manifestPath,
  });
  assert(
    res13.success === false &&
      res13.verdict === "REPROVADO" &&
      res13.failures.some((f) => f.includes("VIOLAÇÃO CRÍTICA")),
    "Bloqueia manifesto com registro extra apontando para entidade protegida da Whitelist"
  );

  // ---------------------------------------------------------------------------
  // TESTE 14: Bloqueio de Registro no Manifesto com physicalPath Ausente / Nulo
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 14: physicalPath Ausente no Manifesto ---");
  const f14 = createBaseFixture("case14_missing_path");
  const man14 = JSON.parse(fs.readFileSync(f14.manifestPath, "utf8"));
  delete man14.manifestRecords[2].physicalPath;
  fs.writeFileSync(f14.manifestPath, JSON.stringify(man14, null, 2), "utf8");

  const res14 = verifyManifestAndRollback({
    rootDir: f14.dir,
    dbPath: f14.dbPath,
    storagePath: f14.storagePath,
    manifestPath: f14.manifestPath,
  });
  assert(
    res14.success === false &&
      res14.verdict === "REPROVADO" &&
      res14.failures.some((f) => f.includes("sem physicalPath válido")),
    "Bloqueia manifesto quando registro possui physicalPath ausente ou nulo"
  );

  // ---------------------------------------------------------------------------
  // TESTE 15: Bloqueio de Entidade Whitelisted em candidateOrgs
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 15: Entidade Whitelisted em candidateOrgs ---");
  const f15 = createBaseFixture("case15_whitelist_in_cand");
  const man15 = JSON.parse(fs.readFileSync(f15.manifestPath, "utf8"));
  man15.candidateOrgs.push({ id: "demo_vintage", name: "Barbearia Vintage Club Matriz" });
  fs.writeFileSync(f15.manifestPath, JSON.stringify(man15, null, 2), "utf8");

  const res15 = verifyManifestAndRollback({
    rootDir: f15.dir,
    dbPath: f15.dbPath,
    storagePath: f15.storagePath,
    manifestPath: f15.manifestPath,
  });
  assert(
    res15.success === false &&
      res15.verdict === "REPROVADO" &&
      res15.failures.some((f) => f.includes("VIOLAÇÃO CRÍTICA: Entidade protegida da Whitelist (demo_vintage)")),
    "Bloqueia inclusão de organização protegida na lista de candidateOrgs"
  );

  console.log("\n================================================================================");
  console.log(`=== RESULTADO C.9: TODOS OS ${passedTests}/${totalTests} TESTES FORAM APROVADOS COM SUCESSO! ===`);
  console.log("================================================================================\n");
} finally {
  fs.rmSync(sandboxBase, { recursive: true, force: true });
}
