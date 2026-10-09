import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { db, isUserSuperAdmin, authUser } from "./db.js";
import { User } from "./types.js";
import {
  JWT_SECRET,
  JwtPayload,
  verifyToken,
  signToken,
} from "./jwt.js";

export type { JwtPayload };
export { JWT_SECRET, verifyToken, authUser };

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
  return signToken(payload);
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
