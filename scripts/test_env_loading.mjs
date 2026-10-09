import { spawnSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import http from "http";

const rootDir = process.cwd();
const realEnvPath = path.join(rootDir, ".env");

// REGRA CRÍTICA: Nunca modificar, apagar ou substituir o .env real do projeto.
const initialRealEnvExists = fs.existsSync(realEnvPath);
const initialRealEnvContent = initialRealEnvExists ? fs.readFileSync(realEnvPath, "utf8") : null;

// Criação de diretório temporário isolado para testes
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kupola-env-tests-"));

console.log("=========================================================================");
console.log("=== BATERIA DE TESTES: INICIALIZAÇÃO DE VARIÁVEIS DE AMBIENTE E JWT   ===");
console.log("=== AMBIENTE ISOLADO SEGURO: Protegendo .env real do projeto          ===");
console.log("=========================================================================\n");
console.log(`[INFO] Diretório temporário isolado criado em: ${tempDir}`);
console.log(`[INFO] Status do .env no diretório raiz: ${initialRealEnvExists ? "Existe (Preservado e Intocado)" : "Não existe no momento"}\n`);

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

function verifyRealEnvUnchanged() {
  const currentExists = fs.existsSync(realEnvPath);
  if (initialRealEnvExists !== currentExists) {
    throw new Error(`VIOLAÇÃO DE INTEGRIDADE: O estado de existência do .env real foi alterado! Inicial: ${initialRealEnvExists}, Atual: ${currentExists}`);
  }
  if (initialRealEnvExists) {
    const currentContent = fs.readFileSync(realEnvPath, "utf8");
    if (currentContent !== initialRealEnvContent) {
      throw new Error("VIOLAÇÃO DE INTEGRIDADE: O conteúdo do .env real foi modificado!");
    }
  }
}

try {
  // Base limpa de variáveis de ambiente para processos filhos
  const baseCleanEnv = { ...process.env };
  delete baseCleanEnv.JWT_SECRET;
  delete baseCleanEnv.NODE_ENV;
  delete baseCleanEnv.PORT;
  delete baseCleanEnv.DOTENV_CONFIG_PATH;

  // ---------------------------------------------------------------------------
  // 1. Aplicação em produção sem "JWT_SECRET": deve falhar de forma segura.
  // ---------------------------------------------------------------------------
  console.log("--- 1. Produção sem JWT_SECRET (Variável ausente e sem .env) ---");
  const emptyEnvFile = path.join(tempDir, ".env.empty");
  fs.writeFileSync(emptyEnvFile, "# Arquivo vazio para teste\n");

  const resNoSecret = spawnSync("npx", [
    "tsx",
    "-e",
    'import "./server/jwt.ts";'
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...baseCleanEnv,
      NODE_ENV: "production",
      DOTENV_CONFIG_PATH: emptyEnvFile
    },
  });

  assert(
    resNoSecret.status !== 0 && resNoSecret.stderr.includes("JWT_SECRET é obrigatório"),
    "Aplicação em produção sem JWT_SECRET falha de forma segura",
    `Status: ${resNoSecret.status}, stderr: ${resNoSecret.stderr}`
  );
  verifyRealEnvUnchanged();

  // ---------------------------------------------------------------------------
  // 2. Aplicação em produção com chave curta: deve falhar de forma segura.
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Produção com chave curta (<32 caracteres) via processo ---");
  const resShortSecret = spawnSync("npx", [
    "tsx",
    "-e",
    'import "./server/jwt.ts";'
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...baseCleanEnv,
      NODE_ENV: "production",
      JWT_SECRET: "chave-curta-apenas-20-c",
      DOTENV_CONFIG_PATH: emptyEnvFile
    },
  });

  assert(
    resShortSecret.status !== 0 && resShortSecret.stderr.includes("mínimo 32 caracteres"),
    "Aplicação em produção com chave curta (<32 chars) via env falha de forma segura",
    `Status: ${resShortSecret.status}, stderr: ${resShortSecret.stderr}`
  );
  verifyRealEnvUnchanged();

  // ---------------------------------------------------------------------------
  // 3. Aplicação em produção com chave válida fornecida pelo ambiente (process.env)
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Produção com chave válida via ambiente (process.env) ---");
  const dummyValidEnvKey = "chave-de-teste-ficticia-com-mais-de-32-caracteres-ambiente-123456";
  const resValidEnv = spawnSync("npx", [
    "tsx",
    "-e",
    'import { JWT_SECRET } from "./server/jwt.ts"; console.log("SECRET_LOADED_LENGTH:", JWT_SECRET.length);'
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...baseCleanEnv,
      NODE_ENV: "production",
      JWT_SECRET: dummyValidEnvKey,
      DOTENV_CONFIG_PATH: emptyEnvFile
    },
  });

  assert(
    resValidEnv.status === 0 && resValidEnv.stdout.includes(`SECRET_LOADED_LENGTH: ${dummyValidEnvKey.length}`),
    "Aplicação em produção com chave válida pelo ambiente inicializa com sucesso",
    `Status: ${resValidEnv.status}, stdout: ${resValidEnv.stdout}, stderr: ${resValidEnv.stderr}`
  );
  verifyRealEnvUnchanged();

  // ---------------------------------------------------------------------------
  // 4. Aplicação com chave válida carregada exclusivamente de arquivo .env de teste isolado
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Chave válida carregada EXCLUSIVAMENTE de um arquivo .env fictício isolado ---");
  const dummyValidKeyInFile = "chave-ficticia-de-teste-do-arquivo-env-com-mais-de-32-caracteres-789";
  const isolatedValidEnvFile = path.join(tempDir, ".env.valid.test");
  fs.writeFileSync(isolatedValidEnvFile, `JWT_SECRET=${dummyValidKeyInFile}\nNODE_ENV=production\n`);

  const resFromDotEnv = spawnSync("npx", [
    "tsx",
    "-e",
    `
    import "dotenv/config";
    import { JWT_SECRET } from "./server/jwt.ts";
    console.log("LOADED_FROM_DOTENV:", JWT_SECRET === "${dummyValidKeyInFile}");
    `
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...baseCleanEnv,
      DOTENV_CONFIG_PATH: isolatedValidEnvFile
    },
  });

  assert(
    resFromDotEnv.status === 0 && resFromDotEnv.stdout.includes("LOADED_FROM_DOTENV: true"),
    "Chave carregada exclusivamente do arquivo .env isolado antes de server/jwt.ts inicializar",
    `Status: ${resFromDotEnv.status}, stdout: ${resFromDotEnv.stdout}, stderr: ${resFromDotEnv.stderr}`
  );
  verifyRealEnvUnchanged();

  // ---------------------------------------------------------------------------
  // 5. Teste carregamento através de server.ts (módulos dependentes de db/jwt via server.ts)
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Carregamento de .env via módulos dependentes (server/db.ts e server/jwt.ts) ---");
  const resServerWithDotEnv = spawnSync("npx", [
    "tsx",
    "-e",
    `
    import "dotenv/config";
    import { db, authUser } from "./server/db.ts";
    import { JWT_SECRET } from "./server/jwt.ts";
    console.log("SERVER_MODULES_INIT_OK:", JWT_SECRET === "${dummyValidKeyInFile}" && typeof db !== "undefined" && typeof authUser === "function");
    `
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...baseCleanEnv,
      DOTENV_CONFIG_PATH: isolatedValidEnvFile
    },
  });

  assert(
    resServerWithDotEnv.status === 0 && resServerWithDotEnv.stdout.includes("SERVER_MODULES_INIT_OK: true"),
    "Módulos do servidor inicializam em produção lendo chave exclusivamente de .env isolado",
    `Status: ${resServerWithDotEnv.status}, stdout: ${resServerWithDotEnv.stdout}`
  );
  verifyRealEnvUnchanged();

  // ---------------------------------------------------------------------------
  // 6. Teste com .env isolado contendo chave curta em produção (deve falhar de forma segura)
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. Arquivo .env isolado com chave curta em produção ---");
  const isolatedShortEnvFile = path.join(tempDir, ".env.short.test");
  fs.writeFileSync(isolatedShortEnvFile, "JWT_SECRET=chave-curta-no-env\nNODE_ENV=production\n");

  const resShortInFile = spawnSync("npx", [
    "tsx",
    "-e",
    'import "./server/jwt.ts";'
  ], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...baseCleanEnv,
      DOTENV_CONFIG_PATH: isolatedShortEnvFile
    },
  });

  assert(
    resShortInFile.status !== 0 && resShortInFile.stderr.includes("mínimo 32 caracteres"),
    "Chave curta lida exclusivamente de .env isolado em produção é rejeitada de forma segura",
    `Status: ${resShortInFile.status}, stderr: ${resShortInFile.stderr}`
  );
  verifyRealEnvUnchanged();

  // ---------------------------------------------------------------------------
  // 7. Teste de ciclo de vida completo do servidor HTTP em porta livre com .env isolado
  // ---------------------------------------------------------------------------
  console.log("\n--- 7. Servidor HTTP completo inicializado com .env isolado ---");
  const testServerEnvFile = path.join(tempDir, ".env.server.test");
  const testServerSecret = "chave-ficticia-servidor-completo-com-mais-de-32-caracteres-ok";
  const testPort = 3094;
  fs.writeFileSync(testServerEnvFile, `JWT_SECRET=${testServerSecret}\nNODE_ENV=production\nPORT=${testPort}\n`);

  let serverStartedSuccessfully = false;
  let serverCheckDetails = "";

  const serverChild = spawn("npx", ["tsx", "server.ts"], {
    cwd: rootDir,
    detached: true,
    env: {
      ...baseCleanEnv,
      DOTENV_CONFIG_PATH: testServerEnvFile
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let childStderr = "";
  serverChild.stderr.on("data", d => { childStderr += d.toString(); });

  // Aguardar resultado da sondagem do servidor
  const checkResult = spawnSync("node", ["-e", `
    const http = require("http");
    let attempts = 0;
    function poll() {
      attempts++;
      const req = http.get("http://127.0.0.1:${testPort}/api/public/shop/default-shop", res => {
        console.log("SERVER_OK:" + res.statusCode);
        process.exit(0);
      });
      req.on("error", err => {
        if (attempts < 25) {
          setTimeout(poll, 200);
        } else {
          console.error("SERVER_ERR:" + err.message);
          process.exit(1);
        }
      });
    }
    setTimeout(poll, 400);
  `], {
    encoding: "utf8",
    timeout: 10000
  });

  // Finalizar grupo de processos do servidor filho de forma segura e completa
  try {
    if (serverChild.pid) {
      try { process.kill(-serverChild.pid, "SIGTERM"); } catch (e) {}
      try { process.kill(-serverChild.pid, "SIGKILL"); } catch (e) {}
    }
  } catch (e) {}

  const serverExited = checkResult.status === 0;
  assert(
    serverExited && checkResult.stdout.includes("SERVER_OK:"),
    "Servidor completo inicia com sucesso lendo configuração exclusivamente de .env isolado",
    checkResult.stdout + " " + checkResult.stderr + " " + childStderr
  );
  verifyRealEnvUnchanged();

  console.log("\n=========================================================");
  console.log(`TOTAL DE TESTES ENV/JWT: ${passed + failed} | APROVADOS: ${passed} | REPROVADOS: ${failed}`);
  console.log("=========================================================");

  if (failed > 0) {
    process.exit(1);
  }
} finally {
  // Limpeza estrita e garantida do diretório temporário
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`[INFO] Diretório temporário ${tempDir} removido com sucesso.`);
    }
  } catch (err) {
    console.error(`[WARN] Erro ao remover diretório temporário: ${err.message}`);
  }

  // Verificação final definitiva: garantir que .env real está 100% íntegro
  verifyRealEnvUnchanged();
  console.log("[INFO] Verificação de segurança concluída: .env real permaneceu 100% intocado.");
}
