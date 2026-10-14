import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  classifyOrganization,
  WHITELISTED_ORGS,
  PROTECTED_OPERATIONAL_COLLECTIONS,
  KNOWN_DB_ORG_DICTIONARIES,
  KNOWN_DB_SINGLE_ROOT_OBJECTS,
  checkSemanticWhitelistedReference,
} from "./plan_reversible_cleanup.mjs";

export function sha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

export function verifyManifestAndRollback(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const dbPath = options.dbPath || path.resolve(rootDir, "data/kupola_db.json");
  const storagePath = options.storagePath || path.resolve(rootDir, "data/kupola_storage.json");
  const manifestPath = options.manifestPath || path.resolve(rootDir, "data/cleanup_manifest.json");

  console.log("===================================================================================");
  console.log("KUPOLA 2.0 — VERIFICAÇÃO DINÂMICA DE CLASSIFICAÇÃO, COBERTURA E INTEGRIDADE");
  console.log("===================================================================================\n");

  const classificationFailures = [];
  const coverageFailures = [];
  const integrityFailures = [];
  const warnings = [];

  const dbRelativePath = path.relative(rootDir, dbPath) || "data/kupola_db.json";
  const storageRelativePath = path.relative(rootDir, storagePath) || "data/kupola_storage.json";

  // 1. CARREGAMENTO E PARSING DO MANIFESTO
  if (!fs.existsSync(manifestPath)) {
    integrityFailures.push(`Manifesto não encontrado no caminho: ${manifestPath}`);
    return {
      success: false,
      verdict: "REPROVADO",
      classificationAudit: { passed: false, failures: ["Manifesto ausente"] },
      coverageAudit: { passed: false, failures: ["Manifesto ausente"] },
      integrityAudit: { passed: false, failures: integrityFailures },
      failures: integrityFailures,
      warnings,
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    console.log("[PASS 1] Manifesto JSON lido e parseado com sucesso.");
  } catch (e) {
    integrityFailures.push(`Manifesto JSON inválido ou corrompido: ${e.message}`);
    return {
      success: false,
      verdict: "REPROVADO",
      classificationAudit: { passed: false, failures: ["Manifesto corrompido"] },
      coverageAudit: { passed: false, failures: ["Manifesto corrompido"] },
      integrityAudit: { passed: false, failures: integrityFailures },
      failures: integrityFailures,
      warnings,
    };
  }

  const manifestRecords = Array.isArray(manifest.manifestRecords) ? manifest.manifestRecords : [];
  const rawCandidateOrgs = Array.isArray(manifest.candidateOrgs) ? manifest.candidateOrgs : [];

  console.log(`- Ocorrências físicas catalogadas no manifesto: ${manifestRecords.length}`);
  console.log(`- Organizações listadas em candidateOrgs:        ${rawCandidateOrgs.length}`);

  // 2. CARREGAMENTO DAS FONTES REAIS DE DADOS
  let dbData = null;
  let storageData = null;

  if (fs.existsSync(dbPath)) {
    try {
      dbData = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    } catch (e) {
      integrityFailures.push(`Falha ao ler dados de ${dbPath}: ${e.message}`);
    }
  } else {
    integrityFailures.push(`Arquivo de banco de dados não encontrado: ${dbPath}`);
  }

  if (fs.existsSync(storagePath)) {
    try {
      storageData = JSON.parse(fs.readFileSync(storagePath, "utf8"));
    } catch (e) {
      integrityFailures.push(`Falha ao ler dados de ${storagePath}: ${e.message}`);
    }
  } else {
    integrityFailures.push(`Arquivo de storage não encontrado: ${storagePath}`);
  }

  // Se os dados não puderem ser lidos, interrompe com reprovação
  if (!dbData || !storageData) {
    const allFailures = [...integrityFailures];
    return {
      success: false,
      verdict: "REPROVADO",
      classificationAudit: { passed: false, failures: ["Fontes de dados indisponíveis"] },
      coverageAudit: { passed: false, failures: ["Fontes de dados indisponíveis"] },
      integrityAudit: { passed: false, failures: integrityFailures },
      failures: allFailures,
      warnings,
    };
  }

  // 3. AUDITORIA DE CLASSIFICAÇÃO DAS ORGANIZAÇÕES A PARTIR DAS FONTES REAIS (RESULTADO A)
  console.log("\n[AUDITORIA A] Verificação de Classificação das Organizações a partir das Fontes Reais");

  const expectedCandidateOrgsMap = new Map();
  const expectedProtectedOrgsMap = new Map();
  const ambiguousSourceOrgs = [];

  // 3.1 Varrer db.barbershops
  const dbBarbershops = Array.isArray(dbData.barbershops) ? dbData.barbershops : [];
  dbBarbershops.forEach((b) => {
    const cls = classifyOrganization(b.id, b.name);
    if (cls.status === "TEST_CANDIDATE") {
      expectedCandidateOrgsMap.set(b.id, {
        id: b.id,
        name: b.name || "(Sem nome)",
        source: dbRelativePath,
        reason: cls.reason,
      });
    } else if (cls.status === "LEGITIMATE") {
      expectedProtectedOrgsMap.set(b.id, {
        id: b.id,
        name: b.name || "(Sem nome)",
        source: dbRelativePath,
        reason: cls.reason,
      });
    } else {
      ambiguousSourceOrgs.push({
        id: b.id,
        name: b.name || "(Sem nome)",
        source: dbRelativePath,
        reason: cls.reason,
      });
    }
  });

  // 3.2 Varrer storage.organizations
  const storageOrgs = Array.isArray(storageData.organizations) ? storageData.organizations : [];
  storageOrgs.forEach((entry) => {
    const key = Array.isArray(entry) ? entry[0] : entry.id;
    const val = Array.isArray(entry) ? entry[1] : entry;
    const orgName = val?.name || val?.shop_name || "(Sem nome)";
    const cls = classifyOrganization(key, orgName);
    if (cls.status === "TEST_CANDIDATE") {
      if (!expectedCandidateOrgsMap.has(key)) {
        expectedCandidateOrgsMap.set(key, {
          id: key,
          name: orgName,
          source: storageRelativePath,
          reason: cls.reason,
        });
      }
    } else if (cls.status === "LEGITIMATE") {
      if (!expectedProtectedOrgsMap.has(key)) {
        expectedProtectedOrgsMap.set(key, {
          id: key,
          name: orgName,
          source: storageRelativePath,
          reason: cls.reason,
        });
      }
    } else {
      ambiguousSourceOrgs.push({
        id: key,
        name: orgName,
        source: storageRelativePath,
        reason: cls.reason,
      });
    }
  });

  // Bloqueio por organização ambígua encontrada nas fontes
  if (ambiguousSourceOrgs.length > 0) {
    ambiguousSourceOrgs.forEach((org) => {
      classificationFailures.push(
        `Organização com classificação AMBÍGUA identificada nas fontes reais: ID='${org.id}', Nome='${org.name}', Arquivo='${org.source}' (${org.reason})`
      );
    });
  }

  // 3.3 Confrontar com candidateOrgs do manifesto
  const manifestCandidateOrgsMap = new Map();
  const duplicateManifestCandidateOrgs = [];

  rawCandidateOrgs.forEach((orgEntry, idx) => {
    const orgId = typeof orgEntry === "string" ? orgEntry : orgEntry.id;
    if (!orgId) {
      classificationFailures.push(`Item no índice ${idx} de candidateOrgs não possui ID válido`);
      return;
    }
    if (manifestCandidateOrgsMap.has(orgId)) {
      duplicateManifestCandidateOrgs.push(orgId);
    } else {
      manifestCandidateOrgsMap.set(orgId, orgEntry);
    }
  });

  if (duplicateManifestCandidateOrgs.length > 0) {
    classificationFailures.push(
      `O manifesto contém ${duplicateManifestCandidateOrgs.length} organizações duplicadas em 'candidateOrgs' (${duplicateManifestCandidateOrgs.join(", ")})`
    );
  }

  // 3.4 Verificar se alguma organização que deveria ser candidata está ausente de candidateOrgs
  for (const [candId, candInfo] of expectedCandidateOrgsMap.entries()) {
    if (!manifestCandidateOrgsMap.has(candId)) {
      classificationFailures.push(
        `Organização candidata comprovada nas fontes reais está AUSENTE de 'candidateOrgs' no manifesto: ID='${candId}' (${candInfo.name}) em ${candInfo.source}`
      );
    }
  }

  // 3.5 Verificar se alguma organização listada no manifesto NÃO deveria ser candidata
  for (const [manOrgId] of manifestCandidateOrgsMap.entries()) {
    if (WHITELISTED_ORGS.has(manOrgId)) {
      classificationFailures.push(
        `VIOLAÇÃO CRÍTICA: Entidade protegida da Whitelist (${manOrgId}) foi incluída indevidamente em 'candidateOrgs'!`
      );
    } else if (!expectedCandidateOrgsMap.has(manOrgId)) {
      classificationFailures.push(
        `Organização '${manOrgId}' incluída em 'candidateOrgs' no manifesto sem evidência positiva suficiente nas fontes reais (não classificada como TEST_CANDIDATE)`
      );
    }
  }

  const classificationPassed = classificationFailures.length === 0;
  console.log(`  -> Auditoria de Classificação: ${classificationPassed ? "APROVADO" : "REPROVADO"}`);

  // 4. AUDITORIA DA COBERTURA FÍSICA EXATA DOS DICIONÁRIOS E ARRAYS (RESULTADO B)
  console.log("\n[AUDITORIA B] Verificação da Cobertura Física Exata dos Dicionários e Arrays (DB e Storage)");

  // 4.1 Verificação de Dicionários (subscriptions e settingsMap)
  const dictionaryCollections = ["subscriptions", "settingsMap"];
  for (const dictColl of dictionaryCollections) {
    const dictObj = dbData[dictColl];

    // Validação de tipo estrutural do dicionário
    if (typeof dictObj !== "object" || dictObj === null || Array.isArray(dictObj)) {
      coverageFailures.push(
        `Estrutura inválida no dicionário '${dictColl}' em ${dbRelativePath}: esperado Object, encontrado '${dictObj === null ? "null" : Array.isArray(dictObj) ? "array" : typeof dictObj}'`
      );
      continue;
    }

    const dictEntries = Object.entries(dictObj);

    // Mapear todas as chaves candidatas reais que deveriam estar no manifesto
    const expectedDictCandidates = new Map();
    const protectedDictKeys = new Set();
    const ambiguousDictKeys = [];

    for (const [key, val] of dictEntries) {
      if (WHITELISTED_ORGS.has(key)) {
        protectedDictKeys.add(key);
      } else if (expectedCandidateOrgsMap.has(key)) {
        const refViolation = checkSemanticWhitelistedReference(val, key);
        if (refViolation) {
          coverageFailures.push(
            `VIOLAÇÃO CRÍTICA: Chave '${key}' no dicionário '${dictColl}' possui referência a entidade protegida da Whitelist: ${refViolation.reason}`
          );
        } else {
          expectedDictCandidates.set(key, val);
        }
      } else {
        ambiguousDictKeys.push(key);
      }
    }

    if (ambiguousDictKeys.length > 0) {
      coverageFailures.push(
        `Chaves ambíguas encontradas no dicionário '${dictColl}' em ${dbRelativePath} sem classificação comprovada: ${ambiguousDictKeys.join(", ")}`
      );
    }

    // Filtrar ocorrências deste dicionário catalogadas no manifesto
    const manifestDictRecords = manifestRecords.filter(
      (r) => (r.file === dbRelativePath || r.file === "data/kupola_db.json") && r.collection === dictColl
    );

    // Mapear ocorrências do manifesto por chave/id para detecção exata de omissões e duplicidades
    const manifestDictRecordsByKey = new Map();
    const duplicateDictKeysInManifest = [];

    manifestDictRecords.forEach((r) => {
      const entryKey = r.id || r.key;
      if (manifestDictRecordsByKey.has(entryKey)) {
        duplicateDictKeysInManifest.push(entryKey);
      } else {
        manifestDictRecordsByKey.set(entryKey, r);
      }
    });

    if (duplicateDictKeysInManifest.length > 0) {
      coverageFailures.push(
        `Registro duplicado no manifesto para o dicionário '${dictColl}': chave(s) ${duplicateDictKeysInManifest.join(", ")} catalogada(s) mais de uma vez.`
      );
    }

    // 4.1.1 Verificar se TODAS as chaves candidatas esperadas estão no manifesto
    const omittedKeys = [];
    for (const [expectedKey] of expectedDictCandidates.entries()) {
      if (!manifestDictRecordsByKey.has(expectedKey)) {
        omittedKeys.push(expectedKey);
        coverageFailures.push(
          `OMISSÃO NO MANIFESTO: Chave candidata '${expectedKey}' do dicionário '${dictColl}' em ${dbRelativePath} está ausente de manifestRecords.`
        );
      } else {
        // Validar integridade dos atributos físicos da entrada catalogada
        const rec = manifestDictRecordsByKey.get(expectedKey);
        const expectedPhysicalPath = `${dictColl}.${expectedKey}`;
        if (rec.file !== dbRelativePath && rec.file !== "data/kupola_db.json") {
          coverageFailures.push(
            `Inconsistência de arquivo para chave '${expectedKey}' em '${dictColl}': catalogado em '${rec.file}', esperado '${dbRelativePath}'.`
          );
        }
        if (rec.structureType !== "dictionary") {
          coverageFailures.push(
            `Inconsistência de structureType para chave '${expectedKey}' em '${dictColl}': catalogado como '${rec.structureType}', esperado 'dictionary'.`
          );
        }
        if (rec.ownerOrgId !== expectedKey) {
          coverageFailures.push(
            `Inconsistência de ownerOrgId para chave '${expectedKey}' em '${dictColl}': catalogado como '${rec.ownerOrgId}', esperado '${expectedKey}'.`
          );
        }
        if (rec.physicalPath !== expectedPhysicalPath) {
          coverageFailures.push(
            `Inconsistência de physicalPath para chave '${expectedKey}' em '${dictColl}': catalogado como '${rec.physicalPath}', esperado '${expectedPhysicalPath}'.`
          );
        }
      }
    }

    if (omittedKeys.length > 0) {
      coverageFailures.push(
        `O manifesto omite ${omittedKeys.length} propriedades candidatas em '${dictColl}' (${omittedKeys.join(", ")})`
      );
    }

    // 4.1.2 Verificar se há registros no manifesto que NÃO existem nos dados reais ou pertencem à whitelist
    for (const [manKey, rec] of manifestDictRecordsByKey.entries()) {
      if (protectedDictKeys.has(manKey) || WHITELISTED_ORGS.has(manKey)) {
        coverageFailures.push(
          `VIOLAÇÃO CRÍTICA: Entidade protegida da Whitelist ('${manKey}') foi indevidamente incluída no manifesto para '${dictColl}'!`
        );
      } else if (!expectedDictCandidates.has(manKey)) {
        coverageFailures.push(
          `Registro inexistente ou indevido no manifesto para '${dictColl}': chave '${manKey}' não existe nos dados reais ou não pertence a uma organização candidata.`
        );
      } else {
        const realVal = dictObj[manKey];
        const refViolation = checkSemanticWhitelistedReference(realVal, manKey) || checkSemanticWhitelistedReference(rec, manKey);
        if (refViolation) {
          coverageFailures.push(
            `VIOLAÇÃO CRÍTICA: Registro candidato '${manKey}' em '${dictColl}' referencia entidade protegida: ${refViolation.reason}`
          );
        }
      }
    }
  }

  // 4.2 Verificação de Coleções Operacionais Protegidas (Auditoria Contábil/Fiscal/Filas)
  for (const protColl of PROTECTED_OPERATIONAL_COLLECTIONS) {
    const illegalRecords = manifestRecords.filter((r) => r.collection === protColl);
    if (illegalRecords.length > 0) {
      coverageFailures.push(
        `VIOLAÇÃO CRÍTICA: Coleção operacional protegida '${protColl}' não pode conter registros no manifesto de limpeza (encontrados ${illegalRecords.length} registros).`
      );
    }
  }

  // 4.3 Verificação de Cobertura Integral dos Arrays no DB
  for (const [collName, items] of Object.entries(dbData)) {
    if (
      !Array.isArray(items) ||
      PROTECTED_OPERATIONAL_COLLECTIONS.has(collName) ||
      KNOWN_DB_ORG_DICTIONARIES.has(collName) ||
      KNOWN_DB_SINGLE_ROOT_OBJECTS.has(collName)
    ) {
      continue;
    }

    const expectedArrayCandidates = new Map();
    items.forEach((item, index) => {
      if (typeof item !== "object" || item === null) return;
      let tenantId = collName === "barbershops" ? item.id : (item.barbershop_id || item.organization_id);
      if (tenantId && expectedCandidateOrgsMap.has(tenantId) && !WHITELISTED_ORGS.has(tenantId)) {
        const refViolation = checkSemanticWhitelistedReference(item, tenantId);
        if (refViolation) {
          coverageFailures.push(
            `VIOLAÇÃO CRÍTICA: Registro na coleção '${collName}[${index}]' possui referência a entidade protegida da Whitelist: ${refViolation.reason}`
          );
        } else {
          const recordId = item.id || item.email || item.code || `${collName}_${index}`;
          const physicalPath = `${collName}[${index}]`;
          expectedArrayCandidates.set(physicalPath, { recordId, index, tenantId, item, physicalPath });
        }
      }
    });

    const manifestArrayRecords = manifestRecords.filter(
      (r) => (r.file === dbRelativePath || r.file === "data/kupola_db.json") && r.collection === collName
    );

    // Verificar omissões em arrays do DB
    const omittedInColl = [];
    for (const [expPath, expInfo] of expectedArrayCandidates.entries()) {
      const matching = manifestArrayRecords.find(
        (r) => r.physicalPath === expPath || (r.id === expInfo.recordId && r.physicalPath === expPath)
      );
      if (!matching) {
        omittedInColl.push(expInfo.recordId);
        coverageFailures.push(
          `OMISSÃO NO MANIFESTO: Registro candidato '${expInfo.recordId}' da coleção '${collName}' (${expPath}) em ${dbRelativePath} está ausente de manifestRecords.`
        );
      }
    }

    if (omittedInColl.length > 0) {
      coverageFailures.push(
        `O manifesto omite ${omittedInColl.length} propriedades/registros candidatos em '${collName}' (${omittedInColl.join(", ")})`
      );
    }

    // Verificar correspondência biunívoca e integridade de cada registro de array catalogado
    manifestArrayRecords.forEach((rec) => {
      if (rec.structureType !== "array") {
        coverageFailures.push(
          `Inconsistência de structureType para registro '${rec.id}' em '${collName}': catalogado como '${rec.structureType}', esperado 'array'.`
        );
      }

      if (!rec.physicalPath || typeof rec.physicalPath !== "string") {
        coverageFailures.push(
          `Caminho físico ausente ou inválido para registro '${rec.id}' em '${collName}'.`
        );
        return;
      }

      const match = rec.physicalPath.match(/^([a-zA-Z0-9_]+)\[(\d+)\]$/);
      if (!match || match[1] !== collName) {
        coverageFailures.push(
          `Caminho físico inválido para registro '${rec.id}' em '${collName}': '${rec.physicalPath}'`
        );
        return;
      }

      const idx = parseInt(match[2], 10);
      if (idx >= items.length) {
        coverageFailures.push(
          `Caminho físico inexistente para registro '${rec.id}' em '${collName}': '${rec.physicalPath}' aponta para índice ${idx} fora dos limites (tamanho: ${items.length})`
        );
        return;
      }

      const realItem = items[idx];
      if (typeof realItem !== "object" || realItem === null) {
        coverageFailures.push(
          `Item no caminho físico '${rec.physicalPath}' não é um objeto válido em ${dbRelativePath}`
        );
        return;
      }

      const realId = realItem.id || realItem.email || realItem.code || `${collName}_${idx}`;
      if (realId !== rec.id) {
        coverageFailures.push(
          `Inconsistência de caminho físico para registro '${rec.id}' em '${collName}': caminho '${rec.physicalPath}' aponta para registro com ID diferente ('${realId}')`
        );
      }

      let realTenant = collName === "barbershops" ? realItem.id : (realItem.barbershop_id || realItem.organization_id);
      if (WHITELISTED_ORGS.has(realTenant) || WHITELISTED_ORGS.has(rec.ownerOrgId) || WHITELISTED_ORGS.has(rec.id)) {
        coverageFailures.push(
          `VIOLAÇÃO CRÍTICA: Entidade protegida da Whitelist ('${realTenant || rec.ownerOrgId || rec.id}') foi indevidamente incluída no manifesto para '${collName}'!`
        );
      } else if (realTenant !== rec.ownerOrgId) {
        coverageFailures.push(
          `Inconsistência de ownerOrgId para registro '${rec.id}' em '${collName}': declarado '${rec.ownerOrgId}', real na fonte '${realTenant}'`
        );
      } else if (!expectedCandidateOrgsMap.has(realTenant)) {
        coverageFailures.push(
          `Registro inexistente ou indevido no manifesto para '${collName}': registro '${rec.id}' não pertence a uma organização candidata.`
        );
      } else if (!expectedArrayCandidates.has(rec.physicalPath)) {
        coverageFailures.push(
          `Registro indevido no manifesto para '${collName}': caminho físico '${rec.physicalPath}' não corresponde a um candidato válido nas fontes reais.`
        );
      }

      const refViolation = checkSemanticWhitelistedReference(realItem, realTenant) || checkSemanticWhitelistedReference(rec, realTenant);
      if (refViolation) {
        coverageFailures.push(
          `VIOLAÇÃO CRÍTICA: Registro '${rec.id}' em '${collName}' (${rec.physicalPath}) possui referência a entidade protegida: ${refViolation.reason}`
        );
      }
    });
  }

  // 4.4 Verificação de Cobertura Integral dos Arrays no Storage
  for (const [collName, entries] of Object.entries(storageData)) {
    if (!Array.isArray(entries)) continue;

    const expectedStorageCandidates = new Map();
    entries.forEach((entry, index) => {
      const key = Array.isArray(entry) ? entry[0] : null;
      const value = Array.isArray(entry) ? entry[1] : entry;
      if (typeof value !== "object" || value === null) return;

      let tenantId = collName === "organizations" ? (key || value.id) : (value.organization_id || value.barbershop_id);
      if (tenantId && expectedCandidateOrgsMap.has(tenantId) && !WHITELISTED_ORGS.has(tenantId)) {
        const refViolation = checkSemanticWhitelistedReference(value, tenantId);
        if (refViolation) {
          coverageFailures.push(
            `VIOLAÇÃO CRÍTICA: Registro em storage '${collName}[${index}]' possui referência a entidade protegida da Whitelist: ${refViolation.reason}`
          );
        } else {
          const recordId = value.id || key || `${collName}_${index}`;
          const physicalPath = `${collName}[${index}]`;
          expectedStorageCandidates.set(physicalPath, { recordId, index, tenantId, value, physicalPath });
        }
      }
    });

    const manifestStorageRecords = manifestRecords.filter(
      (r) => (r.file === storageRelativePath || r.file === "data/kupola_storage.json") && r.collection === collName
    );

    // Verificar omissões em storage
    const omittedInStorage = [];
    for (const [expPath, expInfo] of expectedStorageCandidates.entries()) {
      const matching = manifestStorageRecords.find(
        (r) => r.physicalPath === expPath || (r.id === expInfo.recordId && r.physicalPath === expPath)
      );
      if (!matching) {
        omittedInStorage.push(expInfo.recordId);
        coverageFailures.push(
          `OMISSÃO NO MANIFESTO: Registro candidato '${expInfo.recordId}' da coleção '${collName}' em ${storageRelativePath} está ausente de manifestRecords.`
        );
      }
    }

    if (omittedInStorage.length > 0) {
      coverageFailures.push(
        `O manifesto omite ${omittedInStorage.length} propriedades/registros candidatos em '${collName}' (${omittedInStorage.join(", ")})`
      );
    }

    // Verificar correspondência biunívoca e integridade em storage
    manifestStorageRecords.forEach((rec) => {
      if (rec.structureType !== "array") {
        coverageFailures.push(
          `Inconsistência de structureType para registro '${rec.id}' em '${collName}': catalogado como '${rec.structureType}', esperado 'array'.`
        );
      }

      if (!rec.physicalPath || typeof rec.physicalPath !== "string") {
        coverageFailures.push(
          `Caminho físico ausente ou inválido para registro '${rec.id}' em '${collName}'.`
        );
        return;
      }

      const match = rec.physicalPath.match(/^([a-zA-Z0-9_]+)\[(\d+)\]$/);
      if (!match || match[1] !== collName) {
        coverageFailures.push(
          `Caminho físico inválido para registro '${rec.id}' em '${collName}': '${rec.physicalPath}'`
        );
        return;
      }

      const idx = parseInt(match[2], 10);
      if (idx >= entries.length) {
        coverageFailures.push(
          `Caminho físico inexistente para registro '${rec.id}' em '${collName}': '${rec.physicalPath}' aponta para índice ${idx} fora dos limites (tamanho: ${entries.length})`
        );
        return;
      }

      const realEntry = entries[idx];
      const key = Array.isArray(realEntry) ? realEntry[0] : null;
      const value = Array.isArray(realEntry) ? realEntry[1] : realEntry;
      const realId = value.id || key || `${collName}_${idx}`;

      if (realId !== rec.id) {
        coverageFailures.push(
          `Inconsistência de caminho físico para registro '${rec.id}' em '${collName}': caminho '${rec.physicalPath}' aponta para registro com ID diferente ('${realId}')`
        );
      }

      let realTenant = collName === "organizations" ? (key || value.id) : (value.organization_id || value.barbershop_id);
      if (WHITELISTED_ORGS.has(realTenant) || WHITELISTED_ORGS.has(rec.ownerOrgId) || WHITELISTED_ORGS.has(rec.id)) {
        coverageFailures.push(
          `VIOLAÇÃO CRÍTICA: Entidade protegida da Whitelist ('${realTenant || rec.ownerOrgId || rec.id}') foi indevidamente incluída no manifesto para '${collName}'!`
        );
      } else if (realTenant !== rec.ownerOrgId) {
        coverageFailures.push(
          `Inconsistência de ownerOrgId para registro '${rec.id}' em '${collName}': declarado '${rec.ownerOrgId}', real na fonte '${realTenant}'`
        );
      } else if (!expectedCandidateOrgsMap.has(realTenant)) {
        coverageFailures.push(
          `Registro inexistente ou indevido no manifesto para '${collName}': registro '${rec.id}' não pertence a uma organização candidata.`
        );
      } else if (!expectedStorageCandidates.has(rec.physicalPath)) {
        coverageFailures.push(
          `Registro indevido no manifesto para '${collName}': caminho físico '${rec.physicalPath}' não corresponde a um candidato válido nas fontes reais.`
        );
      }

      const refViolation = checkSemanticWhitelistedReference(value, realTenant) || checkSemanticWhitelistedReference(rec, realTenant);
      if (refViolation) {
        coverageFailures.push(
          `VIOLAÇÃO CRÍTICA: Registro '${rec.id}' em '${collName}' (${rec.physicalPath}) possui referência a entidade protegida: ${refViolation.reason}`
        );
      }
    });
  }

  const coveragePassed = coverageFailures.length === 0;
  console.log(`  -> Auditoria de Cobertura Física: ${coveragePassed ? "APROVADO" : "REPROVADO"}`);

  // 5. AUDITORIA DE INTEGRIDADE GERAL E CRIPTOGRAFIA (RESULTADO C)
  console.log("\n[AUDITORIA C] Verificação Criptográfica e Integridade Referencial Geral");

  // 5.1 Duplicidades físicas, IDs lógicos repetidos em diferentes posições físicas e proprietários válidos
  const countsByFileAndCollection = {};
  const seenPhysicalPaths = new Set();
  const duplicatePhysicalPaths = [];
  const repeatedLogicalIdsByCollection = new Map();
  const whitelistedManifestRecords = [];
  let recordsWithoutOwner = 0;
  let recordsWithoutPhysicalPath = 0;
  const idToCollectionsMap = new Map();

  manifestRecords.forEach((rec) => {
    const fileKey = rec.file;
    const col = rec.collection;
    const compositeColl = `${fileKey}::${col}`;
    countsByFileAndCollection[compositeColl] = (countsByFileAndCollection[compositeColl] || 0) + 1;

    // Validação de physicalPath obrigatório
    if (!rec.physicalPath || typeof rec.physicalPath !== "string") {
      recordsWithoutPhysicalPath++;
    } else {
      // Unicidade física estrita: file + physicalPath
      const fullPhysKey = `${fileKey}::${rec.physicalPath}`;
      if (seenPhysicalPaths.has(fullPhysKey)) {
        duplicatePhysicalPaths.push(fullPhysKey);
      } else {
        seenPhysicalPaths.add(fullPhysKey);
      }
    }

    // Rastreamento de IDs lógicos repetidos em posições físicas diferentes na mesma coleção
    const logicalKey = `${fileKey}::${col}::${rec.id}`;
    if (!repeatedLogicalIdsByCollection.has(logicalKey)) {
      repeatedLogicalIdsByCollection.set(logicalKey, [rec.physicalPath]);
    } else {
      repeatedLogicalIdsByCollection.get(logicalKey).push(rec.physicalPath);
    }

    if (!rec.ownerOrgId) {
      recordsWithoutOwner++;
    }

    if (WHITELISTED_ORGS.has(rec.ownerOrgId) || WHITELISTED_ORGS.has(rec.id)) {
      whitelistedManifestRecords.push(`${fileKey}::${col}::${rec.id}`);
    }

    // Validação semântica em profundidade do próprio registro do manifesto
    const refViolation = checkSemanticWhitelistedReference(rec, rec.ownerOrgId);
    if (refViolation) {
      whitelistedManifestRecords.push(`${fileKey}::${col}::${rec.id} (${refViolation.reason})`);
    }

    if (!idToCollectionsMap.has(rec.id)) {
      idToCollectionsMap.set(rec.id, []);
    }
    idToCollectionsMap.get(rec.id).push(compositeColl);
  });

  if (recordsWithoutPhysicalPath > 0) {
    integrityFailures.push(
      `Foram encontrados ${recordsWithoutPhysicalPath} registros no manifesto sem physicalPath válido.`
    );
  }

  if (duplicatePhysicalPaths.length > 0) {
    integrityFailures.push(
      `Foram encontrados ${duplicatePhysicalPaths.length} registros com caminhos físicos duplicados no manifesto: ${duplicatePhysicalPaths.join(", ")}`
    );
  }

  if (recordsWithoutOwner > 0) {
    integrityFailures.push(`Foram encontrados ${recordsWithoutOwner} registros candidatos sem proprietário inequívoco`);
  }

  if (whitelistedManifestRecords.length > 0) {
    integrityFailures.push(
      `VIOLAÇÃO CRÍTICA DA WHITELIST: ${whitelistedManifestRecords.length} registros no manifesto pertencem ou referenciam entidades protegidas (${whitelistedManifestRecords.join(", ")})`
    );
  }

  // Métricas de IDs lógicos repetidos em posições físicas distintas
  let repeatedLogicalCount = 0;
  repeatedLogicalIdsByCollection.forEach((paths) => {
    if (paths.length > 1) {
      repeatedLogicalCount++;
    }
  });

  // Métricas gerais
  const totalPhysicalOccurrences = manifestRecords.length;
  const totalUniqueLogicalIds = idToCollectionsMap.size;
  let sharedCrossFileCount = 0;

  idToCollectionsMap.forEach((occurrences) => {
    if (occurrences.length > 1) sharedCrossFileCount++;
  });

  console.log(`  - Total de Ocorrências Físicas Catalogadas: ${totalPhysicalOccurrences}`);
  console.log(`  - Total de Identificadores Lógicos Únicos:   ${totalUniqueLogicalIds}`);
  console.log(`  - Entidades Compartilhadas Inter-Coleções:   ${sharedCrossFileCount}`);
  console.log(`  - IDs Lógicos Repetidos em Posições Distintas: ${repeatedLogicalCount}`);

  // 5.2 Verificação separada dos hashes atuais contra o estado pré-limpeza esperado
  const currentDbHash = sha256(dbPath);
  const currentStorageHash = sha256(storagePath);

  const expectedPreDb =
    manifest.metadata?.hashesPreCleanup?.["data/kupola_db.json"] ||
    manifest.metadata?.hashesPreCleanup?.["kupola_db.json"] ||
    manifest.metadata?.sha256?.kupola_db ||
    null;

  const expectedPreStorage =
    manifest.metadata?.hashesPreCleanup?.["data/kupola_storage.json"] ||
    manifest.metadata?.hashesPreCleanup?.["kupola_storage.json"] ||
    manifest.metadata?.sha256?.kupola_storage ||
    null;

  console.log(`- SHA-256 DB atual:       ${currentDbHash}`);
  console.log(`- SHA-256 DB esperado:    ${expectedPreDb || "(NÃO DEFINIDO)"}`);
  const isDbMatch = Boolean(currentDbHash && expectedPreDb && currentDbHash === expectedPreDb);
  console.log(`  -> Status DB:           ${isDbMatch ? "APROVADO (INTACTO)" : "DIVERGENTE / REPROVADO"}`);

  console.log(`- SHA-256 Storage atual:    ${currentStorageHash}`);
  console.log(`- SHA-256 Storage esperado: ${expectedPreStorage || "(NÃO DEFINIDO)"}`);
  const isStorageMatch = Boolean(currentStorageHash && expectedPreStorage && currentStorageHash === expectedPreStorage);
  console.log(`  -> Status Storage:      ${isStorageMatch ? "APROVADO (INTACTO)" : "DIVERGENTE / REPROVADO"}`);

  if (!expectedPreDb) {
    integrityFailures.push("Hash esperado de pré-limpeza para kupola_db.json ausente nos metadados do manifesto");
  } else if (!isDbMatch) {
    integrityFailures.push(
      `DIVERGÊNCIA CRIPTOGRÁFICA EM DB: kupola_db.json (${currentDbHash}) diverge do hash esperado (${expectedPreDb})`
    );
  }

  if (!expectedPreStorage) {
    integrityFailures.push("Hash esperado de pré-limpeza para kupola_storage.json ausente nos metadados do manifesto");
  } else if (!isStorageMatch) {
    integrityFailures.push(
      `DIVERGÊNCIA CRIPTOGRÁFICA EM STORAGE: kupola_storage.json (${currentStorageHash}) diverge do hash esperado (${expectedPreStorage})`
    );
  }

  // 5.3 Verificação de compatibilidade com Backup (se informado)
  const backupDir = options.backupDir || manifest.metadata?.backupLocation;
  if (!backupDir) {
    warnings.push("Diretório de backup não especificado nos metadados do manifesto");
  } else if (!fs.existsSync(backupDir)) {
    integrityFailures.push(`Diretório de backup especificado não existe: ${backupDir}`);
  } else {
    const shaSumsPath = path.join(backupDir, "sha256sums.txt");
    if (!fs.existsSync(shaSumsPath)) {
      integrityFailures.push(`Arquivo sha256sums.txt ausente no diretório de backup: ${backupDir}`);
    } else {
      const backupDbHash = sha256(path.join(backupDir, "kupola_db.json"));
      const backupStorageHash = sha256(path.join(backupDir, "kupola_storage.json"));
      if (expectedPreDb && backupDbHash !== expectedPreDb) {
        integrityFailures.push(
          `DIVERGÊNCIA NO BACKUP: kupola_db.json do backup (${backupDbHash}) não corresponde ao hash esperado no manifesto (${expectedPreDb})`
        );
      }
      if (expectedPreStorage && backupStorageHash !== expectedPreStorage) {
        integrityFailures.push(
          `DIVERGÊNCIA NO BACKUP: kupola_storage.json do backup (${backupStorageHash}) não corresponde ao hash esperado no manifesto (${expectedPreStorage})`
        );
      }
    }
  }

  const integrityPassed = integrityFailures.length === 0;

  // 6. VEREDITO COMBINADO FINAL
  const allFailures = [...classificationFailures, ...coverageFailures, ...integrityFailures];
  const isApproved = classificationPassed && coveragePassed && integrityPassed && allFailures.length === 0;
  const verdict = isApproved ? "APROVADO" : "REPROVADO";

  console.log("\n================================================================");
  console.log(`VEREDITO FINAL DA AUDITORIA: ${verdict}`);
  console.log(`  [Resultado A] Auditoria da Classificação: ${classificationPassed ? "APROVADO" : "REPROVADO"}`);
  console.log(`  [Resultado B] Auditoria da Cobertura:     ${coveragePassed ? "APROVADO" : "REPROVADO"}`);
  console.log(`  [Resultado C] Auditoria de Integridade:   ${integrityPassed ? "APROVADO" : "REPROVADO"}`);
  console.log(`- Total de Falhas: ${allFailures.length}`);
  console.log(`- Total de Avisos: ${warnings.length}`);

  if (allFailures.length > 0) {
    console.log("\nDetalhamento das Falhas:");
    allFailures.forEach((f, idx) => console.log(`  ${idx + 1}. [FALHA] ${f}`));
  }

  if (warnings.length > 0) {
    console.log("\nAvisos de Segurança:");
    warnings.forEach((w, idx) => console.log(`  - [AVISO] ${w}`));
  }
  console.log("================================================================\n");

  return {
    success: isApproved,
    verdict,
    classificationAudit: {
      passed: classificationPassed,
      failures: classificationFailures,
      expectedCandidateCount: expectedCandidateOrgsMap.size,
      manifestCandidateCount: manifestCandidateOrgsMap.size,
    },
    coverageAudit: {
      passed: coveragePassed,
      failures: coverageFailures,
    },
    integrityAudit: {
      passed: integrityPassed,
      failures: integrityFailures,
    },
    failures: allFailures,
    warnings,
    metrics: {
      totalPhysicalOccurrences,
      totalUniqueLogicalIds,
      sharedCrossFileCount,
      repeatedLogicalCount,
      candidateOrgsCount: manifestCandidateOrgsMap.size,
    },
    hashes: {
      currentDbHash,
      currentStorageHash,
      expectedPreDb,
      expectedPreStorage,
      isDbMatch,
      isStorageMatch,
    },
  };
}

if (process.argv[1] && process.argv[1].endsWith("verify_manifest_and_rollback.mjs")) {
  try {
    const res = verifyManifestAndRollback();
    if (!res.success) {
      process.exit(1);
    }
  } catch (err) {
    console.error("[ERRO CRÍTICO NO VERIFICADOR]:", err.message);
    process.exit(1);
  }
}
