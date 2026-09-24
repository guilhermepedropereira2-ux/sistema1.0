# CHANGELOG

## 2026-06 — Correção cirúrgica: permissões do Gerente + segurança (não-destrutivo)
- **Backend (server.py)**: adicionadas dependências de autorização reutilizando o catálogo de permissões existente:
  - `require_perm(*keys)`: Dono = acesso total; Gerente precisa possuir a permissão (senão 403); Barbeiro/anônimo bloqueado.
  - `require_dono`: gestão de usuários/permissões e seed/clear exclusivos do Dono.
  - `require_clients`: clientes podem ser gerenciados por Dono, Gerente (com permissão) e Barbeiro.
- Endpoints de escrita passaram a exigir autenticação + permissão (GETs seguem públicos p/ modo "Continuar sem login"). Sem token → 401; Gerente sem permissão → 403.
- **Gerente não pode se promover**: users/permissions são `require_dono` (bloqueia virar Dono, criar Dono, alterar as próprias permissões).
- **Bug crítico corrigido**: `DELETE /barbers/{id}` nunca apaga a conta do Dono/Gerente — apenas desvincula o papel/perfil de barbeiro (separa usuário × papel × perfil). Contas puramente barbeiro seguem sendo removidas.
- **Migração não-destrutiva**: backfill das novas chaves de permissão (ex.: `gerenciar_clientes`) para Donos (todas true) e Gerentes (default do catálogo, preservando escolhas existentes).
- **Frontend (Usuarios.jsx)**: corrigido o fluxo para um usuário existente (ex.: Dono) ganhar o papel Barbeiro — o seletor "Criar novo perfil / Vincular existente" agora aparece também na edição.
- Banco: **nenhuma operação destrutiva**; apenas backfill de campos.

## Etapa 4 — Multi-tenant + Clientes + Planos (base)
- Isolamento total por `barbershop_id` no backend; acesso cruzado por ID → 404.
- Cadastro de barbearia (`/auth/register`), papéis acumuláveis, troca de painel ADM⇄Barbeiro.
- Clientes unificados por barbearia (dedup por telefone, histórico) e Plano do Cliente v1 (contador de usos, dedução no atendimento, histórico em `plan_usages`).
