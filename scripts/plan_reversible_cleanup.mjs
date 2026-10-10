import fs from "fs";
import path from "path";
import crypto from "crypto";

function calculateHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Whitelist explícita para entidades legítimas do sistema/produção
const WHITELISTED_ORGS = new Set(["demo_vintage", "org_vintage", "unit_shopping"]);

// Critérios Positivos e Explícitos de Identificação de Teste
// NENHUMA organização é considerada candidato a limpeza sem corresponder a ambos os padrões de ID e Nome
const TEST_ORG_ID_PATTERNS = [
  /^org_\d{13}_[a-z0-9]{4}$/i, // Padrão sintático de timestamp + hash (ex: org_1791511054173_svoq)
  /^org_\d{10,}_[a-z0-9]+$/i,  // Padrão sintático de id de teste (ex: org_1791398932614_n47u)
  /^org_test_/i,
];

const TEST_ORG_NAME_PATTERNS = [
  /^Barbearia (Alpha|Beta|X|Y|Alfa Persistente)/i,
  /^Test(e)?\b/i,
  /^Org(anization)?\s*Test/i,
];

function classifyOrganization(id, name) {
  if (WHITELISTED_ORGS.has(id)) {
    return {
      status: "LEGITIMATE",
      reason: `Entidade mantida na Whitelist Explícita (${id})`,
    };
  }

  const idMatches = TEST_ORG_ID_PATTERNS.some((pattern) => pattern.test(id));
  const nameMatches = TEST_ORG_NAME_PATTERNS.some((pattern) => pattern.test(name || ""));

  if (idMatches && nameMatches) {
    return {
      status: "TEST_CANDIDATE",
      reason: `Atende aos critérios positivos explícitos de teste (ID sintático '${id}' e Nome de teste '${name}')`,
    };
  }

  // Se não estiver na whitelist e não possuir critérios positivos explícitos de teste,
  // DEVE ser classificada como AMBÍGUA para bloquear o planejamento e garantir a segurança!
  return {
    status: "AMBIGUOUS",
    reason: `Organização sem classificação inequívoca: não está na whitelist nem possui padrões positivos explícitos de teste.`,
  };
}

