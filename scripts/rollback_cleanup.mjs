import fs from "fs";
import path from "path";
import crypto from "crypto";

function calculateHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function performRollback(targetBackupDir = null) {
  const rootDir = process.cwd();
  const backupsDir = path.join(rootDir, "backups");

  if (!fs.existsSync(backupsDir)) {
    throw new Error("Diretório de backups não encontrado.");
  }

  // Find latest backup if not specified
  let selectedBackupDir = targetBackupDir;
  if (!selectedBackupDir) {
    const subdirs = fs
      .readdirSync(backupsDir)
      .filter((d) => fs.statSync(path.join(backupsDir, d)).isDirectory())
      .sort();

    if (subdirs.length === 0) {
      throw new Error("Nenhum backup encontrado no diretório backups/");
    }

    selectedBackupDir = path.join(backupsDir, subdirs[subdirs.length - 1]);
  }

  console.log(`=== RESTAURAÇÃO / ROLLBACK A PARTIR DE: ${selectedBackupDir} ===`);

  const backupDb = path.join(selectedBackupDir, "kupola_db.json");
  const backupStorage = path.join(selectedBackupDir, "kupola_storage.json");
  const shaFile = path.join(selectedBackupDir, "sha256sums.txt");

  if (!fs.existsSync(backupDb) || !fs.existsSync(backupStorage)) {
    throw new Error("Arquivos de backup incompletos no diretório selecionado.");
  }

  // Calculate backup hashes
  const backupDbHash = calculateHash(backupDb);
  const backupStorageHash = calculateHash(backupStorage);

  // If sha256sums.txt exists, verify backup integrity before restoring
  if (fs.existsSync(shaFile)) {
    const shaContent = fs.readFileSync(shaFile, "utf-8");
    if (!shaContent.includes(backupDbHash) || !shaContent.includes(backupStorageHash)) {
      throw new Error("ALERTA DE INTEGRIDADE: Os arquivos de backup não correspondem aos hashes em sha256sums.txt!");
    }
  }

  const targetDb = path.join(rootDir, "data", "kupola_db.json");
  const targetStorage = path.join(rootDir, "data", "kupola_storage.json");

  // Restore files
  fs.copyFileSync(backupDb, targetDb);
  fs.copyFileSync(backupStorage, targetStorage);

  // Verify restored files match backup hashes
  const restoredDbHash = calculateHash(targetDb);
  const restoredStorageHash = calculateHash(targetStorage);

  const isSuccess = restoredDbHash === backupDbHash && restoredStorageHash === backupStorageHash;

  if (!isSuccess) {
    throw new Error("ERRO CRÍTICO NA RESTAURAÇÃO: Os arquivos restaurados não coincidem com o backup!");
  }

  return {
    backupDir: selectedBackupDir,
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
    console.log(`- SHA-256 kupola_db.json:      ${res.restoredDbHash}`);
    console.log(`- SHA-256 kupola_storage.json: ${res.restoredStorageHash}`);
    console.log("- Status: BASE DADOS RESTAURADA E 100% IDÊNTICA AO BACKUP\n");
  } catch (err) {
    console.error("[ERRO CRÍTICO NO ROLLBACK]:", err.message);
    process.exit(1);
  }
}
