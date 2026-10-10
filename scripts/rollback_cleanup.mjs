import fs from "fs";
import path from "path";
import crypto from "crypto";

function calculateHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function performRollback(targetBackupDir = null, options = {}) {
  const rootDir = process.cwd();
  const backupsDir = path.join(rootDir, "backups");
  const targetDbPath = path.join(rootDir, "data", "kupola_db.json");
  const targetStoragePath = path.join(rootDir, "data", "kupola_storage.json");

  // 1. Exigir explicitamente o caminho do backup via argumento, env var ou opção (NUNCA escolha automática)
  let selectedBackupDir = targetBackupDir || process.env.BACKUP_DIR || options.backupDir || null;

  if (!selectedBackupDir) {
    throw new Error(
      "ERRO CRÍTICO DE SEGURANÇA: Nenhum diretório de backup foi especificado. " +
        "O rollback exige a especificação explícita do caminho do backup via argumento de linha de comando " +
        "ou variável de ambiente (BACKUP_DIR). A seleção automática do backup mais recente está desativada."
    );
  }

  // Resolve absolute path if relative
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

  // 2. Validar existência dos arquivos de backup e de sha256sums.txt
  if (!fs.existsSync(backupDb) || !fs.existsSync(backupStorage)) {
    throw new Error(`FALHA DE SEGURANÇA: Arquivos de backup incompletos no diretório ${selectedBackupDir}`);
  }

  if (!fs.existsSync(shaFile)) {
    throw new Error(
      `FALHA DE SEGURANÇA NO ROLLBACK: Arquivo 'sha256sums.txt' ausente no diretório de backup: ${selectedBackupDir}`
    );
  }

  // 3. Calcular e verificar hashes dos arquivos de backup contra sha256sums.txt
  const backupDbHash = calculateHash(backupDb);
  const backupStorageHash = calculateHash(backupStorage);
  const shaContent = fs.readFileSync(shaFile, "utf-8");

  if (!shaContent.includes(backupDbHash) || !shaContent.includes(backupStorageHash)) {
    throw new Error(
      "ALERTA CRÍTICO DE INTEGRIDADE: Os arquivos no diretório de backup não correspondem aos hashes registrados em sha256sums.txt!"
    );
  }

  // 4. Verificar o estado atual dos arquivos de dados contra o manifesto/auditoria
  const currentDbHash = calculateHash(targetDbPath);
  const currentStorageHash = calculateHash(targetStoragePath);

  console.log(`- Estado atual de kupola_db.json:      ${currentDbHash || "(não existe)"}`);
  console.log(`- Estado atual de kupola_storage.json: ${currentStorageHash || "(não existe)"}`);

  // Verificar se existe um manifesto para validar a integridade pós-limpeza esperada
  const manifestPath = fs.existsSync(path.join(selectedBackupDir, "cleanup_manifest.json"))
    ? path.join(selectedBackupDir, "cleanup_manifest.json")
    : fs.existsSync(path.join(rootDir, "data", "cleanup_manifest.json"))
    ? path.join(rootDir, "data", "cleanup_manifest.json")
    : null;

  if (manifestPath && fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const expectedDbPre = manifest.metadata?.hashesPreCleanup?.["data/kupola_db.json"] || manifest.metadata?.sha256?.kupola_db;
      const expectedStoragePre = manifest.metadata?.hashesPreCleanup?.["data/kupola_storage.json"] || manifest.metadata?.sha256?.kupola_storage;
      const expectedDbPost = manifest.metadata?.hashesPostCleanup?.["data/kupola_db.json"];
      const expectedStoragePost = manifest.metadata?.hashesPostCleanup?.["data/kupola_storage.json"];

      const matchesPre = currentDbHash === expectedDbPre && currentStorageHash === expectedStoragePre;
      const matchesPost = expectedDbPost ? currentDbHash === expectedDbPost && currentStorageHash === expectedStoragePost : true;

      // Se a base foi modificada por outras operações que não batem nem com o estado pré nem pós limpeza
      const isForce = options.force === true || process.env.FORCE_ROLLBACK === "true";
      if (!matchesPre && !matchesPost && !isForce) {
        throw new Error(
          "ALERTA DE SEGURANÇA NO ROLLBACK: A base de dados atual possui alterações divergentes do manifesto. " +
            "A restauração foi bloqueada para evitar a perda acidental de dados modificados por outras operações. " +
            "Se for intencional, defina FORCE_ROLLBACK=true ou force: true."
        );
      }
    } catch (e) {
      if (e.message.startsWith("ALERTA DE SEGURANÇA")) throw e;
      console.warn(`[AVISO] Erro ao ler manifesto de integridade: ${e.message}`);
    }
  }

  // 5. Preservar cópia de segurança (snapshot) do estado atual antes da restauração
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

  // 6. Restaurar arquivos com segurança
  fs.copyFileSync(backupDb, targetDbPath);
  fs.copyFileSync(backupStorage, targetStoragePath);

  // 7. Verificar se os arquivos restaurados coincidem exatamente com os hashes do backup
  const restoredDbHash = calculateHash(targetDbPath);
  const restoredStorageHash = calculateHash(targetStoragePath);

  const isSuccess = restoredDbHash === backupDbHash && restoredStorageHash === backupStorageHash;

  if (!isSuccess) {
    throw new Error("ERRO CRÍTICO NA RESTAURAÇÃO: Os arquivos restaurados não coincidem com os hashes do backup!");
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
    const argDir = process.argv[2] || null;
    const res = performRollback(argDir);
    console.log("[SUCESSO] Restauração executada e validada com sucesso!");
    console.log(`- Origem do Backup: ${res.backupDir}`);
    console.log(`- Snapshot Pré-Rollback: ${res.preRollbackSnapshotDir}`);
    console.log(`- SHA-256 kupola_db.json:      ${res.restoredDbHash}`);
    console.log(`- SHA-256 kupola_storage.json: ${res.restoredStorageHash}`);
    console.log("- Status: BASE DADOS RESTAURADA E 100% IDÊNTICA AO BACKUP\n");
  } catch (err) {
    console.error("[ERRO CRÍTICO NO ROLLBACK]:", err.message);
    process.exit(1);
  }
}

