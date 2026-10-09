import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const envBackupPath = path.join(rootDir, ".env.backup_test");
const envPath = path.join(rootDir, ".env");

let originalEnvExisted = false;
let originalEnvContent = "";

if (fs.existsSync(envPath)) {
  originalEnvExisted = true;
  originalEnvContent = fs.readFileSync(envPath, "utf8");
}

function restoreEnv() {
  if (originalEnvExisted && originalEnvContent) {
    fs.writeFileSync(envPath, originalEnvContent);
  } else if (fs.existsSync(envPath)) {
    fs.unlinkSync(envPath);
  }
}

try {
  console.log("=========================================================================");
  console.log("=== BATERIA DE TESTES: INICIALIZAÇÃO DE VARIÁVEIS DE AMBIENTE E JWT   ===");
  console.log("=========================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  // 1. Aplicação em produção sem "JWT_SECRET": deve falhar de forma segura.
  console.log("--- 1. Produção sem JWT_SECRET ---");
  // Certificar que .env não existe ou não tem JWT_SECRET
  if (fs.existsSync(envPath)) fs.unlinkSync(envPath);

  const resNoSecret = spawnSync("npx", [
    "tsx",
    "-e",
    'delete process.env.JWT_SECRET; process.env.NODE_ENV="production"; import("./server/jwt.ts");'
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", JWT_SECRET: "" },
  });

  assert(
    resNoSecret.status !== 0 && resNoSecret.stderr.includes("JWT_SECRET é obrigatório"),
    "Aplicação em produção sem JWT_SECRET falha de forma segura",
    `Status: ${resNoSecret.status}, stderr: ${resNoSecret.stderr}`
  );

  // 2. Aplicação em produção com chave curta: deve falhar de forma segura.
  console.log("\n--- 2. Produção com chave curta (<32 caracteres) ---");
  const resShortSecret = spawnSync("npx", [
    "tsx",
    "-e",
    'process.env.NODE_ENV="production"; process.env.JWT_SECRET="chave-curta-apenas-20-c"; import("./server/jwt.ts");'
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", JWT_SECRET: "chave-curta-apenas-20-c" },
  });

  assert(
    resShortSecret.status !== 0 && resShortSecret.stderr.includes("mínimo 32 caracteres"),
    "Aplicação em produção com chave curta (<32 chars) falha de forma segura",
    `Status: ${resShortSecret.status}, stderr: ${resShortSecret.stderr}`
  );

  // 3. Aplicação em produção com chave válida fornecida pelo ambiente (process.env)
  console.log("\n--- 3. Produção com chave válida via ambiente (process.env) ---");
  const validTestKeyEnv = "chave-de-teste-valida-com-mais-de-32-caracteres-ambiente";
  const resValidEnv = spawnSync("npx", [
    "tsx",
    "-e",
    'import { JWT_SECRET } from "./server/jwt.ts"; console.log("SECRET_LOADED_LENGTH:", JWT_SECRET.length);'
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", JWT_SECRET: validTestKeyEnv },
  });

  assert(
    resValidEnv.status === 0 && resValidEnv.stdout.includes("SECRET_LOADED_LENGTH: 56"),
    "Aplicação em produção com chave válida pelo ambiente inicializa com sucesso",
    `Status: ${resValidEnv.status}, stdout: ${resValidEnv.stdout}, stderr: ${resValidEnv.stderr}`
  );

  // 4. Aplicação com chave válida carregada exclusivamente de um arquivo ".env" de teste
  console.log("\n--- 4. Chave válida carregada EXCLUSIVAMENTE de um arquivo .env de teste ---");
  const validKeyInFile = "chave-teste-do-arquivo-env-com-mais-de-32-caracteres-123456";
  fs.writeFileSync(envPath, `JWT_SECRET=${validKeyInFile}\nNODE_ENV=production\n`);

  // Limpamos JWT_SECRET e NODE_ENV do ambiente de chamada do processo filho
  const cleanEnv = { ...process.env };
  delete cleanEnv.JWT_SECRET;
  delete cleanEnv.NODE_ENV;

  const resFromDotEnv = spawnSync("npx", [
    "tsx",
    "-e",
    'import { JWT_SECRET } from "./server/jwt.ts"; console.log("LOADED_FROM_DOTENV:", JWT_SECRET === "chave-teste-do-arquivo-env-com-mais-de-32-caracteres-123456");'
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: cleanEnv,
  });

  assert(
    resFromDotEnv.status === 0 && resFromDotEnv.stdout.includes("LOADED_FROM_DOTENV: true"),
    "Chave carregada exclusivamente do arquivo .env antes de server/jwt.ts inicializar",
    `Status: ${resFromDotEnv.status}, stdout: ${resFromDotEnv.stdout}, stderr: ${resFromDotEnv.stderr}`
  );

  // 5. Teste carregamento através de server.ts (módulos dependentes de db/jwt via server.ts)
  console.log("\n--- 5. Carregamento de .env via server.ts com módulos dependentes ---");
  const resServerWithDotEnv = spawnSync("npx", [
    "tsx",
    "-e",
    `
    import "dotenv/config";
    import { db, authUser } from "./server/db.ts";
    import { JWT_SECRET } from "./server/jwt.ts";
    console.log("SERVER_MODULES_INIT_OK:", JWT_SECRET === "chave-teste-do-arquivo-env-com-mais-de-32-caracteres-123456" && typeof db !== "undefined");
    `
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: cleanEnv,
  });

  assert(
    resServerWithDotEnv.status === 0 && resServerWithDotEnv.stdout.includes("SERVER_MODULES_INIT_OK: true"),
    "Módulos do servidor inicializam em produção lendo chave exclusivamente de .env",
    `Status: ${resServerWithDotEnv.status}, stdout: ${resServerWithDotEnv.stdout}`
  );

  // 6. Teste com .env contendo chave curta em produção (deve falhar de forma segura)
  console.log("\n--- 6. Arquivo .env com chave curta em produção ---");
  fs.writeFileSync(envPath, `JWT_SECRET=chave-curta-no-env\nNODE_ENV=production\n`);

  const resShortInFile = spawnSync("npx", [
    "tsx",
    "-e",
    'import("./server/jwt.ts");'
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: cleanEnv,
  });

  assert(
    resShortInFile.status !== 0 && resShortInFile.stderr.includes("mínimo 32 caracteres"),
    "Chave curta lida exclusivamente de .env em produção é rejeitada de forma segura",
    `Status: ${resShortInFile.status}, stderr: ${resShortInFile.stderr}`
  );

  console.log("\n=========================================================");
  console.log(`TOTAL DE TESTES ENV/JWT: ${passed + failed} | APROVADOS: ${passed} | REPROVADOS: ${failed}`);
  console.log("=========================================================");

  if (failed > 0) {
    process.exit(1);
  }
} finally {
  restoreEnv();
}
