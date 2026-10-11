import fs from "fs";
import path from "path";
import crypto from "crypto";
import { performRollback, validateSha256SumsFile, calculateHash } from "./rollback_cleanup.mjs";

console.log("=======================================================================");
console.log("TESTES ISOLADOS DAS PROTEÇÕES DE ROLLBACK (ETAPA 3.6A.4)");
console.log("=======================================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Teste ${totalTests}: ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Teste ${totalTests}: ${testName}`);
  }
}

// Criar diretório sandbox isolado em /tmp
const sandboxDir = path.join("/tmp", `rollback_test_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandboxDir, "data"), { recursive: true });
fs.mkdirSync(path.join(sandboxDir, "backups", "valid_backup"), { recursive: true });

// Conteúdo fictício de teste
const currentDbContent = JSON.stringify({ version: "1.0", db: "current_data" });
const currentStorageContent = JSON.stringify({ version: "1.0", storage: "current_data" });
const backupDbContent = JSON.stringify({ version: "1.0", db: "backup_data" });
const backupStorageContent = JSON.stringify({ version: "1.0", storage: "backup_data" });

const currentDbPath = path.join(sandboxDir, "data", "kupola_db.json");
const currentStoragePath = path.join(sandboxDir, "data", "kupola_storage.json");
fs.writeFileSync(currentDbPath, currentDbContent, "utf-8");
fs.writeFileSync(currentStoragePath, currentStorageContent, "utf-8");

const backupDbPath = path.join(sandboxDir, "backups", "valid_backup", "kupola_db.json");
const backupStoragePath = path.join(sandboxDir, "backups", "valid_backup", "kupola_storage.json");
fs.writeFileSync(backupDbPath, backupDbContent, "utf-8");
fs.writeFileSync(backupStoragePath, backupStorageContent, "utf-8");

const currentDbHash = calculateHash(currentDbPath);
const currentStorageHash = calculateHash(currentStoragePath);
const backupDbHash = calculateHash(backupDbPath);
const backupStorageHash = calculateHash(backupStoragePath);

// Criar sha256sums.txt válido
const validShaContent =
  `${backupDbHash}  kupola_db.json\n` +
  `${backupStorageHash}  kupola_storage.json\n`;
const shaFilePath = path.join(sandboxDir, "backups", "valid_backup", "sha256sums.txt");
fs.writeFileSync(shaFilePath, validShaContent, "utf-8");

// --- TESTE 1: Exigência de Confirmação Explícita ---
try {
  performRollback(path.join(sandboxDir, "backups", "valid_backup"), {
    rootDir: sandboxDir,
    confirm: false, // Sem confirmação
    expectedCurrentHashes: { "kupola_db.json": currentDbHash, "kupola_storage.json": currentStorageHash },
  });
  assert(false, "Deve rejeitar execução sem confirmação explícita");
} catch (e) {
  assert(
    e.message.includes("FALHA DE CONFIRMAÇÃO"),
    "Bloqueia operação e lança FALHA DE CONFIRMAÇÃO sem confirmação explícita"
  );
}

// --- TESTE 2: Validação de sha256sums.txt - Linha Inválida ---
const invalidLineBackupDir = path.join(sandboxDir, "backups", "invalid_line_backup");
fs.mkdirSync(invalidLineBackupDir, { recursive: true });
fs.writeFileSync(path.join(invalidLineBackupDir, "sha256sums.txt"), "linhainvalidasemhash kupola_db.json\n", "utf-8");
try {
  validateSha256SumsFile(path.join(invalidLineBackupDir, "sha256sums.txt"), invalidLineBackupDir);
  assert(false, "Deve rejeitar linha inválida em sha256sums.txt");
} catch (e) {
  assert(e.message.includes("LINHA INVÁLIDA"), "Detecta linha inválida no sha256sums.txt");
}

// --- TESTE 3: Validação de sha256sums.txt - Registro Duplicado ---
const duplicateFileBackupDir = path.join(sandboxDir, "backups", "dup_file_backup");
fs.mkdirSync(duplicateFileBackupDir, { recursive: true });
fs.writeFileSync(
  path.join(duplicateFileBackupDir, "sha256sums.txt"),
  `${backupDbHash}  kupola_db.json\n${backupStorageHash}  kupola_db.json\n`,
  "utf-8"
);
try {
  validateSha256SumsFile(path.join(duplicateFileBackupDir, "sha256sums.txt"), duplicateFileBackupDir);
  assert(false, "Deve rejeitar arquivo duplicado em sha256sums.txt");
} catch (e) {
  assert(e.message.includes("REGISTRO DUPLICADO"), "Detecta arquivo duplicado no sha256sums.txt");
}

// --- TESTE 4: Remoção do bypass FORCE_ROLLBACK / Bloqueio por Divergência ---
try {
  performRollback(path.join(sandboxDir, "backups", "valid_backup"), {
    rootDir: sandboxDir,
    confirm: true,
    force: true, // Forçar bypass
    expectedCurrentHashes: { "kupola_db.json": "hash_falso_123", "kupola_storage.json": "hash_falso_456" },
  });
  assert(false, "Deve rejeitar divergência mesmo com force: true");
} catch (e) {
  assert(
    e.message.includes("ALERTA DE SEGURANÇA NO ROLLBACK"),
    "Bloqueia divergência de estado atual e ignora flag de força/bypass"
  );
}

// --- TESTE 5: Proteção contra Falha Parcial e Auto-Reversão ---
const originalRenameSync = fs.renameSync;
let renameCallCount = 0;
// Interceptar renameSync para simular falha ao renomear o segundo arquivo (kupola_storage.json)
fs.renameSync = function (oldPath, newPath) {
  renameCallCount++;
  if (newPath.includes("kupola_storage.json")) {
    throw new Error("SIMULATED_DISK_FAILURE_ON_STORAGE");
  }
  return originalRenameSync.call(fs, oldPath, newPath);
};

try {
  performRollback(path.join(sandboxDir, "backups", "valid_backup"), {
    rootDir: sandboxDir,
    confirm: true,
    expectedCurrentHashes: { "kupola_db.json": currentDbHash, "kupola_storage.json": currentStorageHash },
  });
  assert(false, "Deve lançar erro de falha parcial ao falhar no segundo arquivo");
} catch (e) {
  const dbContentAfterPartialFailure = fs.readFileSync(currentDbPath, "utf-8");
  const isDbRevertedToOriginal = dbContentAfterPartialFailure === currentDbContent;
  assert(
    e.message.includes("FALHA PARCIAL DETECTADA E REVERTIDA") && isDbRevertedToOriginal,
    "Detecta falha parcial no segundo arquivo e reverte automaticamente o primeiro arquivo para o snapshot"
  );
} finally {
  fs.renameSync = originalRenameSync; // Restaurar fs.renameSync original
}

// --- TESTE 6: Restauração com Sucesso em Ambiente Sandbox ---
try {
  const result = performRollback(path.join(sandboxDir, "backups", "valid_backup"), {
    rootDir: sandboxDir,
    confirm: true,
    expectedCurrentHashes: { "kupola_db.json": currentDbHash, "kupola_storage.json": currentStorageHash },
  });

  const restoredDbContent = fs.readFileSync(currentDbPath, "utf-8");
  const restoredStorageContent = fs.readFileSync(currentStoragePath, "utf-8");

  const isRestoredCorrectly =
    restoredDbContent === backupDbContent &&
    restoredStorageContent === backupStorageContent &&
    result.isSuccess === true;

  assert(isRestoredCorrectly, "Restauração com sucesso e validação final dos hashes do backup");
} catch (e) {
  assert(false, `Falha inesperada no rollback com parâmetros válidos: ${e.message}`);
}

// Limpeza da sandbox de teste em /tmp
try {
  fs.rmSync(sandboxDir, { recursive: true, force: true });
} catch (_) {}

console.log("\n================================================");
console.log(`RESULTADO DOS TESTES: ${passedTests}/${totalTests} PASSARAM`);
console.log("================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
