import fs from "fs";
import path from "path";
import crypto from "crypto";

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
  console.log("KUPOLA 2.0 — VERIFICAÇÃO DINÂMICA DE INTEGRIDADE, MANIFESTO E ROLLBACK");
  console.log("===================================================================================\n");

  const failures = [];
  const warnings = [];

  // 1. CARREGAMENTO E PARSING DO MANIFESTO
  if (!fs.existsSync(manifestPath)) {
    failures.push(`Manifesto não encontrado no caminho: ${manifestPath}`);
    return { success: false, verdict: "REPROVADO", failures, warnings };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    console.log("[PASS 1] Manifesto JSON lido e parseado com sucesso.");
  } catch (e) {
    failures.push(`Manifesto JSON inválido ou corrompido: ${e.message}`);
    return { success: false, verdict: "REPROVADO", failures, warnings };
  }

  const records = Array.isArray(manifest.manifestRecords) ? manifest.manifestRecords : [];
  console.log(`- Ocorrências físicas catalogadas no manifesto: ${records.length}`);

  // 2. AUDITORIA DE COBERTURA, ESTRUTURAS E DUPLICIDADES
  const countsByFileAndCollection = {};
  const seenPhysicalKeys = new Set();
  const duplicatePhysicalKeys = [];
  let recordsWithoutOwner = 0;
  const idToCollectionsMap = new Map();

  records.forEach((rec) => {
    const fileKey = rec.file;
    const col = rec.collection;
    const compositeColl = `${fileKey}::${col}`;
    countsByFileAndCollection[compositeColl] = (countsByFileAndCollection[compositeColl] || 0) + 1;

    // Duplicidade física na mesma coleção
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

  console.log("\n--- Contagem Detalhada por Arquivo e Coleção ---");
  Object.entries(countsByFileAndCollection).forEach(([key, count]) => {
    console.log(`  - ${key.padEnd(45)} : ${count} ocorrências`);
  });

  if (duplicatePhysicalKeys.length > 0) {
    failures.push(`Foram encontrados ${duplicatePhysicalKeys.length} registros com IDs duplicados na mesma coleção física`);
  }
  if (recordsWithoutOwner > 0) {
    failures.push(`Foram encontrados ${recordsWithoutOwner} registros candidatos sem proprietário inequívoco`);
  }

  // 3. ENTIDADES ÚNICAS E COMPARTILHADAS (DISTINÇÃO METODOLÓGICA)
  const totalPhysicalOccurrences = records.length;
  const totalUniqueLogicalIds = idToCollectionsMap.size;
  let sharedCrossFileCount = 0;
  idToCollectionsMap.forEach((occurrences) => {
    if (occurrences.length > 1) sharedCrossFileCount++;
  });

  console.log("\n--- Métricas Lógicas e Físicas ---");
  console.log(`  - Total de Ocorrências Físicas:            ${totalPhysicalOccurrences}`);
  console.log(`  - Total de Identificadores Lógicos Únicos:  ${totalUniqueLogicalIds}`);
  console.log(`  - Entidades Compartilhadas Inter-Coleções:  ${sharedCrossFileCount}`);
  console.log("  * Nota: Uma mesma entidade conceitual (ex: usuário) pode possuir ocorrências físicas em múltiplos arquivos.");

  // 4. VERIFICAÇÃO DE CANDIDATAS E ISOLAMENTO DA WHITELIST
  const rawCandidateOrgs = manifest.candidateOrgs || [];
  const candidateOrgs = new Set(rawCandidateOrgs.map((o) => (typeof o === "string" ? o : o.id)));
  console.log(`\n[PASS 2] Organizações candidatas mapeadas no manifesto: ${candidateOrgs.size}`);

  const whitelistedIds = new Set(["demo_vintage", "org_vintage", "unit_shopping", "vintage_barbershop"]);
  const whitelistedEntitiesFound = [];
  let invalidOwnerCount = 0;

  records.forEach((rec) => {
    if (whitelistedIds.has(rec.id) || whitelistedIds.has(rec.ownerOrgId)) {
      whitelistedEntitiesFound.push({ id: rec.id, owner: rec.ownerOrgId, col: rec.collection });
    }
    if (!candidateOrgs.has(rec.ownerOrgId)) {
      invalidOwnerCount++;
    }
  });

  if (whitelistedEntitiesFound.length > 0) {
    failures.push(`VIOLAÇÃO CRÍTICA: ${whitelistedEntitiesFound.length} entidades protegidas da Whitelist foram encontradas no manifesto!`);
  }
  if (invalidOwnerCount > 0) {
    failures.push(`Foram encontrados ${invalidOwnerCount} registros com proprietário fora da lista de organizações candidatas`);
  }

  // 5. AUDITORIA DE COBERTURA CONTRA O BANCO DE DADOS REAL
  let dbData = null;
  let storageData = null;

  if (fs.existsSync(dbPath)) {
    try {
      dbData = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    } catch (e) {
      failures.push(`Falha ao ler dados de ${dbPath}: ${e.message}`);
    }
  } else {
    failures.push(`Arquivo de banco de dados não encontrado: ${dbPath}`);
  }

  if (fs.existsSync(storagePath)) {
    try {
      storageData = JSON.parse(fs.readFileSync(storagePath, "utf8"));
    } catch (e) {
      failures.push(`Falha ao ler dados de ${storagePath}: ${e.message}`);
    }
  } else {
    failures.push(`Arquivo de storage não encontrado: ${storagePath}`);
  }

  // Verificar se o manifesto cobre os dicionários subscriptions e settingsMap
  if (dbData) {
    const subInManifest = records.filter((r) => r.collection === "subscriptions").length;
    const setInManifest = records.filter((r) => r.collection === "settingsMap").length;

    const subCandidateKeysInDb = Object.keys(dbData.subscriptions || {}).filter(
      (k) => !whitelistedIds.has(k) && candidateOrgs.has(k)
    ).length;
    const setCandidateKeysInDb = Object.keys(dbData.settingsMap || {}).filter(
      (k) => !whitelistedIds.has(k) && candidateOrgs.has(k)
    ).length;

    if (subCandidateKeysInDb > 0 && subInManifest === 0) {
      warnings.push(
        `MANIFESTO INCOMPLETO: Existem ${subCandidateKeysInDb} chaves candidatas no dicionário 'subscriptions' em ${path.basename(dbPath)}, mas nenhuma foi catalogada no manifesto.`
      );
      failures.push(
        `O manifesto atual está incompleto: omite ${subCandidateKeysInDb} propriedades candidatas em 'subscriptions'.`
      );
    }

    if (setCandidateKeysInDb > 0 && setInManifest === 0) {
      warnings.push(
        `MANIFESTO INCOMPLETO: Existem ${setCandidateKeysInDb} chaves candidatas no dicionário 'settingsMap' em ${path.basename(dbPath)}, mas nenhuma foi catalogada no manifesto.`
      );
      failures.push(
        `O manifesto atual está incompleto: omite ${setCandidateKeysInDb} propriedades candidatas em 'settingsMap'.`
      );
    }
  }

  // 6. VERIFICAÇÃO SEPARADA DOS HASHES ATUAIS CONTRA O ESTADO PRÉ-LIMPEZA
  console.log("\n[PASS 3] Verificação Criptográfica Separada dos Hashes Atuais");
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
    failures.push("Hash esperado de pré-limpeza para kupola_db.json ausente nos metadados do manifesto");
  } else if (!isDbMatch) {
    failures.push(
      `DIVERGÊNCIA CRIPTOGRÁFICA EM DB: kupola_db.json (${currentDbHash}) diverge do hash de pré-limpeza (${expectedPreDb})`
    );
  }

  if (!expectedPreStorage) {
    failures.push("Hash esperado de pré-limpeza para kupola_storage.json ausente nos metadados do manifesto");
  } else if (!isStorageMatch) {
    failures.push(
      `DIVERGÊNCIA CRIPTOGRÁFICA EM STORAGE: kupola_storage.json (${currentStorageHash}) diverge do hash de pré-limpeza (${expectedPreStorage})`
    );
  }

  // 7. VERIFICAÇÃO DO BACKUP E TESTE DE RESTAURAÇÃO ISOLADO
  console.log("\n[PASS 4] Verificação do Diretório de Backup");
  const backupDir = options.backupDir || manifest.metadata?.backupLocation;
  let backupValid = false;

  if (!backupDir) {
    warnings.push("Diretório de backup não especificado nos metadados do manifesto");
  } else if (!fs.existsSync(backupDir)) {
    failures.push(`Diretório de backup especificado não existe: ${backupDir}`);
  } else {
    const shaSumsPath = path.join(backupDir, "sha256sums.txt");
    if (!fs.existsSync(shaSumsPath)) {
      failures.push(`Arquivo sha256sums.txt ausente no diretório de backup: ${backupDir}`);
    } else {
      const backupDbHash = sha256(path.join(backupDir, "kupola_db.json"));
      const backupStorageHash = sha256(path.join(backupDir, "kupola_storage.json"));

      // Validar correspondência do backup com os hashes esperados do manifesto
      if (expectedPreDb && backupDbHash !== expectedPreDb) {
        failures.push(
          `DIVERGÊNCIA NO BACKUP: O arquivo kupola_db.json do backup (${backupDbHash}) não corresponde ao hash esperado no manifesto (${expectedPreDb})`
        );
      }
      if (expectedPreStorage && backupStorageHash !== expectedPreStorage) {
        failures.push(
          `DIVERGÊNCIA NO BACKUP: O arquivo kupola_storage.json do backup (${backupStorageHash}) não corresponde ao hash esperado no manifesto (${expectedPreStorage})`
        );
      }

      // Teste de restauração isolado em /tmp
      const tmpDir = path.join("/tmp", `test_restore_verify_${Date.now()}`);
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
        const restoredDb = path.join(tmpDir, "kupola_db.json");
        const restoredStorage = path.join(tmpDir, "kupola_storage.json");

        fs.copyFileSync(path.join(backupDir, "kupola_db.json"), restoredDb);
        fs.copyFileSync(path.join(backupDir, "kupola_storage.json"), restoredStorage);

        const testDbHash = sha256(restoredDb);
        const testStorageHash = sha256(restoredStorage);

        if (testDbHash === backupDbHash && testStorageHash === backupStorageHash) {
          backupValid = true;
          console.log(`- Restauração de teste em sandbox: SUCESSO`);
        } else {
          failures.push("Falha de integridade durante a restauração de teste em diretório temporário");
        }
      } catch (err) {
        failures.push(`Exceção durante teste de restauração isolado: ${err.message}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  }

  // 8. VEREDITO FINAL CALCULADO DINAMICAMENTE
  const isApproved = failures.length === 0;
  const verdict = isApproved ? "APROVADO" : "REPROVADO";

  console.log("\n================================================================");
  console.log(`VEREDITO DA AUDITORIA: ${verdict}`);
  console.log(`- Falhas Detectadas:    ${failures.length}`);
  console.log(`- Avisos Registrados:   ${warnings.length}`);
  if (failures.length > 0) {
    console.log("\nMotivos da Reprovação:");
    failures.forEach((f, idx) => console.log(`  ${idx + 1}. [FALHA] ${f}`));
  }
  if (warnings.length > 0) {
    console.log("\nAvisos de Segurança:");
    warnings.forEach((w, idx) => console.log(`  - [AVISO] ${w}`));
  }
  console.log("================================================================\n");

  return {
    success: isApproved,
    verdict,
    failures,
    warnings,
    metrics: {
      totalPhysicalOccurrences,
      totalUniqueLogicalIds,
      sharedCrossFileCount,
      candidateOrgsCount: candidateOrgs.size,
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
