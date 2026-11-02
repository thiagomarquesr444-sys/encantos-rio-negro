# ERN — Baseline do banco de produção

**Arquivo:** `20261101_baseline_producao_ern.sql`
**Data da fotografia:** 01/11/2026 (America/Manaus)
**Origem:** projeto Supabase `encantos-rio-negro` (sa-east-1), PostgreSQL 17
**SHA-256:** `772190c5fdebd7b4cc2dbe4f63170fea2019c8ee6ce3e1597b733c7be826ac7c`

> **NÃO EXECUTAR NO BANCO DE PRODUÇÃO.** Produção já contém tudo o que está
> neste arquivo. Ele existe para registrar no Git o estado real do banco e
> para reconstruir a estrutura em um projeto **novo e vazio**, se necessário.

Esta pasta fica separada de `supabase/migrations/` de propósito, para que
nenhuma ferramenta tente aplicar o baseline automaticamente.

## Como foi gerado

Extração somente leitura via catálogo do PostgreSQL (`pg_get_functiondef`,
`pg_get_constraintdef`, `pg_get_indexdef`, `pg_get_triggerdef`,
`pg_policies`, ACLs). Nenhum dado de cliente, reserva ou financeiro foi lido.
Antes de gravar, foi feita varredura de segredos (tokens, chaves, JWT,
URLs): nenhum encontrado.

## Como foi verificado

1. **Checksum por seção:** o MD5 de cada seção foi calculado no banco de
   produção e no arquivo. As 15 seções conferem.
2. **Restauração de teste:** o arquivo foi aplicado do zero em um PostgreSQL
   16 descartável, com simulação mínima dos schemas `auth` e `storage` e dos
   papéis do Supabase. Resultado: execução sem erros e contagem idêntica à
   produção (46 tabelas com RLS, 50 funções, 139 políticas, 9 políticas de
   storage, 272 restrições, 130 índices, 26 gatilhos, 2 buckets).
   Adaptações apenas na cópia de teste (o arquivo não foi alterado):
   extensões `pg_stat_statements`/`supabase_vault` omitidas e privilégio
   `MAINTAIN` removido, que existe só a partir do PostgreSQL 17.

| Seção | Conteúdo | Itens | MD5 da seção |
|---|---|---|---|
| 01 | Extensões | 4 | `5644134dae6f6a5bf7044af383c44b7e` |
| 02 | Tabelas | 46 | `3b11ff7d05a4caa772467cda1de00b6f` |
| 03 | Funções | 50 | `713d799817cf2624a1a079a9ab2af26b` |
| 04 | Views | 2 | `b0f68e7a79742b854958552947ed395f` |
| 05 | Restrições | 272 | `b356ed56190bacbdbfdf35b6f8ac0e8a` |
| 06 | Índices (fora os das restrições) | 65 | `f6a9cf2f3593fd1e63daf83ef5a35e41` |
| 07 | Gatilhos | 26 | `346b38aab06926e2bcd5d4e2a2662eda` |
| 08 | RLS ativado | 46 | `a94caa415aef00376805ed06704a9300` |
| 09 | Políticas RLS (public) | 139 | `183eed6412ebf36a8906faff95666f77` |
| 10 | Buckets de storage | 2 | `12b6bcb9604bd37f3eb5dcd4124f0a15`¹ |
| 11 | Políticas de storage | 9 | `5ea14a91bd582942ff0676373231f962` |
| 12 | Permissões de tabelas | 48 | `044810d54294a4648052fdae60f461a5` |
| 13 | Permissões por coluna | 76 | `ccf7e88ab7c5d5de6ff573c9f66736ce` |
| 14 | Permissões de funções | 50 | `0750d26e41f19183cb534d917e0ef028` |
| 15 | Comentários | 14 | `1b9deccb3f4ec4f38db00333800ba143` |

¹ A seção 10 foi reextraída após corrigir a formatação do valor booleano
(`t` → `true`); a única diferença em relação à primeira extração é essa.

## O que não está incluído

- Dados (nenhuma linha de nenhuma tabela).
- Configurações do Supabase Auth (provedores, captcha, e-mails, URLs).
- Estrutura interna dos schemas `auth` e `storage` (gerenciados pelo Supabase).
- Privilégios padrão (default ACL) que o próprio Supabase define.
- Segredos do Vault e variáveis de ambiente.
- Arquivos guardados nos buckets.

## Regra daqui em diante

Toda mudança futura no banco vira um arquivo novo em `supabase/migrations/`
(`AAAAMMDDHHMM_descricao.sql`), versionado no Git **antes** de ser aplicado,
com backup e plano de volta, conforme `supabase/README.md`.
