import fs from "fs";
import path from "path";
import crypto from "crypto";

export function calculateHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Whitelist explícita para entidades legítimas do sistema/produção
export const WHITELISTED_ORGS = new Set(["demo_vintage", "org_vintage", "unit_shopping"]);

// Critérios Positivos e Explícitos de Identificação de Teste
// NENHUMA organização é considerada candidata à limpeza sem corresponder a ambos os padrões de ID e Nome
const TEST_ORG_ID_PATTERNS = [
  /^org_\d{13}_[a-z0-9]{4}$/i, // Padrão sintático de timestamp + hash (ex: org_1791511054173_svoq)
  /^org_\d{10,}_[a-z0-9]+$/i,  // Padrão sintático de id de teste (ex: org_1791398932614_n47u)
  /^org_test_/i,
];

const TEST_ORG_NAME_PATTERNS = [
  /^Barbearia\s+(?:Alpha|Beta|X|Y|Alfa Persistente|Test(?:e)?)\b(?:\s|\d|$)/i,
  /^Test(?:e)?\b(?:\s|\d|$)/i,
  /^Org(?:anization)?\s+Test(?:e)?\b(?:\s|\d|$)/i,
];

// Estruturas de dicionário organizacionais conhecidas e reconhecidas
export const KNOWN_DB_ORG_DICTIONARIES = new Set(["subscriptions", "settingsMap"]);

// Objetos raiz únicos conhecidos e reconhecidos (Singletons da aplicação/demo)
export const KNOWN_DB_SINGLE_ROOT_OBJECTS = new Set(["subscription", "settings", "barbershop", "onboarding"]);

