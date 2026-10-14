import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { verifyManifestAndRollback, sha256 } from "./verify_manifest_and_rollback.mjs";

console.log("===================================================================================");
console.log("=== KUPOLA 2.0 — ETAPA C.5: TESTES NEGATIVOS E AUDITORIA DE COBERTURA           ===");
console.log("===================================================================================\n");

let passedCount = 0;
let totalCount = 0;

function assertTest(condition, testId, testName, expectedSummary, observedSummary) {
  totalCount++;
  console.log(`\n--- [TESTE ${testId}] ${testName} ---`);
  console.log(`  Esperado:  ${expectedSummary}`);
  console.log(`  Observado: ${observedSummary}`);
  if (condition) {
    console.log(`  [SITUAÇÃO]: APROVADO`);
    passedCount++;
  } else {
    console.error(`  [SITUAÇÃO]: REPROVADO`);
    throw new Error(`Falha no teste ${testId}: ${testName}`);
  }
}

// Sandbox isolada em diretório temporário exclusivo
const sandboxRoot = path.join(os.tmpdir(), `kupola_test_c5_${Date.now()}`);
fs.mkdirSync(sandboxRoot, { recursive: true });

try {
  // Helper para criar fixture sintética com 3 organizações candidatas e 1 protegida
  function createReferenceFixture(subDir) {
    const envDir = path.join(sandboxRoot, subDir);
    const dataDir = path.join(envDir, "data");
    fs.mkdirSync(dataDir, { recursive: true });

    const dbPath = path.join(dataDir, "kupola_db.json");
    const storagePath = path.join(dataDir, "kupola_storage.json");
    const manifestPath = path.join(dataDir, "cleanup_manifest.json");

    const candidateOrgs = [
      { id: "org_test_c5_1", name: "Barbearia Teste Alpha 1" },
      { id: "org_test_c5_2", name: "Barbearia Teste Beta 2" },
      { id: "org_test_c5_3", name: "Barbearia Teste Gama 3" },
    ];

    const dbObj = {
      barbershops: [
        { id: "demo_vintage", name: "Barbearia Vintage Club" },
        ...candidateOrgs,
      ],
      users: [
        { id: "usr_vintage", organization_id: "demo_vintage", name: "Admin Vintage" },
        { id: "usr_c5_1", organization_id: "org_test_c5_1", name: "User 1" },
        { id: "usr_c5_2", organization_id: "org_test_c5_2", name: "User 2" },
        { id: "usr_c5_3", organization_id: "org_test_c5_3", name: "User 3" },
      ],
      subscriptions: {
        demo_vintage: { plan: "enterprise", status: "active" },
        org_test_c5_1: { plan: "trial", status: "active" },
        org_test_c5_2: { plan: "pro", status: "active" },
        org_test_c5_3: { plan: "basic", status: "canceled" },
      },
      settingsMap: {
        demo_vintage: { theme: "dark", notifications: true },
        org_test_c5_1: { theme: "light", notifications: false },
        org_test_c5_2: { theme: "dark", notifications: false },
        org_test_c5_3: { theme: "light", notifications: true },
      },
    };

    const storageObj = {
      organizations: [
        ["org_vintage", { name: "Barbearia Vintage Club" }],
        ["org_test_c5_1", { name: "Barbearia Teste Alpha 1" }],
        ["org_test_c5_2", { name: "Barbearia Teste Beta 2" }],
        ["org_test_c5_3", { name: "Barbearia Teste Gama 3" }],
      ],
      users: [
        ["usr_vintage", { organization_id: "org_vintage" }],
        ["usr_c5_1", { organization_id: "org_test_c5_1" }],
        ["usr_c5_2", { organization_id: "org_test_c5_2" }],
        ["usr_c5_3", { organization_id: "org_test_c5_3" }],
      ],
    };

    fs.writeFileSync(dbPath, JSON.stringify(dbObj, null, 2), "utf-8");
    fs.writeFileSync(storagePath, JSON.stringify(storageObj, null, 2), "utf-8");

    const dbHash = sha256(dbPath);
    const storageHash = sha256(storagePath);

    const manifestObj = {
      metadata: {
        generatedAt: new Date().toISOString(),
        status: "PLANNED_READ_ONLY",
        hashesPreCleanup: {
          "data/kupola_db.json": dbHash,
          "data/kupola_storage.json": storageHash,
        },
      },
      candidateOrgs: candidateOrgs.map((o) => ({ id: o.id })),
      manifestRecords: [
        // Array records
        {
          id: "usr_c5_1",
          file: "data/kupola_db.json",
          collection: "users",
          structureType: "array",
          entityType: "collection_record",
          ownerOrgId: "org_test_c5_1",
          physicalPath: "users[1]",
        },
        {
          id: "usr_c5_2",
          file: "data/kupola_db.json",
          collection: "users",
          structureType: "array",
          entityType: "collection_record",
          ownerOrgId: "org_test_c5_2",
          physicalPath: "users[2]",
        },
        {
          id: "usr_c5_3",
          file: "data/kupola_db.json",
          collection: "users",
          structureType: "array",
          entityType: "collection_record",
          ownerOrgId: "org_test_c5_3",
          physicalPath: "users[3]",
        },
        // subscriptions records
        {
          id: "org_test_c5_1",
          key: "org_test_c5_1",
          file: "data/kupola_db.json",
          collection: "subscriptions",
          structureType: "dictionary",
          entityType: "organization_setting_entry",
          ownerOrgId: "org_test_c5_1",
          physicalPath: "subscriptions.org_test_c5_1",
        },
        {
          id: "org_test_c5_2",
          key: "org_test_c5_2",
          file: "data/kupola_db.json",
          collection: "subscriptions",
          structureType: "dictionary",
          entityType: "organization_setting_entry",
          ownerOrgId: "org_test_c5_2",
          physicalPath: "subscriptions.org_test_c5_2",
        },
        {
          id: "org_test_c5_3",
          key: "org_test_c5_3",
          file: "data/kupola_db.json",
          collection: "subscriptions",
          structureType: "dictionary",
          entityType: "organization_setting_entry",
          ownerOrgId: "org_test_c5_3",
          physicalPath: "subscriptions.org_test_c5_3",
        },
        // settingsMap records
        {
          id: "org_test_c5_1",
          key: "org_test_c5_1",
          file: "data/kupola_db.json",
          collection: "settingsMap",
          structureType: "dictionary",
          entityType: "organization_setting_entry",
          ownerOrgId: "org_test_c5_1",
          physicalPath: "settingsMap.org_test_c5_1",
        },
        {
          id: "org_test_c5_2",
          key: "org_test_c5_2",
          file: "data/kupola_db.json",
          collection: "settingsMap",
          structureType: "dictionary",
          entityType: "organization_setting_entry",
          ownerOrgId: "org_test_c5_2",
          physicalPath: "settingsMap.org_test_c5_2",
        },
        {
          id: "org_test_c5_3",
          key: "org_test_c5_3",
          file: "data/kupola_db.json",
          collection: "settingsMap",
          structureType: "dictionary",
          entityType: "organization_setting_entry",
          ownerOrgId: "org_test_c5_3",
          physicalPath: "settingsMap.org_test_c5_3",
        },
      ],
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2), "utf-8");

    return { envDir, dataDir, dbPath, storagePath, manifestPath, dbObj, storageObj, manifestObj };
  }

  // ---------------------------------------------------------------------------
  // TESTE D.0: Referência Positiva Inicial (Baseline Válido Deve Passar com 0 Falhas)
  // ---------------------------------------------------------------------------
  const ref0 = createReferenceFixture("env_d0");
  const res0 = verifyManifestAndRollback({
    rootDir: ref0.envDir,
    dbPath: ref0.dbPath,
    storagePath: ref0.storagePath,
    manifestPath: ref0.manifestPath,
  });
  assertTest(
    res0.success === true && res0.verdict === "APROVADO" && res0.failures.length === 0,
    "D.0",
    "Baseline de Referência Positiva",
    "Sucesso=true, Veredito=APROVADO, Falhas=0",
    `Sucesso=${res0.success}, Veredito=${res0.verdict}, Falhas=${res0.failures.length}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.1: Omissão Parcial em "subscriptions" (remove 1 de 3)
  // ---------------------------------------------------------------------------
  const ref1 = createReferenceFixture("env_d1");
  // Remover org_test_c5_2 de subscriptions em manifestRecords
  ref1.manifestObj.manifestRecords = ref1.manifestObj.manifestRecords.filter(
    (r) => !(r.collection === "subscriptions" && (r.id === "org_test_c5_2" || r.key === "org_test_c5_2"))
  );
  fs.writeFileSync(ref1.manifestPath, JSON.stringify(ref1.manifestObj, null, 2), "utf-8");
  const res1 = verifyManifestAndRollback({
    rootDir: ref1.envDir,
    dbPath: ref1.dbPath,
    storagePath: ref1.storagePath,
    manifestPath: ref1.manifestPath,
  });
  const hasSpecificD1 = res1.failures.some(
    (f) => f.includes("subscriptions") && f.includes("org_test_c5_2") && f.includes("ausente")
  );
  const hasSummaryD1 = res1.failures.some(
    (f) => f.includes("omite 1 propriedades candidatas em 'subscriptions'")
  );
  assertTest(
    res1.success === false && res1.verdict === "REPROVADO" && hasSpecificD1 && hasSummaryD1,
    "D.1",
    "Omissão Parcial em subscriptions (1 de 3 entradas candidatas removida)",
    "Reprovação com identificação de 'subscriptions', 'org_test_c5_2' ausente e resumo 'omite 1 propriedades'",
    `Sucesso=${res1.success}, Veredito=${res1.verdict}, Diagnóstico Específico=${hasSpecificD1}, Resumo=${hasSummaryD1}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.2: Omissão Parcial em "settingsMap" (remove 1 de 3)
  // ---------------------------------------------------------------------------
  const ref2 = createReferenceFixture("env_d2");
  // Remover org_test_c5_3 de settingsMap em manifestRecords
  ref2.manifestObj.manifestRecords = ref2.manifestObj.manifestRecords.filter(
    (r) => !(r.collection === "settingsMap" && (r.id === "org_test_c5_3" || r.key === "org_test_c5_3"))
  );
  fs.writeFileSync(ref2.manifestPath, JSON.stringify(ref2.manifestObj, null, 2), "utf-8");
  const res2 = verifyManifestAndRollback({
    rootDir: ref2.envDir,
    dbPath: ref2.dbPath,
    storagePath: ref2.storagePath,
    manifestPath: ref2.manifestPath,
  });
  const hasSpecificD2 = res2.failures.some(
    (f) => f.includes("settingsMap") && f.includes("org_test_c5_3") && f.includes("ausente")
  );
  const hasSummaryD2 = res2.failures.some(
    (f) => f.includes("omite 1 propriedades candidatas em 'settingsMap'")
  );
  assertTest(
    res2.success === false && res2.verdict === "REPROVADO" && hasSpecificD2 && hasSummaryD2,
    "D.2",
    "Omissão Parcial em settingsMap (1 de 3 entradas candidatas removida)",
    "Reprovação com identificação de 'settingsMap', 'org_test_c5_3' ausente e resumo 'omite 1 propriedades'",
    `Sucesso=${res2.success}, Veredito=${res2.verdict}, Diagnóstico Específico=${hasSpecificD2}, Resumo=${hasSummaryD2}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.3a: Omissão Total em "subscriptions" (remove 3 de 3)
  // ---------------------------------------------------------------------------
  const ref3a = createReferenceFixture("env_d3a");
  ref3a.manifestObj.manifestRecords = ref3a.manifestObj.manifestRecords.filter(
    (r) => r.collection !== "subscriptions"
  );
  fs.writeFileSync(ref3a.manifestPath, JSON.stringify(ref3a.manifestObj, null, 2), "utf-8");
  const res3a = verifyManifestAndRollback({
    rootDir: ref3a.envDir,
    dbPath: ref3a.dbPath,
    storagePath: ref3a.storagePath,
    manifestPath: ref3a.manifestPath,
  });
  const hasSummaryD3a = res3a.failures.some(
    (f) => f.includes("omite 3 propriedades candidatas em 'subscriptions'")
  );
  assertTest(
    res3a.success === false && res3a.verdict === "REPROVADO" && hasSummaryD3a,
    "D.3a",
    "Omissão Total em subscriptions (todas as 3 entradas omitidas)",
    "Reprovação com diagnóstico 'omite 3 propriedades candidatas em subscriptions'",
    `Sucesso=${res3a.success}, Veredito=${res3a.verdict}, Resumo=${hasSummaryD3a}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.3b: Omissão Total em "settingsMap" (remove 3 de 3)
  // ---------------------------------------------------------------------------
  const ref3b = createReferenceFixture("env_d3b");
  ref3b.manifestObj.manifestRecords = ref3b.manifestObj.manifestRecords.filter(
    (r) => r.collection !== "settingsMap"
  );
  fs.writeFileSync(ref3b.manifestPath, JSON.stringify(ref3b.manifestObj, null, 2), "utf-8");
  const res3b = verifyManifestAndRollback({
    rootDir: ref3b.envDir,
    dbPath: ref3b.dbPath,
    storagePath: ref3b.storagePath,
    manifestPath: ref3b.manifestPath,
  });
  const hasSummaryD3b = res3b.failures.some(
    (f) => f.includes("omite 3 propriedades candidatas em 'settingsMap'")
  );
  assertTest(
    res3b.success === false && res3b.verdict === "REPROVADO" && hasSummaryD3b,
    "D.3b",
    "Omissão Total em settingsMap (todas as 3 entradas omitidas)",
    "Reprovação com diagnóstico 'omite 3 propriedades candidatas em settingsMap'",
    `Sucesso=${res3b.success}, Veredito=${res3b.verdict}, Resumo=${hasSummaryD3b}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.4: Entradas Extras no Manifesto (chave não existe na fonte)
  // ---------------------------------------------------------------------------
  const ref4 = createReferenceFixture("env_d4");
  ref4.manifestObj.manifestRecords.push({
    id: "org_extra_fantasma",
    key: "org_extra_fantasma",
    file: "data/kupola_db.json",
    collection: "subscriptions",
    structureType: "dictionary",
    entityType: "organization_setting_entry",
    ownerOrgId: "org_extra_fantasma",
    physicalPath: "subscriptions.org_extra_fantasma",
  });
  fs.writeFileSync(ref4.manifestPath, JSON.stringify(ref4.manifestObj, null, 2), "utf-8");
  const res4 = verifyManifestAndRollback({
    rootDir: ref4.envDir,
    dbPath: ref4.dbPath,
    storagePath: ref4.storagePath,
    manifestPath: ref4.manifestPath,
  });
  const hasExtraError = res4.failures.some(
    (f) => f.includes("Registro inexistente ou indevido") && f.includes("org_extra_fantasma")
  );
  assertTest(
    res4.success === false && res4.verdict === "REPROVADO" && hasExtraError,
    "D.4",
    "Entrada Extra no Manifesto para Dicionário",
    "Reprovação com diagnóstico 'Registro inexistente ou indevido no manifesto para subscriptions'",
    `Sucesso=${res4.success}, Veredito=${res4.verdict}, Diagnóstico=${hasExtraError}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.5: Duplicidade Controlada de Chave no Manifesto
  // ---------------------------------------------------------------------------
  const ref5 = createReferenceFixture("env_d5");
  // Clonar entrada de subscriptions.org_test_c5_1
  ref5.manifestObj.manifestRecords.push({
    id: "org_test_c5_1",
    key: "org_test_c5_1",
    file: "data/kupola_db.json",
    collection: "subscriptions",
    structureType: "dictionary",
    entityType: "organization_setting_entry",
    ownerOrgId: "org_test_c5_1",
    physicalPath: "subscriptions.org_test_c5_1",
  });
  fs.writeFileSync(ref5.manifestPath, JSON.stringify(ref5.manifestObj, null, 2), "utf-8");
  const res5 = verifyManifestAndRollback({
    rootDir: ref5.envDir,
    dbPath: ref5.dbPath,
    storagePath: ref5.storagePath,
    manifestPath: ref5.manifestPath,
  });
  const hasDupError = res5.failures.some(
    (f) => f.includes("Registro duplicado no manifesto para o dicionário 'subscriptions'")
  );
  assertTest(
    res5.success === false && res5.verdict === "REPROVADO" && hasDupError,
    "D.5",
    "Duplicidade de Entrada no Manifesto",
    "Reprovação com diagnóstico 'Registro duplicado no manifesto para o dicionário subscriptions'",
    `Sucesso=${res5.success}, Veredito=${res5.verdict}, Diagnóstico=${hasDupError}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.6a: Metadado Físico Incorreto - file
  // ---------------------------------------------------------------------------
  const ref6a = createReferenceFixture("env_d6a");
  const subIdx6a = ref6a.manifestObj.manifestRecords.findIndex(
    (r) => r.collection === "subscriptions" && r.id === "org_test_c5_1"
  );
  ref6a.manifestObj.manifestRecords[subIdx6a].file = "data/outro_arquivo.json";
  fs.writeFileSync(ref6a.manifestPath, JSON.stringify(ref6a.manifestObj, null, 2), "utf-8");
  const res6a = verifyManifestAndRollback({
    rootDir: ref6a.envDir,
    dbPath: ref6a.dbPath,
    storagePath: ref6a.storagePath,
    manifestPath: ref6a.manifestPath,
  });
  const hasFileError = res6a.failures.some((f) => f.includes("Inconsistência de arquivo"));
  assertTest(
    res6a.success === false && res6a.verdict === "REPROVADO" && hasFileError,
    "D.6a",
    "Metadado Físico Incorreto: file",
    "Reprovação com diagnóstico 'Inconsistência de arquivo para chave'",
    `Sucesso=${res6a.success}, Veredito=${res6a.verdict}, Diagnóstico=${hasFileError}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.6b: Metadado Físico Incorreto - structureType
  // ---------------------------------------------------------------------------
  const ref6b = createReferenceFixture("env_d6b");
  const subIdx6b = ref6b.manifestObj.manifestRecords.findIndex(
    (r) => r.collection === "subscriptions" && r.id === "org_test_c5_1"
  );
  ref6b.manifestObj.manifestRecords[subIdx6b].structureType = "array";
  fs.writeFileSync(ref6b.manifestPath, JSON.stringify(ref6b.manifestObj, null, 2), "utf-8");
  const res6b = verifyManifestAndRollback({
    rootDir: ref6b.envDir,
    dbPath: ref6b.dbPath,
    storagePath: ref6b.storagePath,
    manifestPath: ref6b.manifestPath,
  });
  const hasStructError = res6b.failures.some((f) => f.includes("Inconsistência de structureType"));
  assertTest(
    res6b.success === false && res6b.verdict === "REPROVADO" && hasStructError,
    "D.6b",
    "Metadado Físico Incorreto: structureType",
    "Reprovação com diagnóstico 'Inconsistência de structureType para chave'",
    `Sucesso=${res6b.success}, Veredito=${res6b.verdict}, Diagnóstico=${hasStructError}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.6c: Metadado Físico Incorreto - ownerOrgId
  // ---------------------------------------------------------------------------
  const ref6c = createReferenceFixture("env_d6c");
  const subIdx6c = ref6c.manifestObj.manifestRecords.findIndex(
    (r) => r.collection === "subscriptions" && r.id === "org_test_c5_1"
  );
  ref6c.manifestObj.manifestRecords[subIdx6c].ownerOrgId = "org_alien";
  fs.writeFileSync(ref6c.manifestPath, JSON.stringify(ref6c.manifestObj, null, 2), "utf-8");
  const res6c = verifyManifestAndRollback({
    rootDir: ref6c.envDir,
    dbPath: ref6c.dbPath,
    storagePath: ref6c.storagePath,
    manifestPath: ref6c.manifestPath,
  });
  const hasOwnerError = res6c.failures.some((f) => f.includes("Inconsistência de ownerOrgId"));
  assertTest(
    res6c.success === false && res6c.verdict === "REPROVADO" && hasOwnerError,
    "D.6c",
    "Metadado Físico Incorreto: ownerOrgId",
    "Reprovação com diagnóstico 'Inconsistência de ownerOrgId para chave'",
    `Sucesso=${res6c.success}, Veredito=${res6c.verdict}, Diagnóstico=${hasOwnerError}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.6d: Metadado Físico Incorreto - physicalPath
  // ---------------------------------------------------------------------------
  const ref6d = createReferenceFixture("env_d6d");
  const subIdx6d = ref6d.manifestObj.manifestRecords.findIndex(
    (r) => r.collection === "subscriptions" && r.id === "org_test_c5_1"
  );
  ref6d.manifestObj.manifestRecords[subIdx6d].physicalPath = "caminho_adulterado.prop";
  fs.writeFileSync(ref6d.manifestPath, JSON.stringify(ref6d.manifestObj, null, 2), "utf-8");
  const res6d = verifyManifestAndRollback({
    rootDir: ref6d.envDir,
    dbPath: ref6d.dbPath,
    storagePath: ref6d.storagePath,
    manifestPath: ref6d.manifestPath,
  });
  const hasPathError = res6d.failures.some((f) => f.includes("Inconsistência de physicalPath"));
  assertTest(
    res6d.success === false && res6d.verdict === "REPROVADO" && hasPathError,
    "D.6d",
    "Metadado Físico Incorreto: physicalPath",
    "Reprovação com diagnóstico 'Inconsistência de physicalPath para chave'",
    `Sucesso=${res6d.success}, Veredito=${res6d.verdict}, Diagnóstico=${hasPathError}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.7a: Classificação Incorreta - Entidade protegida na lista de candidatos
  // ---------------------------------------------------------------------------
  const ref7a = createReferenceFixture("env_d7a");
  ref7a.manifestObj.candidateOrgs.push({ id: "demo_vintage" });
  fs.writeFileSync(ref7a.manifestPath, JSON.stringify(ref7a.manifestObj, null, 2), "utf-8");
  const res7a = verifyManifestAndRollback({
    rootDir: ref7a.envDir,
    dbPath: ref7a.dbPath,
    storagePath: ref7a.storagePath,
    manifestPath: ref7a.manifestPath,
  });
  const hasWhitelistViolation = res7a.failures.some((f) => f.includes("VIOLAÇÃO CRÍTICA: Entidade protegida"));
  assertTest(
    res7a.success === false && res7a.verdict === "REPROVADO" && hasWhitelistViolation,
    "D.7a",
    "Classificação Incorreta: Entidade protegida (demo_vintage) incluída em candidateOrgs",
    "Reprovação com 'VIOLAÇÃO CRÍTICA: Entidade protegida da Whitelist'",
    `Sucesso=${res7a.success}, Veredito=${res7a.verdict}, Diagnóstico=${hasWhitelistViolation}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.7b: Classificação Incorreta - Organização candidata omitida da classificação
  // ---------------------------------------------------------------------------
  const ref7b = createReferenceFixture("env_d7b");
  ref7b.manifestObj.candidateOrgs = ref7b.manifestObj.candidateOrgs.filter(
    (o) => o.id !== "org_test_c5_1"
  );
  fs.writeFileSync(ref7b.manifestPath, JSON.stringify(ref7b.manifestObj, null, 2), "utf-8");
  const res7b = verifyManifestAndRollback({
    rootDir: ref7b.envDir,
    dbPath: ref7b.dbPath,
    storagePath: ref7b.storagePath,
    manifestPath: ref7b.manifestPath,
  });
  const hasOmissionInCandidateOrgs = res7b.failures.some(
    (f) => f.includes("AUSENTE de 'candidateOrgs' no manifesto") && f.includes("org_test_c5_1")
  );
  assertTest(
    res7b.success === false && res7b.verdict === "REPROVADO" && hasOmissionInCandidateOrgs,
    "D.7b",
    "Classificação Incorreta: Organização candidata comprovada omitida de candidateOrgs",
    "Reprovação com 'Organização candidata comprovada nas fontes reais está AUSENTE de candidateOrgs'",
    `Sucesso=${res7b.success}, Veredito=${res7b.verdict}, Diagnóstico=${hasOmissionInCandidateOrgs}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.7c: Classificação Incorreta - Organização sem evidência nas fontes reais
  // ---------------------------------------------------------------------------
  const ref7c = createReferenceFixture("env_d7c");
  ref7c.manifestObj.candidateOrgs.push({ id: "org_test_fantasma" });
  fs.writeFileSync(ref7c.manifestPath, JSON.stringify(ref7c.manifestObj, null, 2), "utf-8");
  const res7c = verifyManifestAndRollback({
    rootDir: ref7c.envDir,
    dbPath: ref7c.dbPath,
    storagePath: ref7c.storagePath,
    manifestPath: ref7c.manifestPath,
  });
  const hasNoEvidenceError = res7c.failures.some(
    (f) => f.includes("sem evidência positiva suficiente nas fontes reais") && f.includes("org_test_fantasma")
  );
  assertTest(
    res7c.success === false && res7c.verdict === "REPROVADO" && hasNoEvidenceError,
    "D.7c",
    "Classificação Incorreta: Organização sem evidência positiva nas fontes",
    "Reprovação com 'sem evidência positiva suficiente nas fontes reais'",
    `Sucesso=${res7c.success}, Veredito=${res7c.verdict}, Diagnóstico=${hasNoEvidenceError}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.8a: Hash Divergente Exclusivamente em DB
  // ---------------------------------------------------------------------------
  const ref8a = createReferenceFixture("env_d8a");
  // Alterar DB sem atualizar hash
  const dbObj8a = JSON.parse(fs.readFileSync(ref8a.dbPath, "utf-8"));
  dbObj8a.tampered = true;
  fs.writeFileSync(ref8a.dbPath, JSON.stringify(dbObj8a, null, 2), "utf-8");
  const res8a = verifyManifestAndRollback({
    rootDir: ref8a.envDir,
    dbPath: ref8a.dbPath,
    storagePath: ref8a.storagePath,
    manifestPath: ref8a.manifestPath,
  });
  assertTest(
    res8a.success === false &&
      res8a.verdict === "REPROVADO" &&
      res8a.hashes.isDbMatch === false &&
      res8a.hashes.isStorageMatch === true,
    "D.8a",
    "Divergência Criptográfica Exclusiva em kupola_db.json",
    "Reprovação com isDbMatch=false e isStorageMatch=true",
    `Sucesso=${res8a.success}, Veredito=${res8a.verdict}, isDbMatch=${res8a.hashes.isDbMatch}, isStorageMatch=${res8a.hashes.isStorageMatch}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.8b: Hash Divergente Exclusivamente em Storage
  // ---------------------------------------------------------------------------
  const ref8b = createReferenceFixture("env_d8b");
  // Alterar Storage sem atualizar hash
  const stObj8b = JSON.parse(fs.readFileSync(ref8b.storagePath, "utf-8"));
  stObj8b.tampered = true;
  fs.writeFileSync(ref8b.storagePath, JSON.stringify(stObj8b, null, 2), "utf-8");
  const res8b = verifyManifestAndRollback({
    rootDir: ref8b.envDir,
    dbPath: ref8b.dbPath,
    storagePath: ref8b.storagePath,
    manifestPath: ref8b.manifestPath,
  });
  assertTest(
    res8b.success === false &&
      res8b.verdict === "REPROVADO" &&
      res8b.hashes.isDbMatch === true &&
      res8b.hashes.isStorageMatch === false,
    "D.8b",
    "Divergência Criptográfica Exclusiva em kupola_storage.json",
    "Reprovação com isDbMatch=true e isStorageMatch=false",
    `Sucesso=${res8b.success}, Veredito=${res8b.verdict}, isDbMatch=${res8b.hashes.isDbMatch}, isStorageMatch=${res8b.hashes.isStorageMatch}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.9a: Fixture Inválida - Manifesto com JSON Corrompido
  // ---------------------------------------------------------------------------
  const ref9a = createReferenceFixture("env_d9a");
  fs.writeFileSync(ref9a.manifestPath, "{ corrupt_json: [", "utf-8");
  const res9a = verifyManifestAndRollback({
    rootDir: ref9a.envDir,
    dbPath: ref9a.dbPath,
    storagePath: ref9a.storagePath,
    manifestPath: ref9a.manifestPath,
  });
  const hasCorruptJsonError = res9a.failures.some((f) => f.includes("Manifesto JSON inválido ou corrompido"));
  assertTest(
    res9a.success === false && res9a.verdict === "REPROVADO" && hasCorruptJsonError,
    "D.9a",
    "Fixture Inválida: Manifesto JSON Corrompido",
    "Reprovação com 'Manifesto JSON inválido ou corrompido'",
    `Sucesso=${res9a.success}, Veredito=${res9a.verdict}, Diagnóstico=${hasCorruptJsonError}`
  );

  // ---------------------------------------------------------------------------
  // TESTE D.9b: Fixture Inválida - Estrutura de Dicionário não é Objeto
  // ---------------------------------------------------------------------------
  const ref9b = createReferenceFixture("env_d9b");
  const dbObj9b = JSON.parse(fs.readFileSync(ref9b.dbPath, "utf-8"));
  dbObj9b.subscriptions = "invalid_string_type";
  fs.writeFileSync(ref9b.dbPath, JSON.stringify(dbObj9b, null, 2), "utf-8");
  // Atualizar hash do DB no manifesto para isolar o erro de tipo estrutural
  const newHash9b = sha256(ref9b.dbPath);
  ref9b.manifestObj.metadata.hashesPreCleanup["data/kupola_db.json"] = newHash9b;
  fs.writeFileSync(ref9b.manifestPath, JSON.stringify(ref9b.manifestObj, null, 2), "utf-8");
  const res9b = verifyManifestAndRollback({
    rootDir: ref9b.envDir,
    dbPath: ref9b.dbPath,
    storagePath: ref9b.storagePath,
    manifestPath: ref9b.manifestPath,
  });
  const hasStructTypeError = res9b.failures.some(
    (f) => f.includes("Estrutura inválida no dicionário 'subscriptions'") && f.includes("esperado Object")
  );
  assertTest(
    res9b.success === false && res9b.verdict === "REPROVADO" && hasStructTypeError,
    "D.9b",
    "Fixture Inválida: Dicionário subscriptions com tipo não-objeto",
    "Reprovação com 'Estrutura inválida no dicionário subscriptions: esperado Object'",
    `Sucesso=${res9b.success}, Veredito=${res9b.verdict}, Diagnóstico=${hasStructTypeError}`
  );

  console.log("\n===================================================================================");
  console.log(`=== RESULTADO: TODOS OS ${passedCount}/${totalCount} TESTES DA ETAPA C.5 PASSARAM COM SUCESSO! ===`);
  console.log("===================================================================================\n");
} finally {
  // Limpeza da sandbox temporária
  fs.rmSync(sandboxRoot, { recursive: true, force: true });
}
