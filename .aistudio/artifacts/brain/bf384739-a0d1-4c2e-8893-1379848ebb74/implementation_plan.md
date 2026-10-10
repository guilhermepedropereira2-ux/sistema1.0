# KUPOLA 2.0 — ETAPA 3.5 (REVISÃO DO PLANO DE EXECUÇÃO)
# PREPARAÇÃO, SANDBOX, BACKUP E SIMULAÇÃO (DRY-RUN)

Este plano técnico estabelece as regras e salvaguardas para a execução segura da Etapa 3.5, com foco estrito em simulação, preservação e segurança de dados.

## 1. Diretrizes Fundamentais (Garantias Obrigatórias)

Nesta etapa, toda a atividade com dados operacionais reais será **estritamente somente leitura** e de simulação (dry-run).

1. **Somente Leitura e Simulação (DRY-RUN):** Não alterar, excluir, mover ou sobrescrever qualquer dado real no sistema.
2. **Sem Escritas no Banco Real:** Não modificar nenhum arquivo de produção nem rodar scripts que executem escritas nos dados persistentes (`data/kupola_db.json` e `data/kupola_storage.json`).
3. **Mecanismo de Backup:** Criar backups versionados com data e hora (`backups/<timestamp>/`) de ambos os arquivos de dados e verificar os hashes SHA-256 para garantir integridade perfeita antes de qualquer futura limpeza.
4. **Preservação Inviolável do Vintage Club:** Preservar de forma integral e irrestrita todos os dados legítimos da Barbearia Vintage Club, incluindo especificamente as entidades com ID `org_vintage` e `demo_vintage`, bem como seus usuários, barbeiros, serviços e agendamentos.
5. **Inventariamento de Candidatos e Dependências:** Identificar com precisão todas as organizações candidatas à limpeza e todas as entidades dependentes vinculadas (usuários, unidades, barbeiros, serviços, métodos de pagamento, clientes e agendamentos), detalhando seus IDs e quantidades.
6. **Cláusula de Interrupção Crítica (Abort Trigger):** Interromper a simulação imediatamente se for detectada classificação ambígua de qualquer registro, vínculo cruzado inesperado com dados legítimos da Vintage Club, integridade corrompida ou qualquer falha na verificação dos hashes dos backups.
7. **Relatório Consolidado:** Gerar um relatório estruturado exibindo os hashes SHA-256 (originais e backups), IDs candidatos identificados, dependências detalhadas por categoria, eventuais inconsistências encontradas e o impacto estimado nas métricas do SuperAdmin.
8. **Parada Obrigatória:** Ao término da geração do relatório, suspender qualquer atividade e aguardar aprovação explícita e formal para prosseguir. Nenhuma limpeza ou remoção será executada nesta etapa.

---

## 2. Passo a Passo Técnico de Execução

### Passo 1 — Isolamento dos Scripts de Teste (Fase 1)
- Identificar e migrar os scripts de teste legados (`scripts/test_security_audit.mjs`, `scripts/test_etapa_2b1.mjs` e `scripts/test_etapa_2b1_1.mjs`) para rodar exclusivamente em diretório temporário (`fs.mkdtempSync` do Node.js).
- Redirecionar as variáveis de ambiente de banco e armazenamento para o sandbox, impedindo que requisições HTTP ou lógicas desses testes acessem ou gravem na porta principal do servidor de desenvolvimento ou nos dados reais.
- Verificar que o timestamp de modificação dos arquivos reais de dados não sofre alterações ao executar a suíte.

### Passo 2 — Geração de Backups e Cálculo de SHA-256 (Fase 2)
- Implementar o script utilitário `scripts/backup_database.mjs`.
- O utilitário criará o diretório `backups/<timestamp>/` com a data e hora do servidor.
- Fará cópias independentes de `data/kupola_db.json` e `data/kupola_storage.json`.
- Calculará os hashes SHA-256 dos arquivos de origem e destino, gravando-os em `backups/<timestamp>/sha256sums.txt`.
- O utilitário validará se os hashes conferem perfeitamente. Caso ocorra divergência de integridade, o processo é abortado no mesmo instante.

### Passo 3 — Execução da Simulação Somente Leitura (Fase 3 - DRY-RUN)
- Desenvolver o script `scripts/dry_run_cleanup.mjs` que acessa os dados reais exclusivamente com flags de leitura (`fs.readFileSync`), sem carregar módulos de persistência ativos ou gravação de dados.
- Mapear organizações candidatas à exclusão utilizando critérios seguros (IDs que comecem com `org_test_`, `org_audit_`, `etapa_2b1_`, `test_`).
- Whitelistar estritamente `org_vintage` e `demo_vintage`.
- Rastrear todas as entidades dependentes que possuam `organization_id` ou `org_id` apontando para os IDs candidatos.
- **Fail-Safe de Validação:** Se qualquer entidade dependente cruzar com a Barbearia Vintage Club, se houver registros com IDs ambíguos ou se ocorrer inconsistência de dados, o script interrompe sua execução e detalha o motivo do erro.

### Passo 4 — Exibição do Relatório de Simulação e Parada (Fase 4)
- Formatar o relatório final exibindo:
  - Hashes SHA-256 das bases e backups, indicando o status de integridade.
  - Lista detalhada de IDs das 62 organizações de teste selecionadas para limpeza futura.
  - Quantidade nominal de usuários, unidades, barbeiros, serviços, métodos de pagamento, clientes e agendamentos vinculados a essas organizações de teste.
  - Resultados da validação de regras de integridade (zero vínculos com Vintage Club e classificação 100% segura).
  - Projeção de impacto no painel SuperAdmin pós-limpeza (reduzindo contadores espúrios e apresentando as métricas reais).
- Interromper o processo após a impressão do relatório e aguardar confirmação explícita.