export function classifyOrganization(id, name) {
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
  const rootDir = options.rootDir || process.cwd();
  const dbPath = options.dbPath || path.join(rootDir, "data", "kupola_db.json");
  const storagePath = options.storagePath || path.join(rootDir, "data", "kupola_storage.json");
  const manifestOutputPath = options.manifestOutputPath || path.join(rootDir, "data", "cleanup_manifest.json");

  // 1. Calculate initial hashes before planning (READ-ONLY)
  const initialDbHash = calculateHash(dbPath);
  const initialStorageHash = calculateHash(storagePath);

  // 2. Load original data (READ-ONLY)
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Arquivo de banco de dados não encontrado: ${dbPath}`);
  }
  if (!fs.existsSync(storagePath)) {
    throw new Error(`Arquivo de storage não encontrado: ${storagePath}`);
  }

  const dbData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  const storageData = JSON.parse(fs.readFileSync(storagePath, "utf-8"));

  // 3. Classify All Organizations using Positive Criteria
  const candidateOrgsMap = new Map();
  const ambiguousOrgsMap = new Map();
  const preservedOrgsMap = new Map();

  const dbRelativePath = path.relative(rootDir, dbPath) || "data/kupola_db.json";
  const storageRelativePath = path.relative(rootDir, storagePath) || "data/kupola_storage.json";

  // Process DB barbershops
  (dbData.barbershops || []).forEach((b) => {
    const classification = classifyOrganization(b.id, b.name);
    if (classification.status === "TEST_CANDIDATE") {
      candidateOrgsMap.set(b.id, {
        id: b.id,
        name: b.name || "(Sem nome)",
        source: dbRelativePath,
        classification: "TEST_CANDIDATE",
        reason: classification.reason,
      });
    } else if (classification.status === "AMBIGUOUS") {
      ambiguousOrgsMap.set(b.id, {
        id: b.id,
        name: b.name || "(Sem nome)",
        source: dbRelativePath,
        classification: "AMBIGUOUS",
        reason: classification.reason,
      });
    } else {
      preservedOrgsMap.set(b.id, {
        id: b.id,
        name: b.name || "(Sem nome)",
        source: dbRelativePath,
        classification: "LEGITIMATE",
        reason: classification.reason,
      });
    }
  });

  // Process Storage organizations
  const storageOrgsList = Array.isArray(storageData.organizations) ? storageData.organizations : [];
  storageOrgsList.forEach((entry) => {
    const key = Array.isArray(entry) ? entry[0] : entry.id;
    const val = Array.isArray(entry) ? entry[1] : entry;
    const orgName = val.name || val.shop_name || "(Sem nome)";
    const classification = classifyOrganization(key, orgName);
    if (classification.status === "TEST_CANDIDATE") {
      if (!candidateOrgsMap.has(key)) {
        candidateOrgsMap.set(key, {
          id: key,
          name: orgName,
          source: storageRelativePath,
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
          source: storageRelativePath,
          classification: "AMBIGUOUS",
          reason: classification.reason,
        });
      }
    } else {
      if (!preservedOrgsMap.has(key)) {
        preservedOrgsMap.set(key, {
          id: key,
          name: orgName,
          source: storageRelativePath,
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
  const ambiguousEntries = [];
  const unexpectedStructures = [];
  const seenPhysicalPaths = new Set();
  const duplicatePathViolations = [];

  // Helper for DB Array collections
  const processDbArrayCollection = (collName, items) => {
    if (!Array.isArray(items)) {
      unexpectedStructures.push({ file: dbRelativePath, collection: collName, reason: "Esperado Array, encontrado tipo inválido" });
      return;
    }

    items.forEach((item, index) => {
      if (typeof item !== "object" || item === null) {
        unexpectedStructures.push({ file: dbRelativePath, collection: collName, reason: `Item no índice ${index} não é objeto` });
        return;
      }

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
            id: item.id || `index_${index}`,
            collection: collName,
            tenantId,
            reason: "Registro candidato possui referência cruzada com entidade whitelisted de produção",
          });
          return;
        }

        const recordId = item.id || item.email || item.code || `${collName}_${index}`;
        const physicalPath = `${collName}[${index}]`;
        const pathKey = `${dbRelativePath}::${collName}::${recordId}`;

        if (seenPhysicalPaths.has(pathKey)) {
          duplicatePathViolations.push(pathKey);
        } else {
          seenPhysicalPaths.add(pathKey);
        }

        const orgInfo = candidateOrgsMap.get(tenantId);
        manifestRecords.push({
          id: recordId,
          file: dbRelativePath,
          collection: collName,
          structureType: "array",
          entityType: "collection_record",
          ownerOrgId: tenantId,
          ownerOrgName: orgInfo ? orgInfo.name : "(Desconhecido)",
          physicalPath,
          reason: `Vínculo inequívoco de tenant com a organização de teste ${tenantId}`,
        });
      } else if (tenantId) {
        // Possui tenantId mas não está na whitelist nem nos candidatos conhecidos -> AMBÍGUO!
        ambiguousEntries.push({
          file: dbRelativePath,
          collection: collName,
          id: item.id || `index_${index}`,
          tenantId,
          reason: `Tenant '${tenantId}' não está na whitelist nem entre as organizações de teste confirmadas.`,
        });
      }
    });
  };

  // Helper for DB Dictionary collections (subscriptions, settingsMap)
  const processDbDictionary = (collName, dictObj) => {
    if (typeof dictObj !== "object" || dictObj === null || Array.isArray(dictObj)) {
      unexpectedStructures.push({ file: dbRelativePath, collection: collName, reason: "Esperado Dicionário (Object), encontrado outro tipo" });
      return;
    }

    Object.entries(dictObj).forEach(([key, entryVal]) => {
      // 1. Chave Whitelisted/Protegida (ex: demo_vintage)
      if (WHITELISTED_ORGS.has(key)) {
        // Validar integridade da entrada protegida: não pode ter referências a candidatos de teste
        if (typeof entryVal === "object" && entryVal !== null) {
          const refsCandidate = Object.values(entryVal).some(
            (val) => typeof val === "string" && candidateOrgIdsSet.has(val)
          );
          if (refsCandidate) {
            crossReferenceViolations.push({
              id: key,
              collection: collName,
              tenantId: key,
              reason: `Entidade protegida da whitelist (${key}) contém referências internas a organizações de teste`,
            });
          }
        }
        return; // Preservado intacto
      }

      // 2. Chave de Organização Candidata Comprovada
      if (candidateOrgIdsSet.has(key)) {
        if (typeof entryVal !== "object" || entryVal === null) {
          ambiguousEntries.push({
            file: dbRelativePath,
            collection: collName,
            id: key,
            tenantId: key,
            reason: `Valor da chave '${key}' no dicionário '${collName}' não é um objeto válido`,
          });
          return;
        }

        // Validar referências cruzadas: não pode apontar para whitelist
        const refsWhitelisted = Object.values(entryVal).some(
          (val) => typeof val === "string" && WHITELISTED_ORGS.has(val)
        );
        if (refsWhitelisted) {
          crossReferenceViolations.push({
            id: key,
            collection: collName,
            tenantId: key,
            reason: `Entrada candidata no dicionário '${collName}' possui referência cruzada com entidade whitelisted`,
          });
          return;
        }

        // Se contiver barbershop_id ou organization_id explícito, validar coerência com a chave
        const entryTenant = entryVal.barbershop_id || entryVal.organization_id;
        if (entryTenant && entryTenant !== key) {
          crossReferenceViolations.push({
            id: key,
            collection: collName,
            tenantId: key,
            reason: `Incoerência de tenant interno: chave é '${key}' mas propriedade aponta para '${entryTenant}'`,
          });
          return;
        }

        const pathKey = `${dbRelativePath}::${collName}::${key}`;
        if (seenPhysicalPaths.has(pathKey)) {
          duplicatePathViolations.push(pathKey);
        } else {
          seenPhysicalPaths.add(pathKey);
        }

        const orgInfo = candidateOrgsMap.get(key);
        manifestRecords.push({
          id: key,
          key: key,
          file: dbRelativePath,
          collection: collName,
          structureType: "dictionary",
          entityType: "organization_setting_entry",
          ownerOrgId: key,
          ownerOrgName: orgInfo ? orgInfo.name : "(Desconhecido)",
          physicalPath: `${collName}.${key}`,
          reason: `Vínculo positivo e inequívoco da chave '${key}' no dicionário '${collName}' com a organização de teste ${key}`,
        });
      } else {
        // 3. Chave desconhecida (não está na whitelist nem nos candidatos conhecidos) -> AMBÍGUO!
        ambiguousEntries.push({
          file: dbRelativePath,
          collection: collName,
          id: key,
          tenantId: key,
          reason: `Chave '${key}' no dicionário '${collName}' sem vínculo com whitelist nem candidatos confirmados.`,
        });
      }
    });
  };

  // Helper for Storage collections
  const processStorageCollection = (collName, entries) => {
    if (!Array.isArray(entries)) {
      unexpectedStructures.push({ file: storageRelativePath, collection: collName, reason: "Esperado Array em storage, encontrado outro tipo" });
      return;
    }

    entries.forEach((entry, index) => {
      const key = Array.isArray(entry) ? entry[0] : null;
      const value = Array.isArray(entry) ? entry[1] : entry;
      let tenantId = value.organization_id || value.barbershop_id;
      if (collName === "organizations") tenantId = key;

      if (WHITELISTED_ORGS.has(tenantId)) {
        return; // Legitimate record
      }

      if (tenantId && candidateOrgIdsSet.has(tenantId)) {
        const recordId = value.id || key || `${collName}_${index}`;
        const pathKey = `${storageRelativePath}::${collName}::${recordId}`;

        if (seenPhysicalPaths.has(pathKey)) {
          duplicatePathViolations.push(pathKey);
        } else {
          seenPhysicalPaths.add(pathKey);
        }

        const orgInfo = candidateOrgsMap.get(tenantId);
        manifestRecords.push({
          id: recordId,
          file: storageRelativePath,
          collection: collName,
          structureType: "array",
          entityType: "storage_record",
          ownerOrgId: tenantId,
          ownerOrgName: orgInfo ? orgInfo.name : "(Desconhecido)",
          physicalPath: `${collName}[${index}]`,
          reason: `Vínculo inequívoco de tenant em kupola_storage.json com a organização de teste ${tenantId}`,
        });
      } else if (tenantId) {
        ambiguousEntries.push({
          file: storageRelativePath,
          collection: collName,
          id: value.id || key || `index_${index}`,
          tenantId,
          reason: `Tenant '${tenantId}' em storage não pertence à whitelist nem aos candidatos conhecidos`,
        });
      }
    });
  };

  // Process DB Top-Level Elements
  Object.keys(dbData).forEach((topKey) => {
    if (KNOWN_DB_ORG_DICTIONARIES.has(topKey)) {
      processDbDictionary(topKey, dbData[topKey]);
    } else if (KNOWN_DB_SINGLE_ROOT_OBJECTS.has(topKey)) {
      // Validar objeto singleton protegido (demo_vintage / global)
      const obj = dbData[topKey];
      if (typeof obj !== "object" || obj === null) {
        unexpectedStructures.push({ file: dbRelativePath, collection: topKey, reason: "Objeto singleton inválido ou nulo" });
        return;
      }
      const tenant = obj.barbershop_id || obj.organization_id;
      if (tenant && !WHITELISTED_ORGS.has(tenant)) {
        ambiguousEntries.push({
          file: dbRelativePath,
          collection: topKey,
          id: topKey,
          tenantId: tenant,
          reason: `Objeto singleton '${topKey}' possui tenant não autorizado: '${tenant}'`,
        });
      }
    } else if (Array.isArray(dbData[topKey])) {
      processDbArrayCollection(topKey, dbData[topKey]);
    } else {
      unexpectedStructures.push({
        file: dbRelativePath,
        collection: topKey,
        reason: `Estrutura desconhecida de tipo '${typeof dbData[topKey]}'. O planejador não sabe interpretar esta estrutura.`,
      });
    }
  });

  // Process Storage Elements
  Object.keys(storageData).forEach((topKey) => {
    if (Array.isArray(storageData[topKey])) {
      processStorageCollection(topKey, storageData[topKey]);
    } else {
      unexpectedStructures.push({
        file: storageRelativePath,
        collection: topKey,
        reason: `Estrutura em storage não é array: '${typeof storageData[topKey]}'`,
      });
    }
  });

  // Bloqueio imediato para estruturas inesperadas
  if (unexpectedStructures.length > 0) {
    console.error("[ERRO CRÍTICO DE SEGURANÇA]: Foram encontradas estruturas de dados inesperadas ou não suportadas!");
    unexpectedStructures.forEach((u) => {
      console.error(`  - Arquivo: ${u.file} | Coleção: ${u.collection} | Razão: ${u.reason}`);
    });
    throw new Error(
      `PLANEJAMENTO BLOQUEADO: ${unexpectedStructures.length} estruturas inesperadas detectadas. O planejador foi interrompido.`
    );
  }

  // Bloqueio imediato para entradas ambíguas
  if (ambiguousEntries.length > 0) {
    console.error("[ERRO CRÍTICO DE SEGURANÇA]: Foram encontradas entradas com classificação ambígua!");
    ambiguousEntries.forEach((a) => {
      console.error(`  - Arquivo: ${a.file} | Coleção: ${a.collection} | ID: ${a.id} | Tenant: ${a.tenantId} | Razão: ${a.reason}`);
    });
    throw new Error(
      `PLANEJAMENTO BLOQUEADO: Existem ${ambiguousEntries.length} entradas ambíguas sem classificação inequívoca. O planejamento foi interrompido.`
    );
  }

  // Bloqueio imediato para violações de referência cruzada
  if (crossReferenceViolations.length > 0) {
    console.error("[ERRO CRÍTICO DE SEGURANÇA]: Foram encontradas referências cruzadas com dados legítimos!");
    crossReferenceViolations.forEach((v) => {
      console.error(`  - Registro ID: ${v.id} | Coleção: ${v.collection} | Tenant: ${v.tenantId} | Razão: ${v.reason}`);
    });
    throw new Error(
      `PLANEJAMENTO BLOQUEADO: ${crossReferenceViolations.length} registros candidatos possuem referências cruzadas com entidades whitelisted.`
    );
  }

  // Bloqueio imediato para caminhos duplicados
  if (duplicatePathViolations.length > 0) {
    console.error("[ERRO CRÍTICO DE SEGURANÇA]: Foram detectados caminhos físicos duplicados dentro da mesma coleção!");
    duplicatePathViolations.forEach((p) => {
      console.error(`  - Caminho Duplicado: ${p}`);
    });
    throw new Error(
      `PLANEJAMENTO BLOQUEADO: ${duplicatePathViolations.length} caminhos duplicados detectados.`
    );
  }

  // Verificar que cada registro candidato possui proprietário comprovado
  const unownedRecords = manifestRecords.filter((r) => !r.ownerOrgId || !candidateOrgIdsSet.has(r.ownerOrgId));
  if (unownedRecords.length > 0) {
    throw new Error(
      `PLANEJAMENTO BLOQUEADO: ${unownedRecords.length} registros candidatos não possuem proprietário de teste comprovado.`
    );
  }

  // Contagens e resumos
  const summaryByCollection = {};
  const summaryByStructureType = { array: 0, dictionary: 0 };
  const idOccurrencesMap = new Map();

  manifestRecords.forEach((r) => {
    const collKey = `${r.file} :: ${r.collection}`;
    summaryByCollection[collKey] = (summaryByCollection[collKey] || 0) + 1;
    summaryByStructureType[r.structureType] = (summaryByStructureType[r.structureType] || 0) + 1;

    if (!idOccurrencesMap.has(r.id)) {
      idOccurrencesMap.set(r.id, []);
    }
    idOccurrencesMap.get(r.id).push(collKey);
  });

  // Distinção entre ocorrências físicas e entidades lógicas únicas
  const totalPhysicalOccurrences = manifestRecords.length;
  const totalUniqueIds = idOccurrencesMap.size;
  let sharedCrossFileEntitiesCount = 0;
  idOccurrencesMap.forEach((occurrences) => {
    if (occurrences.length > 1) {
      sharedCrossFileEntitiesCount++;
    }
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
      totalCandidateRecords: totalPhysicalOccurrences,
      totalPhysicalOccurrences,
      totalLogicalEntities: totalUniqueIds,
      sharedCrossFileEntitiesCount,
      summaryByStructureType,
      ambiguousOrgsCount: 0,
      ambiguousEntriesCount: 0,
      whitelistedEntities: Array.from(WHITELISTED_ORGS),
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
    fs.writeFileSync(manifestOutputPath, JSON.stringify(manifest, null, 2), "utf-8");
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
    console.log("=== KUPOLA 2.0 — ETAPA 3.6C.1: AUDITORIA E PLANEJAMENTO SOMENTE LEITURA      ===");
    console.log("================================================================ drop-file-mode\n");

    const result = generateCleanupManifest({ writeManifest: false });

    console.log("[SUCESSO] Auditoria de Planejamento concluída com sucesso em modo SOMENTE LEITURA.");
    console.log(`- Nenhum backup ou arquivo de manifesto foi criado ou alterado no disco.`);
    console.log(`- SHA-256 kupola_db.json:      ${result.finalDbHash}`);
    console.log(`- SHA-256 kupola_storage.json: ${result.finalStorageHash}`);
    console.log(`- Status da Integridade: VERIFICADO E 100% INTACTO (0 bytes alterados nos arquivos originais)\n`);

    console.log("--- RESUMO DA AUDITORIA DO MANIFESTO ---");
    console.log(`Total de Organizações de Teste Mapeadas:   ${result.manifest.metadata.totalCandidateOrgs}`);
    console.log(`Total de Ocorrências Físicas Catalogadas: ${result.manifest.metadata.totalPhysicalOccurrences}`);
    console.log(`  - Ocorrências em Arrays:                ${result.manifest.metadata.summaryByStructureType.array}`);
    console.log(`  - Ocorrências em Dicionários:           ${result.manifest.metadata.summaryByStructureType.dictionary}`);
    console.log(`Total de Identificadores Lógicos Únicos:  ${result.manifest.metadata.totalLogicalEntities}`);
    console.log(`Entidades Compartilhadas Inter-Coleções:  ${result.manifest.metadata.sharedCrossFileEntitiesCount}`);
    console.log(`Organizações Ambíguas Encontradas:        ${result.manifest.metadata.ambiguousOrgsCount}`);
    console.log(`Entidades Preservadas na Whitelist:       ${result.manifest.metadata.whitelistedEntities.join(", ")}`);

    console.log("\nDetalhamento por Coleção:");
    Object.entries(result.manifest.summaryByCollection).forEach(([coll, count]) => {
      console.log(`  - ${coll.padEnd(42)}: ${count} ocorrências`);
    });

    console.log("\n================================================================================");
    console.log("=== FIM DO PLANEJAMENTO (3.6C.1) — NENHUM DADO FOI EXCLUÍDO OU ALTERADO    ===");
    console.log("=== AGUARDANDO AUTORIZAÇÃO EXPLÍCITA DO USUÁRIO PARA QUALQUER EXCLUSÃO REAL ===");
    console.log("================================================================================\n");
  } catch (err) {
    console.error("[ERRO CRÍTICO NO PLANEJAMENTO]:", err.message);
    process.exit(1);
  }
}