export function generateCleanupManifest(options = {}) {
  const writeManifest = options.writeManifest === true;
  const rootDir = process.cwd();
  const dbPath = path.join(rootDir, "data", "kupola_db.json");
  const storagePath = path.join(rootDir, "data", "kupola_storage.json");

  // 1. Calculate initial hashes before planning (READ-ONLY)
  const initialDbHash = calculateHash(dbPath);
  const initialStorageHash = calculateHash(storagePath);

  // 2. Load original data (READ-ONLY)
  const dbData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  const storageData = JSON.parse(fs.readFileSync(storagePath, "utf-8"));

  // 3. Classify All Organizations using Positive Criteria
  const candidateOrgsMap = new Map();
  const ambiguousOrgsMap = new Map();
  const preservedOrgsMap = new Map();

  // Process DB barbershops
  (dbData.barbershops || []).forEach((b) => {
    const classification = classifyOrganization(b.id, b.name);
    if (classification.status === "TEST_CANDIDATE") {
      candidateOrgsMap.set(b.id, {
        id: b.id,
        name: b.name || "(Sem nome)",
        source: "kupola_db.json",
        classification: "TEST_CANDIDATE",
        reason: classification.reason,
      });
    } else if (classification.status === "AMBIGUOUS") {
      ambiguousOrgsMap.set(b.id, {
        id: b.id,
        name: b.name || "(Sem nome)",
        source: "kupola_db.json",
        classification: "AMBIGUOUS",
        reason: classification.reason,
      });
    } else {
      preservedOrgsMap.set(b.id, {
        id: b.id,
        name: b.name || "(Sem nome)",
        source: "kupola_db.json",
        classification: "LEGITIMATE",
        reason: classification.reason,
      });
    }
  });

  // Process Storage organizations
  const storageOrgsList = Array.isArray(storageData.organizations) ? storageData.organizations : [];
  storageOrgsList.forEach(([key, val]) => {
    const orgName = val.name || val.shop_name || "(Sem nome)";
    const classification = classifyOrganization(key, orgName);

    if (classification.status === "TEST_CANDIDATE") {
      if (!candidateOrgsMap.has(key)) {
        candidateOrgsMap.set(key, {
          id: key,
          name: orgName,
          source: "kupola_storage.json",
          classification: "TEST_CANDIDATE",
          reason: classification.reason,
        });
      } else {
        candidateOrgsMap.get(key).inStorage = true;
      }
    } else if (classification.status === "AMBIGUOUS") {
      if (!ambiguousOrgsMap.has(key)) {
        ambiguousOrgsMap.set(key, {
          id: key,
          name: orgName,
          source: "kupola_storage.json",
          classification: "AMBIGUOUS",
          reason: classification.reason,
        });
      }
    } else {
      if (!preservedOrgsMap.has(key)) {
        preservedOrgsMap.set(key, {
          id: key,
          name: orgName,
          source: "kupola_storage.json",
          classification: "LEGITIMATE",
          reason: classification.reason,
        });
      }
    }
  });

  // Check for ambiguous organizations
  const ambiguousOrgsList = Array.from(ambiguousOrgsMap.values());
  if (ambiguousOrgsList.length > 0) {
    console.error("[ERRO CRÍTICO DE SEGURANÇA]: Foram encontradas organizações com classificação ambígua!");
    ambiguousOrgsList.forEach((org) => {
      console.error(`  - ID: ${org.id} | Nome: ${org.name} | Origem: ${org.source} | Razão: ${org.reason}`);
    });
    throw new Error(
      `PLANEJAMENTO BLOQUEADO: Existem ${ambiguousOrgsList.length} organizações ambíguas sem classificação inequívoca. O planejamento foi interrompido.`
    );
  }

  const candidateOrgsList = Array.from(candidateOrgsMap.values());
  const candidateOrgIdsSet = new Set(candidateOrgsList.map((o) => o.id));

  // 4. Catalog Candidate Records with Strict Tenant Verification & Cross-Reference Checks
  const manifestRecords = [];
  const crossReferenceViolations = [];

  // Helper for DB collections
  const processDbCollection = (collName, items) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      let tenantId = item.barbershop_id || item.organization_id;
      if (collName === "barbershops") tenantId = item.id;

      // Verify no cross-reference to whitelisted legitimate organizations
      if (WHITELISTED_ORGS.has(tenantId)) {
        return; // Legitimate record belonging to whitelisted org
      }

      if (tenantId && candidateOrgIdsSet.has(tenantId)) {
        // Additional safety check: check if record references a whitelisted org in any property
        const refsWhitelisted = Object.values(item).some(
          (val) => typeof val === "string" && WHITELISTED_ORGS.has(val) && val !== tenantId
        );
        if (refsWhitelisted) {
          crossReferenceViolations.push({
            id: item.id || "(sem id)",
            collection: collName,
            tenantId,
            reason: "Registro candidato possui referência cruzada com entidade whitelisted de produção",
          });
          return;
        }

        const orgInfo = candidateOrgsMap.get(tenantId);
        manifestRecords.push({
          id: item.id || item.email || item.code || `${collName}_${manifestRecords.length}`,
          file: "data/kupola_db.json",
          collection: collName,
          ownerOrgId: tenantId,
          ownerOrgName: orgInfo ? orgInfo.name : "(Desconhecido)",
          reason: `Vínculo inequívoco de tenant com a organização de teste ${tenantId}`,
        });
      }
    });
  };

  // Helper for Storage collections
  const processStorageCollection = (collName, entries) => {
    if (!Array.isArray(entries)) return;
    entries.forEach((entry) => {
      const key = Array.isArray(entry) ? entry[0] : null;
      const value = Array.isArray(entry) ? entry[1] : entry;
      let tenantId = value.organization_id || value.barbershop_id;
      if (collName === "organizations") tenantId = key;

      if (WHITELISTED_ORGS.has(tenantId)) {
        return; // Legitimate record
      }

      if (tenantId && candidateOrgIdsSet.has(tenantId)) {
        const orgInfo = candidateOrgsMap.get(tenantId);
        manifestRecords.push({
          id: value.id || key,
          file: "data/kupola_storage.json",
          collection: collName,
          ownerOrgId: tenantId,
          ownerOrgName: orgInfo ? orgInfo.name : "(Desconhecido)",
          reason: `Vínculo inequívoco de tenant em kupola_storage.json com a organização de teste ${tenantId}`,
        });
      }
    });
  };

  // Process DB
  Object.keys(dbData).forEach((coll) => {
    processDbCollection(coll, dbData[coll]);
  });

  // Process Storage
  Object.keys(storageData).forEach((coll) => {
    processStorageCollection(coll, storageData[coll]);
  });

  if (crossReferenceViolations.length > 0) {
    console.error("[ERRO CRÍTICO DE SEGURANÇA]: Foram encontradas referências cruzadas com dados legítimos!");
    crossReferenceViolations.forEach((v) => {
      console.error(`  - Registro ID: ${v.id} | Coleção: ${v.collection} | Tenant: ${v.tenantId}`);
    });
    throw new Error(
      `PLANEJAMENTO BLOQUEADO: ${crossReferenceViolations.length} registros candidatos possuem referências cruzadas com entidades whitelisted.`
    );
  }

  // Calculate summary counts by collection
  const summaryByCollection = {};
  manifestRecords.forEach((r) => {
    const key = `${r.file} :: ${r.collection}`;
    summaryByCollection[key] = (summaryByCollection[key] || 0) + 1;
  });

  // 5. Build Manifest Object
  const manifest = {
    metadata: {
      generatedAt: new Date().toISOString(),
      status: "PLANNED_READ_ONLY",
      sha256: {
        kupola_db: initialDbHash,
        kupola_storage: initialStorageHash,
      },
      hashesPreCleanup: {
        "data/kupola_db.json": initialDbHash,
        "data/kupola_storage.json": initialStorageHash,
      },
      totalCandidateOrgs: candidateOrgsList.length,
      totalCandidateRecords: manifestRecords.length,
      ambiguousOrgsCount: 0,
      whitelistedEntities: ["demo_vintage", "org_vintage", "unit_shopping"],
    },
    summaryByCollection,
    candidateOrgs: candidateOrgsList,
    manifestRecords,
  };

  // 6. Verify SHA-256 Hashes of original files post-planning to guarantee zero modification
  const finalDbHash = calculateHash(dbPath);
  const finalStorageHash = calculateHash(storagePath);

  if (initialDbHash !== finalDbHash || initialStorageHash !== finalStorageHash) {
    throw new Error("ERRO CRÍTICO: Os arquivos de dados originais foram alterados durante o planejamento!");
  }

  // Write manifest file ONLY if writeManifest is explicitly requested (not during read-only audit)
  if (writeManifest) {
    const manifestPathData = path.join(rootDir, "data", "cleanup_manifest.json");
    fs.writeFileSync(manifestPathData, JSON.stringify(manifest, null, 2), "utf-8");
  }

  return {
    manifest,
    initialDbHash,
    initialStorageHash,
    finalDbHash,
    finalStorageHash,
  };
}

