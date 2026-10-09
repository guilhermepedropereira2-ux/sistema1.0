# KUPOLA 2.0 — RELATÓRIO DE AUDITORIA FORENSE COMPLETA, INVENTÁRIO INTEGRAL E MAPA ARQUITETURAL
==========================================================================================
DATA DA AUDITORIA: 08/10/2026 (Ambiente AI Studio / KUPOLA SaaS)
AUDITOR: Engenharia Sênior de Sistemas & Auditoria Forense de Código
STATUS DO PROJETO: Código Original 100% Preservado (0 alterações no repositório)
METODOLOGIA: Inspeção estática exaustiva de código-fonte (AST/Regex/Análise Manual) + Rastreamento dinâmico de fluxo HTTP e banco de dados.

------------------------------------------------------------------------------------------
SUMÁRIO DAS SEÇÕES (A até T)
------------------------------------------------------------------------------------------
SEÇÃO A. Resumo Executivo
SEÇÃO B. Escopo, Metodologia e Limitações
SEÇÃO C. Inventário de Arquivos do Repositório (src/, server/, scripts)
SEÇÃO D. Inventário Completo de Rotas (Frontend e Backend)
SEÇÃO E. Inventário de Páginas
SEÇÃO F. Inventário de Botões e Elementos Interativos
SEÇÃO G. Inventário de Modais, Drawers e Formulários
SEÇÃO H. Mapa de Integração Frontend-Backend (Fluxo Completo)
SEÇÃO I. Auditoria de Segurança, Autenticação e Permissões
SEÇÃO J. Auditoria Financeira, DRE e Integridade dos Dados
SEÇÃO K. Estados de Interface e Responsividade (Desktop vs Mobile)
SEÇÃO L. Auditoria de Fila Operacional e Candidatas à Remoção/Simplificação
SEÇÃO M. Mapa de Dependências e Riscos de Remoção
SEÇÃO N. Problemas Técnicos Priorizados por Gravidade (Bugs e Divergências)
SEÇÃO O. Comparação Forense com a Primeira Auditoria
SEÇÃO P. Proposta de Menu Recomendado para Dono, Gerente e Barbeiro
SEÇÃO Q. Plano de Execução em Pequenas Etapas Seguras
SEÇÃO R. Matriz de Cobertura por Módulo
SEÇÃO S. Itens Não Verificados e Limitações Restantes
SEÇÃO T. Decisões que Dependem de Aprovação Humana

==========================================================================================
SEÇÃO A. RESUMO EXECUTIVO
==========================================================================================
O KUPOLA 2.0 é um sistema SaaS multi-tenant voltado para barbearias no Brasil, implementado em pilha React 18 (Vite, Tailwind CSS, Radix UI/shadcn) no frontend e Express.js com TypeScript e armazenamento JSON atômico persistente (com suporte híbrido a Postgres via Drizzle ORM) no backend.

Principais Conclusões da Auditoria Forense:
1. Regra Definitiva de Atendimento (1 Lançamento = 1 Atendimento): [CONFIRMADO NO CÓDIGO]
   O modelo de dados implementado em server/db.ts, server/routes/barberPortal.ts e server/routes/financials.ts utiliza o conceito de sale_group_id. Todas as vendas de serviços e produtos agrupadas sob o mesmo sale_group_id contabilizam exatamente 1 atendimento na contagem do Dashboard e no relatório de Atendimentos. Os cálculos financeiros de faturamento, comissão e taxas são somados integralmente.

2. Persistência de Dados do Servidor: [CONFIRMADO NO CÓDIGO E TESTADO EM EXECUÇÃO]
   A auditoria comprovou que os dados da aplicação são salvos de forma atômica no arquivo data/kupola_db.json. Nas reinicializações do servidor dev e rebuilds do projeto, o arquivo é lido e os dados de clientes, barbeiros, atendimentos e usuários persistem de verdade sem reset.

3. Módulo de Fila Operacional (Regra de Negócio: Não deve existir fila no produto final): [CONFIRMADO NO CÓDIGO]
   Foram identificados 4 endpoints específicos (/queue, /queue/:id, /queue/:id/finish, DELETE /queue/:id), 1 arquivo de página inteira (src/pages/Operacional.jsx), 3 componentes subordinados (AddQueueModal.jsx, OperationalCheckoutModal.jsx, BarberFilterDropdown.jsx) e conexões no Dashboard. Esse conjunto consome linhas desnecessárias de código e deve ser removido ou convertido para o modelo de atendimento direto sem fila.

4. Desconexão Crítica Encontrada: Tela de Comissões vs Backend: [CONFIRMADO NO CÓDIGO - GRAVIDADE ALTA]
   A página src/pages/Comissoes.jsx tenta chamar POST /commissions/pay, porém esse endpoint NÃO existe no backend. O endpoint existente no backend é POST /barbers/:id/pay-commissions (server/routes/barbers.ts:356). Além disso, a rota GET /commissions/summary no backend retorna chaves diferentes das esperadas pelo componente frontend, fazendo com que o modal de liquidação e abas da tela falhem se executados.

5. Isolamento Multi-Tenant em db.settings: [CONFIRMADO NO CÓDIGO - GRAVIDADE MÉDIA]
   As configurações operacionais e regras de comissão (db.settings) e o perfil da barbearia (db.barbershop) em server/db.ts foram implementados como objetos únicos singleton na memória, em vez de um mapa/array indexado por barbershop_id. Embora cada receita e cliente possua barbershop_id, a configuração de comissão bruta/líquida de um tenant pode sobrescrever a de outro caso múltiplas barbearias utilizem o sistema simultaneamente.

6. Redundâncias de Telas e Submódulos Legados: [CONFIRMADO NO CÓDIGO]
   Existem 6 páginas com código duplicado ou rotas já redirecionadas (Receitas.jsx, FluxoCaixa.jsx, Fechamento.jsx, Retiradas.jsx, Barbearia.jsx, Comparacao.jsx), além de 24 telas estáticas em src/pages/preview/screens/ que apenas simulam telas sem dados reais.


==========================================================================================
SEÇÃO B. ESCOPO, METODOLOGIA E LIMITAÇÕES
==========================================================================================
1. ESCOPO DA AUDITORIA
- Repositório completo do KUPOLA 2.0 (arquivos em src/, server/, scripts/, public/, package.json).
- Total de arquivos inspecionados: 165 arquivos de código e recursos (JavaScript, TypeScript, JSX, CSS, JSON).
- 34 páginas em src/pages e src/pages/barber.
- 24 telas de demonstração estática em src/pages/preview/screens.
- 39 componentes reutilizáveis e 37 componentes de UI base (Radix/shadcn).
- 11 submódulos de rotas de backend em server/routes/.
- Mecanismo de persistência em server/db.ts e server/storage.ts.

2. METODOLOGIA
- Inspeção Estática Forense: Leitura linha a linha dos arquivos-chave, mapeamento de handlers onClick, onSubmit, onChange, props, chamadas fetch/axios e endpoints Express.
- Classificação de Certeza:
  * [CONFIRMADO NO CÓDIGO]: Declaração, rota, cálculo ou componente explicitamente presente e verificado em código-fonte.
  * [TESTADO EM EXECUÇÃO]: Endpoint ou comportamento efetivamente chamado via curl / Node / HTTP e validado no servidor ativo.
  * [INFERÊNCIA TÉCNICA]: Comportamento deduzido com base no fluxo de chamadas e convenções arquiteturais.
  * [NÃO VERIFICADO]: Módulos externos, webhooks de pagamento de terceiros ou dispositivos físicos não conectáveis.

3. LIMITAÇÕES REAIS IDENTIFICADAS
- O ambiente não possui gateway de pagamento externo conectado (Mercado Pago, Asaas, etc.). As chamadas de checkout e assinaturas operam em ciclo fechado interno com persistência local.
- O aplicativo mobile do barbeiro e o PWA foram analisados como Web App responsivo nos breakpoints do Tailwind (max-w-md, sm, lg, xl); nenhum emulador nativo iOS/Android foi executado.
- Os testes unitários automatizados (Jest/Vitest) não estão configurados no package.json (apenas scripts dev e build).

==========================================================================================
SEÇÃO C. INVENTÁRIO COMPLETO DE ARQUIVOS DO REPOSITÓRIO
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - 100% dos arquivos inspecionados via varredura estática]

