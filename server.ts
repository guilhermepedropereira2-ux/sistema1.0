import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { initDatabaseWithPg } from "./src/db/sync.js";
import { db, authUser } from "./server/db.js";
import { storage } from "./server/storage.js";

// Modular Route Handlers
import systemRoutes from "./server/routes/system.js";
import authRoutes from "./server/routes/auth.js";
import webhooksRoutes from "./server/routes/webhooks.js";
import publicShopRoutes from "./server/routes/publicShop.js";
import barbersRoutes from "./server/routes/barbers.js";
import catalogRoutes from "./server/routes/catalog.js";
import operationsRoutes from "./server/routes/operations.js";
import financialsRoutes from "./server/routes/financials.js";
import barberPortalRoutes from "./server/routes/barberPortal.js";
import analyticsRoutes from "./server/routes/analytics.js";
import superadminRoutes from "./server/routes/superadmin.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Router
const apiRouter = express.Router();

/**
 * Middleware de Expiração e Controle de Acesso
 * Verifica rotas operacionais (/api/barber/*, /api/financial/*, atendimentos, caixa, etc.):
 * - Se subscription_status === 'trial' e data atual > trial_ends_at, altera automaticamente o status para 'expired'.
 * - Retorna HTTP 403 Forbidden com { code: 'TRIAL_EXPIRED', message: '...' }
 */
apiRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  const reqPath = req.path;
  const isOperationalRoute =
    reqPath.startsWith("/barber") ||
    reqPath.startsWith("/financial") ||
    reqPath.startsWith("/appointments") ||
    reqPath.startsWith("/queue") ||
    reqPath.startsWith("/revenues") ||
    reqPath.startsWith("/expenses") ||
    reqPath.startsWith("/withdrawals") ||
    reqPath.startsWith("/cash-closings") ||
    reqPath.startsWith("/dashboard");

  if (!isOperationalRoute) {
    return next();
  }

  const user = authUser(req);
  const orgId = user?.barbershop_id || (req.headers["x-organization-id"] as string) || "org_vintage";
  const org = await storage.getOrganization(orgId);

  const now = new Date();

  // 1. Checagem na organização do banco relacional
  if (org) {
    const isTrial = org.subscription_status === "trial";
    const trialEnded = isTrial && org.trial_ends_at && new Date(org.trial_ends_at) < now;
    const isAlreadyExpired = org.subscription_status === "expired" || org.status === "expired";

    if (trialEnded || isAlreadyExpired) {
      if (org.subscription_status !== "expired") {
        await storage.updateOrganizationTrialStatus(org.id, "expired");
        org.subscription_status = "expired";
      }
      if (user) {
        user.subscriptionStatus = "expired";
      }
      db.subscription.status = "expired";
      db.subscription.subscriptionStatus = "expired";

      return res.status(403).json({
        code: "TRIAL_EXPIRED",
        message: "O seu período de teste de 7 dias terminou. Ative um plano para continuar.",
      });
    }
  }

  // 2. Checagem no usuário da sessão
  if (user) {
    const isUserTrial = (user.subscriptionStatus as string) === "trial" || user.subscriptionStatus === "trialing";
    const userExpired = isUserTrial && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < now;

    if (userExpired || user.subscriptionStatus === "expired") {
      user.subscriptionStatus = "expired";
      db.subscription.status = "expired";
      db.subscription.subscriptionStatus = "expired";
      if (org && org.subscription_status !== "expired") {
        await storage.updateOrganizationTrialStatus(org.id, "expired");
      }

      return res.status(403).json({
        code: "TRIAL_EXPIRED",
        message: "O seu período de teste de 7 dias terminou. Ative um plano para continuar.",
      });
    }
  }

  next();
});

// Registrar submódulos de rotas
apiRouter.use(systemRoutes);
apiRouter.use(authRoutes);
apiRouter.use(webhooksRoutes);
apiRouter.use(publicShopRoutes);
apiRouter.use(barbersRoutes);
apiRouter.use(catalogRoutes);
apiRouter.use(operationsRoutes);
apiRouter.use(financialsRoutes);
apiRouter.use(barberPortalRoutes);
apiRouter.use(analyticsRoutes);
apiRouter.use(superadminRoutes);

app.use("/api", apiRouter);

// ----------------------------- Vite Middleware & Startup -----------------------------

async function start() {
  // Inicializa conexão e migrações do PostgreSQL Supabase
  try {
    await initDatabaseWithPg(db);
  } catch (err: any) {
    console.warn("[PostgreSQL Startup Warning]:", err.message);
  }

  // Landing Page Route
  app.get(["/landing", "/landing.html"], (_req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "landing.html"));
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
