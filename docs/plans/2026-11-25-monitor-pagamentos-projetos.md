# Monitor de Pagamentos de Projetos Culturais — Plano

> Status: **implementado (E0–E9) na branch `feature/payment-management`, sem commit**.
> Data: 2026-11-25 · Branch base: `feature/payment-management`
>
> **Onde a implementação se afastou do plano:**
> - Projeto: renomear e excluir. O "arquivar" ficou de fora.
> - Prévia do remanejamento: calculada no navegador. O servidor recalcula tudo ao aplicar, então não existe a action `previewBudgetVersion`.
> - Rascunhos de planilha: são apagados no próximo upload do mesmo projeto. Não há limpeza automática após 24 h.
> - A E0 (Next 16.4) exigiu ajustes em dois arquivos existentes: tirar `runtime` de `app/icon.tsx` e pôr `connection()` em `app/api/sentry-example-api`.

Este documento segue as três etapas pedidas: plano inicial (Etapa 1), revisão de segurança (Etapa 2), revisão funcional (Etapa 3) e, no fim, o **plano final consolidado**, que é o que vale para a implementação.

---

## 0. Decisões (respondidas)

| # | Decisão |
|---|---|
| D1 | **A descriptografia continua no servidor**, como hoje. O navegador recebe só os dados já autorizados e decifrados, via TLS. |
| D2 | **Sem equipe.** Cada projeto pertence a um usuário (dono = `userId` do Clerk), e só o dono o vê. O acesso ao módulo é dado por uma **lista de e-mails em variável de ambiente**, `PROJECT_MANAGER_EMAILS`, no mesmo formato de `ADMIN_EMAILS`. Um sistema de roles formal fica para depois. |
| D3 | Resolvida pela D2. Ser admin **não** dá acesso ao módulo, só estar em `PROJECT_MANAGER_EMAILS` dá. |
| D4 | **Gestor de tipos de pagamento**: o usuário cria e edita os tipos e o checklist de cada um. Os 5 tipos do pedido entram como padrão, editáveis. |
| D5 | Campos do pagamento: **data, valor, tipo, rubrica, favorecido e comentário**. |
| D6 | Pagamento acima do saldo **avisa e pede confirmação**, sem bloquear. |
| D7 | Só **.xlsx**. |
| — | Planilha de orçamento **simples**: uma tabela com o cabeçalho na primeira linha. |

---

## Etapa 1 — Plano inicial

### 1.1 Levantamento do que já existe