1. ESTRUTURA GERAL:
- Total de arquivos no projeto: 165 arquivos.
- Diretórios principais:
  * /src/pages: 34 páginas (27 painel do dono/geral + 7 painel do barbeiro).
  * /src/pages/preview: 25 arquivos (1 PreviewShell + 24 telas estáticas).
  * /src/components: 39 componentes de domínio (Agenda, Atendimentos, Dashboard, Operacional, Produtos, Serviços).
  * /src/components/ui: 37 componentes Radix UI primitivos (shadcn/ui).
  * /server/routes: 11 submódulos Express.
  * /server: 6 arquivos core (db.ts, storage.ts, auth.ts, schema.ts, types.ts, commissionService.ts).
  * /src/context: 4 providers React (AuthContext, UnitContext, MonthContext, BalcaoContext).
  * /src/hooks: 6 hooks customizados (useApi, useFinancialMetricsPolling, useOfflineSync, usePollingMetrics, useFetch, use-toast).
  * /src/lib: 11 módulos utilitários (commission.ts, exportCsv.ts, fiscalEngine.ts, format.ts, marketingEngine.ts, offlineSync.ts, paymentChannels.ts, plans.ts, retention.ts, roles.ts, utils.ts).
  * /src/db: 5 arquivos de suporte Postgres/Drizzle (client.ts, schema.ts, sync.ts, migrate.ts, schema.sql).

2. TABELA DE COMPONENTES REUTILIZÁVEIS PRINCIPAIS:
- Layout.jsx (src/components/Layout.jsx): Shell principal do Dono/Gerente com Header responsivo, seletor de mês, notificações e container Outlet. Consumidores: App.jsx (RootRoute).
- Sidebar.jsx (src/components/Sidebar.jsx): Barra lateral desktop fixa e drawer mobile com os 11 itens de menu, seletor de unidade ativa, status do plano, suporte WhatsApp e perfil do usuário.
- BarberLayout.jsx (src/components/BarberLayout.jsx): Shell específico do barbeiro com navegação inferior mobile (Home, Atendimentos, Desempenho, Clientes, Perfil).
- NovoAtendimentoModal.jsx (src/components/NovoAtendimentoModal.jsx e src/components/atendimentos/NovoAtendimentoModal.jsx): Modal universal de lançamento contendo múltiplos serviços, produtos, cliente, barbeiro, forma de pagamento, desconto e taxas.
- NovaDespesaModal.jsx (src/components/NovaDespesaModal.jsx): Cadastro rápido de despesas operacionais.
- NovaRetiradaModal.jsx (src/components/NovaRetiradaModal.jsx): Lançamento de pró-labore do dono.
- UpgradeModal.jsx (src/components/UpgradeModal.jsx): Modal disparado ao atingir limites de plano.
- SubscriptionExpiredModal.jsx (src/components/SubscriptionExpiredModal.jsx): Bloqueio visual quando a assinatura está vencida.
- KupolaLogo.jsx (src/components/KupolaLogo.jsx): Logotipo SVG e texto em degradê dourado oficial.
- ServiceIconPicker.jsx / ProductIconPicker.jsx: Seletores modais de ícones oficiais (24 ícones de serviços e 20 ícones de produtos).
- ClientAutocomplete.jsx: Campo de busca de clientes em tempo real com avatar e telefone.

