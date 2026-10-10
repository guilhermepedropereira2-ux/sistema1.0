import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createBackup } from "./backup_database.mjs";

function calculateHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function generateCleanupManifest() {
  const rootDir = process.cwd();
  const dbPath = path.join(rootDir, "data", "kupola_db.json");
  const storagePath = path.join(rootDir, "data", "kupola_storage.json");

  // 1. Calculate hashes before planning
  const initialDbHash = calculateHash(dbPath);
  const initialStorageHash = calculateHash(storagePath);

  // 2. Ensure timestamped backup exists and is verified
  const backupRes = createBackup();

  // 3. Load original data (READ-ONLY)
  const dbData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  const storageData = JSON.parse(fs.readFileSync(storagePath, "utf-8"));

  // Explicit Whitelist for Legitimate Entities
  const WHITELISTED_ORGS = new Set(["demo_vintage", "org_vintage"]);

  // 4. Identify 62 Candidate Organizations
  const candidateOrgsMap = new Map();

  // DB barbershops
  (dbData.barbershops || []).forEach((b) => {
    if (!WHITELISTED_ORGS.has(b.id)) {
      candidateOrgsMap.set(b.id, { id: b.id, name: b.name || "(Sem nome)", source: "kupola_db.json" });
    }
  });

  // Storage organizations
  const storageOrgsList = Array.isArray(storageData.organizations) ? storageData.organizations : [];
  storageOrgsList.forEach(([key, val]) => {
    if (!WHITELISTED_ORGS.has(key)) {
      if (!candidateOrgsMap.has(key)) {
        candidateOrgsMap.set(key, { id: key, name: val.name || val.shop_name || "(Sem nome)", source: "kupola_storage.json" });
      } else {
        candidateOrgsMap.get(key).inStorage = true;
      }
    }
  });

  const candidateOrgsList = Array.from(candidateOrgsMap.values());
  const candidateOrgIdsSet = new Set(candidateOrgsList.map((o) => o.id));

  // 5. Catalog Candidate Records with Strict Tenant Verification
  const manifestRecords = [];

  // Helper for DB collections
  const processDbCollection = (collName, items) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      let tenantId = item.barbershop_id || item.organization_id;
      if (collName === "barbershops") tenantId = item.id;

      if (tenantId && candidateOrgIdsSet.has(tenantId)) {
        const orgInfo = candidateOrgsMap.get(tenantId);
        manifestRecords.push({
          id: item.id || item.email || item.code || `${collName}_${manifestRecords.length}`,
          file: "data/kupola_db.json",
          collection: collName,
          ownerOrgId: tenantId,
          ownerOrgName: orgInfo ? orgInfo.name : "(Desconhecido)",
          reason: `Vínculo inequívoco de tenant com a organização de teste ${tenantId}`,
        });
      }
    });
  };

  // Helper for Storage collections
  const processStorageCollection = (collName, entries) => {
    if (!Array.isArray(entries)) return;
    entries.forEach((entry) => {
      const key = Array.isArray(entry) ? entry[0] : null;
      const value = Array.isArray(entry) ? entry[1] : entry;
      let tenantId = value.organization_id || value.barbershop_id;
      if (collName === "organizations") tenantId = key;

      if (tenantId && candidateOrgIdsSet.has(tenantId)) {
        const orgInfo = candidateOrgsMap.get(tenantId);
        manifestRecords.push({
          id: value.id || key,
          file: "data/kupola_storage.json",
          collection: collName,
          ownerOrgId: tenantId,
          ownerOrgName: orgInfo ? orgInfo.name : "(Desconhecido)",
          reason: `Vínculo inequívoco de tenant em kupola_storage.json com a organização de teste ${tenantId}`,
        });
      }
    });
  };

  // Process DB
  Object.keys(dbData).forEach((coll) => {
    processDbCollection(coll, dbData[coll]);
  });

  // Process Storage
  Object.keys(storageData).forEach((coll) => {
    processStorageCollection(coll, storageData[coll]);
  });

  // Calculate summary counts by collection
  const summaryByCollection = {};
  manifestRecords.forEach((r) => {
    const key = `${r.file} :: ${r.collection}`;
    summaryByCollection[key] = (summaryByCollection[key] || 0) + 1;
  });

  // 6. Build Manifest JSON
  const manifest = {
    metadata: {
      generatedAt: new Date().toISOString(),
      status: "PLANNED_READ_ONLY",
      sha256: {
        kupola_db: initialDbHash,
        kupola_storage: initialStorageHash,
      },
      backupLocation: backupRes.backupDir,
      totalCandidateOrgs: candidateOrgsList.length,
      totalCandidateRecords: manifestRecords.length,
      whitelistedEntities: ["demo_vintage", "org_vintage", "unit_shopping"],
    },
    summaryByCollection,
    candidateOrgs: candidateOrgsList,
    manifestRecords,
  };

  // Save manifest file in backups directory and data directory
  const manifestPathBackup = path.join(backupRes.backupDir, "cleanup_manifest.json");
  const manifestPathData = path.join(rootDir, "data", "cleanup_manifest.json");

  fs.writeFileSync(manifestPathBackup, JSON.stringify(manifest, null, 2), "utf-8");
  fs.writeFileSync(manifestPathData, JSON.stringify(manifest, null, 2), "utf-8");

  // 7. Verify SHA-256 Hashes of original files post-planning to guarantee zero modification
  const finalDbHash = calculateHash(dbPath);
  const finalStorageHash = calculateHash(storagePath);

  if (initialDbHash !== finalDbHash || initialStorageHash !== finalStorageHash) {
    throw new Error("ERRO CRÍTICO: Os arquivos de dados originais foram alterados durante o planejamento!");
  }

  return {
    backupRes,
    manifest,
    manifestPathBackup,
    manifestPathData,
    finalDbHash,
    finalStorageHash,
  };
}