| Área | O que existe | Reaproveitar? |
|---|---|---|
| **Criptografia de campo** | `lib/field-encryption.ts`: AES-256-GCM, IV aleatório de 12 bytes, tag de 16 bytes, formato `enc:v1:<base64url(iv‖tag‖ct)>`, chave de 32 bytes em `FIELD_VALUE_ENCRYPTION_KEY`, com teste em `lib/field-encryption.test.ts`. A cifra e a decifra acontecem no servidor. | **Sim**, sem mudanças, para todas as colunas sensíveis. |
| **Criptografia de arquivo** | Não existe. | **Criar** `encryptBuffer`/`decryptBuffer` no mesmo módulo, com o mesmo algoritmo. |
| **Controle de acesso** | O admin vem de `ADMIN_EMAILS` (env). A Lojinha usa a tabela `merch_members`. As checagens ficam em `lib/admin.ts`, com `cache()` por request. | **Mesmo padrão do admin**: `PROJECT_MANAGER_EMAILS` + `canCurrentUserManageProjects()`. |
| **Proteção de rotas** | `proxy.ts` usa `clerkMiddleware` + `auth.protect()`. Os módulos restritos checam no layout (`notFound()`) **e** em cada server action (`runMerchAction`). Os dados do usuário são filtrados por `userId` (`templates`, `documentGenerations`). | **Sim**: checagem em duas camadas mais filtro por dono, como Modelos e Cadastros já fazem. |
| **R2** | `lib/r2.ts`: cliente S3, `makeR2Pointer`/`getR2KeyFromPointer`, upload/get/delete. Sem URLs pré-assinadas. | **Sim**. Vou adicionar `uploadBudgetFileToR2` e reaproveitar get/delete. |
| **Leitura de Excel** | **Nenhuma biblioteca instalada.** | **Precisa de lib nova** (ver 1.7). |
| **UI** | shadcn/ui em `components/ui/`: table, dialog, alert-dialog, select, input, label, card, badge, switch, popover, command, textarea. `sonner`. `lucide-react`. | **Sim**, tudo. |
| **Padrões de tela** | Lojinha: layout com cabeçalho de ícone, abas (`MerchNav`), `EditableCell`, `ConfirmDeleteButton` (`components/merch/shared.tsx`). Upload com drag-and-drop em `UploadTemplate.tsx`. Filtros em `DashboardFilter`/`TagFilter`. | **Sim**. Vou extrair `EditableCell`/`ConfirmDeleteButton` para `components/shared/` (só mover, com re-export). |
| **Formulários** | `react-hook-form` + `zod` + `@hookform/resolvers` (`TemplateForm.tsx`). | **Sim**, para o formulário de pagamento. O mesmo schema zod valida no servidor. |
| **Dinheiro e datas** | `parsePrice`/`formatPrice` em `lib/merch.ts`. `date-fns`/`react-day-picker` estão instalados, mas não são usados. | Mover para `lib/money.ts`, mantendo o re-export. Usar `<Input type="date">`. |
| **Erros e observabilidade** | O wrapper `runMerchAction` devolve `{ok, error}` e manda ao Sentry com tag. | **Sim** (`runProjectAction`). |
| **Testes** | `node:test` + `tsx`, apenas `lib/*.test.ts`. Sem testes de integração com o banco. | Lógica em funções puras em `lib/`, testadas. |
| **Banco** | Drizzle + Neon HTTP, schema aplicado com `drizzle-kit push`. | **Sim**, só tabelas novas. |

### 1.2–1.6 (versão inicial)

A primeira versão do plano trazia o papel em tabela, equipe por projeto, tipos de pagamento fixos no código e um mapeamento de planilha "à prova de tudo". As revisões abaixo e as decisões D1–D7 reduziram isso ao que está na seção F.

### 1.7 Situação das bibliotecas

**Vulnerabilidades (`npm audit --omit=dev`): 38 no total, sendo 4 críticas, 14 altas, 18 moderadas e 2 baixas.** As que importam:

| Pacote | Atual → corrigido | Gravidade | Por que importa aqui | Impacto da atualização |
|---|---|---|---|---|
| `@clerk/nextjs` | 6.39.0 → **6.39.9** | **Crítica** | *"Middleware-based route protection bypass"*. O `proxy.ts` depende disso. | Patch dentro da 6.x. Baixo. |
| `next` | 16.1.6 (fixo) → **16.4.6** | **Crítica** | Request smuggling em rewrites (o Sentry usa o rewrite `/monitoring`). Também corrige postcss e sharp. | Minor. Build + smoke test. Atualizar `eslint-config-next` junto. |
| `@sentry/nextjs` | 10.48.0 → **10.78.0** | **Crítica** | *"Middleware bypass when using tunnel route"*. Também corrige o vazamento em logs do instrumentation-http. | Minor dentro da 10.x. Baixo. |
| `drizzle-orm` | 0.45.1 → **0.45.4** | Alta | SQL injection por identificadores. | Patch. Baixo. |
| `zod` | 4.3.6 → **4.6.7** | Alta | Exaustão de memória em coleções grandes. | Minor. Baixo. |
| `@aws-sdk/client-s3` e transitivas (`xmldom`, `fast-xml-*` etc.) | — | Alta a baixa | R2, mammoth. | `npm update` + `npm audit fix`. |