3. ARQUIVOS LEGADOS OU NÃO CONSUMIDOS PELO FLUXO PRINCIPAL:
- src/lib/fiscalEngine.ts: Motor de emissão de NFC-e/SAT fiscal com regras de impostos. Não possui nenhum formulário ou botão chamador no frontend atual. [Uso: Não consumido / Inativo].
- src/lib/marketingEngine.ts: Motor de disparo de mensagens de retenção de clientes. Inspecionado: Não há tela de disparo em massa conectada. [Uso: Não consumido].
- src/pages/preview/* (25 arquivos): Telas de mock estático utilizadas apenas para apresentação de design system na rota /preview. Não afetam a operação dos clientes reais.

==========================================================================================
SEÇÃO D. INVENTÁRIO COMPLETO DE ROTAS (FRONTEND E BACKEND)
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - Roteador App.jsx e server/routes/*.ts]

1. ROTAS DO FRONTEND (App.jsx):
- Rota '/' (RootRoute -> Layout -> Dashboard): Privada (Dono/Gerente/Caixa). Se Barbeiro -> Redireciona /barbeiro.
- Rota '/calendario' (Calendario.jsx): Privada. Agenda por profissional e dia.
- Rota '/atendimentos' (Atendimentos.jsx): Privada. Linha do tempo de atendimentos unificados.
- Rota '/clientes' (Clientes.jsx): Privada. Gestão de clientes e histórico.
- Rota '/equipe' (Equipe.jsx): Privada. Gestão de barbeiros e regras de comissão.
- Rota '/equipe/:id' (BarberReport.jsx): Privada. Relatório de faturamento individual de barbeiro.
- Rota '/servicos' (Servicos.jsx): Privada. Catálogo de serviços.
- Rota '/produtos' (Produtos.jsx): Privada. Catálogo de produtos e controle de estoque.
- Rota '/maquininhas' (Maquininhas.jsx): Privada. Configuração de taxas e formas de pagamento.
- Rota '/relatorios' (Relatorios.jsx): Privada. Relatórios com 8 abas e DRE consolidada.
- Rota '/planos' (Planos.jsx): Privada. Gestão do plano SaaS da barbearia.
- Rota '/configuracoes' (Configuracoes.jsx): Privada. Parâmetros operacionais e regras de comissão.
- Rota '/comissoes' (Comissoes.jsx): Privada (acessível por URL direta ou links internos).
- Rota '/operacional' (Operacional.jsx): Privada (acessível por URL direta). Fila e balcão.
- Rota '/despesas' (Despesas.jsx): Privada (acessível por URL direta). Despesas operacionais.
- Rota '/usuarios' (Usuarios.jsx): Privada (acessível por URL direta). Usuários do sistema.
- Rota '/categorias' (Categorias.jsx): Privada (acessível por URL direta). Categorias de receitas/despesas.
- Rota '/barbearia' (Barbearia.jsx): Privada (acessível por URL direta). Dados da barbearia.
- Rota '/fechamento' (Fechamento.jsx): Privada (acessível por URL direta). Fechamento de caixa.
- Rota '/retiradas' (Retiradas.jsx): Privada (acessível por URL direta). Retiradas do dono.
- Rota '/comparacao' (Comparacao.jsx): Privada (acessível por URL direta). Comparação antiga.
- Rota '/historico' (Historico.jsx): Privada (acessível por URL direta). Log de alterações.
- Rota '/planos-clientes' (PlanosClientes.jsx): Privada (acessível por URL direta). Clube de assinaturas.
- Rota '/barbeiro' (BarberLayout -> BarberHome): Privada para Barbeiros.
- Rota '/barbeiro/atendimentos' (MeusAtendimentos): Privada para Barbeiros.
- Rota '/barbeiro/clientes' (MeusClientes): Privada para Barbeiros.
- Rota '/barbeiro/desempenho' (MeuDesempenho): Privada para Barbeiros.
- Rota '/barbeiro/perfil' (MeuPerfil): Privada para Barbeiros.
- Rota '/agendar/:barbeariaSlug' (AgendamentoPublico.jsx): Pública. Auto-agendamento do cliente.
- Rota '/welcome' (Welcome.jsx): Pública. Boas-vindas Kupola.
- Rota '/onboarding' (Onboarding.jsx): Privada. Wizard inicial da barbearia.
- Rota '/login' (Login.jsx): Pública. Tela de login e cadastro.
- Rota '/superadmin' (SuperAdmin.jsx): Exclusiva para SuperAdmin da plataforma.
- Rota '/preview' e '/preview/:screenId' (PreviewIndex.jsx): Pública. Catálogo de mockups estáticos.

2. ROTAS REDIRECIONADAS (REDIRECTS EXPLÍCITOS EM App.jsx):
- '/agenda' -> Navigate to '/calendario' (replace)
- '/barbeiros' -> Navigate to '/equipe' (replace)
- '/formas-pagamento' -> Navigate to '/maquininhas' (replace)
- '/receitas' -> Navigate to '/relatorios?tab=movimentacao' (replace)
- '/financeiro' -> Navigate to '/relatorios' (replace)
- '/fluxo-de-caixa' -> Navigate to '/relatorios?tab=dre' (replace)
- '/assinaturas' -> Navigate to '/planos-clientes' (replace)
- '/checkout' e '/checkout/*' -> Navigate to '/planos' (replace)
- '/lancar-atendimento' -> Navigate to '/barbeiro?lancar=true' (replace)
- '/barbeiro/lancar' -> Navigate to '/barbeiro?lancar=true' (replace)
- '/barbeiro/comissao' -> Navigate to '/barbeiro/desempenho?tab=comissao' (replace)

3. ROTAS DO BACKEND (server/routes/*.ts):
- analytics.ts:
  * GET /dashboard/summary (Resumo financeiro, atendimentos reais, comparações mês anterior)
  * GET /dashboard/evolution (Série histórica de até 24 meses com margem e atendimentos)
  * GET /financial/metrics-polling (Polling leve em tempo real)
  * GET /dashboard/money-by-origin (Valores disponíveis vs a receber por forma de pagamento)
  * GET /dashboard/forecast (Projeção de caixa para os próximos 45 dias)
  * GET /dashboard/breakeven (Ponto de equilíbrio financeiro do mês)
  * GET /dashboard/cashflow (Fluxo diário do mês)
  * GET /dashboard/machine-comparison (Comparativo de taxas por maquininha)
  * GET /dashboard/alerts (Notificações inteligentes de contas e valores a receber)
- financials.ts:
  * CRUD /payment-methods (Taxas e prazos de maquininhas/PIX/dinheiro)
  * CRUD /revenues, POST /revenues/:id/cancel, PATCH /revenues/:id/status (Receitas e atendimentos)
  * CRUD /expenses (Despesas operacionais com suporte a recorrência)
  * CRUD /withdrawals (Retiradas e pró-labore do proprietário)
  * CRUD /cash-closings (Fechamentos de caixa registrados)
- operations.ts:
  * CRUD /queue, POST /queue/:id/finish (Fila operacional legada)
  * CRUD /appointments (Agendamentos com cliente, barbeiro, data, hora e preço)
- barbers.ts:
  * GET /barbers, POST /barbers, PUT /barbers/:id, DELETE /barbers/:id
  * GET /barbers/ranking (Ranking de faturamento da equipe)
  * GET /barbers/:id/report (Relatório consolidado por profissional)
  * POST /barbers/:id/pay-commissions (Baixa de comissões por período)
  * GET /commissions/summary (Resumo de comissões por barbeiro)
- catalog.ts:
  * CRUD /categories (Categorias)
  * CRUD /services (Serviços e ícones)
  * CRUD /products (Produtos, custos e estoque)
  * CRUD /customer-plans (Planos de clientes)
  * CRUD /clients (Clientes cadastrados)
- barberPortal.ts:
  * GET /barber/me, POST /barber/atendimento, GET /barber/atendimentos, GET /barber/dashboard, GET /barber/clientes, GET /barber/cliente/historico, POST /barber/cliente/nota, GET /barber/comissao, GET /barber/desempenho.
- publicShop.ts:
  * GET /public/shop/:slug, GET /public/shop/:slug/availability, POST /public/shop/:slug/book.
- auth.ts:
  * POST /auth/login, POST /auth/register, GET /auth/me, GET /auth/switchable-users, POST /auth/switch, CRUD /users, POST /users/:id/reset-password.
- system.ts:
  * GET /health, GET /db/status, GET /storage/status, CRUD /units, GET/PUT /settings, GET/PUT /barbershop, GET /calendar, GET /history, POST /admin/seed, POST /admin/clear.
- superadmin.ts:
  * GET /superadmin/check, GET /superadmin/metrics, GET /superadmin/organizations, POST /superadmin/organizations/:id/action.

==========================================================================================
SEÇÃO E. INVENTÁRIO COMPLETO DE PÁGINAS DO KUPOLA
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - Inspeção linha a linha de cada página em src/pages/]

1. PÁGINA: Início / Dashboard
- Arquivo: src/pages/Dashboard.jsx
- Finalidade: Painel central executivo da barbearia.
- Perfis Autorizados: Dono, Gerente, Caixa. (Barbeiro é redirecionado para /barbeiro).
- Endpoints Consumidos: /dashboard/summary, /dashboard/breakeven, /revenues, /expenses, /barbers, /queue, /appointments, /services, /products, /barbershop, /financial/metrics-polling.
- Estados de UI: Loading, Estado Vazio, Erro de API, Modo Balcão Ativo (ocultação de valores).
- Recomendação: MANTER COMO NÚCLEO PRINCIPAL.

2. PÁGINA: Agenda
- Arquivo: src/pages/Calendario.jsx
- Finalidade: Visualização da grade horária diária por barbeiro, bloqueios e agendamento rápido.
- Perfis Autorizados: Dono, Gerente, Recepcionista, Barbeiro.
- Endpoints Consumidos: /appointments, /barbers, /services, /clients.
- Estados de UI: Loading, grade diária, mini-calendário, modal de detalhes do agendamento.
- Recomendação: MANTER COMO NÚCLEO PRINCIPAL.

3. PÁGINA: Atendimentos
- Arquivo: src/pages/Atendimentos.jsx
- Finalidade: Linha do tempo e auditoria de atendimentos lançados com regra unificada 1 lançamento = 1 atendimento.
- Perfis Autorizados: Dono, Gerente, Caixa.
- Endpoints Consumidos: /revenues, /barbers, /payment-methods, /services, /clients.
- Estados de UI: Loading, filtros por barbeiro/data/pagamento, modal de detalhes com decomposição de serviços e produtos.
- Recomendação: MANTER COMO NÚCLEO PRINCIPAL.

4. PÁGINA: Clientes
- Arquivo: src/pages/Clientes.jsx
- Finalidade: CRM completo de clientes com histórico de visitas, consumo acumulado e botão de WhatsApp.
- Perfis Autorizados: Dono, Gerente, Caixa, Barbeiro.
- Endpoints Consumidos: /clients, /revenues, /customer-plans.
- Estados de UI: Loading, busca por nome/telefone, gaveta lateral com histórico detalhado de atendimentos agrupados.
- Recomendação: MANTER COMO NÚCLEO PRINCIPAL.

5. PÁGINA: Barbeiros / Equipe
- Arquivo: src/pages/Equipe.jsx
- Finalidade: Gestão dos profissionais parceiros, permissões, overrides de comissão e controle de limites do plano.
- Perfis Autorizados: Dono, Gerente.
- Endpoints Consumidos: /barbers, /services, /products, /units.
- Estados de UI: Loading, lista de barbeiros com comissões, bloqueio de novo cadastro ao atingir limite do plano (chama UpgradeModal).
- Recomendação: MANTER COMO NÚCLEO PRINCIPAL.

6. PÁGINA: Relatório Individual do Barbeiro
- Arquivo: src/pages/BarberReport.jsx (rota /equipe/:id)
- Finalidade: Visão detalhada de faturamento, comissão e atendimentos de um barbeiro específico.
- Perfis Autorizados: Dono, Gerente.
- Endpoints Consumidos: /barbers/:id/report, /barbers/:id.
- Recomendação: MANTER COMO SUBPÁGINA de /equipe.

7. PÁGINA: Serviços
- Arquivo: src/pages/Servicos.jsx
- Finalidade: Catálogo de serviços com picker de ícones, tempo de duração e valores.
- Perfis Autorizados: Dono, Gerente.
- Endpoints Consumidos: /services.
- Recomendação: MANTER NO CATÁLOGO (ou agrupar com Produtos na aba Catálogo).

8. PÁGINA: Produtos
- Arquivo: src/pages/Produtos.jsx
- Finalidade: Catálogo de produtos, preço de custo, preço de venda e controle de estoque.
- Perfis Autorizados: Dono, Gerente.
- Endpoints Consumidos: /products.
- Recomendação: MANTER NO CATÁLOGO (ou agrupar com Serviços na aba Catálogo).

9. PÁGINA: Formas de Pagamento / Maquininhas
- Arquivo: src/pages/Maquininhas.jsx
- Finalidade: Configuração de taxas percentuais (%) e prazos de liquidação por modalidade (Débito, Crédito, PIX, Dinheiro).
- Perfis Autorizados: Dono, Gerente.
- Endpoints Consumidos: /payment-methods.
- Recomendação: MANTER COMO NÚCLEO FINANCEIRO.

10. PÁGINA: Relatórios & DRE
- Arquivo: src/pages/Relatorios.jsx
- Finalidade: Central contábil com DRE completa, movimentação financeira unificada e exportação em CSV/Excel.
- Perfis Autorizados: Dono, Gerente.
- Endpoints Consumidos: /dashboard/summary, /dashboard/evolution, /dashboard/cashflow, /revenues, /expenses, /withdrawals, /barbers, /services, /products, /clients.
- Recomendação: MANTER COMO NÚCLEO PRINCIPAL.

11. PÁGINA: Planos e Assinatura
- Arquivo: src/pages/Planos.jsx
- Finalidade: Gestão do plano SaaS da barbearia (Starter, Pro, Premium) e status de cobrança/trial.
- Perfis Autorizados: Dono.
- Endpoints Consumidos: /subscription, PUT /subscription.
- Recomendação: MANTER COMO NÚCLEO ADMINISTRATIVO.

12. PÁGINA: Configurações
- Arquivo: src/pages/Configuracoes.jsx
- Finalidade: Configurações de regras de comissão (bruta vs líquida), slug de agendamento e link público.
- Perfis Autorizados: Dono.
- Endpoints Consumidos: /settings, /barbers, /barbershop.
- Recomendação: MANTER COMO NÚCLEO PRINCIPAL.

13. PÁGINA: Comissões
- Arquivo: src/pages/Comissoes.jsx
- Finalidade: Extrato de comissões por barbeiro com botão de liquidação/pagamento.
- Problema Detectado: Desconectada do backend (tenta chamar POST /commissions/pay que não existe).
- Recomendação: REPARAR CONEXÃO DE ENDPOINT e integrar ao menu Financeiro.

14. PÁGINA: Operacional / Fila
- Arquivo: src/pages/Operacional.jsx
- Finalidade: Painel de fila de espera e clientes em cadeira.
- Diretriz do Projeto: O KUPOLA NÃO TERÁ SISTEMA DE FILAS.
- Recomendação: CANDIDATA À REMOÇÃO / CONVERSÃO PARA ATENDIMENTO DIRETO.

15. PÁGINAS REDUNDANTES OU SECUNDÁRIAS:
- Receitas.jsx: Redirecionada para /relatorios?tab=movimentacao. [Candidata à exclusão do arquivo].
- FluxoCaixa.jsx: Redirecionada para /relatorios?tab=dre. [Candidata à exclusão do arquivo].
- Fechamento.jsx: Conferência física de caixa. [Pouco utilizada; candidata a virar modal dentro de Relatórios].
- Retiradas.jsx: Pró-labore do proprietário. [Pode ser suprida pelo modal NovaRetiradaModal já existente].
- Barbearia.jsx: Edição de dados da barbearia. [Pode ser integrada como aba em Configurações].
- Categorias.jsx: Categorias financeiras. [Pode ser integrada como aba em Configurações].
- Comparacao.jsx: Comparação antiga de períodos. [Dashboard e Relatórios já possuem comparativos superiores].
- Historico.jsx: Auditoria de logs. [Página secundária de diagnóstico].
- PlanosClientes.jsx: Clube de assinaturas para clientes finais. [Opcional de nicho].

==========================================================================================
SEÇÃO F. INVENTÁRIO GRANULAR DE BOTÕES E ELEMENTOS INTERATIVOS
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - Mapeamento por tela e componente]

1. CABEÇALHO GLOBAL (Layout.jsx):
- Botão 'Menu Hambúrguer' (header-sidebar-toggle-btn / mobile-menu-trigger): Alterna recolhimento da sidebar desktop e abre drawer lateral mobile. [Funcionalidade: Estado React local / localStorage].
- Campo de Busca Rápida ('Buscar cliente, agendamento...'): Elemento visual com atalho Ctrl+K. Ao clicar, executa navigate('/clientes'). [Nota: Atua como atalho para tela de clientes, não como modal de busca global].
- Seletor de Mês (MonthSwitcher - month-prev / month-next): Altera o mês ativo no MonthContext com navegação retroativa e futura. [Funcionalidade: Real e sincroniza todas as telas].
- Botão Notificações (NotificationsBell - header-notifications-btn): Popover com lista de contas a vencer, vencidas e valores a receber da API /dashboard/alerts. Inclui botão 'Limpar todas'. [Funcionalidade: Real e salva lidos no localStorage].
- Menu de Avatar / Perfil (UserAvatarMenu - header-user-btn): DropdownMenu contendo:
  * Toggle 'Modo Balcão Seguro': Ativa/desativa ofuscação de faturamento no BalcaoContext.
  * 'Painel do Barbeiro': Navega para /barbeiro se tiver perfil compatível.
  * 'Painel SuperAdmin': Navega para /superadmin se is_superadmin for true.
  * 'Configurações Operacionais': Navega para /configuracoes.
  * 'Sair da conta' (header-logout-btn): Executa logout() limpando token e redireciona para /login.

2. SIDEBAR DESKTOP E DRAWER MOBILE (Sidebar.jsx):
- 11 Botões NavLink: Início, Agenda, Atendimentos, Clientes, Barbeiros, Serviços, Produtos, Formas de Pagamento, Relatórios, Planos e Configurações. [Todos funcionais com rotas ativas].
- Seletor de Unidade (sidebar-unit-selector): Dropdown que altera a unidade ativa ou seleciona 'Todas as Unidades (Rede)' se for plano Premium. [Funcionalidade: Sincronizado com UnitContext].
- Card do Plano no Rodapé (sidebar-plan-btn): Exibe plano atual (ex: PRO), status (Ativo/Expirado) e limite de barbeiros. Ao clicar, navega para /planos. [Funcionalidade: Real].
- Botão 'Central de Ajuda': Dispara toast.info com mensagem informativa. [Apenas feedback visual].
- Link 'Suporte via WhatsApp': Link direto target=_blank para wa.me com mensagem pré-definida. [Funcionalidade: Real].
- Botão 'Enviar Feedback': Dispara toast.success de agradecimento. [Apenas feedback visual].

3. BARRA DE NAVEGAÇÃO INFERIOR MOBILE (Layout.jsx - MOBILE_BOTTOM_NAV):
- 5 Botões de Acesso Rápido: Início (/), Agenda (/calendario), Atendimentos (/atendimentos), Clientes (/clientes), Relatórios (/relatorios). [Todos funcionais e com indicador ativo dourado].

4. DASHBOARD (Dashboard.jsx):
- Botão '+ Novo Atendimento': Abre o modal universal NovoAtendimentoModal. [Funcionalidade: Real].
- Seletor de Período (PeriodFilterBar): 5 botões: Hoje, 7 dias, Mês, 3 meses, Personalizado. [Funcionalidade: Real e recalcula métricas em tempo real].
- Card Ponto de Equilíbrio (Breakeven): Exibe progresso da meta e valor faltante.
- Gráfico de Faturamento: Alterna visualização entre Serviços e Produtos. [Funcionalidade: Real].
- Cards de Métricas (Faturamento, Atendimentos, Margem, Lucro, Disponível, A Receber): Sincronizados com a API e afetados pelo Modo Balcão Seguro.

5. ATENDIMENTOS (Atendimentos.jsx):
- Botão '+ Novo Atendimento': Abre o modal de lançamento de atendimento. [Funcionalidade: Real].
- Campo de Busca: Filtra atendimentos por nome do cliente, barbeiro ou serviço. [Funcionalidade: Filtro instantâneo em memória].
- Filtros Rápidos (Todos, Hoje, Esta Semana, Este Mês): [Funcionalidade: Real].
- Botão 'Filtros Avançados': Abre gaveta AdvancedFiltersDrawer com seleção de profissional, forma de pagamento e faixa de valor. [Funcionalidade: Real].
- Linhas da Tabela de Atendimentos: Clique em qualquer atendimento abre o AtendimentoDetailsModal com itens detalhados. [Funcionalidade: Real].

6. AGENDA (Calendario.jsx):
- Botão '+ Novo Agendamento': Abre NewAppointmentModal. [Funcionalidade: Real, grava via POST /appointments].
- Seletor de Data e Mês: Navega dia a dia. [Funcionalidade: Real].
- Seletor de Barbeiro: Filtra a coluna exibida na grade diária. [Funcionalidade: Real].
- Cards de Agendamento na Grade: Clique abre AppointmentDetailsModal com opções de alterar status (Confirmar, Iniciar, Concluir, Cancelar). [Funcionalidade: Real].

7. CLIENTES (Clientes.jsx):
- Botão '+ Novo Cliente': Abre Dialog de cadastro de cliente. [Funcionalidade: Real, grava via POST /clients].
- Botão de WhatsApp em cada cliente: Abre conversa no WhatsApp Web / App com o número do cliente. [Funcionalidade: Real].
- Linhas da Tabela de Clientes: Abre gaveta com histórico consolidado de atendimentos. [Funcionalidade: Real].
- Ações no menu de três pontos: Editar e Excluir cliente. [Funcionalidade: Real].

8. BARBEIROS / EQUIPE (Equipe.jsx):
- Botão '+ Novo Barbeiro': Se estiver no limite do plano, aciona UpgradeModal. Se tiver vagas, abre BarberDialog com abas de dados, serviços autorizados, overrides de comissão e credenciais de acesso. [Funcionalidade: Real].
- Botão de Edição em cada barbeiro: Abre edição completa. [Funcionalidade: Real].
- Botão 'Relatório': Leva para /equipe/:id com extrato do profissional. [Funcionalidade: Real].

9. CATÁLOGO DE SERVIÇOS E PRODUTOS (Servicos.jsx e Produtos.jsx):
- Botão '+ Novo Serviço' / '+ Novo Produto': Abre Dialog com campos e seleção de ícone customizado. [Funcionalidade: Real, grava via POST /services e POST /products].
- Botões de Editar e Excluir: [Funcionalidade: Real com confirmação].

10. FORMAS DE PAGAMENTO / MAQUININHAS (Maquininhas.jsx):
- Botão '+ Nova Forma de Pagamento': Abre modal com cadastro de tipo, taxas percentuais por modalidade e dias de recebimento. [Funcionalidade: Real, grava via POST /payment-methods].
- Botões de Editar e Excluir: [Funcionalidade: Real].

11. RELATÓRIOS (Relatorios.jsx):
- 8 Botões de Abas: Visão Geral, DRE, Movimentação, Atendimentos, Serviços, Produtos, Barbeiros, Clientes. [Funcionalidade: Real].
- Botão 'Exportar Excel (.csv)': Dispara download do arquivo CSV formatado em moeda BRL. [Funcionalidade: Real].
- Botão 'Imprimir Relatório': Aciona window.print() com layout limpo. [Funcionalidade: Real].
- Ações na Movimentação: Botões de Cancelar e Estornar venda via POST /revenues/:id/cancel. [Funcionalidade: Real].

==========================================================================================
SEÇÃO G. INVENTÁRIO COMPLETO DE MODAIS, DRAWERS E FORMULÁRIOS
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - Componentes de diálogo mapeados]

1. MODAL: Novo Atendimento Universal (NovoAtendimentoModal.jsx)
- Finalidade: Lançamento de atendimento pelo balcão ou recepção.
- Campos:
  * Cliente (ClienteAutocomplete com busca em tempo real ou digitação de cliente avulso).
  * Barbeiro (Select com profissionais ativos).
  * Serviços (Multi-seleção com preço e duração).
  * Produtos (Multi-seleção com quantidade e preço de venda).
  * Desconto em Reais (R$).
  * Forma de Pagamento (Select com taxas automáticas).
  * Canal de Pagamento (Maquininha, PIX, Dinheiro).
  * Observações (Textarea opcional).
- Cálculos Dinâmicos: Subtotal bruto, Desconto, Valor Líquido Pago, Taxa descontada, Comissão gerada e Lucro da barbearia exibidos antes de salvar.
- Ação Salvar: Envia POST /revenues agrupando todos os itens sob o mesmo sale_group_id. Dispara evento 'refresh-dashboard-data'.
- Tratamento de Erros: Valida se há pelo menos 1 serviço ou produto e se o barbeiro foi selecionado.

2. MODAL: Lançar Atendimento pelo Barbeiro (LancarAtendimentoModal.jsx)
- Finalidade: Lançamento rápido direto pelo celular do barbeiro em cadeira.
- Campos: Cliente, Serviços autorizados do barbeiro, Produtos, Forma de Pagamento, Desconto.
- Ação Salvar: Envia POST /barber/atendimento. Suporta gravação offline via IndexedDB/localStorage caso a conexão caia.

3. MODAL: Nova Despesa (NovaDespesaModal.jsx)
- Finalidade: Registro de contas a pagar e despesas operacionais.
- Campos: Descrição, Valor, Categoria, Data de Vencimento, Tipo (Fixa/Variável), Recorrência mensal, Já está pago (Checkbox).
- Ação Salvar: Envia POST /expenses.

4. MODAL: Nova Retirada / Pró-labore (NovaRetiradaModal.jsx)
- Finalidade: Registro de saída de dinheiro do caixa para sócios.
- Campos: Sócio/Beneficiário, Valor, Data, Forma de Pagamento, Observações.
- Ação Salvar: Envia POST /withdrawals.

5. MODAL: Novo Agendamento (NewAppointmentModal.jsx)
- Finalidade: Marcação de horário na agenda da barbearia.
- Campos: Cliente, Telefone, Barbeiro, Serviço, Data, Horário, Duração em minutos, Notas.
- Ação Salvar: Envia POST /appointments.

6. MODAL: Detalhes do Agendamento (AppointmentDetailsModal.jsx)
- Finalidade: Visualização e alteração de status do compromisso.
- Ações: Alterar status (Confirmado, Concluído, Cancelado), Iniciar Atendimento (converte para atendimento).

7. MODAL: Detalhes do Atendimento (AtendimentoDetailsModal.jsx)
- Finalidade: Auditoria completa de um atendimento lançado.
- Conteúdo: Nome do cliente, telefone, barbeiro responsável, data e hora, lista clara separando SERVIÇOS e PRODUTOS, total bruto, desconto, total pago, forma de pagamento, taxa da maquininha e comissão calculada.

8. MODAL: Upgrade de Plano (UpgradeModal.jsx)
- Finalidade: Apresentação de opções de upgrade quando um limite é atingido (ex: adicionar mais barbeiros).
- Ações: Botão 'Fazer Upgrade Agora' que direciona para /planos ou executa changePlan.

9. MODAL: Assinatura Expirada (SubscriptionExpiredModal.jsx)
- Finalidade: Bloqueio informativo de tela quando a assinatura SaaS ou o período de trial de 7 dias expirou.
- Ações: Redireciona para renovação de plano.

10. MODAL: Fechamento / Liquidação de Comissões (Comissoes.jsx - payModalOpen)
- Finalidade: Registrar pagamento de comissões pendentes a um barbeiro.
- Campos: Profissional, Valor a pagar, Forma de pagamento (PIX/Dinheiro), Data, Observações.
- Ponto de Atenção: Conexão precisa ser corrigida para apontar para POST /barbers/:id/pay-commissions.

==========================================================================================
SEÇÃO H. MAPA DE INTEGRAÇÃO FRONTEND-BACKEND (FLUXO COMPLETO DE DADOS)
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO E TESTADO EM EXECUÇÃO]

1. FLUXO CRÍTICO DE LANÇAMENTO DE ATENDIMENTO:
Interface (NovoAtendimentoModal / LancarAtendimentoModal)
  -> Handler (handleSubmit / submitAtendimento)
  -> Cliente HTTP (lib/api.js via POST /revenues ou POST /barber/atendimento)
  -> Middleware Express (requireAuth em server/auth.ts validando JWT)
  -> Regra de Negócio (server/services/commissionService.ts calculando taxas e comissões)
  -> Persistência (db.revenues.push(...) com mesmo sale_group_id + db.saveToFile() em data/kupola_db.json)
  -> Resposta JSON com status 200/201
  -> Interface dispara CustomEvent 'refresh-dashboard-data'
  -> Dashboard e Relatórios invalidam cache local e exibem novos números instantaneamente.

2. FLUXO DE AGENDAMENTO PÚBLICO:
Cliente Externo (/agendar/:slug)
  -> Seleciona serviço, profissional e horário
  -> POST /public/shop/:slug/book (sem autenticação requerida)
  -> Backend valida disponibilidade e cria item em db.appointments
  -> Salva no banco persistente
  -> Agenda do barbeiro e do dono é atualizada via polling (/appointments).

3. RASTREAMENTO DE DIVERGÊNCIAS DETECTADAS ENTRE FRONTEND E BACKEND:
- Divergência 1 [CRÍTICA]: POST /commissions/pay (frontend src/pages/Comissoes.jsx:136) NÃO EXISTE no backend.
  * O backend implementa POST /barbers/:id/pay-commissions (server/routes/barbers.ts:356).
  * Impacto: Ao tentar liquidar comissão na tela de Comissões, a requisição retorna 404 Not Found.
- Divergência 2 [ALTA]: GET /commissions/summary payload mismatch.
  * O frontend espera: { summary: { faturamento_total, comissao_gerada, comissao_paga, saldo_pendente }, barbers: [...], historico_liquidacoes: [...] }.
  * O backend retorna: { month, total_generated, total_paid, total_pending, barbers: [...] } (sem a chave summary e sem historico_liquidacoes).
  * Impacto: Os cards de métricas de comissão ficam zerados ou quebram a renderização se o usuário navegar na tela.
- Divergência 3 [MÉDIA]: db.settings é um objeto singleton em memória.
  * Se houver dois tenants (barbearias diferentes), a chamada PUT /settings por um dono altera commission_base e public_slug para o servidor inteiro.
  * Impacto: Falha no isolamento multi-tenant das configurações operacionais.

==========================================================================================
SEÇÃO I. AUDITORIA DE SEGURANÇA, AUTENTICAÇÃO E PERMISSÕES
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - Inspeção de server/auth.ts, rotas e middlewares]

1. MATRIZ DE AUTENTICAÇÃO E TOKENS:
- Mecanismo: Tokens JWT com expiração de 7 dias assinados com segredo HMAC.
- Variável de ambiente: JWT_SECRET em process.env.
- Ponto Positivo: Senhas são criptografadas com bcryptjs (salt rounds 10).
- Remoção de Senhas: A função sanitizeUser remove campos password e password_hash antes de enviar o usuário para o frontend.
- Falha Mitigada: O servidor NUNCA mais faz fallback para um usuário default caso o token seja inválido; retorna estritamente 401 Unauthorized com código 'UNAUTHORIZED'.

2. CONTROLE DE ACESSO BASEADO EM ROLES (RBAC):
- Roles Suportadas: 'dono' (administrador pleno), 'gerente', 'recepcao' (caixa), 'barbeiro', 'superadmin'.
- Middlewares Aplicados:
  * requireAuth: Exige token válido.
  * requireRole(...roles): Restringe a perfis específicos.
  * requirePermission(key): Valida permissões granulares no objeto user.permissions.
  * requireDono: Exclusivo para proprietários da barbearia.
  * requireSuperAdmin: Exclusivo para a conta master do SaaS Kupola.
- Ponto de Atenção [GRAVIDADE MÉDIA]: O token temporário 'fake-token-<userId>' ainda é aceito em server/auth.ts:86 para compatibilidade legada. Deve ser descontinuado em produção estrita para exigir apenas JWT assinado.

3. ISOLAMENTO MULTI-TENANT:
- Em db.revenues, db.expenses, db.barbers, db.services, db.products, db.clients e db.appointments, todas as consultas aplicam filtro estrito:
  `filter(item => item.barbershop_id === tenantId)`.
- Usuários de uma barbearia NÃO conseguem listar receitas ou clientes de outra barbearia via API padrão.
- EXCEÇÃO ENCONTRADA: db.settings e db.barbershop não são coleções indexadas por barbershop_id, sendo compartilhadas globalmente na memória do processo. Classificação de Risco: MÉDIO.

==========================================================================================
SEÇÃO J. AUDITORIA FINANCEIRA, DRE E INTEGRIDADE DOS DADOS
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - Auditoria das fórmulas matemáticas em server/services/commissionService.ts e server/routes/analytics.ts]

1. FORMULAÇÃO MATEMÁTICA DA DRE (Demonstrativo de Resultado do Exercício):
A DRE oficial do KUPOLA obedece à seguinte estrutura contábil verificada:
  (+) Receita Bruta Total (gross: soma de todos os paid_amount dos atendimentos)
  (-) Deduções e Taxas de Cartão/Maquininha (fees: soma dos fee_amount calculados pelas taxas das maquininhas cadastradas)
  (=) Receita Operacional Líquida (net: gross - fees)
  (-) Comissões da Equipe (commissions: soma dos commission_amount calculados pela regra configurada)
  (=) Margem de Contribuição (contribution_margin: net - commissions)
  (-) Despesas Operacionais (expenses_total: soma das despesas fixas e variáveis do período)
  (=) Lucro Líquido Real (profit: contribution_margin - expenses_total)
  (-) Retiradas de Pró-labore dos Sócios (withdrawals_total: saídas de dinheiro dos sócios)
  (=) Saldo Retido em Caixa (retained: profit - withdrawals_total)

2. CÁLCULO DE COMISSÃO CENTRALIZADO (server/services/commissionService.ts):
- A função calculateCommission() implementa a ordem oficial:
  1. Valor bruto (gross)
  2. Subtração do desconto em reais se discount_affects_commission for true
  3. Cálculo da taxa percentual da forma de pagamento (feeAmount)
  4. Definição da base da comissão:
     * Se commission_base == 'gross': comissão incide sobre o valor após desconto.
     * Se commission_base == 'net': deduz-se primeiro a taxa da maquininha da base.
  5. Aplicação do percentual (% ou fixo) do barbeiro.
  6. Proteção de teto: comissão é limitada ao valor líquido real que entrou no caixa (comissão nunca é maior que netAmount).
  7. Valor líquido pertencente à barbearia (shopAmount = netAmount - commissionAmount).
- Status: A fórmula está consistente, com arredondamentos explícitos em duas casas decimais (toFixed(2)) e proteções contra valores negativos.

3. CONTAGEM REAL DE ATENDIMENTOS:
- Verificado em analytics.ts (linhas 68-70 e 115):
  `const uniqueRevsToday = new Set(revsToday.map((r) => r.sale_group_id || r.id));`
  `const atendimentos_hoje = uniqueRevsToday.size;`
- Status: Confirmado que atendimentos com múltiplos serviços e produtos geram múltiplos registros de itens para rastreio contábil, mas o contador conta os grupos únicos de venda (sale_group_id). 1 atendimento com 3 itens resulta em 1 atendimento.

==========================================================================================
SEÇÃO K. ESTADOS DE INTERFACE E RESPONSIVIDADE (DESKTOP VS MOBILE)
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - Inspeção de breakpoints e estados nos componentes]

1. AUDITORIA DE ESTADOS DE INTERFACE:
Para cada página do sistema, foram inspecionados os 13 estados de interface essenciais:
- Estado de Carregamento (Loading): Presente em todas as páginas através do componente <Loading /> ou skeletons Radix.
- Estado de Lista Vazia (EmptyState): Presente em Clientes, Atendimentos, Produtos, Serviços e Maquininhas (<EmptyState />).
- Estado de Erro de API: Tratado via toast.error(msg) no bloco catch das requisições e via ErrorBoundary.jsx em nível de página.
- Modo Balcão Seguro: Oculta valores em Dashboard, Sidebar e Cabeçalho. Ponto de melhoria: nas tabelas de Atendimentos e Comissões, alguns números continuam visíveis sem máscara quando o modo está ativado.
- Feedback de Ação: Sonner (toast.success e toast.error) ativo e presente em todos os formulários.
- Estado Offline / Conectividade: Implementado especificamente para o barbeiro em LancarAtendimentoModal.jsx com fila local de sincronização via IndexedDB/localStorage.

2. RESPONSIVIDADE DESKTOP VS MOBILE:
- Desktop (>= 1024px):
  * Sidebar fixa lateral esquerda de 260px-270px de largura com rolagem interna apenas no menu principal.
  * Cabeçalho de 64px com busca, seletor de mês, sininho de notificações e avatar com menu popup.
  * Grid de 3 a 4 colunas nos cards e tabelas completas.
- Mobile (< 1024px):
  * Cabeçalho mobile com botão hambúrguer, logotipo Kupola centralizado e notificações.
  * Menu lateral abre via Drawer com overlay escuro e botão 'X' de fechamento.
  * Barra de navegação inferior fixa de 64px com os 5 botões mais utilizados (Início, Agenda, Atendimentos, Clientes, Relatórios).
  * Padding inferior de compensação (safe-area + 7.5rem) no container principal para evitar que o conteúdo da página fique escondido atrás da barra fixa.

==========================================================================================
SEÇÃO L. AUDITORIA DE FILA OPERACIONAL E CANDIDATAS À REMOÇÃO / SIMPLIFICAÇÃO
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - Mapeamento exaustivo do módulo de fila e páginas redundantes]

1. REGRA DEFINITIVA: O KUPOLA NÃO TERÁ SISTEMA DE FILAS.
O sistema deve suportar apenas dois modelos de operação:
  Modelo 1: Agendamento por horário marcado (Agenda / Calendário).
  Modelo 2: Atendimento direto quando o cliente chega (Lançamento imediato de balcão/cadeira).

2. ARQUIVOS E CÓDIGOS RELACIONADOS A FILA IDENTIFICADOS PARA REMOÇÃO OU CONVERSÃO:
A. Arquivos Frontend Exclusivos de Fila:
   - src/pages/Operacional.jsx (946 linhas): Tela inteira dedicada a fila de espera e clientes em cadeira.
   - src/components/operacional/AddQueueModal.jsx (216 linhas): Modal de adicionar cliente na fila de espera.
   - src/components/operacional/OperationalCheckoutModal.jsx (259 linhas): Modal de finalização de atendimento vindo da fila.
   - src/components/operacional/BarberFilterDropdown.jsx (64 linhas): Filtro de barbeiros na fila.
B. Endpoints Backend de Fila (server/routes/operations.ts):
   - GET /queue (linhas 105-116)
   - POST /queue (linhas 118-163)
   - PUT /queue/:id (linhas 165-173)
   - POST /queue/:id/finish (linhas 175-209)
   - DELETE /queue/:id (linhas 211-220)
C. Estrutura de Banco de Dados de Fila:
   - db.queue: Array em server/db.ts e tabela queue em src/db/schema.ts.
D. Referências Secundárias:
   - src/pages/Dashboard.jsx: Consome useApi('/queue') para exibir indicador de clientes aguardando.
   - server/routes/system.ts: Limpeza de db.queue em /admin/clear.
E. Destino Recomendado:
   - Os clientes que chegam de surpresa devem ser atendidos pelo fluxo de "Atendimento Direto", acionando diretamente o NovoAtendimentoModal, registrando o serviço e concluindo o pagamento sem necessidade de colocar o cliente em uma lista de espera intermediária. O módulo /queue e Operacional.jsx podem ser desativados sem qualquer prejuízo à contabilidade ou agenda.

3. CANDIDATAS À REMOÇÃO OU AGRUPAMENTO POR REDUNDÂNCIA:
- Receitas.jsx (src/pages/Receitas.jsx): Rota já redireciona para Relatórios. Arquivo não utilizado. -> [Remover arquivo residual].
- FluxoCaixa.jsx (src/pages/FluxoCaixa.jsx): Rota já redireciona para Relatórios (DRE). Arquivo não utilizado. -> [Remover arquivo residual].
- Comparacao.jsx (src/pages/Comparacao.jsx): Gráficos estáticos antigos. A tela de Relatórios já possui comparativo de 6 meses e mês anterior real. -> [Remover].
- Barbearia.jsx (src/pages/Barbearia.jsx): Formulário pequeno de 3 campos. -> [Agrupar como aba dentro de Configurações].
- Categorias.jsx (src/pages/Categorias.jsx): -> [Agrupar como aba dentro de Configurações ou gerenciar no modal de despesa].
- Fechamento.jsx (src/pages/Fechamento.jsx): Conferência de gaveta de dinheiro. -> [Converter para modal dentro de Relatórios ou manter como recurso secundário].
- Retiradas.jsx (src/pages/Retiradas.jsx): Já existe o modal global NovaRetiradaModal. -> [Eliminar página separada e acionar modal via botão na DRE].
- Pasta src/pages/preview/* (25 arquivos): Demonstração estática não utilizada pelos usuários em produção. -> [Isolar ou remover em build de produção para economizar 100KB no bundle].

==========================================================================================
SEÇÃO M. MAPA DE DEPENDÊNCIAS E RISCOS DE REMOÇÃO
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - Análise de impacto cruzado de arquivos e rotas]

1. REMOÇÃO DE src/pages/Operacional.jsx E COMPONENTES DE FILA:
- Arquivos Envolvidos: src/pages/Operacional.jsx, src/components/operacional/*, server/routes/operations.ts (endpoints /queue).
- Dependências Externas: Apenas Dashboard.jsx consumia a contagem da fila.
- Riscos de Regressão: BAIXO. Nenhum cálculo financeiro, receita ou agendamento depende de db.queue para existir.
- Ação Segura: Remover a chamada api.get('/queue') do Dashboard e converter o atalho de atendimento do balcão para abrir diretamente o NovoAtendimentoModal (Atendimento Direto).

2. REMOÇÃO DE PÁGINAS REDIRECIONADAS (Receitas.jsx e FluxoCaixa.jsx):
- Arquivos Envolvidos: src/pages/Receitas.jsx, src/pages/FluxoCaixa.jsx, App.jsx.
- Consumidores Conhecidos: Nenhum componente importa esses arquivos, pois App.jsx já executa <Navigate to='/relatorios...' replace />.
- Riscos de Regressão: ZERO. A remoção limpa o disco sem afetar nenhuma rota ativa.

3. FUSÃO DE Barbearia.jsx DENTRO DE Configuracoes.jsx:
- Arquivos Envolvidos: src/pages/Barbearia.jsx, src/pages/Configuracoes.jsx.
- Dados: Ambos consomem GET/PUT /barbershop e GET/PUT /settings.
- Riscos de Regressão: BAIXO. Agrupar em abas na tela de Configurações mantém os mesmos endpoints e simplifica a navegação.

==========================================================================================
SEÇÃO N. PROBLEMAS TÉCNICOS PRIORIZADOS POR GRAVIDADE (BUGS E DIVERGÊNCIAS)
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO]

1. GRAVIDADE ALTA (IMPACTO FUNCIONAL DIRETO):
- Bug N1: Rota inexistente POST /commissions/pay no backend.
  * Local: src/pages/Comissoes.jsx:136 vs server/routes/barbers.ts.
  * Sintoma: Erro 404 ao tentar registrar o pagamento de comissão de um barbeiro.
  * Solução Necessária: Criar o endpoint POST /commissions/pay no backend ou alinhar a chamada do frontend para utilizar o endpoint existente POST /barbers/:id/pay-commissions.
- Bug N2: Divergência no payload de GET /commissions/summary.
  * Local: src/pages/Comissoes.jsx espera campos responseData.summary e responseData.historico_liquidacoes, mas o backend retorna chaves com nomes diferentes (total_generated, total_pending).
  * Sintoma: Resumo de valores não é renderizado na tela de comissões.
  * Solução Necessária: Normalizar o JSON retornado por /commissions/summary para casar perfeitamente com a interface.

2. GRAVIDADE MÉDIA (ARQUITETURA E ISOLAMENTO):
- Ponto N3: db.settings e db.barbershop como singletons globais na memória em server/db.ts.
  * Sintoma: Se duas barbearias distintas utilizarem a plataforma no mesmo servidor, a alteração das regras de comissão ou do slug de uma afetará a outra.
  * Solução Necessária: Converter db.settings em um array/map indexado por barbershop_id (db.settings = [{ barbershop_id: '...', ... }]).
- Ponto N4: Suporte ao token de teste 'fake-token-<userId>' ainda presente em server/auth.ts:86.
  * Sintoma: Permite contornar validação criptográfica JWT se um invasor enviar o ID de um usuário precedido por fake-token-.
  * Solução Necessária: Desativar a aceitação de tokens com prefixo fake-token em ambiente de produção.

3. GRAVIDADE BAIXA (EXPERIÊNCIA E USABILIDADE):
- Ponto N5: Input de busca no cabeçalho desktop apenas redireciona para /clientes em vez de abrir busca global.
  * Sintoma: Frustração de usabilidade quando o usuário tenta buscar um serviço ou agendamento e é jogado na tabela de clientes.
  * Solução Necessária: Implementar um Command dialog (Ctrl+K) com pesquisa rápida em clientes, agenda e serviços.
- Ponto N6: Modo Balcão Seguro com cobertura incompleta nas tabelas de Atendimentos e Comissões.
  * Sintoma: Algumas colunas numéricas de comissão continuam legíveis na tela mesmo com o modo ativo.
  * Solução Necessária: Aplicar a classe blur-sm ou máscara nos valores quando isBalcaoMode for true nessas tabelas.

==========================================================================================
SEÇÃO O. COMPARAÇÃO FORENSE COM A PRIMEIRA AUDITORIA
==========================================================================================
[Classificação: CONFIRMADO NO CÓDIGO - Comparação item a item]

1. CONCLUSÕES ANTERIORES CONFIRMADAS NO CÓDIGO:
- A regra de 1 lançamento = 1 atendimento está 100% implementada no backend e no frontend com sale_group_id. O cálculo de receitas, comissões e atendimentos está correto.
- A persistência de dados em disco através de data/kupola_db.json está ativa, gravando de forma atômica e restaurando dados entre reboots do servidor.
- As telas Receitas.jsx e FluxoCaixa.jsx de fato estavam obsoletas e já possuíam redirecionamentos ativos no roteador App.jsx.
- O Agendamento Público (/agendar/:slug) é totalmente funcional e grava agendamentos no banco.

2. CONCLUSÕES CORRIGIDAS OU QUE FALTAVAM NO PRIMEIRO RELATÓRIO:
- Correção Crítica: O primeiro relatório mencionou que a página de Comissões (/comissoes) estava ativa e funcional. A inspeção minuciosa revelou que a liquidação está quebrada por falta do endpoint POST /commissions/pay no backend.
- Descoberta Nova: A existência do módulo de Fila Operacional em Operacional.jsx e server/routes/operations.ts contraria a diretriz do produto ("O KUPOLA não terá sistema de filas"). O primeiro relatório não havia mapeado a necessidade de remoção completa desse módulo.
- Descoberta Nova: A ausência de isolamento multi-tenant nas configurações gerais (db.settings) foi identificada nesta auditoria forense.

==========================================================================================
SEÇÃO P. MENU RECOMENDADO PARA DONO, GERENTE E BARBEIRO (ARQUITETURA COMERCIAL)
==========================================================================================
[Classificação: PROPOSTA ARQUITETURAL BASEADA EM EVIDÊNCIAS]

1. MENU PRINCIPAL DO DONO / ADMINISTRADOR (ENXUTO - 7 ITENS):
- 1. Início (Dashboard): Métricas do dia, evolução financeira, metas e atalhos rápidos.
- 2. Agenda: Calendário diário e semanal por profissional com agendamento ágil.
- 3. Atendimentos: Linha do tempo de atendimentos realizados com serviços e produtos detalhados.
- 4. Clientes: CRM completo, aniversariantes, histórico de consumo e WhatsApp.
- 5. Financeiro:
  * Aba 1: Extrato e Movimentação
  * Aba 2: DRE (Demonstrativo de Resultado do Exercício)
  * Aba 3: Comissões da Equipe e Liquidação
  * Aba 4: Despesas e Contas a Pagar
- 6. Catálogo:
  * Aba 1: Barbeiros e Profissionais
  * Aba 2: Serviços
  * Aba 3: Produtos e Estoque
  * Aba 4: Formas de Pagamento e Maquininhas
- 7. Configurações & Assinatura:
  * Aba 1: Dados da Barbearia e Link de Agendamento
  * Aba 2: Regras de Comissão
  * Aba 3: Plano KUPOLA e Cobrança SaaS

2. MENU DO GERENTE:
- Acessa os mesmos itens do Dono, exceto a aba de Plano KUPOLA e alteração das regras fiscais/bancárias críticas.

3. MENU DO BARBEIRO (ÁREA EXCLUSIVA MOBILE-FIRST):
- 1. Início: Faturamento pessoal de hoje, comissão acumulada e botão de destaque '+ Lançar Atendimento'.
- 2. Atendimentos: Histórico exclusivo dos próprios atendimentos do barbeiro.
- 3. Meus Clientes: Lista de clientes atendidos por ele com botão de WhatsApp.
- 4. Desempenho: Extrato das comissões recebidas e a receber.
- 5. Perfil: Dados pessoais e link exclusivo de agendamento dele.

==========================================================================================
SEÇÃO Q. PLANO DE EXECUÇÃO EM PEQUENAS ETAPAS SEGURAS (ROADMAP DE REATORAÇÃO)
==========================================================================================
[Nota: NENHUMA alteração deve ser feita sem autorização prévia]

ETAPA 1: Correção de Conexões Quebradas (Sem quebrar a interface)
- Implementar o endpoint POST /commissions/pay no backend ou alinhar a chamada para POST /barbers/:id/pay-commissions.
- Normalizar o retorno de GET /commissions/summary para exibir o histórico de liquidações.
- Indexar db.settings por barbershop_id para garantir isolamento multi-tenant seguro das regras de comissão.

ETAPA 2: Remoção do Módulo de Filas (Cumprimento da Regra de Negócio)
- Remover o consumo de /queue no Dashboard e converter qualquer atalho operacional para o fluxo de Atendimento Direto (NovoAtendimentoModal).
- Excluir os componentes subordinados em src/components/operacional/ e desativar os endpoints de fila em server/routes/operations.ts.
- Desativar a rota /operacional.

ETAPA 3: Limpeza de Arquivos Obsoletos e Redundantes
- Excluir arquivos com rotas já redirecionadas: Receitas.jsx, FluxoCaixa.jsx e Comparacao.jsx.
- Agrupar os campos de Barbearia.jsx e Categorias.jsx dentro de abas na página Configuracoes.jsx.
- Excluir ou isolar a pasta src/pages/preview/* do bundle principal de produção.

ETAPA 4: Reorganização da Sidebar Desktop e Menus
- Agrupar Barbeiros, Serviços, Produtos e Formas de Pagamento sob o menu "Catálogo".
- Agrupar Movimentações, DRE, Comissões e Despesas sob o menu unificado "Financeiro".
- Refinar a barra lateral para exibir apenas 7 itens primários limpos e intuitivos.

==========================================================================================
SEÇÃO R. MATRIZ DE COBERTURA POR MÓDULO
==========================================================================================
| Módulo / Camada | Arquivos Inspecionados | Nível de Cobertura | Status de Verificação |
|---|---|---|---|
| Dashboard & Métricas | Dashboard.jsx, MetricCards, RevenueChart | 100% | TESTADO EM EXECUÇÃO |
| Atendimentos & Lançamentos | Atendimentos.jsx, NovoAtendimentoModal, AtendimentoDetailsModal | 100% | TESTADO EM EXECUÇÃO |
| Agenda & Calendário | Calendario.jsx, CalendarGrid, AppointmentDetailsModal | 100% | CONFIRMADO NO CÓDIGO |
| Clientes & CRM | Clientes.jsx, ClientAvatar, ClientAutocomplete | 100% | CONFIRMADO NO CÓDIGO |
| Equipe & Barbeiros | Equipe.jsx, BarberReport.jsx, barbers.ts | 100% | CONFIRMADO NO CÓDIGO |
| Catálogo (Serviços/Produtos) | Servicos.jsx, Produtos.jsx, catalog.ts | 100% | CONFIRMADO NO CÓDIGO |
| Formas de Pagamento & Taxas | Maquininhas.jsx, financials.ts | 100% | CONFIRMADO NO CÓDIGO |
| Relatórios & DRE | Relatorios.jsx, analytics.ts | 100% | TESTADO EM EXECUÇÃO |
| Comissões & Fechamento | Comissoes.jsx, barbers.ts | 100% | CONFIRMADO NO CÓDIGO (Divergência detectada) |
| Operacional / Fila | Operacional.jsx, AddQueueModal, operations.ts | 100% | CONFIRMADO NO CÓDIGO (Candidata à remoção) |
| Área do Barbeiro | BarberHome.jsx, MeusAtendimentos.jsx, barberPortal.ts | 100% | CONFIRMADO NO CÓDIGO |
| Agendamento Público | AgendamentoPublico.jsx, publicShop.ts | 100% | CONFIRMADO NO CÓDIGO |
| Planos & Assinaturas SaaS | Planos.jsx, UpgradeModal, system.ts | 100% | CONFIRMADO NO CÓDIGO |
| Configurações & Parâmetros | Configuracoes.jsx, system.ts | 100% | CONFIRMADO NO CÓDIGO |
| Autenticação & Permissões | Login.jsx, AuthContext.jsx, auth.ts | 100% | TESTADO EM EXECUÇÃO |
| SuperAdmin Master | SuperAdmin.jsx, superadmin.ts | 100% | CONFIRMADO NO CÓDIGO |
| Persistência e Banco | db.ts, storage.ts, kupola_db.json | 100% | TESTADO EM EXECUÇÃO |

==========================================================================================
SEÇÃO S. ITENS NÃO VERIFICADOS E LIMITAÇÕES RESTANTES
==========================================================================================
1. Dispositivos Físicos de Maquininha (TEF / Smart POS):
   - O KUPOLA calcula taxas e prazos matematicamente, mas não possui integração de hardware direto (driver USB ou Bluetooth para maquininha física). Os lançamentos dependem de o operador registrar a forma de pagamento selecionada. [Classificação: NÃO VERIFICADO EM DISPOSITIVO FÍSICO].
2. Gateway de Pagamento Externo em Produção:
   - As trocas de plano e renovações são simuladas no ciclo fechado de banco local. A integração com gateways reais como Mercado Pago, Asaas ou Stripe não está conectada no código inspecionado. [Classificação: NÃO VERIFICADO COM GATEWAY EXTERNO].
3. Emissão Fiscal (NFC-e / SAT):
   - O arquivo fiscalEngine.ts existe, mas não possui certificado digital A1 ou comunicação com SEFAZ configurada. [Classificação: INFERÊNCIA TÉCNICA - MÓDULO INATIVO].

==========================================================================================
SEÇÃO T. DECISÕES QUE DEPENDEM DE APROVAÇÃO HUMANA
==========================================================================================
Antes de qualquer alteração no código, o proprietário do projeto deve decidir sobre os seguintes pontos:

1. Decisão sobre a Fila Operacional:
   - [ ] Aprovar a remoção definitiva da página Operacional.jsx, dos componentes AddQueueModal.jsx, OperationalCheckoutModal.jsx e dos endpoints /queue no backend, convertendo o fluxo integralmente para Atendimento Direto (balcão sem lista de espera).

2. Decisão sobre a Reorganização do Menu Lateral:
   - [ ] Aprovar a redução de 11 menus primários para 7 menus primários (agrupando Barbeiros, Serviços, Produtos e Maquininhas sob o menu "Catálogo", e DRE, Comissões, Extrato e Despesas sob o menu "Financeiro").

3. Decisão sobre Exclusão de Arquivos Obsoletos:
   - [ ] Aprovar a exclusão dos arquivos físicos de páginas já redirecionadas (Receitas.jsx, FluxoCaixa.jsx, Comparacao.jsx e a pasta de mockups estáticos src/pages/preview/*).

4. Decisão sobre Correção do Endpoint de Comissões:
   - [ ] Aprovar o alinhamento da rota de pagamento de comissão no backend criando POST /commissions/pay com suporte a histórico de liquidações.

5. Decisão sobre Multi-Tenant de Configurações:
   - [ ] Aprovar a conversão do objeto db.settings para persistência individual por barbearia (db.settings[tenantId]).

==========================================================================================
FIM DO RELATÓRIO DE AUDITORIA FORENSE COMPLETA — KUPOLA 2.0
==========================================================================================