if (process.argv[1] && process.argv[1].endsWith("plan_reversible_cleanup.mjs")) {
  try {
    console.log("================================================================================");
    console.log("=== KUPOLA 2.0 — ETAPA 3.6A.3: AUDITORIA E PLANEJAMENTO SOMENTE LEITURA      ===");
    console.log("================================================================ drop-file-mode\n");

    const result = generateCleanupManifest({ writeManifest: false });

    console.log("[SUCESSO] Auditoria de Planejamento concluída com sucesso em modo SOMENTE LEITURA.");
    console.log(`- Nenhum backup ou arquivo de manifesto foi criado ou alterado no disco.`);
    console.log(`- SHA-256 kupola_db.json:      ${result.finalDbHash}`);
    console.log(`- SHA-256 kupola_storage.json: ${result.finalStorageHash}`);
    console.log(`- Status da Integridade: VERIFICADO E 100% INTACTO (0 bytes alterados nos arquivos originais)\n`);

    console.log("--- RESUMO DA AUDITORIA DO MANIFESTO ---");
    console.log(`Total de Organizações de Teste Mapeadas: ${result.manifest.metadata.totalCandidateOrgs}`);
    console.log(`Total de Registros Candidatos Catalogados: ${result.manifest.metadata.totalCandidateRecords}`);
    console.log(`Organizações Ambíguas Encontradas: ${result.manifest.metadata.ambiguousOrgsCount}`);
    console.log(`Entidades Preservadas na Whitelist: ${result.manifest.metadata.whitelistedEntities.join(", ")}`);
    console.log("\nDetalhamento por Coleção:");
    Object.entries(result.manifest.summaryByCollection).forEach(([coll, count]) => {
      console.log(`  - ${coll.padEnd(42)}: ${count} registros`);
    });

    console.log("\n================================================================================");
    console.log("=== FIM DO PLANEJAMENTO (3.6A.3) — NENHUM DADO FOI EXCLUÍDO OU ALTERADO     ===");
    console.log("=== AGUARDANDO AUTORIZAÇÃO EXPLÍCITA DO USUÁRIO PARA QUALQUER EXCLUSÃO REAL ===");
    console.log("================================================================================\n");
  } catch (err) {
    console.error("[ERRO CRÍTICO NO PLANEJAMENTO]:", err.message);
    process.exit(1);
  }
}

