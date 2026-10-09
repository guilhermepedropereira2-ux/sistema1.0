import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { db, isUserSuperAdmin } from "./db.js";
import { User } from "./types.js";

/**
 * Resolução e validação estrita da chave JWT.
 * Em produção (NODE_ENV === "production"), exige obrigatoriamente a variável JWT_SECRET
 * configurada no ambiente com no mínimo 32 caracteres criptograficamente fortes.
 * Em desenvolvimento/testes locais, permite fallback restrito para viabilizar execução local.
 */
function resolveJwtSecret(): string {
  const isProd = process.env.NODE_ENV === "production";
  const rawSecret = process.env.JWT_SECRET;

  if (isProd) {
    if (!rawSecret || rawSecret.trim().length < 32) {
      const errorMsg =
        "\n====================================================================\n" +
        "[KUPOLA FATAL SECURITY ERROR] Inicialização abortada em PRODUÇÃO!\n" +
        "A variável de ambiente 'JWT_SECRET' é obrigatória e deve possuir no mínimo 32 caracteres.\n" +
        "Nunca utilize chaves fracas ou pré-definidas em produção.\n" +
        "Configure 'JWT_SECRET' no painel de variáveis de ambiente da hospedagem.\n" +
        "====================================================================\n";
      console.error(errorMsg);
      throw new Error("JWT_SECRET é obrigatório e deve ter no mínimo 32 caracteres em ambiente de produção.");
    }
    return rawSecret.trim();
  }

  // Ambiente de desenvolvimento ou testes locais
  if (rawSecret && rawSecret.trim().length >= 16) {
    return rawSecret.trim();
  }

  // Fallback estritamente local para desenvolvimento (desativado em produção)
  return "kupola-dev-local-only-insecure-secret-key-change-in-env";
}

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  roles: string[];
  barbershop_id: string;
  is_superadmin?: boolean;
}

/**
 * Gera um token JWT criptograficamente assinado com expiração
 */
export function generateToken(user: User): string {
  const isSuper = isUserSuperAdmin(user);
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    roles: user.roles || [user.role],
    barbershop_id: user.barbershop_id || "",
    is_superadmin: isSuper,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Valida e decodifica o token JWT
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Hash de senha utilizando bcrypt com salt rounds 10
 */
export function hashPassword(plain: string): string {
  if (!plain) return "";
  if (plain.startsWith("$2a$") || plain.startsWith("$2b$")) return plain;
  return bcrypt.hashSync(plain, 10);
}

/**
 * Compara senha fornecida com hash armazenado
 */
export function comparePassword(plain: string, hashOrPlain: string): boolean {
  if (!plain || !hashOrPlain) return false;
  if (hashOrPlain.startsWith("$2a$") || hashOrPlain.startsWith("$2b$")) {
    return bcrypt.compareSync(plain, hashOrPlain);
  }
  // Migração transparente de senhas legadas em texto plano
  return plain === hashOrPlain;
}

/**
 * Gera uma senha temporária aleatória segura de 10 caracteres
 */
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let pass = "";
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

/**
 * Remove campos sensíveis antes de retornar o usuário na API
 */
export function sanitizeUser(user: any): any {
  if (!user) return null;
  const { password, password_hash, ...clean } = user;
  return clean;
}

/**
 * Helper centralizado para obter o usuário autenticado da requisição.
 * NUNCA FAZ FALLBACK PARA OUTRO USUÁRIO SE O TOKEN FOR INVÁLIDO OU AUSENTE.
 */
export const authUser = (req: Request): User | null => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;

  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;

  // 1. Validação estrita de JWT criptograficamente assinado com expiração
  const decoded = verifyToken(token);
  if (decoded && decoded.userId) {
    const user = db.users.find((u) => u.id === decoded.userId);
    if (user && user.active !== false) {
      return user;
    }
    return null;
  }

  // Se o token for inválido, expirado ou forjado, retorna estritamente null
  return null;
};

/**
 * Middleware Express: Exige usuário autenticado ativo.
 * Retorna 401 Unauthorized se o token for ausente, inválido ou expirado.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = authUser(req);
  if (!user) {
    return res.status(401).json({
      error: "Unauthorized",
      detail: "Autenticação obrigatória. Token ausente, inválido ou sessão expirada.",
      code: "UNAUTHORIZED",
    });
  }
  (req as any).user = user;
  next();
};

/**
 * Middleware Express: Exige uma das roles especificadas.
 * Dono e SuperAdmin têm bypass automático.
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user || authUser(req);
    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        detail: "Autenticação obrigatória.",
        code: "UNAUTHORIZED",
      });
    }

    if (isUserSuperAdmin(user)) {
      (req as any).user = user;
      return next();
    }

    const userRoles = user.roles || (user.role ? [user.role] : []);
    const isDono = userRoles.some((r: string) => ["dono", "admin", "owner"].includes(r));
    if (isDono) {
      (req as any).user = user;
      return next();
    }

    const hasAllowedRole = userRoles.some((r: string) => allowedRoles.includes(r));
    if (!hasAllowedRole) {
      return res.status(403).json({
        error: "Forbidden",
        detail: `Acesso negado. Perfil '${user.role}' não autorizado para esta operação.`,
        code: "ROLE_FORBIDDEN",
      });
    }

    (req as any).user = user;
    next();
  };
};

/**
 * Middleware Express: Exige uma permissão específica do catálogo.
 * Dono e SuperAdmin têm bypass automático.
 */
export const requirePermission = (permissionKey: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user || authUser(req);
    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        detail: "Autenticação obrigatória.",
        code: "UNAUTHORIZED",
      });
    }

    if (isUserSuperAdmin(user)) {
      (req as any).user = user;
      return next();
    }

    const userRoles = user.roles || (user.role ? [user.role] : []);
    const isDono = userRoles.some((r: string) => ["dono", "admin", "owner"].includes(r));
    if (isDono) {
      (req as any).user = user;
      return next();
    }

    const perms = user.permissions || {};
    if (perms[permissionKey] === true) {
      (req as any).user = user;
      return next();
    }

    return res.status(403).json({
      error: "Forbidden",
      detail: `Acesso negado. Permissão '${permissionKey}' necessária para esta operação.`,
      code: "PERMISSION_DENIED",
    });
  };
};

/**
 * Middleware Express: Exige perfil Dono / Proprietário ou SuperAdmin.
 */
export const requireDono = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user || authUser(req);
  if (!user) {
    return res.status(401).json({
      error: "Unauthorized",
      detail: "Autenticação obrigatória.",
      code: "UNAUTHORIZED",
    });
  }

  if (isUserSuperAdmin(user)) {
    (req as any).user = user;
    return next();
  }

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isDono = userRoles.some((r: string) => ["dono", "admin", "owner"].includes(r));
  if (!isDono) {
    return res.status(403).json({
      error: "Forbidden",
      detail: "Acesso negado. Esta operação é exclusiva para o Dono/Proprietário da barbearia.",
      code: "DONO_REQUIRED",
    });
  }

  (req as any).user = user;
  next();
};

/**
 * Middleware Express: Exige SuperAdmin da plataforma Kupola.
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user || authUser(req);
  if (!user || !isUserSuperAdmin(user)) {
    return res.status(403).json({
      error: "Forbidden",
      detail: "Acesso exclusivo para o SuperAdministrador da plataforma KUPOLA.",
      code: "SUPERADMIN_FORBIDDEN",
    });
  }
  (req as any).user = user;
  next();
};