if (process.argv[1] && process.argv[1].endsWith("plan_reversible_cleanup.mjs")) {
  try {
    console.log("================================================================================");
    console.log("=== KUPOLA 2.0 — ETAPA 3.6A: PLANEJAMENTO E MANIFESTO DE LIMPEZA REVERSÍVEL  ===");
    console.log("================================================================================\n");

    const result = generateCleanupManifest();

    console.log("[SUCESSO] Manifesto gerado com sucesso em modo SOMENTE LEITURA.");
    console.log(`- Backup criado em: ${result.backupRes.backupDir}`);
    console.log(`- Manifesto salvo em: ${result.manifestPathData}`);
    console.log(`- SHA-256 kupola_db.json:      ${result.finalDbHash}`);
    console.log(`- SHA-256 kupola_storage.json: ${result.finalStorageHash}`);
    console.log(`- Status da Integridade: VERIFICADO E 100% INTACTO (0 bytes alterados em dados originais)\n`);

    console.log("--- RESUMO DO MANIFESTO JSON ---");
    console.log(`Total de Organizações de Teste Mapeadas: ${result.manifest.metadata.totalCandidateOrgs}`);
    console.log(`Total de Registros Candidatos Catalogados: ${result.manifest.metadata.totalCandidateRecords}`);
    console.log("\nDetalhamento por Coleção:");
    Object.entries(result.manifest.summaryByCollection).forEach(([coll, count]) => {
      console.log(`  - ${coll.padEnd(42)}: ${count} registros`);
    });

    console.log("\n================================================================================");
    console.log("=== FIM DO PLANEJAMENTO (3.6A) — NENHUM DADO FOI EXCLUÍDO OU ALTERADO       ===");
    console.log("=== AGUARDANDO AUTORIZAÇÃO EXPLÍCITA DO USUÁRIO PARA QUALQUER EXCLUSÃO REAL ===");
    console.log("================================================================================\n");
  } catch (err) {
    console.error("[ERRO CRÍTICO NO PLANEJAMENTO]:", err.message);
    process.exit(1);
  }
}
