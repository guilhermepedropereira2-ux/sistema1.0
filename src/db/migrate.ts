import fs from "fs";
import path from "path";
import { getDbPool, testConnection } from "./client.js";

export async function runMigrations(): Promise<{ success: boolean; message: string; tables: Record<string, number> }> {
  console.log("[Migration] Verificando conexão com o PostgreSQL...");
  const connTest = await testConnection();
  if (!connTest.ok) {
    throw new Error(`Falha na conexão com o banco: ${connTest.message}`);
  }
  console.log("[Migration] Conexão confirmada:", connTest.details?.database);

  const pool = getDbPool();
  if (!pool) throw new Error("Pool do banco não inicializado.");

  const client = await pool.connect();
  const tableCounts: Record<string, number> = {};

  try {
    // 1. Executar DDL do Schema
    const schemaPath = path.join(process.cwd(), "src", "db", "schema.sql");
    const ddl = fs.readFileSync(schemaPath, "utf-8");

    console.log("[Migration] Executando DDL das tabelas...");
    await client.query(ddl);
    console.log("[Migration] Tabelas e índices criados com sucesso.");

    // 2. Verificar se precisa de Seed inicial (verifica barbershop e units)
    const checkBarbershop = await client.query("SELECT COUNT(*)::int as count FROM barbershop;");
    const count = checkBarbershop.rows[0].count;

    if (count === 0) {
      console.log("[Migration] Banco de dados vazio. Inserindo dados iniciais da barbearia...");
      await client.query("BEGIN;");

      // Barbearia
      await client.query(`
        INSERT INTO barbershop (id, name, slug, document, phone, address, opening_hours, city, state, shop_phone, operational_mode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING;
      `, [
        "profile",
        "Barbearia Vintage Club",
        "barbearia-vintage",
        "12.345.678/0001-90",
        "(11) 99999-8888",
        "Rua Augusta, 1200 - Consolação, São Paulo - SP",
        "Segunda a Sábado das 09h às 20h",
        "São Paulo",
        "SP",
        "(11) 99999-8888",
        "hibrido"
      ]);

      // Settings
      await client.query(`
        INSERT INTO settings (id, barbershop_id, commission_on, initial_balance, shop_name, operational_mode, public_slug)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING;
      `, [
        "settings",
        "profile",
        "pago",
        3000.0,
        "Barbearia Vintage Club",
        "hibrido",
        "barbearia-vintage"
      ]);

      // Subscription
      await client.query(`
        INSERT INTO subscription (plan_id, status, max_barbers, multi_unit, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (plan_id) DO NOTHING;
      `, ["premium", "active", 10, true]);

      // Units
      await client.query(`
        INSERT INTO units (id, name, short_name, slug, address, phone, city, state, is_main, operational_mode)
        VALUES 
          ('unit_centro', 'Unidade Centro (Matriz)', 'Centro', 'barbearia-vintage-centro', 'Rua Augusta, 1200 - Consolação, São Paulo - SP', '(11) 99999-8888', 'São Paulo', 'SP', true, 'hibrido'),
          ('unit_shopping', 'Unidade Shopping (Filial)', 'Shopping', 'barbearia-vintage-shopping', 'Av. Brigadeiro Faria Lima, 2232 - Shopping Iguatemi, São Paulo - SP', '(11) 98888-7777', 'São Paulo', 'SP', false, 'agendamento')
        ON CONFLICT (id) DO NOTHING;
      `);

      // Users
      await client.query(`
        INSERT INTO users (id, name, username, password, role, roles, barbershop_id, permissions, active)
        VALUES 
          ('usr_dono', 'Carlos Roberto (Dono)', 'dono', '123456', 'dono', '["dono"]'::jsonb, 'profile', '{"ver_dashboard": true, "ver_financeiro": true, "gerenciar_barbeiros": true}'::jsonb, true),
          ('usr_gerente', 'Marcos Vinicius (Gerente)', 'gerente', '123456', 'gerente', '["gerente"]'::jsonb, 'profile', '{"ver_dashboard": true, "ver_receitas": true, "gerenciar_fila": true}'::jsonb, true)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Payment Methods
      await client.query(`
        INSERT INTO payment_methods (id, barbershop_id, name, kind, fees, settlement_days, active)
        VALUES
          ('pm_dinheiro', 'profile', 'Dinheiro', 'dinheiro', '{"dinheiro": 0}'::jsonb, '{"dinheiro": 0}'::jsonb, true),
          ('pm_pix', 'profile', 'PIX', 'pix', '{"pix": 0}'::jsonb, '{"pix": 0}'::jsonb, true),
          ('pm_ton', 'profile', 'Ton', 'maquininha', '{"debito": 1.99, "credito_vista": 3.15, "credito_parcelado": 4.60, "pix": 0.99}'::jsonb, '{"debito": 1, "credito_vista": 1, "credito_parcelado": 30, "pix": 0}'::jsonb, true),
          ('pm_stone', 'profile', 'Stone', 'maquininha', '{"debito": 1.49, "credito_vista": 2.99, "credito_parcelado": 4.20, "pix": 0.79}'::jsonb, '{"debito": 1, "credito_vista": 30, "credito_parcelado": 30, "pix": 0}'::jsonb, true),
          ('pm_infinitepay', 'profile', 'InfinitePay', 'maquininha', '{"debito": 1.37, "credito_vista": 3.05, "credito_parcelado": 4.35, "pix": 0}'::jsonb, '{"debito": 1, "credito_vista": 1, "credito_parcelado": 30, "pix": 0}'::jsonb, true)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Services
      await client.query(`
        INSERT INTO services (id, barbershop_id, name, price, duration_min, active)
        VALUES
          ('svc_corte', 'profile', 'Corte Tradicional', 50, 30, true),
          ('svc_barba', 'profile', 'Barba Terapia', 35, 30, true),
          ('svc_combo', 'profile', 'Corte + Barba', 75, 60, true),
          ('svc_degrade', 'profile', 'Corte Degradê', 60, 40, true),
          ('svc_sobrancelha', 'profile', 'Sobrancelha', 20, 15, true)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Products
      await client.query(`
        INSERT INTO products (id, barbershop_id, name, price, cost, stock, active)
        VALUES
          ('prod_pomada', 'profile', 'Pomada Matte 100g', 45, 20, 28, true),
          ('prod_shampoo', 'profile', 'Shampoo Refrescante', 35, 15, 19, true),
          ('prod_oleo', 'profile', 'Óleo para Barba 30ml', 50, 22, 15, true),
          ('prod_cera', 'profile', 'Cera Modeladora Forte', 40, 18, 22, true)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Barbers
      await client.query(`
        INSERT INTO barbers (id, barbershop_id, name, commission_percent, commission_type, commission_value, commission_overrides, phone, email, authorized_services, authorized_products, active)
        VALUES
          ('barber_carlos', 'unit_centro', 'Carlos Souza', 40, 'percent', 0, '{}'::jsonb, '(11) 98765-4321', 'carlos@vintage.com', '["svc_corte", "svc_barba", "svc_combo", "svc_degrade"]'::jsonb, '["prod_pomada", "prod_shampoo"]'::jsonb, true),
          ('barber_rafael', 'unit_centro', 'Rafael Lima', 35, 'percent', 0, '{}'::jsonb, '(11) 98765-1234', 'rafael@vintage.com', '["svc_corte", "svc_degrade"]'::jsonb, '["prod_pomada"]'::jsonb, true),
          ('barber_andre', 'unit_centro', 'André Costa', 40, 'percent', 0, '{}'::jsonb, '(11) 98765-9876', 'andre@vintage.com', '["svc_corte", "svc_barba", "svc_combo"]'::jsonb, '["prod_pomada", "prod_oleo"]'::jsonb, true),
          ('barber_diego', 'unit_shopping', 'Diego Santos', 45, 'percent', 0, '{}'::jsonb, '(11) 98111-2233', 'diego@vintage.com', '["svc_corte", "svc_barba", "svc_degrade"]'::jsonb, '["prod_pomada", "prod_cera"]'::jsonb, true)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Categories
      await client.query(`
        INSERT INTO categories (id, barbershop_id, name, "group", type, color)
        VALUES
          ('cat_fixo_aluguel', 'profile', 'Aluguel & Condomínio', 'Estrutura', 'fixo', '#ef4444'),
          ('cat_fixo_energia', 'profile', 'Energia & Água', 'Estrutura', 'fixo', '#f59e0b'),
          ('cat_fixo_internet', 'profile', 'Internet & Telefonia', 'Estrutura', 'fixo', '#3b82f6'),
          ('cat_var_produtos', 'profile', 'Reposição de Produtos', 'Insumos', 'variavel', '#10b981'),
          ('cat_var_limpeza', 'profile', 'Material de Limpeza', 'Insumos', 'variavel', '#6366f1'),
          ('cat_var_manutencao', 'profile', 'Manutenção de Máquinas', 'Equipamentos', 'variavel', '#ec4899')
        ON CONFLICT (id) DO NOTHING;
      `);

      // Clients
      await client.query(`
        INSERT INTO clients (id, barbershop_id, name, phone, notes, has_plan, plan)
        VALUES
          ('cli_1', 'profile', 'Lucas Mendes', '(11) 98123-4567', 'Gosta de café sem açúcar', true, '{"name": "VIP Mensal", "total": 4, "used": 2}'::jsonb),
          ('cli_2', 'profile', 'Thiago Oliveira', '(11) 98234-5678', 'Prefere corte na tesoura', false, null),
          ('cli_3', 'profile', 'Rodrigo Silva', '(11) 98345-6789', 'Cliente pontual', false, null)
        ON CONFLICT (id) DO NOTHING;
      `);

      await client.query("COMMIT;");
      console.log("[Migration] Seed inicial inserido com sucesso.");
    } else {
      console.log(`[Migration] O banco já contém dados cadastrados (${count} barbearia(s)). Pulando seed.`);
    }

    // 3. Contagem das tabelas
    const tablesList = [
      "barbershop", "units", "users", "barbers", "services", "products",
      "payment_methods", "categories", "clients", "revenues", "expenses",
      "withdrawals", "cash_closings", "queue", "appointments", "settings", "subscription"
    ];

    for (const tbl of tablesList) {
      try {
        const res = await client.query(`SELECT count(*)::int as c FROM ${tbl};`);
        tableCounts[tbl] = res.rows[0].c;
      } catch {
        tableCounts[tbl] = 0;
      }
    }

    return {
      success: true,
      message: "Todas as tabelas foram criadas e verificadas no PostgreSQL Supabase com sucesso!",
      tables: tableCounts,
    };
  } catch (err: any) {
    await client.query("ROLLBACK;").catch(() => {});
    console.error("[Migration Error]:", err);
    throw err;
  } finally {
    client.release();
  }
}

// Executar diretamente se chamado via CLI
if (process.argv[1]?.includes("migrate")) {
  runMigrations()
    .then((res) => {
      console.log("\n==========================================");
      console.log("✅ RESULTADO DA MIGRAÇÃO (SUPABASE):");
      console.log("==========================================");
      console.log("Status:", res.message);
      console.log("Estatísticas das Tabelas:", res.tables);
      console.log("==========================================\n");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ ERRO NA MIGRAÇÃO:", err.message);
      process.exit(1);
    });
}
