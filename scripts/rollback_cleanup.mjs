import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * DOCUMENTAÇÃO DE LIMITAÇÃO TÉCNICA DO NODE.JS / SISTEMA DE ARQUIVOS (POSIX / WINDOWS):
 * As chamadas de sistema do SO (fs.renameSync) oferecem atomicidade individual por arquivo, mas o Node.js e o sistema de arquivos
 * não fornecem suporte nativo a transações multi-arquivo verdadeiramente atômicas e simultâneas entre múltiplos arquivos JSON
 * ('kupola_db.json' e 'kupola_storage.json').
 * Para mitigar esse limite físico sem simular falsa atomicidade perfeita:
 * 1. Os arquivos de backup são validados previamente e preparados em arquivos temporários (.tmp).
 * 2. É gerado um snapshot pré-rollback validado criptograficamente com hashes SHA-256.
 * 3. É feita a verificação de correspondência entre o backup e os hashes de pré-limpeza do manifesto validado.
 * 4. É feita a substituição sequencial protegida via fs.renameSync.
 * 5. Se a substituição do segundo arquivo falhar, o script executa a reversão automática do primeiro arquivo para o snapshot.
 * 6. Se a reversão do primeiro arquivo falhar, emite diagnóstico forense com hashes reais e preserva o snapshot.
 * 7. Se a validação final pós-restauração falhar, o script executa a reversão automática de AMBOS os arquivos para o snapshot.
 * 8. Se a própria reversão do snapshot falhar, os artefatos são preservados e um relatório forense detalhado é emitido.
 */

export function calculateHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function validateSha256SumsFile(shaFilePath, backupDir) {
  if (!fs.existsSync(shaFilePath)) {
    throw new Error(`FALHA DE SEGURANÇA NO ROLLBACK: Arquivo 'sha256sums.txt' ausente em ${shaFilePath}`);
  }

  const shaContent = fs.readFileSync(shaFilePath, "utf-8");
  const lines = shaContent.split(/\r?\n/);

  const parsedEntries = new Map(); // filename -> hash
  const seenHashes = new Set();    // hash set

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Permitir linhas em branco e comentários iniciados por #
    if (!line || line.startsWith("#")) continue;

    // Formato padrão sha256sum: 64 caracteres hexadecimais, seguidos de espaços/asterisco e nome do arquivo
    const match = line.match(/^([a-fA-F0-9]{64})\s+(?:\*| )?(.+)$/);
    if (!match) {
      throw new Error(
        `LINHA INVÁLIDA EM sha256sums.txt (linha ${i + 1}): "${rawLine}". Formato esperado: <64-hex-hash>  <filename>`
      );
    }

    const hash = match[1].toLowerCase();
    const rawFileName = match[2].trim();
    const fileName = path.basename(rawFileName);

    if (parsedEntries.has(fileName)) {
      throw new Error(`REGISTRO DUPLICADO EM sha256sums.txt: Arquivo '${fileName}' aparece mais de uma vez.`);
    }

    if (seenHashes.has(hash)) {
      throw new Error(`HASH DUPLICADO EM sha256sums.txt: O hash '${hash}' está associado a múltiplos registros.`);
    }

    parsedEntries.set(fileName, hash);
    seenHashes.add(hash);
  }

  // Verificar presença obrigatória dos arquivos principais
  const requiredFiles = ["kupola_db.json", "kupola_storage.json"];
  for (const reqFile of requiredFiles) {
    if (!parsedEntries.has(reqFile)) {
      throw new Error(`ARQUIVO OBRIGATÓRIO AUSENTE EM sha256sums.txt: '${reqFile}' não consta no registro de hashes.`);
    }
  }

  // Verificar integridade física de cada arquivo registrado em sha256sums.txt
  for (const [fileName, expectedHash] of parsedEntries.entries()) {
    const filePath = path.join(backupDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `ARQUIVO REGISTRADO AUSENTE NO BACKUP: O arquivo '${fileName}' consta em sha256sums.txt mas não existe em ${backupDir}`
      );
    }

    const actualHash = calculateHash(filePath);
    if (actualHash !== expectedHash) {
      throw new Error(
        `DIVERGÊNCIA DE HASH SHA-256 NO BACKUP: O arquivo '${fileName}' (${actualHash}) não corresponde ao hash registrado em sha256sums.txt (${expectedHash})`
      );
    }
  }

  return parsedEntries;
}