**Majors que não são necessárias agora:** Clerk 7, Sentry 11, lucide-react 1.x, react-day-picker 10, TypeScript 7, ESLint 10, `@hookform/resolvers` 7.
**Instaladas e não usadas:** `date-fns`, `react-day-picker`, `@base-ui/react`. Só registro aqui.

**Leitura de Excel:**

| Lib | Situação | Veredito |
|---|---|---|
| `xlsx` (SheetJS) no npm | Parada na 0.18.5, com CVEs conhecidas. As versões corrigidas ficam fora do npm. | ❌ |
| `exceljs` | 4.4.0, sem release desde 2023, árvore de dependências grande. | ❌ |
| **`read-excel-file`** | 9.3.20 (2026-11). Só lê .xlsx, tem poucas dependências e **não avalia fórmulas** (usa o valor em cache). | ✅ **Única dependência nova.** |

---

## Etapa 2 — Revisão de segurança

### 2.1 Observações por gravidade

**🔴 Crítica**

- **S1. Onde descriptografar (D1 confirmada).** A chave fica só no servidor. Decifrar só depois da checagem de autorização. Nunca serializar a chave nem o ciphertext para o cliente.
- **S2. Dependências com bypass de autenticação** (Clerk, Sentry tunnel, Next). **Correção:** a entrega **E0** atualiza tudo antes de qualquer código novo.

**🟠 Alta**

- **S3. Acesso a projetos de outro usuário (IDOR).** Checar só a lista de e-mails não basta: um gestor poderia passar o `paymentId` de outro gestor. **Correção:**
  - O helper único `requireOwnedProject(projectId)` exige que o usuário esteja em `PROJECT_MANAGER_EMAILS` **e** que `projects.ownerUserId = userId`.
  - **Toda** query filtra também por `projectId`, por exemplo `where(and(eq(payments.id, id), eq(payments.projectId, projectId)))`.
  - Os tipos de pagamento filtram por `ownerUserId`.
  - A função pura de decisão é testada.
  - Checklist de revisão de PR: "nenhuma query por id sem o escopo do dono".
- **S4. Exclusão `.xlsx` no matcher do `proxy.ts`.** A regex pula o middleware em caminhos terminados em `.xlsx`. **Correção:** nenhuma rota do módulo termina em extensão, e toda rota e action chama `auth()` + `requireOwnedProject` por conta própria.
- **S5. Chave única para dois usos.** **Correção:**
  - A subchave de arquivos é derivada por **HKDF-SHA256** da mesma `FIELD_VALUE_ENCRYPTION_KEY` (`info = "avia:budget-file:v1"`).
  - O formato do arquivo é `AVIA-ENC1‖iv‖tag‖ct`.
  - Continua havendo um só segredo.
- **S6. Upload de Excel malicioso.** **Correção:**
  - Validação no **servidor**.
  - Tamanho ≤ **2 MB**.
  - Extensão `.xlsx` **e** magic bytes `PK\x03\x04`.
  - No diretório central do zip, a soma descompactada deve ser ≤ **25 MB** e haver no máximo 200 entradas (mitiga zip bomb).
  - Arquivos com `vbaProject.bin` são recusados.
  - Limites de **5.000 linhas × 50 colunas** e 500 caracteres por célula.
- **S7. Fórmulas.** Não são avaliadas. Uma fórmula sem valor em cache vira erro na linha. Todo texto passa por `sanitizeText`. Fica registrado no código que uma futura exportação deve escapar `= + - @`.
- **S8. Dados decifrados no Sentry.** Hoje estão ativos `sendDefaultPii: true`, `tracesSampleRate: 1` e Replay. **Correção:**
  - Configurar `maskAllText`, `maskAllInputs` e `blockAllMedia` explicitamente.
  - `beforeSend`/`beforeBreadcrumb` descartam o corpo de requests em `/projetos`.
  - O `runProjectAction` manda ao Sentry só o nome da action e o tipo do erro.
  - Nenhum `console.*` com payload.
  - Mensagens de erro sem ecoar valores.

