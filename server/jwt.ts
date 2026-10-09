import "dotenv/config";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  roles: string[];
  barbershop_id: string;
  is_superadmin?: boolean;
}

const JWT_EXPIRES_IN = "7d";

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

export const JWT_SECRET = resolveJwtSecret();
export { resolveJwtSecret };

/**
 * Valida e decodifica o token JWT de forma estrita.
 * Retorna JwtPayload se válido ou null se inválido/expirado/forjado.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Assina um token JWT com expiração configurada.
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
