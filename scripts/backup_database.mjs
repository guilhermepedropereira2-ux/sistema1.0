import fs from "fs";
import path from "path";
import crypto from "crypto";

function calculateHash(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

export function createBackup() {
  const rootDir = process.cwd();
  const dbPath = path.join(rootDir, "data", "kupola_db.json");
  const storagePath = path.join(rootDir, "data", "kupola_storage.json");

  if (!fs.existsSync(dbPath) || !fs.existsSync(storagePath)) {
    throw new Error("Os arquivos de dados originais (kupola_db.json / kupola_storage.json) não foram encontrados em data/");
  }

  // 1. Calculate original hashes
  const origDbHash = calculateHash(dbPath);
  const origStorageHash = calculateHash(storagePath);

  // 2. Create timestamped directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(rootDir, "backups", timestamp);
  fs.mkdirSync(backupDir, { recursive: true });

  const backupDbPath = path.join(backupDir, "kupola_db.json");
  const backupStoragePath = path.join(backupDir, "kupola_storage.json");

  // 3. Copy files
  fs.copyFileSync(dbPath, backupDbPath);
  fs.copyFileSync(storagePath, backupStoragePath);

  // 4. Calculate backup hashes
  const backupDbHash = calculateHash(backupDbPath);
  const backupStorageHash = calculateHash(backupStoragePath);

  // 5. Verify integrity
  const dbMatch = origDbHash === backupDbHash;
  const storageMatch = origStorageHash === backupStorageHash;
  const isValid = dbMatch && storageMatch;

  if (!isValid) {
    throw new Error(
      `Falha crítica de integridade no backup! Hashes divergentes:\n` +
      `kupola_db.json: orig=${origDbHash} backup=${backupDbHash}\n` +
      `kupola_storage.json: orig=${origStorageHash} backup=${backupStorageHash}`
    );
  }

  // 6. Write sha256sums.txt
  const shaContent =
    `# SHA-256 Checksum Log - Backup ${timestamp}\n` +
    `${origDbHash}  kupola_db.json\n` +
    `${origStorageHash}  kupola_storage.json\n` +
    `Status: VALIDADOS E IDÊNTICOS\n`;

  fs.writeFileSync(path.join(backupDir, "sha256sums.txt"), shaContent, "utf-8");

  return {
    timestamp,
    backupDir,
    dbHash: origDbHash,
    storageHash: origStorageHash,
    isValid,
  };
}

if (process.argv[1] && process.argv[1].endsWith("backup_database.mjs")) {
  try {
    console.log("=== INICIANDO CRIAÇÃO E VALIDAÇÃO DE BACKUP ===");
    const res = createBackup();
    console.log(`[SUCESSO] Backup salvo e validado em: ${res.backupDir}`);
    console.log(`SHA-256 kupola_db.json:      ${res.dbHash}`);
    console.log(`SHA-256 kupola_storage.json: ${res.storageHash}`);
    console.log("Status da integridade: VALIDADO (100% IDÊNTICO)");
  } catch (err) {
    console.error("[ERRO CRÍTICO NO BACKUP]:", err.message);
    process.exit(1);
  }
}