**🟡 Média**

- **S9. Cache.** Proibir `"use cache"` no módulo. As páginas fazem `await connection()`.
- **S10. Arquivos no R2.**
  - Chave `budgets/<ownerUserId>/<projectId>/<uuid>.enc`, **sem nome de arquivo** (o nome vai cifrado no banco).
  - Sem URL pré-assinada.
  - O download opcional passa por route handler autenticado, com `no-store`.
  - Excluir o projeto apaga os objetos.
  - Rascunhos não confirmados são apagados no próximo upload ou após 24 h.
- **S11. Somas.** Feitas no servidor, após decifrar, em **centavos inteiros**.
- **S12. E-mail na lista de acesso.** Considerar só e-mails **verificados** no Clerk na checagem de `PROJECT_MANAGER_EMAILS`. Aplico só ao módulo novo; admin e Lojinha não mudam.
- **S13. CSRF.** As server actions já verificam `Origin`. Não criar route handlers `POST` de escrita.

**🟢 Baixa**

- **S14.** Sem AAD no GCM (trocar ciphertext entre linhas exige acesso de escrita ao banco). Fica o `v1` por consistência e o `v2` registrado como evolução.
- **S15.** Sem rotação de chave. O prefixo de versão permite. O procedimento será documentado.
- **S16.** Sem rate limit. Risco baixo, porque os usuários são autenticados e poucos.
- **S17.** Erros do Drizzle trazem os parâmetros da query, mas os campos sensíveis já estão cifrados nesse ponto.

---

## Etapa 3 — Revisão funcional

### 3.1 Cobertura dos requisitos

| Requisito | Coberto? |
|---|---|
| Upload + mapeamento (id opcional, nome, valor) | ✅ planilha simples, cabeçalho na linha 1 |
| Exibir "identificador - nome" | ✅ `formatBudgetItemLabel()` com teste |
| Várias parcelas por rubrica e previsto/pago/saldo | ✅ |
| Sinalizar pagamento acima do saldo | ✅ aviso + confirmação |
| Tipos com checklist, e devolução exige carta | ✅ pelo gestor de tipos, com o padrão já criado |
| Só marcar, sem anexar, e mostrar completo/pendente | ✅ |
| Linha do tempo com filtros por rubrica, tipo e documentação | ✅ |
| Remanejamento por nova planilha | ✅ com prévia das diferenças |
| Modelo que permita histórico depois | ✅ retrato por versão |

### 3.2 Observações

- **F1. Planilha simples.**
  - Usa a primeira aba. Se houver mais de uma, aparece um seletor.
  - Cabeçalho na linha 1. O usuário escolhe as colunas de identificador (opcional), nome e valor pelos nomes do cabeçalho.
  - Linhas totalmente vazias são ignoradas.
  - A prévia mostra as rubricas e a soma total.
- **F2. Erros por linha.** Valor inválido, zero ou negativo, nome vazio e identificador duplicado aparecem na própria linha da prévia e bloqueiam a confirmação. O valor pode ser número da célula ou texto pt-BR ("R$ 1.234,56").
- **F3. Checklist com "não se aplica".** Cada item tem a opção "admite N/A", configurável no gestor de tipos. Na Devolução, a carta vem como item **sem N/A**.
- **F4. Devolução e rubrica.** Cada tipo tem a opção "rubrica opcional", que vem ligada só na Devolução. Uma devolução sem rubrica entra nos totais do projeto e na linha do tempo, mas não no saldo de nenhuma rubrica.
- **F5. Remanejamento com prévia das diferenças.**
  - A prévia mostra: rubricas novas, valores alterados (antes → depois), removidas sem pagamentos e removidas com pagamentos.
  - Correspondência: pelo identificador se a coluna estiver mapeada, senão pelo nome normalizado. Uma rubrica sem correspondência pode ser **ligada manualmente** a uma antiga (caso de renomeação).
  - **Rubrica removida com pagamentos:** fica como "fora do orçamento", com previsto R$ 0, e os pagamentos continuam lá.
  - **Previsto menor que o já pago:** aparece como "estourada".
