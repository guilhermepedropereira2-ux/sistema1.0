import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { performRollback, validateSha256SumsFile, calculateHash } from "./rollback_cleanup.mjs";

console.log("================================================================================");
console.log("=== KUPOLA 2.0 — ETAPA 3.6C.3: TESTES ISOLADOS DE RECUPERAÇÃO DO ROLLBACK    ===");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Teste ${totalTests}: ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Teste ${totalTests}: ${testName}`);
    throw new Error(`Falha de asserção no teste: ${testName}`);
  }
}

// Sandbox isolada em diretório temporário
const sandboxRoot = path.join(os.tmpdir(), `kupola_rollback_test_${Date.now()}`);
fs.mkdirSync(sandboxRoot, { recursive: true });

function setupEnvironment(envName) {
  const envDir = path.join(sandboxRoot, envName);
  const dataDir = path.join(envDir, "data");
  const backupDir = path.join(envDir, "backups", "backup_2026");

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const preCleanupDbContent = JSON.stringify({ state: "pre_cleanup", items: [1, 2, 3] });
  const preCleanupStorageContent = JSON.stringify({ state: "pre_cleanup", orgs: ["a", "b"] });

  const postCleanupDbContent = JSON.stringify({ state: "post_cleanup", items: [1] });
  const postCleanupStorageContent = JSON.stringify({ state: "post_cleanup", orgs: ["a"] });

  // Backup contém o estado pré-limpeza
  const backupDbPath = path.join(backupDir, "kupola_db.json");
  const backupStoragePath = path.join(backupDir, "kupola_storage.json");
  fs.writeFileSync(backupDbPath, preCleanupDbContent, "utf-8");
  fs.writeFileSync(backupStoragePath, preCleanupStorageContent, "utf-8");

  const backupDbHash = calculateHash(backupDbPath);
  const backupStorageHash = calculateHash(backupStoragePath);

  // sha256sums.txt no backup
  const shaContent = `${backupDbHash}  kupola_db.json\n${backupStorageHash}  kupola_storage.json\n`;
  fs.writeFileSync(path.join(backupDir, "sha256sums.txt"), shaContent, "utf-8");

  // Manifesto no backup
  const manifestData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      status: "PLANNED",
      hashesPreCleanup: {
        "data/kupola_db.json": backupDbHash,
        "data/kupola_storage.json": backupStorageHash,
      },
      hashesPostCleanup: {
        "data/kupola_db.json": crypto.createHash("sha256").update(postCleanupDbContent).digest("hex"),
        "data/kupola_storage.json": crypto.createHash("sha256").update(postCleanupStorageContent).digest("hex"),
      },
      sha256: {
        kupola_db: backupDbHash,
        kupola_storage: backupStorageHash,
      },
    },
  };
  fs.writeFileSync(path.join(backupDir, "cleanup_manifest.json"), JSON.stringify(manifestData, null, 2), "utf-8");
  fs.writeFileSync(path.join(dataDir, "cleanup_manifest.json"), JSON.stringify(manifestData, null, 2), "utf-8");

  return {
    envDir,
    dataDir,
    backupDir,
    backupDbHash,
    backupStorageHash,
    preCleanupDbContent,
    preCleanupStorageContent,
    postCleanupDbContent,
    postCleanupStorageContent,
    postDbHash: manifestData.metadata.hashesPostCleanup["data/kupola_db.json"],
    postStorageHash: manifestData.metadata.hashesPostCleanup["data/kupola_storage.json"],
  };
}

try {
  // ---------------------------------------------------------------------------
  // TESTE 1: Recuperação bem-sucedida quando o estado atual é PÓS-LIMPEZA
  // ---------------------------------------------------------------------------
  console.log("--- Executando Teste 1: Recuperação em Estado Pós-Limpeza ---");
  const env1 = setupEnvironment("test1");
  const db1Path = path.join(env1.dataDir, "kupola_db.json");
  const storage1Path = path.join(env1.dataDir, "kupola_storage.json");

  // Escrever estado pós-limpeza nos arquivos atuais de data/
  fs.writeFileSync(db1Path, env1.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage1Path, env1.postCleanupStorageContent, "utf-8");

  const res1 = performRollback(env1.backupDir, {
    rootDir: env1.envDir,
    confirm: true,
  });

  assert(
    res1.isSuccess === true &&
      res1.restoredDbHash === env1.backupDbHash &&
      res1.restoredStorageHash === env1.backupStorageHash,
    "Recuperação aceita e concluída com sucesso quando o estado atual corresponde a POST_CLEANUP"
  );

  // ---------------------------------------------------------------------------
  // TESTE 2: Bloqueio diante de hashes inesperados
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 2: Bloqueio de Hashes Inesperados ---");
  const env2 = setupEnvironment("test2");
  const db2Path = path.join(env2.dataDir, "kupola_db.json");
  const storage2Path = path.join(env2.dataDir, "kupola_storage.json");

  // Escrever conteúdo desconhecido que diverge de pré e de pós
  fs.writeFileSync(db2Path, JSON.stringify({ state: "corrupted_or_arbitrary_data" }), "utf-8");
  fs.writeFileSync(storage2Path, env1.postCleanupStorageContent, "utf-8");

  let blockedUnexpected = false;
  try {
    performRollback(env2.backupDir, {
      rootDir: env2.envDir,
      confirm: true,
    });
  } catch (err) {
    if (err.message.includes("alterações divergentes do estado esperado")) {
      blockedUnexpected = true;
    }
  }
  assert(blockedUnexpected, "Bloqueia operação quando os dados atuais possuem hashes inesperados");

  // ---------------------------------------------------------------------------
  // TESTE 3: Bloqueio de um estado inconsistente entre os dois arquivos
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 3: Bloqueio de Estado Misto/Inconsistente ---");
  const env3 = setupEnvironment("test3");
  const db3Path = path.join(env3.dataDir, "kupola_db.json");
  const storage3Path = path.join(env3.dataDir, "kupola_storage.json");

  // DB em Pré-limpeza e Storage em Pós-limpeza (estado incompatível)
  fs.writeFileSync(db3Path, env3.preCleanupDbContent, "utf-8");
  fs.writeFileSync(storage3Path, env3.postCleanupStorageContent, "utf-8");

  let blockedMixed = false;
  try {
    performRollback(env3.backupDir, {
      rootDir: env3.envDir,
      confirm: true,
    });
  } catch (err) {
    if (err.message.includes("Estado inconsistente e misto detectado")) {
      blockedMixed = true;
    }
  }
  assert(blockedMixed, "Detecta e bloqueia estado misto (um arquivo pré e outro pós-limpeza)");

  // ---------------------------------------------------------------------------
  // TESTE 4: Manutenção da proteção contra bypass por força
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 4: Rejeição de Bypass por Força ---");
  const env4 = setupEnvironment("test4");
  const db4Path = path.join(env4.dataDir, "kupola_db.json");
  const storage4Path = path.join(env4.dataDir, "kupola_storage.json");

  fs.writeFileSync(db4Path, "arbitrary_corrupt_data", "utf-8");
  fs.writeFileSync(storage4Path, env4.postCleanupStorageContent, "utf-8");

  let blockedForce = false;
  try {
    performRollback(env4.backupDir, {
      rootDir: env4.envDir,
      confirm: true,
      force: true,
      FORCE_ROLLBACK: true,
    });
  } catch (err) {
    if (err.message.includes("sem possibilidade de bypass automático")) {
      blockedForce = true;
    }
  }
  assert(blockedForce, "Rejeita tentativa de bypass mesmo com parâmetros de força ativados");

  // ---------------------------------------------------------------------------
  // TESTE 5: Falha na substituição do segundo arquivo (Auto-Reversão do 1º)
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 5: Falha na Substituição do Segundo Arquivo ---");
  const env5 = setupEnvironment("test5");
  const db5Path = path.join(env5.dataDir, "kupola_db.json");
  const storage5Path = path.join(env5.dataDir, "kupola_storage.json");

  fs.writeFileSync(db5Path, env5.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage5Path, env5.postCleanupStorageContent, "utf-8");

  const originalRenameSync = fs.renameSync;
  let simulatedSecondFileFail = false;
  fs.renameSync = function (oldPath, newPath) {
    if (newPath.includes("kupola_storage.json")) {
      throw new Error("DISK_IO_FAILURE_STORAGE");
    }
    return originalRenameSync.call(fs, oldPath, newPath);
  };

  try {
    performRollback(env5.backupDir, {
      rootDir: env5.envDir,
      confirm: true,
    });
  } catch (err) {
    if (err.message.includes("FALHA PARCIAL DETECTADA E REVERTIDA")) {
      simulatedSecondFileFail = true;
    }
  } finally {
    fs.renameSync = originalRenameSync;
  }

  const db5ContentAfter = fs.readFileSync(db5Path, "utf-8");
  assert(
    simulatedSecondFileFail && db5ContentAfter === env5.postCleanupDbContent,
    "Falha no segundo arquivo reverte imediatamente o primeiro para o snapshot intacto"
  );

  // ---------------------------------------------------------------------------
  // TESTE 6 & 7: Falha de Validação Final e Auto-Recuperação de Ambos os Arquivos
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 6 e 7: Falha na Validação Final e Auto-Recuperação Dupla ---");
  const env6 = setupEnvironment("test6");
  const db6Path = path.join(env6.dataDir, "kupola_db.json");
  const storage6Path = path.join(env6.dataDir, "kupola_storage.json");

  fs.writeFileSync(db6Path, env6.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage6Path, env6.postCleanupStorageContent, "utf-8");

  const db6HashBefore = calculateHash(db6Path);
  const storage6HashBefore = calculateHash(storage6Path);

  // Interceptar fs.renameSync para simular corrupção silenciosa nos arquivos após serem renomeados
  fs.renameSync = function (oldPath, newPath) {
    originalRenameSync.call(fs, oldPath, newPath);
    // Adulterar o conteúdo logo após a renomeação para simular falha de hash na validação pós-restauração
    if (newPath.includes("kupola_db.json")) {
      fs.writeFileSync(newPath, "corrompido_apos_rename", "utf-8");
    }
  };

  let doubleRecoveryTriggered = false;
  try {
    performRollback(env6.backupDir, {
      rootDir: env6.envDir,
      confirm: true,
    });
  } catch (err) {
    if (err.message.includes("AUTO-RECUPERAÇÃO CONCLUÍDA") && err.message.includes("REVERTIDOS COM SUCESSO")) {
      doubleRecoveryTriggered = true;
    }
  } finally {
    fs.renameSync = originalRenameSync;
  }

  const db6HashAfter = calculateHash(db6Path);
  const storage6HashAfter = calculateHash(storage6Path);

  assert(
    doubleRecoveryTriggered &&
      db6HashAfter === db6HashBefore &&
      storage6HashAfter === storage6HashBefore,
    "Validação final detecta corrupção pós-rename e recupera com sucesso ambos os arquivos ao snapshot"
  );

  // ---------------------------------------------------------------------------
  // TESTE 8: Comportamento quando a própria recuperação do snapshot falhar
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 8: Falha Catastrófica na Recuperação do Snapshot ---");
  const env8 = setupEnvironment("test8");
  const db8Path = path.join(env8.dataDir, "kupola_db.json");
  const storage8Path = path.join(env8.dataDir, "kupola_storage.json");

  fs.writeFileSync(db8Path, env8.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage8Path, env8.postCleanupStorageContent, "utf-8");

  // Interceptar fs.renameSync para simular falha de hash pós-rename
  fs.renameSync = function (oldPath, newPath) {
    originalRenameSync.call(fs, oldPath, newPath);
    if (newPath.includes("kupola_db.json")) {
      fs.writeFileSync(newPath, "corrompido_apos_rename", "utf-8");
    }
  };

  const originalCopyFileSync = fs.copyFileSync;
  // Interceptar copyFileSync para falhar ao tentar recuperar do snapshot
  fs.copyFileSync = function (src, dest) {
    if (src.includes("pre-rollback") && dest.includes("kupola_storage.json")) {
      throw new Error("READ_ONLY_FILESYSTEM_ON_RECOVERY");
    }
    return originalCopyFileSync.call(fs, src, dest);
  };

  let catastrophicReported = false;
  try {
    performRollback(env8.backupDir, {
      rootDir: env8.envDir,
      confirm: true,
    });
  } catch (err) {
    if (
      err.message.includes("ERRO CATASTRÓFICO") &&
      err.message.includes("CÓPIA DE SEGURANÇA INTACTA DISPONÍVEL") &&
      err.message.includes("Intervenção manual necessária")
    ) {
      catastrophicReported = true;
    }
  } finally {
    fs.renameSync = originalRenameSync;
    fs.copyFileSync = originalCopyFileSync;
  }

  assert(
    catastrophicReported,
    "Emite relatório forense explícito preservando artefatos quando a recuperação do snapshot falha"
  );

  // ---------------------------------------------------------------------------
  // TESTE 9: Validação dos hashes finais após recuperação bem-sucedida
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Teste 9: Validação Rigorosa dos Hashes Finais ---");
  const env9 = setupEnvironment("test9");
  const db9Path = path.join(env9.dataDir, "kupola_db.json");
  const storage9Path = path.join(env9.dataDir, "kupola_storage.json");

  fs.writeFileSync(db9Path, env9.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage9Path, env9.postCleanupStorageContent, "utf-8");

  const res9 = performRollback(env9.backupDir, {
    rootDir: env9.envDir,
    confirm: true,
  });

  const finalDiskDbHash = calculateHash(db9Path);
  const finalDiskStorageHash = calculateHash(storage9Path);

  assert(
    res9.isSuccess === true &&
      finalDiskDbHash === env9.backupDbHash &&
      finalDiskStorageHash === env9.backupStorageHash &&
      res9.restoredDbHash === finalDiskDbHash &&
      res9.restoredStorageHash === finalDiskStorageHash,
    "Verificação integral dos hashes finais no disco confirmando paridade de 100% com o backup"
  );

  // ---------------------------------------------------------------------------
  // TESTES ADICIONAIS: sha256sums.txt e Confirmação Obrigatória
  // ---------------------------------------------------------------------------
  console.log("\n--- Executando Testes Adicionais de Salvaguarda de Entrada ---");

  // Rejeição sem confirmação
  let blockedNoConfirm = false;
  try {
    performRollback(env1.backupDir, {
      rootDir: env1.envDir,
      confirm: false,
    });
  } catch (e) {
    if (e.message.includes("FALHA DE CONFIRMAÇÃO")) blockedNoConfirm = true;
  }
  assert(blockedNoConfirm, "Exige confirmação explícita antes de qualquer operação");

  // Linha inválida em sha256sums.txt
  const badShaDir = path.join(sandboxRoot, "bad_sha_dir");
  fs.mkdirSync(badShaDir, { recursive: true });
  fs.writeFileSync(path.join(badShaDir, "sha256sums.txt"), "linhainvalida kupola_db.json\n");
  let blockedBadLine = false;
  try {
    validateSha256SumsFile(path.join(badShaDir, "sha256sums.txt"), badShaDir);
  } catch (e) {
    if (e.message.includes("LINHA INVÁLIDA")) blockedBadLine = true;
  }
  assert(blockedBadLine, "Detecta linha com sintaxe inválida no sha256sums.txt");

  // Registro duplicado em sha256sums.txt
  const dupShaDir = path.join(sandboxRoot, "dup_sha_dir");
  fs.mkdirSync(dupShaDir, { recursive: true });
  fs.writeFileSync(
    path.join(dupShaDir, "sha256sums.txt"),
    `${env1.backupDbHash}  kupola_db.json\n${env1.backupStorageHash}  kupola_db.json\n`
  );
  let blockedDup = false;
  try {
    validateSha256SumsFile(path.join(dupShaDir, "sha256sums.txt"), dupShaDir);
  } catch (e) {
    if (e.message.includes("REGISTRO DUPLICADO")) blockedDup = true;
  }
  assert(blockedDup, "Detecta arquivo duplicado no sha256sums.txt");

  console.log("\n================================================================================");
  console.log(`=== RESULTADO: TODOS OS ${passedTests}/${totalTests} TESTES FORAM APROVADOS COM 100% DE SUCESSO! ===`);
  console.log("================================================================================\n");
} finally {
  // Limpar diretório temporário isolado da sandbox
  fs.rmSync(sandboxRoot, { recursive: true, force: true });
}
