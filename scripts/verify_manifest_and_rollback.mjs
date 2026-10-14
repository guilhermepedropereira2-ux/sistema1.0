import fs from "fs";
import path from "path";
import crypto from "crypto";
import { classifyOrganization, WHITELISTED_ORGS } from "./plan_reversible_cleanup.mjs";

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
      `Duplicidade em candidateOrgs no manifesto: ${duplicateManifestCandidateOrgs.length} organizações duplicadas (${duplicateManifestCandidateOrgs.join(", ")})`
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

  // 4. AUDITORIA DA COBERTURA FÍSICA EXATA DOS DICIONÁRIOS (RESULTADO B)
  console.log("\n[AUDITORIA B] Verificação da Cobertura Física Exata dos Dicionários (subscriptions e settingsMap)");

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
        expectedDictCandidates.set(key, val);
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
    const manifestDictRecords = manifestRecords.filter((r) => r.collection === dictColl);

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

    // 4.1 Verificar se TODAS as chaves candidatas esperadas estão no manifesto
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

    // 4.2 Verificar se há registros no manifesto que NÃO existem nos dados reais ou pertencem à whitelist
    for (const [manKey, rec] of manifestDictRecordsByKey.entries()) {
      if (protectedDictKeys.has(manKey) || WHITELISTED_ORGS.has(manKey)) {
        coverageFailures.push(
          `VIOLAÇÃO CRÍTICA: Entidade protegida da Whitelist ('${manKey}') foi indevidamente incluída no manifesto para '${dictColl}'!`
        );
      } else if (!expectedDictCandidates.has(manKey)) {
        coverageFailures.push(
          `Registro inexistente ou indevido no manifesto para '${dictColl}': chave '${manKey}' não existe nos dados reais ou não pertence a uma organização candidata.`
        );
      }
    }
  }

  const coveragePassed = coverageFailures.length === 0;
  console.log(`  -> Auditoria de Cobertura Física: ${coveragePassed ? "APROVADO" : "REPROVADO"}`);

  // 5. AUDITORIA DE INTEGRIDADE GERAL E CRIPTOGRAFIA (RESULTADO C)
  console.log("\n[AUDITORIA C] Verificação Criptográfica e Integridade Referencial Geral");

  // 5.1 Duplicidades gerais e proprietários válidos em manifestRecords
  const countsByFileAndCollection = {};
  const seenPhysicalKeys = new Set();
  const duplicatePhysicalKeys = [];
  let recordsWithoutOwner = 0;
  const idToCollectionsMap = new Map();

  manifestRecords.forEach((rec) => {
    const fileKey = rec.file;
    const col = rec.collection;
    const compositeColl = `${fileKey}::${col}`;
    countsByFileAndCollection[compositeColl] = (countsByFileAndCollection[compositeColl] || 0) + 1;

    const recordUniqueKey = `${fileKey}::${col}::${rec.id}`;
    if (seenPhysicalKeys.has(recordUniqueKey)) {
      duplicatePhysicalKeys.push(recordUniqueKey);
    } else {
      seenPhysicalKeys.add(recordUniqueKey);
    }

    if (!rec.ownerOrgId) {
      recordsWithoutOwner++;
    }

    if (!idToCollectionsMap.has(rec.id)) {
      idToCollectionsMap.set(rec.id, []);
    }
    idToCollectionsMap.get(rec.id).push(compositeColl);
  });

  if (duplicatePhysicalKeys.length > 0) {
    integrityFailures.push(
      `Foram encontrados ${duplicatePhysicalKeys.length} registros com caminhos físicos duplicados na mesma coleção`
    );
  }
  if (recordsWithoutOwner > 0) {
    integrityFailures.push(`Foram encontrados ${recordsWithoutOwner} registros candidatos sem proprietário inequívoco`);
  }

  // Métricas
  const totalPhysicalOccurrences = manifestRecords.length;
  const totalUniqueLogicalIds = idToCollectionsMap.size;
  let sharedCrossFileCount = 0;
  idToCollectionsMap.forEach((occurrences) => {
    if (occurrences.length > 1) sharedCrossFileCount++;
  });

  console.log(`  - Total de Ocorrências Físicas Catalogadas: ${totalPhysicalOccurrences}`);
  console.log(`  - Total de Identificadores Lógicos Únicos:   ${totalUniqueLogicalIds}`);
  console.log(`  - Entidades Compartilhadas Inter-Coleções:   ${sharedCrossFileCount}`);

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