- **F6. Base para o histórico.** `budget_items` guarda a identidade estável e o valor vigente. Cada versão grava um retrato em `budget_version_lines`.
- **F7. Resumo do projeto.** Total previsto, total pago, saldo, pagamentos com documentação pendente e rubricas estouradas.
- **F8. Estados vazios guiados.** "Suba a planilha de orçamento" e "Registrar pagamento".
- **F9. Editar, excluir e mover pagamento** de rubrica.
- **F10. Edição de tipos com pagamentos já existentes**, que é o caso de borda do gestor de tipos:
  - **Adicionar item** ao checklist: os pagamentos existentes passam a mostrá-lo como pendente (o estado ausente conta como pendente).
  - **Remover item:** ele é **arquivado**, não apagado. Some do checklist e deixa de contar para "completo", e o estado salvo nos pagamentos é preservado.
  - **Excluir tipo:** se houver pagamentos com ele, só é possível **arquivar**. Um tipo arquivado não aparece para novos pagamentos, mas os antigos continuam exibindo o tipo.
  - **Renomear:** livre.
- **F11. Fatiamento.** E0 isolada para as dependências. O gestor de tipos vem antes dos pagamentos, que dependem dele. O remanejamento fica por último.

---

## F. Plano final consolidado

### F.1 Modelo de dados

🔒 = cifrado com `encryptFieldValue` (texto `enc:v1:`). Todas as tabelas são novas; nenhuma tabela existente muda.

```ts
// Acesso ao módulo: env PROJECT_MANAGER_EMAILS (sem tabela)

projects           { id uuid pk, ownerUserId varchar /*Clerk userId*/, name text,
                     currentVersionId uuid null, createdAt, archivedAt null,
                     index(ownerUserId) }

// Cada upload de planilha; draft até o usuário confirmar o mapeamento
budget_versions    { id, projectId → projects (cascade), versionNumber int,
                     storageKey text /*r2:budgets/<owner>/<projectId>/<uuid>.enc*/,
                     originalFilename 🔒, sheetName 🔒,
                     columnMapping jsonb /*{code?: colIndex, name: colIndex, amount: colIndex}*/,
                     status 'draft'|'applied', createdAt, appliedAt null,
                     unique(projectId, versionNumber) }

// Identidade estável da rubrica + valores vigentes
budget_items       { id, projectId → projects (cascade), code 🔒 null, name 🔒,
                     plannedCents 🔒, position int, status 'active'|'out_of_budget',
                     createdInVersionId, updatedInVersionId, createdAt }

// Retrato por versão (só escrita nesta entrega; habilita histórico)
budget_version_lines { id, versionId → budget_versions (cascade), budgetItemId → budget_items,
                       code 🔒 null, name 🔒, plannedCents 🔒, position int }

// Gestor de tipos de pagamento (por usuário)
payment_types      { id, ownerUserId varchar, name text, budgetItemOptional boolean default false,
                     position int, archivedAt null, createdAt, index(ownerUserId) }

payment_type_checklist_items
                   { id, paymentTypeId → payment_types (cascade), label text,
                     allowNotApplicable boolean default true, position int, archivedAt null }

payments           { id, projectId → projects (cascade),
                     budgetItemId → budget_items (restrict) null /*null só se o tipo permitir*/,
                     paymentTypeId → payment_types (restrict),
                     paymentDate date, amountCents 🔒, payee 🔒 /*favorecido*/, comment 🔒 null,
                     createdAt, updatedAt, index(projectId, paymentDate) }

payment_checklist_states
                   { id, paymentId → payments (cascade),
                     checklistItemId → payment_type_checklist_items (cascade),
                     state 'done'|'na' /*ausência = pendente*/, updatedAt,
                     unique(paymentId, checklistItemId) }
```

