# PRD — App Barbearia (sem nome definido)

## Problema / Objetivo
Aplicativo profissional exclusivo para barbearias. Missão: manter a agenda dos barbeiros cheia de seg-sáb.
Etapa 1 (este prompt): construir apenas o **PAINEL ADM** com foco no **MÓDULO FINANCEIRO**, deixando a arquitetura preparada para módulos futuros (Painel Barbeiro, agenda, clientes, marketing, fidelidade, IA — NÃO construídos ainda).

## Decisões do usuário
- Sem login nesta etapa.
- Moeda R$ / idioma Português (pt-BR).
- Tema dark, moderno e clean.
- Dados de demonstração com botão para limpar (começar vazio).
- Foco 100% no Financeiro; controle de acesso Dono/Gerente fica para depois.

## Arquitetura
- Backend: FastAPI + MongoDB (motor). IDs uuid string. Rotas com prefixo `/api`.
- Frontend: React + Tailwind + shadcn/ui + Recharts. Sem TypeScript.
- Sem autenticação. Contexto de mês global (MonthContext) + hook useApi.

## Implementado (Etapa 1 — junho/2026)
- **Receitas**: registro com cálculo automático (bruto → desconto → pago → taxa maquininha → líquido → comissão barbeiro → valor barbearia). Cancelamento/estorno. Preview de cálculo ao vivo no modal.
- **Maquininhas/Formas de pagamento**: CRUD com taxas configuráveis por tipo (débito, crédito à vista, crédito parcelado, PIX) e prazo de recebimento (dias). Seed: Dinheiro, PIX, Ton, Stone, InfinitePay.
- **Barbeiros**: CRUD com % de comissão.
- **Categorias financeiras**: CRUD agrupadas (Estrutura, Operação, Equipe, Marketing, Manutenção, Outros).
- **Despesas fixas** (recorrência mensal gera N ocorrências) e **variáveis**; status pago/pendente/vencido; marcar como pago.
- **Dashboard**: KPIs (Lucro Real, Disponível Agora, A Receber, Faturamento, Taxas, Comissões, Despesas, Retiradas), composição do lucro, ponto de equilíbrio com progresso, previsão de recebimentos, dinheiro por origem, alertas inteligentes.
- **Fluxo de caixa**: saldo inicial/atual, entradas/saídas, gráfico diário.
- **Calendário financeiro**: contas do mês com indicadores pago/pendente/vencido/próximo do vencimento.
- **Fechamento de caixa**: esperado vs contado por origem, diferença.
- **Retiradas do proprietário**: separadas das despesas operacionais.
- **Comparação entre maquininhas**: total vendido, taxas, líquido, transações, a receber.
- **Histórico de alterações**: usuário, data/hora, ação.
- **Configurações**: nome da barbearia, saldo inicial, base de comissão (pago vs original), gerar/limpar dados demo.
- Validações: valor bruto > 0, 0 ≤ desconto ≤ bruto, datas inválidas → HTTP 400.

## Status de testes
- Backend: 30/30 pytest (100%). Frontend: ~95% (todos os fluxos funcionais).

## Implementado (Etapa 2 — junho/2026)
- **Autenticação JWT** (usuário+senha, bcrypt) com perfis Dono/Gerente/Barbeiro. ADM permanece ABERTO (login opcional em /login); estrutura pronta para exigir auth depois.
- **Cadastro da Barbearia** (nome, CNPJ/CPF, telefone, endereço, logo, horário) — doc único, sincroniza settings.shop_name.
- **Equipe (barbeiros expandidos)**: foto, telefone, e-mail, data de entrada, ativo/inativo, serviços/produtos autorizados, login individual, comissão percentual OU fixa + overrides por item.
- **Comissão flexível** integrada ao Financeiro (fonte única `resolve_commission`): %, valor fixo, override por serviço/produto; comissão nunca deixa a barbearia negativa (cap no líquido).
- **Catálogo de Serviços e Produtos** (CRUD) referenciados nas receitas.
- **Relatório individual do barbeiro** com filtros (Hoje/Ontem/Semana/Mês/Mês anterior/Personalizado + tipo/pagamento/status): atendimentos, serviços/produtos vendidos, faturamento, descontos, taxas, líquido, comissão gerada/paga/pendente, total barbearia, breakdowns e histórico detalhado.
- **Pagar comissões** por período (marca commission_paid).
- **Ranking da equipe** por período.
- **Usuários & Permissões**: CRUD de usuários; gerente com permissões configuráveis (sensíveis bloqueadas por padrão).
- Dono garantido no startup (`ensure_owner`); `clear` mantém o dono.

## Status de testes
- Etapa 1: 30/30 backend. Etapa 2: 75/75 backend (45 + 30 regressão). Frontend ~95%.

## Contas demo
- dono/dono123, gerente/gerente123, carlos|rafael|andre/barbeiro123.

## Backlog (próximos prompts)
- Painel do Barbeiro (usar o login já criado), Agenda, Clientes, Metas, Marketing, Fidelidade, IA, NFS-e.
- Ao ativar auth: rate limiting/lockout no login, token httpOnly cookie, CORS explícito, enforcement de permissões nos endpoints.
- Refino: date pickers estilizados; coluna Ativo/Inativo em Serviços/Produtos.
