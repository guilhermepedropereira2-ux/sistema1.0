import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { performRollback, validateSha256SumsFile, calculateHash } from "./rollback_cleanup.mjs";
import { verifyManifestAndRollback } from "./verify_manifest_and_rollback.mjs";

console.log("================================================================================");
console.log("=== KUPOLA 2.0 — ETAPA 3.6C.4: SUÍTE DE TESTES RIGOROSOS DE SEGURANÇA       ===");
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
const sandboxRoot = path.join(os.tmpdir(), `kupola_rollback_test_36c4_${Date.now()}`);
fs.mkdirSync(sandboxRoot, { recursive: true });

function setupEnvironment(envName) {
  const envDir = path.join(sandboxRoot, envName);
  const dataDir = path.join(envDir, "data");
  const backupDir = path.join(envDir, "backups", "backup_2026");

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const preCleanupDbContent = JSON.stringify({ state: "pre_cleanup", barbershops: [{ id: "org_test_1", name: "Barbearia Teste 1" }], items: [1, 2, 3], subscriptions: {}, settingsMap: {} });
  const preCleanupStorageContent = JSON.stringify({ state: "pre_cleanup", orgs: ["a", "b"] });

  const postCleanupDbContent = JSON.stringify({ state: "post_cleanup", barbershops: [], items: [1], subscriptions: {}, settingsMap: {} });
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

  const postDbHash = crypto.createHash("sha256").update(postCleanupDbContent).digest("hex");
  const postStorageHash = crypto.createHash("sha256").update(postCleanupStorageContent).digest("hex");

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
        "data/kupola_db.json": postDbHash,
        "data/kupola_storage.json": postStorageHash,
      },
      sha256: {
        kupola_db: backupDbHash,
        kupola_storage: backupStorageHash,
      },
    },
    candidateOrgs: [{ id: "org_test_1" }],
    manifestRecords: [
      { id: "usr_1", file: "data/kupola_db.json", collection: "users", ownerOrgId: "org_test_1" },
    ],
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
    postDbHash,
    postStorageHash,
  };
}