export function performRollback(targetBackupDir = null, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const backupsDir = path.join(rootDir, "backups");
  const targetDbPath = path.join(rootDir, "data", "kupola_db.json");
  const targetStoragePath = path.join(rootDir, "data", "kupola_storage.json");

  // 1. Exigir explicitamente a confirmação antes de qualquer operação
  const isConfirmed =
    options.confirm === true ||
    process.env.CONFIRM_ROLLBACK === "true" ||
    process.env.CONFIRM_ROLLBACK === "1" ||
    process.env.CONFIRM === "true" ||
    process.argv.includes("--confirm");

  if (!isConfirmed) {
    throw new Error(
      "FALHA DE CONFIRMAÇÃO: A restauração exige confirmação explícita (opção confirm: true, flag --confirm ou variável de ambiente CONFIRM_ROLLBACK=true). Operação interrompida e bloqueada antes de criar snapshots ou alterar arquivos."
    );
  }

  // 2. Exigir explicitamente o caminho do backup via argumento, env var ou opção (NUNCA escolha automática)
  let selectedBackupDir = targetBackupDir || process.env.BACKUP_DIR || options.backupDir || null;

  if (!selectedBackupDir) {
    throw new Error(
      "ERRO CRÍTICO DE SEGURANÇA: Nenhum diretório de backup foi especificado. " +
        "O rollback exige a especificação explícita do caminho do backup via argumento de linha de comando " +
        "ou variável de ambiente (BACKUP_DIR). A seleção automática está desativada."
    );
  }

  if (!path.isAbsolute(selectedBackupDir)) {
    selectedBackupDir = path.resolve(rootDir, selectedBackupDir);
  }

  if (!fs.existsSync(selectedBackupDir) || !fs.statSync(selectedBackupDir).isDirectory()) {
    throw new Error(`FALHA DE SEGURANÇA: O diretório de backup especificado não existe: ${selectedBackupDir}`);
  }

  console.log(`=== RESTAURAÇÃO / ROLLBACK SEGURA A PARTIR DE: ${selectedBackupDir} ===`);

  const backupDb = path.join(selectedBackupDir, "kupola_db.json");
  const backupStorage = path.join(selectedBackupDir, "kupola_storage.json");
  const shaFile = path.join(selectedBackupDir, "sha256sums.txt");

  if (!fs.existsSync(backupDb) || !fs.existsSync(backupStorage)) {
    throw new Error(`FALHA DE SEGURANÇA: Arquivos de backup incompletos no diretório ${selectedBackupDir}`);
  }

  // 3. Validar rigorosamente o sha256sums.txt linha por linha (rejeitar duplicados, inválidos, ausentes)
  const verifiedBackupHashes = validateSha256SumsFile(shaFile, selectedBackupDir);
  const backupDbHash = verifiedBackupHashes.get("kupola_db.json");
  const backupStorageHash = verifiedBackupHashes.get("kupola_storage.json");

  // 4. Verificar o estado atual dos arquivos de dados contra estados conhecidos e consistentes (SEM BYPASS / FORCE_ROLLBACK)
  const currentDbHash = calculateHash(targetDbPath);
  const currentStorageHash = calculateHash(targetStoragePath);

  console.log(`- Estado atual de kupola_db.json:      ${currentDbHash || "(não existe)"}`);
  console.log(`- Estado atual de kupola_storage.json: ${currentStorageHash || "(não existe)"}`);

  let expectedDbHash =
    options.expectedCurrentHashes?.["kupola_db.json"] ||
    options.expectedCurrentHashes?.["data/kupola_db.json"] ||
    null;
  let expectedStorageHash =
    options.expectedCurrentHashes?.["kupola_storage.json"] ||
    options.expectedCurrentHashes?.["data/kupola_storage.json"] ||
    null;

  let recognizedStateName = null;
  let preDb = null;
  let preStorage = null;

  if (expectedDbHash && expectedStorageHash) {
    recognizedStateName = "EXPLICIT_OPTIONS";
    if (currentDbHash !== expectedDbHash || currentStorageHash !== expectedStorageHash) {
      throw new Error(
        `ALERTA DE SEGURANÇA NO ROLLBACK: A base de dados atual possui alterações divergentes dos hashes esperados fornecidos!\n` +
          `  kupola_db.json: atual (${currentDbHash}) vs esperado (${expectedDbHash})\n` +
          `  kupola_storage.json: atual (${currentStorageHash}) vs esperado (${expectedStorageHash})\n` +
          `A restauração foi BLOQUEADA sem possibilidade de bypass automático para evitar a perda de dados.`
      );
    }
    // Se hashes esperados explícitos foram passados, usar como referência de pré-limpeza se não houver manifesto
    preDb = expectedDbHash;
    preStorage = expectedStorageHash;
  } else {
    // Buscar manifestos nos caminhos potenciais
    const backupManifestPath = path.join(selectedBackupDir, "cleanup_manifest.json");
    const dataManifestPath = path.join(rootDir, "data", "cleanup_manifest.json");

    const hasBackupManifest = fs.existsSync(backupManifestPath);
    const hasDataManifest = fs.existsSync(dataManifestPath);

    if (!hasBackupManifest && !hasDataManifest) {
      throw new Error(
        "FALHA DE VALIDAÇÃO DE SEGURANÇA: Não foi possível determinar e verificar os hashes esperados para o estado atual dos arquivos (manifesto ausente e expectedCurrentHashes não fornecido). Operação interrompida."
      );
    }

    let backupManifest = null;
    let dataManifest = null;

    if (hasBackupManifest) {
      try {
        backupManifest = JSON.parse(fs.readFileSync(backupManifestPath, "utf-8"));
      } catch (e) {
        throw new Error(`FALHA DE VALIDAÇÃO DO MANIFESTO: Não foi possível ler o manifesto do backup: ${e.message}`);
      }
    }

    if (hasDataManifest) {
      try {
        dataManifest = JSON.parse(fs.readFileSync(dataManifestPath, "utf-8"));
      } catch (e) {
        throw new Error(`FALHA DE VALIDAÇÃO DO MANIFESTO: Não foi possível ler o manifesto de dados: ${e.message}`);
      }
    }

    // Se houver manifestos em ambos os locais, verificar compatibilidade estrita!
    if (hasBackupManifest && hasDataManifest) {
      const bPreDb =
        backupManifest.metadata?.hashesPreCleanup?.["data/kupola_db.json"] ||
        backupManifest.metadata?.hashesPreCleanup?.["kupola_db.json"] ||
        backupManifest.metadata?.sha256?.kupola_db;
      const dPreDb =
        dataManifest.metadata?.hashesPreCleanup?.["data/kupola_db.json"] ||
        dataManifest.metadata?.hashesPreCleanup?.["kupola_db.json"] ||
        dataManifest.metadata?.sha256?.kupola_db;

      const bPreStorage =
        backupManifest.metadata?.hashesPreCleanup?.["data/kupola_storage.json"] ||
        backupManifest.metadata?.hashesPreCleanup?.["kupola_storage.json"] ||
        backupManifest.metadata?.sha256?.kupola_storage;
      const dPreStorage =
        dataManifest.metadata?.hashesPreCleanup?.["data/kupola_storage.json"] ||
        dataManifest.metadata?.hashesPreCleanup?.["kupola_storage.json"] ||
        dataManifest.metadata?.sha256?.kupola_storage;

      if (bPreDb !== dPreDb || bPreStorage !== dPreStorage) {
        throw new Error(
          `CONFLITO DE MANIFESTOS DETECTADO: O manifesto no backup e o manifesto na raiz de dados possuem hashes de pré-limpeza incompatíveis!\n` +
            `  Backup Pre-Cleanup: DB=${bPreDb}, Storage=${bPreStorage}\n` +
            `  Data Pre-Cleanup:   DB=${dPreDb}, Storage=${dPreStorage}\n` +
            `A restauração foi BLOQUEADA para evitar escolha arbitrária de manifesto incompatível.`
        );
      }
    }

    const manifest = backupManifest || dataManifest;

    preDb =
      manifest.metadata?.hashesPreCleanup?.["data/kupola_db.json"] ||
      manifest.metadata?.hashesPreCleanup?.["kupola_db.json"] ||
      manifest.metadata?.sha256?.kupola_db ||
      null;
    preStorage =
      manifest.metadata?.hashesPreCleanup?.["data/kupola_storage.json"] ||
      manifest.metadata?.hashesPreCleanup?.["kupola_storage.json"] ||
      manifest.metadata?.sha256?.kupola_storage ||
      null;

    const postDb =
      manifest.metadata?.hashesPostCleanup?.["data/kupola_db.json"] ||
      manifest.metadata?.hashesPostCleanup?.["kupola_db.json"] ||
      null;
    const postStorage =
      manifest.metadata?.hashesPostCleanup?.["data/kupola_storage.json"] ||
      manifest.metadata?.hashesPostCleanup?.["kupola_storage.json"] ||
      null;

    const matchesPre = Boolean(preDb && preStorage && currentDbHash === preDb && currentStorageHash === preStorage);
    const matchesPost = Boolean(postDb && postStorage && currentDbHash === postDb && currentStorageHash === postStorage);

    // Detecção de estado misto / inconsistente
    const dbMatchesPre = preDb && currentDbHash === preDb;
    const dbMatchesPost = postDb && currentDbHash === postDb;
    const storageMatchesPre = preStorage && currentStorageHash === preStorage;
    const storageMatchesPost = postStorage && currentStorageHash === postStorage;

    if ((dbMatchesPre && storageMatchesPost) || (dbMatchesPost && storageMatchesPre)) {
      throw new Error(
        `ALERTA DE SEGURANÇA NO ROLLBACK: Estado inconsistente e misto detectado entre os arquivos!\n` +
          `  kupola_db.json corresponde ao estado ${dbMatchesPre ? "PRÉ-LIMPEZA" : "PÓS-LIMPEZA"},\n` +
          `  enquanto kupola_storage.json corresponde ao estado ${storageMatchesPre ? "PRÉ-LIMPEZA" : "PÓS-LIMPEZA"}.\n` +
          `A restauração foi BLOQUEADA devido a combinação incompatível entre os bancos de dados.`
      );
    }

    if (matchesPost) {
      recognizedStateName = "POST_CLEANUP";
      expectedDbHash = postDb;
      expectedStorageHash = postStorage;
    } else if (matchesPre) {
      recognizedStateName = "PRE_CLEANUP";
      expectedDbHash = preDb;
      expectedStorageHash = preStorage;
    } else {
      throw new Error(
        `ALERTA DE SEGURANÇA NO ROLLBACK: A base de dados atual possui alterações divergentes do estado esperado!\n` +
          `  kupola_db.json atual: ${currentDbHash} (esperado pré: ${preDb || "N/A"}, pós: ${postDb || "N/A"})\n` +
          `  kupola_storage.json atual: ${currentStorageHash} (esperado pré: ${preStorage || "N/A"}, pós: ${postStorage || "N/A"})\n` +
          `O estado atual não corresponde integralmente a nenhum estado conhecido (pré-limpeza ou pós-limpeza).\n` +
          `A restauração foi BLOQUEADA sem possibilidade de bypass automático para evitar a perda de dados.`
      );
    }
  }

  console.log(`- Estado atual validado como consistente: ${recognizedStateName}`);

  // 4.1 Validação de correspondência entre os arquivos do backup e o estado de pré-limpeza esperado do manifesto
  if (preDb && preStorage) {
    if (backupDbHash !== preDb || backupStorageHash !== preStorage) {
      throw new Error(
        `ALERTA DE SEGURANÇA NO ROLLBACK: Os arquivos do backup selecionado são internamente íntegros, mas DIVERGEM dos hashes de pré-limpeza esperados registrados no manifesto!\n` +
          `  kupola_db.json no backup:      ${backupDbHash} vs manifesto (${preDb})\n` +
          `  kupola_storage.json no backup: ${backupStorageHash} vs manifesto (${preStorage})\n` +
          `A restauração foi BLOQUEADA antes de qualquer substituição para evitar restauração de backup incompatível.`
      );
    }
    console.log("- Correspondência do backup com o manifesto esperado: APROVADO (100% IDÊNTICO)");
  }

  // 5. Preservar cópia de segurança (snapshot) do estado atual e validá-la antes da restauração
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const preRollbackTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const preRollbackDir = path.join(backupsDir, `pre-rollback-${preRollbackTimestamp}`);
  fs.mkdirSync(preRollbackDir, { recursive: true });

  if (fs.existsSync(targetDbPath)) {
    fs.copyFileSync(targetDbPath, path.join(preRollbackDir, "kupola_db.json"));
  }
  if (fs.existsSync(targetStoragePath)) {
    fs.copyFileSync(targetStoragePath, path.join(preRollbackDir, "kupola_storage.json"));
  }

  const preRollbackShaLog =
    `# SHA-256 Safety Snapshot Pre-Rollback - ${preRollbackTimestamp}\n` +
    `${currentDbHash || "file_missing"}  kupola_db.json\n` +
    `${currentStorageHash || "file_missing"}  kupola_storage.json\n` +
    `Status: CÓPIA DE SEGURANÇA PRÉ-RESTAURAÇÃO\n`;

  fs.writeFileSync(path.join(preRollbackDir, "sha256sums.txt"), preRollbackShaLog, "utf-8");
  console.log(`[SEGURANÇA] Cópia íntegra do estado atual preservada em: ${preRollbackDir}`);

  // Validar o snapshot pré-rollback recém-criado comparando com os arquivos atuais
  const snapshotDbHash = calculateHash(path.join(preRollbackDir, "kupola_db.json"));
  const snapshotStorageHash = calculateHash(path.join(preRollbackDir, "kupola_storage.json"));

  if (snapshotDbHash !== currentDbHash || snapshotStorageHash !== currentStorageHash) {
    throw new Error(
      "ERRO CRÍTICO NA VALIDAÇÃO DO SNAPSHOT: A cópia de segurança pré-rollback criada diverge dos arquivos atuais! Operação abortada."
    );
  }

  // 6. Preparação temporária em runtime e substituição sequencial protegida com auto-reversão em falha parcial
  console.log("[INÍCIO] Preparando arquivos temporários de restauração...");
  const tmpTargetDbPath = path.join(rootDir, "data", `kupola_db.json.tmp.${Date.now()}`);
  const tmpTargetStoragePath = path.join(rootDir, "data", `kupola_storage.json.tmp.${Date.now()}`);

  try {
    fs.copyFileSync(backupDb, tmpTargetDbPath);
    fs.copyFileSync(backupStorage, tmpTargetStoragePath);

    // Validar hashes dos arquivos temporários antes de trocar
    if (calculateHash(tmpTargetDbPath) !== backupDbHash || calculateHash(tmpTargetStoragePath) !== backupStorageHash) {
      throw new Error("Divergência de hash ao preparar arquivos temporários de restauração.");
    }

    // Tentar substituir o primeiro arquivo (kupola_db.json)
    try {
      fs.renameSync(tmpTargetDbPath, targetDbPath);
    } catch (errDb) {
      throw new Error(`Falha ao substituir kupola_db.json com o arquivo temporário: ${errDb.message}`);
    }

    // Tentar substituir o segundo arquivo (kupola_storage.json)
    try {
      fs.renameSync(tmpTargetStoragePath, targetStoragePath);
    } catch (errStorage) {
      console.error(`[FALHA CRÍTICA] Erro ao substituir kupola_storage.json: ${errStorage.message}`);
      console.log("[AÇÃO DE EMERGÊNCIA] Iniciando reversão automática do primeiro arquivo para o snapshot pré-rollback...");

      let dbRevertError = null;
      try {
        fs.copyFileSync(path.join(preRollbackDir, "kupola_db.json"), targetDbPath);
      } catch (errCopy) {
        dbRevertError = errCopy;
        console.error(`[FALHA DE RECUPERAÇÃO] Erro ao copiar kupola_db.json de volta do snapshot: ${errCopy.message}`);
      }

      const finalDbHash = calculateHash(targetDbPath);
      const finalStorageHash = calculateHash(targetStoragePath);

      const isDbReverted = !dbRevertError && finalDbHash === currentDbHash;

      if (isDbReverted) {
        throw new Error(
          `FALHA PARCIAL DETECTADA E REVERTIDA: Falha ao substituir 'kupola_storage.json' (${errStorage.message}). ` +
            `O arquivo 'kupola_db.json' foi REVERTIDO COM SUCESSO para o snapshot pré-rollback (hash verificado: ${finalDbHash}). Nenhum dado foi corrompido.`
        );
      } else {
        throw new Error(
          `ERRO CATASTRÓFICO: Falha na substituição de 'kupola_storage.json' (${errStorage.message}) ` +
            `E a reversão automática de 'kupola_db.json' também FALHOU (${dbRevertError ? dbRevertError.message : "hash divergente"})!\n` +
            `  kupola_db.json:      hash atual (${finalDbHash}), esperado (${currentDbHash}) [STATUS: NÃO RECUPERADO]\n` +
            `  kupola_storage.json: hash atual (${finalStorageHash}), esperado (${currentStorageHash}) [STATUS: NÃO ALTERADO]\n` +
            `  SNAPSHOT PRÉ-ROLLBACK PRESERVADO EM: ${preRollbackDir}\n` +
            `  Intervenção manual necessária utilizando os arquivos preservados no snapshot pré-rollback.`
        );
      }
    }
  } finally {
    // Limpeza de quaisquer arquivos temporários remanescentes
    if (fs.existsSync(tmpTargetDbPath)) {
      try {
        fs.unlinkSync(tmpTargetDbPath);
      } catch (_) {}
    }
    if (fs.existsSync(tmpTargetStoragePath)) {
      try {
        fs.unlinkSync(tmpTargetStoragePath);
      } catch (_) {}
    }
  }

  // 7. Validação final pós-restauração com mecanismo de auto-recuperação dupla
  const restoredDbHash = calculateHash(targetDbPath);
  const restoredStorageHash = calculateHash(targetStoragePath);

  const isSuccess = restoredDbHash === backupDbHash && restoredStorageHash === backupStorageHash;

  if (!isSuccess) {
    console.error(`[FALHA CRÍTICA NA VALIDAÇÃO FINAL] Os arquivos restaurados não coincidem com os hashes do backup!`);
    console.error(`  kupola_db.json: restaurado (${restoredDbHash}) vs backup (${backupDbHash})`);
    console.error(`  kupola_storage.json: restaurado (${restoredStorageHash}) vs backup (${backupStorageHash})`);
    console.log(`[AÇÃO DE EMERGÊNCIA] Iniciando auto-recuperação de AMBOS os arquivos para o snapshot pré-rollback...`);

    let dbRecovered = false;
    let storageRecovered = false;

    try {
      fs.copyFileSync(path.join(preRollbackDir, "kupola_db.json"), targetDbPath);
      const testDbHash = calculateHash(targetDbPath);
      if (testDbHash === snapshotDbHash) {
        dbRecovered = true;
      }
    } catch (eDb) {
      console.error(`[FALHA DE RECUPERAÇÃO] Erro ao recuperar kupola_db.json para o snapshot: ${eDb.message}`);
    }

    try {
      fs.copyFileSync(path.join(preRollbackDir, "kupola_storage.json"), targetStoragePath);
      const testStorageHash = calculateHash(targetStoragePath);
      if (testStorageHash === snapshotStorageHash) {
        storageRecovered = true;
      }
    } catch (eStorage) {
      console.error(`[FALHA DE RECUPERAÇÃO] Erro ao recuperar kupola_storage.json para o snapshot: ${eStorage.message}`);
    }

    if (dbRecovered && storageRecovered) {
      throw new Error(
        `FALHA DE VALIDAÇÃO FINAL E AUTO-RECUPERAÇÃO CONCLUÍDA: A validação final pós-substituição falhou (hashes não coincidiram com o backup).\n` +
          `Ambos os arquivos foram REVERTIDOS COM SUCESSO para o snapshot pré-rollback em ${preRollbackDir}.\n` +
          `kupola_db.json: recuperado (${snapshotDbHash})\n` +
          `kupola_storage.json: recuperado (${snapshotStorageHash})\n` +
          `Nenhum dado foi corrompido, e a integridade pré-rollback foi 100% restabelecida.`
      );
    } else {
      const currentFailDbHash = calculateHash(targetDbPath);
      const currentFailStorageHash = calculateHash(targetStoragePath);
      throw new Error(
        `ERRO CATASTRÓFICO: Falha na validação final e a auto-recuperação do snapshot falhou parcialmente!\n` +
          `  Status kupola_db.json: ${dbRecovered ? "RECUPERADO" : "FALHA NA RECUPERAÇÃO"} (hash atual: ${currentFailDbHash}, esperado: ${snapshotDbHash})\n` +
          `  Status kupola_storage.json: ${storageRecovered ? "RECUPERADO" : "FALHA NA RECUPERAÇÃO"} (hash atual: ${currentFailStorageHash}, esperado: ${snapshotStorageHash})\n` +
          `  CÓPIA DE SEGURANÇA INTACTA DISPONÍVEL EM: ${preRollbackDir}\n` +
          `  Intervenção manual necessária utilizando os arquivos preservados no snapshot pré-rollback.`
      );
    }
  }

  return {
    backupDir: selectedBackupDir,
    preRollbackSnapshotDir: preRollbackDir,
    restoredDbHash,
    restoredStorageHash,
    isSuccess,
  };
}

if (process.argv[1] && process.argv[1].endsWith("rollback_cleanup.mjs")) {
  try {
    const args = process.argv.slice(2);
    const confirmFlag = args.includes("--confirm");
    const filteredArgs = args.filter((a) => a !== "--confirm");
    const argDir = filteredArgs[0] || null;

    const res = performRollback(argDir, { confirm: confirmFlag });
    console.log("[SUCESSO] Restauração executada e validada com sucesso!");
    console.log(`- Origem do Backup: ${res.backupDir}`);
    console.log(`- Snapshot Pré-Rollback: ${res.preRollbackSnapshotDir}`);
    console.log(`- SHA-256 kupola_db.json:      ${res.restoredDbHash}`);
    console.log(`- SHA-256 kupola_storage.json: ${res.restoredStorageHash}`);
    console.log("- Status: BASE DE DADOS RESTAURADA E 100% IDÊNTICA AO BACKUP\n");
  } catch (err) {
    console.error("[ERRO CRÍTICO NO ROLLBACK]:", err.message);
    process.exit(1);
  }
}