Notas:
- **Campos em texto aberto:** `paymentDate`, o tipo, os status, a posição, os IDs e os nomes de tipos e itens de checklist. São estruturais, não identificam pessoas nem valores e servem para ordenar e filtrar. `projects.name` também fica aberto, por ser o nome público do projeto.
- **Tipos padrão:** no primeiro acesso ao módulo, se o usuário não tiver nenhum tipo, são criados os 5 padrões da seção F.4, de forma idempotente.
- **Escopo do tipo:** o `paymentTypeId` de um pagamento precisa pertencer ao mesmo `ownerUserId` do projeto. Isso é validado na action (S3).

### F.2 Camadas e arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/field-encryption.ts` (+teste) | **Acrescentar** `encryptBuffer`/`decryptBuffer` (HKDF + `AVIA-ENC1`). Nada muda nas funções atuais. |
| `lib/r2.ts` | **Acrescentar** `uploadBudgetFileToR2({ownerUserId, projectId, buffer})`. Reaproveitar get/delete. |
| `lib/admin.ts` | **Acrescentar** `canCurrentUserManageProjects()` (lê `PROJECT_MANAGER_EMAILS`, só e-mails verificados). |
| `lib/project-access.ts` (+teste) | Função pura `isProjectManager(emails, allowList)` + `requireOwnedProject(projectId)` (server-only: auth + lista + dono). |
| `lib/money.ts` (+teste) | `parsePrice`/`formatPrice` movidos de `lib/merch.ts` (com re-export), `toCents`/`fromCents`. |
| `lib/budget-sheet.ts` (+teste) | Valida o zip (tamanho, entradas, macros) e lê com `read-excel-file` → `{sheets, header, rows}` com limites. Função pura `applyMapping(rows, mapping) → {items, errors, totalCents}`, **usada tanto na prévia (cliente) quanto na confirmação (servidor)**. |
| `lib/budget-diff.ts` (+teste) | `matchBudgetItems(current, incoming, manualLinks)` → `{added, changed, removedEmpty, removedWithPayments}`. |
| `lib/projects.ts` (+teste) | `DEFAULT_PAYMENT_TYPES`, `checklistStatus(items, states)`, `summarizeItem` (previsto/pago/saldo/estourada), `formatBudgetItemLabel`, schemas zod (pagamento, tipo). |
| `services/project-actions.ts` | `"use server"` + `runProjectAction(name, fn)`, com auth, lista, try/catch, Sentry só com nome e tipo, e `revalidatePath`. |
| `services/payment-type-actions.ts` | CRUD de tipos e itens de checklist (filtro por `ownerUserId`, arquivar em vez de apagar quando houver uso). |
| `services/project-services.ts` | Leituras + decifra, sempre com o escopo do dono já verificado. |

**Server actions:**
- `createProject`, `renameProject`, `archiveProject`.
- `uploadBudgetFile` → `{versionId, sheets, header, rows}`.
- `previewBudgetVersion(versionId, mapping)` → diff.
- `applyBudgetVersion(versionId, mapping, manualLinks)`. Esta action **relê o arquivo do R2 e reaplica o mapeamento no servidor** e grava de forma atômica com `db.batch`.
- `createPayment`, `updatePayment`, `deletePayment`, `setChecklistState`.
- `createPaymentType`, `updatePaymentType`, `archivePaymentType`, `addChecklistItem`, `updateChecklistItem`, `archiveChecklistItem`, `reorderChecklistItems`.

**Route handler (opcional):** `GET /api/projetos/[id]/orcamento/[versionId]` baixa a planilha original, decifrada em memória e servida com `no-store`.