try {
  // ---------------------------------------------------------------------------
  // TESTE 1: Recuperação bem-sucedida em estado pós-limpeza com verificação de hashes
  // ---------------------------------------------------------------------------
  console.log("--- Teste 1: Recuperação em Estado Pós-Limpeza ---");
  const env1 = setupEnvironment("test1");
  const db1Path = path.join(env1.dataDir, "kupola_db.json");
  const storage1Path = path.join(env1.dataDir, "kupola_storage.json");

  fs.writeFileSync(db1Path, env1.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage1Path, env1.postCleanupStorageContent, "utf-8");

  const res1 = performRollback(env1.backupDir, {
    rootDir: env1.envDir,
    confirm: true,
  });

  const finalDb1Hash = calculateHash(db1Path);
  const finalStorage1Hash = calculateHash(storage1Path);

  assert(
    res1.isSuccess === true &&
      finalDb1Hash === env1.backupDbHash &&
      finalStorage1Hash === env1.backupStorageHash &&
      res1.restoredDbHash === finalDb1Hash,
    "Recuperação aceita e hashes finais verificados correspondendo 100% ao backup"
  );

  // ---------------------------------------------------------------------------
  // TESTE 2: Backup internamente válido mas incompatível com o manifesto esperado é rejeitado
  // ---------------------------------------------------------------------------
  console.log("\n--- Teste 2: Rejeição de Backup Incompatível com o Manifesto ---");
  const env2 = setupEnvironment("test2");
  const db2Path = path.join(env2.dataDir, "kupola_db.json");
  const storage2Path = path.join(env2.dataDir, "kupola_storage.json");

  fs.writeFileSync(db2Path, env2.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage2Path, env2.postCleanupStorageContent, "utf-8");

  // Criar um backup que é internamente válido (seu sha256sums.txt bate com seu conteúdo),
  // mas foi gerado com dados diferentes do pré-limpeza esperado no manifesto!
  const rogueBackupDir = path.join(env2.envDir, "backups", "rogue_backup");
  fs.mkdirSync(rogueBackupDir, { recursive: true });
  fs.writeFileSync(path.join(rogueBackupDir, "kupola_db.json"), JSON.stringify({ state: "rogue_data" }), "utf-8");
  fs.writeFileSync(path.join(rogueBackupDir, "kupola_storage.json"), JSON.stringify({ state: "rogue_storage" }), "utf-8");

  const rogueDbHash = calculateHash(path.join(rogueBackupDir, "kupola_db.json"));
  const rogueStorageHash = calculateHash(path.join(rogueBackupDir, "kupola_storage.json"));
  fs.writeFileSync(
    path.join(rogueBackupDir, "sha256sums.txt"),
    `${rogueDbHash}  kupola_db.json\n${rogueStorageHash}  kupola_storage.json\n`,
    "utf-8"
  );

  let blockedRogue = false;
  try {
    performRollback(rogueBackupDir, {
      rootDir: env2.envDir,
      confirm: true,
    });
  } catch (err) {
    if (err.message.includes("DIVERGEM dos hashes de pré-limpeza esperados registrados no manifesto")) {
      blockedRogue = true;
    }
  }

  // Validar que os arquivos em data/ NÃO foram modificados
  const db2AfterRogue = calculateHash(db2Path);
  assert(
    blockedRogue && db2AfterRogue === env2.postDbHash,
    "Backup internamente íntegro porém incompatível com o manifesto é rejeitado antes de alterar dados"
  );

  // ---------------------------------------------------------------------------
  // TESTE 3: Bloqueio de manifestos conflitantes em múltiplos locais
  // ---------------------------------------------------------------------------
  console.log("\n--- Teste 3: Bloqueio de Manifestos Conflitantes (Backup vs Data) ---");
  const env3 = setupEnvironment("test3");
  const db3Path = path.join(env3.dataDir, "kupola_db.json");
  const storage3Path = path.join(env3.dataDir, "kupola_storage.json");

  fs.writeFileSync(db3Path, env3.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage3Path, env3.postCleanupStorageContent, "utf-8");

  // Adulterar o manifesto dentro do diretório de backup com hashes conflitantes
  const conflictingManifest = JSON.parse(fs.readFileSync(path.join(env3.dataDir, "cleanup_manifest.json"), "utf-8"));
  conflictingManifest.metadata.hashesPreCleanup["data/kupola_db.json"] = "hash_conflitante_falso_123456";
  fs.writeFileSync(path.join(env3.backupDir, "cleanup_manifest.json"), JSON.stringify(conflictingManifest, null, 2), "utf-8");

  let blockedConflicting = false;
  try {
    performRollback(env3.backupDir, {
      rootDir: env3.envDir,
      confirm: true,
    });
  } catch (err) {
    if (err.message.includes("CONFLITO DE MANIFESTOS DETECTADO")) {
      blockedConflicting = true;
    }
  }

  assert(blockedConflicting, "Detecta e bloqueia conflito de manifestos incompatíveis entre backup e data/");

  // ---------------------------------------------------------------------------
  // TESTE 4: Alteração no arquivo de storage, com DB inalterado, reprova o verificador
  // ---------------------------------------------------------------------------
  console.log("\n--- Teste 4: Alteração Exclusiva em Storage Reprova o Verificador ---");
  const env4 = setupEnvironment("test4");
  const db4Path = path.join(env4.dataDir, "kupola_db.json");
  const storage4Path = path.join(env4.dataDir, "kupola_storage.json");

  // DB com hash de pré-limpeza correto, mas storage alterado
  fs.writeFileSync(db4Path, env4.preCleanupDbContent, "utf-8");
  fs.writeFileSync(storage4Path, JSON.stringify({ state: "corrupted_storage" }), "utf-8");

  const verifyRes4 = verifyManifestAndRollback({
    rootDir: env4.envDir,
    dbPath: db4Path,
    storagePath: storage4Path,
    manifestPath: path.join(env4.dataDir, "cleanup_manifest.json"),
    backupDir: env4.backupDir,
  });

  assert(
    verifyRes4.success === false &&
      verifyRes4.verdict === "REPROVADO" &&
      verifyRes4.hashes.isDbMatch === true &&
      verifyRes4.hashes.isStorageMatch === false,
    "Alteração apenas em storage reprova o verificador com identificação separada de DB e Storage"
  );

  // ---------------------------------------------------------------------------
  // TESTE 5: Manifesto incompleto ou divergente reprova o verificador dinamicamente
  // ---------------------------------------------------------------------------
  console.log("\n--- Teste 5: Manifesto Incompleto Reprova o Verificador ---");
  const env5 = setupEnvironment("test5");
  const db5Path = path.join(env5.dataDir, "kupola_db.json");
  const storage5Path = path.join(env5.dataDir, "kupola_storage.json");

  // Injetar dados no DB que têm chaves candidatas em subscriptions, mas o manifesto omite subscriptions
  const db5WithSub = {
    ...JSON.parse(env5.preCleanupDbContent),
    subscriptions: {
      org_test_1: { plan: "trial" },
    },
  };
  fs.writeFileSync(db5Path, JSON.stringify(db5WithSub, null, 2), "utf-8");
  fs.writeFileSync(storage5Path, env5.preCleanupStorageContent, "utf-8");

  // Atualizar manifesto com hash pré do novo db5, mas SEM catalogar subscriptions
  const newDb5Hash = calculateHash(db5Path);
  const manifest5 = JSON.parse(fs.readFileSync(path.join(env5.dataDir, "cleanup_manifest.json"), "utf-8"));
  manifest5.metadata.hashesPreCleanup["data/kupola_db.json"] = newDb5Hash;
  manifest5.manifestRecords = [{ id: "usr_1", file: "data/kupola_db.json", collection: "users", ownerOrgId: "org_test_1" }];
  fs.writeFileSync(path.join(env5.dataDir, "cleanup_manifest.json"), JSON.stringify(manifest5, null, 2), "utf-8");

  const verifyRes5 = verifyManifestAndRollback({
    rootDir: env5.envDir,
    dbPath: db5Path,
    storagePath: storage5Path,
    manifestPath: path.join(env5.dataDir, "cleanup_manifest.json"),
  });

  assert(
    verifyRes5.success === false &&
      verifyRes5.verdict === "REPROVADO" &&
      verifyRes5.failures.some((f) => f.includes("omite 1 propriedades candidatas em 'subscriptions'")),
    "Manifesto incompleto (omitindo chaves de dicionário) é terminantemente REPROVADO"
  );

  // ---------------------------------------------------------------------------
  // TESTE 6: Falha no segundo arquivo E falha na recuperação do primeiro produz diagnóstico explícito
  // ---------------------------------------------------------------------------
  console.log("\n--- Teste 6: Falha Dupla (Substituição do 2º e Recuperação do 1º) ---");
  const env6 = setupEnvironment("test6");
  const db6Path = path.join(env6.dataDir, "kupola_db.json");
  const storage6Path = path.join(env6.dataDir, "kupola_storage.json");

  fs.writeFileSync(db6Path, env6.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage6Path, env6.postCleanupStorageContent, "utf-8");

  const originalRenameSync = fs.renameSync;
  const originalCopyFileSync = fs.copyFileSync;

  // Interceptar renameSync para falhar no segundo arquivo (storage)
  fs.renameSync = function (oldPath, newPath) {
    if (newPath.includes("kupola_storage.json")) {
      throw new Error("DISK_FAILURE_ON_STORAGE");
    }
    return originalRenameSync.call(fs, oldPath, newPath);
  };

  // Interceptar copyFileSync para falhar também ao tentar recuperar kupola_db.json do snapshot pré-rollback
  fs.copyFileSync = function (src, dest) {
    if (src.includes("pre-rollback") && dest.includes("kupola_db.json")) {
      throw new Error("DISK_FAILURE_ON_PRE_ROLLBACK_RECOVERY");
    }
    return originalCopyFileSync.call(fs, src, dest);
  };

  let catastrophicDiagnosed = false;
  try {
    performRollback(env6.backupDir, {
      rootDir: env6.envDir,
      confirm: true,
    });
  } catch (err) {
    if (
      err.message.includes("ERRO CATASTRÓFICO") &&
      err.message.includes("STATUS: NÃO RECUPERADO") &&
      err.message.includes("SNAPSHOT PRÉ-ROLLBACK PRESERVADO EM")
    ) {
      catastrophicDiagnosed = true;
    }
  } finally {
    fs.renameSync = originalRenameSync;
    fs.copyFileSync = originalCopyFileSync;
  }

  assert(
    catastrophicDiagnosed,
    "Falha na substituição e falha na recuperação do primeiro arquivo emite diagnóstico forense e preserva snapshot"
  );

  // ---------------------------------------------------------------------------
  // TESTE 7: Falha no segundo arquivo com auto-reversão do primeiro bem-sucedida
  // ---------------------------------------------------------------------------
  console.log("\n--- Teste 7: Falha no Segundo Arquivo com Auto-Reversão do Primeiro ---");
  const env7 = setupEnvironment("test7");
  const db7Path = path.join(env7.dataDir, "kupola_db.json");
  const storage7Path = path.join(env7.dataDir, "kupola_storage.json");

  fs.writeFileSync(db7Path, env7.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage7Path, env7.postCleanupStorageContent, "utf-8");

  fs.renameSync = function (oldPath, newPath) {
    if (newPath.includes("kupola_storage.json")) {
      throw new Error("DISK_FAILURE_STORAGE_ONLY");
    }
    return originalRenameSync.call(fs, oldPath, newPath);
  };

  let revertedSuccess = false;
  try {
    performRollback(env7.backupDir, {
      rootDir: env7.envDir,
      confirm: true,
    });
  } catch (err) {
    if (err.message.includes("FALHA PARCIAL DETECTADA E REVERTIDA")) {
      revertedSuccess = true;
    }
  } finally {
    fs.renameSync = originalRenameSync;
  }

  const finalDb7Hash = calculateHash(db7Path);
  assert(
    revertedSuccess && finalDb7Hash === env7.postDbHash,
    "Falha no segundo arquivo reverte o primeiro arquivo ao estado anterior com hash verificado"
  );

  // ---------------------------------------------------------------------------
  // TESTE 8: Bloqueio de estado misto/inconsistente
  // ---------------------------------------------------------------------------
  console.log("\n--- Teste 8: Bloqueio de Estado Misto ---");
  const env8 = setupEnvironment("test8");
  const db8Path = path.join(env8.dataDir, "kupola_db.json");
  const storage8Path = path.join(env8.dataDir, "kupola_storage.json");

  fs.writeFileSync(db8Path, env8.preCleanupDbContent, "utf-8");
  fs.writeFileSync(storage8Path, env8.postCleanupStorageContent, "utf-8");

  let blockedMixed = false;
  try {
    performRollback(env8.backupDir, {
      rootDir: env8.envDir,
      confirm: true,
    });
  } catch (err) {
    if (err.message.includes("Estado inconsistente e misto detectado")) {
      blockedMixed = true;
    }
  }

  assert(blockedMixed, "Bloqueia estado misto onde um arquivo está em pré-limpeza e outro em pós-limpeza");

  // ---------------------------------------------------------------------------
  // TESTE 9: Falha na validação final com auto-recuperação dupla de ambos os arquivos
  // ---------------------------------------------------------------------------
  console.log("\n--- Teste 9: Falha na Validação Final com Auto-Recuperação Dupla ---");
  const env9 = setupEnvironment("test9");
  const db9Path = path.join(env9.dataDir, "kupola_db.json");
  const storage9Path = path.join(env9.dataDir, "kupola_storage.json");

  fs.writeFileSync(db9Path, env9.postCleanupDbContent, "utf-8");
  fs.writeFileSync(storage9Path, env9.postCleanupStorageContent, "utf-8");

  fs.renameSync = function (oldPath, newPath) {
    originalRenameSync.call(fs, oldPath, newPath);
    if (newPath.includes("kupola_db.json")) {
      fs.writeFileSync(newPath, "corrompido_apos_rename_final", "utf-8");
    }
  };

  let doubleReverted = false;
  try {
    performRollback(env9.backupDir, {
      rootDir: env9.envDir,
      confirm: true,
    });
  } catch (err) {
    if (err.message.includes("AUTO-RECUPERAÇÃO CONCLUÍDA")) {
      doubleReverted = true;
    }
  } finally {
    fs.renameSync = originalRenameSync;
  }

  const db9HashAfter = calculateHash(db9Path);
  const storage9HashAfter = calculateHash(storage9Path);

  assert(
    doubleReverted &&
      db9HashAfter === env9.postDbHash &&
      storage9HashAfter === env9.postStorageHash,
    "Validação final falha e reverte ambos os arquivos para o snapshot pré-rollback com hashes verificados"
  );

  // ---------------------------------------------------------------------------
  // TESTE 10: Rejeição de bypass por força
  // ---------------------------------------------------------------------------
  console.log("\n--- Teste 10: Rejeição de Bypass por Força ---");
  const env10 = setupEnvironment("test10");
  const db10Path = path.join(env10.dataDir, "kupola_db.json");
  const storage10Path = path.join(env10.dataDir, "kupola_storage.json");

  fs.writeFileSync(db10Path, "arbitrary_corrupt", "utf-8");
  fs.writeFileSync(storage10Path, env10.postCleanupStorageContent, "utf-8");

  let blockedForce = false;
  try {
    performRollback(env10.backupDir, {
      rootDir: env10.envDir,
      confirm: true,
      force: true,
      FORCE_ROLLBACK: true,
    });
  } catch (err) {
    if (err.message.includes("sem possibilidade de bypass automático")) {
      blockedForce = true;
    }
  }

  assert(blockedForce, "Rejeita tentativa de bypass por força diante de hashes divergentes");

  console.log("\n================================================================================");
  console.log(`=== RESULTADO: TODOS OS ${passedTests}/${totalTests} TESTES FORAM APROVADOS COM 100% DE SUCESSO! ===`);
  console.log("================================================================================\n");
} finally {
  fs.rmSync(sandboxRoot, { recursive: true, force: true });
}
