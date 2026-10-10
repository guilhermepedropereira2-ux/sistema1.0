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

  if (!fs.existsSync(backupsDir)) {
    throw new Error("Diretório de backups não encontrado.");
  }

  // 1. Locate backup directory
  let selectedBackupDir = targetBackupDir;
  if (!selectedBackupDir) {
    const subdirs = fs
      .readdirSync(backupsDir)
      .filter((d) => fs.statSync(path.join(backupsDir, d)).isDirectory() && !d.startsWith("pre-rollback-"))
      .sort();

    if (subdirs.length === 0) {
      throw new Error("Nenhum backup válido encontrado no diretório backups/");
    }

    selectedBackupDir = path.join(backupsDir, subdirs[subdirs.length - 1]);
  }

  console.log(`=== RESTAURAÇÃO / ROLLBACK SEGURA A PARTIR DE: ${selectedBackupDir} ===`);

  const backupDb = path.join(selectedBackupDir, "kupola_db.json");
  const backupStorage = path.join(selectedBackupDir, "kupola_storage.json");
  const shaFile = path.join(selectedBackupDir, "sha256sums.txt");

  // 2. Validate source backup files existence
  if (!fs.existsSync(backupDb) || !fs.existsSync(backupStorage)) {
    throw new Error(`FALHA DE SEGURANÇA: Arquivos de backup incompletos no diretório ${selectedBackupDir}`);
  }

  // 3. Calculate and verify backup hashes against sha256sums.txt
  const backupDbHash = calculateHash(backupDb);
  const backupStorageHash = calculateHash(backupStorage);

  if (fs.existsSync(shaFile)) {
    const shaContent = fs.readFileSync(shaFile, "utf-8");
    if (!shaContent.includes(backupDbHash) || !shaContent.includes(backupStorageHash)) {
      throw new Error("ALERTA CRÍTICO DE INTEGRIDADE: Os arquivos de backup não correspondem aos hashes em sha256sums.txt!");
    }
  } else {
    throw new Error("FALHA DE SEGURANÇA NO ROLLBACK: Arquivo sha256sums.txt ausente no diretório de backup!");
  }

  // 4. Calculate current state hashes before overwriting
  const currentDbHash = calculateHash(targetDbPath);
  const currentStorageHash = calculateHash(targetStoragePath);

  console.log(`- Estado atual de kupola_db.json:      ${currentDbHash || "(não existe)"}`);
  console.log(`- Estado atual de kupola_storage.json: ${currentStorageHash || "(não existe)"}`);

  // 5. Preserve safety copy of current state before restoration
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

  // 6. Restore files safely
  fs.copyFileSync(backupDb, targetDbPath);
  fs.copyFileSync(backupStorage, targetStoragePath);

  // 7. Verify restored files match backup hashes
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