`next.config.ts`: `experimental.serverActions.bodySizeLimit: "3mb"`.
`.env.example`: nova variável `PROJECT_MANAGER_EMAILS`.

### F.3 Telas e fluxos

O layout segue o da Lojinha: `await connection()`, `canCurrentUserManageProjects()` com `notFound()`, cabeçalho com ícone e abas.

| Rota | Conteúdo | Componentes reaproveitados |
|---|---|---|
| `/projetos` | Meus projetos + "Novo projeto" (dialog com nome). Link para "Tipos de pagamento". | `Card`, `Dialog`, `Input`, `Button`, `sonner` |
| `/projetos/tipos` | **Gestor de tipos de pagamento.** Lista de tipos (nome editável e "rubrica opcional"). Em cada tipo, os itens do checklist com rótulo editável, "admite N/A", reordenação, adicionar e arquivar. Tipos arquivados ficam recolhidos e podem ser reativados. | `EditableCell`, `ConfirmDeleteButton`, `Switch`, `@dnd-kit` (já usado em `CadastroGroups`) para ordenar |
| `/projetos/[id]` (aba **Rubricas**) | Resumo (F7). Tabela "id - nome · previsto · pago · saldo · progresso", com selos "estourada"/"fora do orçamento". Ao expandir, aparecem os pagamentos da rubrica e "Registrar pagamento". | `Table`, `Badge`, `Dialog` |
| Dialog **Pagamento** | Data, valor, tipo, rubrica, favorecido e comentário. O valor mostra "saldo após este pagamento". Se ficar negativo, aparece um aviso e a caixa "confirmo que ultrapassa o saldo". | `react-hook-form` + zod, `Dialog`, `Select`, `Input`, `Textarea` |
| Checklist (no pagamento e na linha do tempo) | Itens ativos do tipo, cada um com três estados (pendente / ok / N/A quando permitido), salvos na hora. Selo "Documentação completa"/"Pendente (n)". | `Badge`, botões segmentados como em `MerchNav` |
| `/projetos/[id]/pagamentos` (aba **Linha do tempo**) | Por data, agrupada por mês. Filtros de rubrica, tipo e documentação na URL (só IDs e enums). | `Select`, padrão de `DashboardFilter` |
| `/projetos/[id]/orcamento` (aba **Orçamento**) | Upload (drag-and-drop) → aba (se houver mais de uma) → colunas → prévia com erros e total → (se já houver orçamento) prévia das diferenças → confirmar. Lista das versões aplicadas. | padrão de `UploadTemplate`, `Select`, `Table` |

Navegação: link "Projetos" no `Header` e no `MobileNav`, só para quem está na lista.

### F.4 Tipos padrão (criados no primeiro acesso, todos editáveis)

| Tipo | Itens do checklist | Rubrica opcional |
|---|---|---|
| **Pessoa física (PF)** | Recibo/RPA assinado · Comprovante de pagamento · Documento de identificação e CPF · Guia de retenção (INSS/IRRF/ISS) *(admite N/A)* | não |
| **Pessoa jurídica (PJ)** | Nota fiscal · Comprovante de pagamento · Orçamento ou contrato *(admite N/A)* | não |
| **Compra** | Nota fiscal ou cupom · Comprovante de pagamento · Cotações *(admite N/A)* | não |
| **DARF** | Guia DARF · Comprovante de pagamento | não |
| **Devolução** | **Carta de devolução** *(sem N/A)* · Comprovante de depósito/transferência | **sim** |

Os itens sem marcação "*admite N/A*" vêm com N/A desligado. Documentação **completa** = todos os itens ativos em "ok" ou "N/A".

### F.5 Entregas (cada uma é um PR pequeno e testável)

| # | Entrega | Pronto quando |
|---|---|---|
| **E0** | **Atualização de segurança das dependências** (Next 16.4.6 + eslint-config-next, Clerk 6.39.9, Sentry 10.78, drizzle-orm 0.45.4, zod 4.6.7, aws-sdk, `npm audit fix`). Sem majors. | `build`, `test` e `lint` verdes. `npm audit --omit=dev` sem crítica/alta corrigível. Smoke test manual: login, Modelos, Cadastros, download, Lojinha. |
| **E1** | **Acesso + projetos.** `PROJECT_MANAGER_EMAILS`, `lib/project-access.ts`, tabela `projects`, `/projetos` (listar, criar, renomear, arquivar), layout protegido, abas vazias, link no menu. | Testes da função de acesso. Manual: fora da lista → 404, inclusive para admin. Usuário A não abre projeto de B → 404. Action com `projectId` alheio → erro. |
| **E2** | **Criptografia de arquivo + R2 + Sentry.** `encryptBuffer`/`decryptBuffer`, `uploadBudgetFileToR2`, configuração S8. | Testes de ida e volta, de adulteração e de cabeçalho inválido. O objeto no R2 não abre como zip. |
| **E3** | **Importação do orçamento (1ª versão).** `read-excel-file`, `lib/budget-sheet.ts`, tabelas de versão/rubrica/retrato, fluxo de upload → colunas → prévia → confirmar. | Testes com fixtures em `tests/files/`: com e sem identificador; valor numérico e texto pt-BR; linha com erro; fórmula sem cache; zip bomb; `.xlsm` renomeado; arquivo grande demais. |
| **E4** | **Rubricas.** Resumo + tabela previsto/pago/saldo. | Testes de `summarizeItem` e `formatBudgetItemLabel`. |
| **E5** | **Gestor de tipos de pagamento.** Tabelas de tipos e itens, padrões criados no primeiro acesso, tela `/projetos/tipos`, regras de arquivamento (F10). | Testes dos padrões (idempotência), de `checklistStatus` com itens arquivados e adicionados e dos schemas. Manual: o usuário B não vê nem usa os tipos de A. |
| **E6** | **Pagamentos + checklist.** Tabelas `payments` e `payment_checklist_states`, dialog, aviso de saldo, editar/excluir/mover, rubrica opcional por tipo, checklist com N/A. | Testes de saldo com várias parcelas e estouro. Manual: valor, favorecido e comentário aparecem como `enc:v1:` no Drizzle Studio. Um tipo de outro usuário é recusado. |
| **E7** | **Linha do tempo + filtros.** | Testes do filtro e do agrupamento por mês. |
| **E8** | **Remanejamento.** Nova versão com o mapeamento anterior pré-preenchido, prévia das diferenças, ligação manual, "fora do orçamento". | Testes do diff: id igual com valor novo; casamento por nome; renomeação com ligação manual; removida sem e com pagamento; previsto abaixo do pago. |
| **E9** | **Fechamento.** Limpeza de rascunhos, README (módulo, variável nova, rotação de chave). | `/security-review` no diff completo. |

### F.6 Riscos e pontos em aberto

1. **Transação no Neon HTTP:** aplicar uma versão grava em várias tabelas. Plano: `db.batch` (transação não interativa do neon-http). Valido no começo da E3.
2. **Sem testes de integração com banco:** a autorização e as regras ficam em funções puras testadas. As queries são finas, e cada PR passa pelo checklist "toda query filtra pelo escopo do dono".
3. **Atualização do Next 16.1 → 16.4** com `cacheComponents` e `reactCompiler`: como a E0 é isolada, dá para reverter.
4. **Migração futura para roles:** o acesso fica concentrado em `canCurrentUserManageProjects()`. Trocar a env por roles depois mexe só nessa função.

### F.7 Fora do escopo

Anexar ou armazenar documentos · histórico de versões e remanejamentos (o retrato por versão deixa a porta aberta) · sistema de roles formal · compartilhamento de projetos · redesenho visual · exportação · majors de dependências.
