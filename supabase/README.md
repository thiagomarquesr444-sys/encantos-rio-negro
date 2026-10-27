# Encantos Rio Negro - Banco de dados

## Estado atual

O banco principal utiliza Supabase PostgreSQL.

As estruturas existentes foram criadas antes da adocao
de um historico local de migracoes.

## Regras de seguranca

1. Nunca executar migrations automaticamente em producao.
2. Nunca sobrescrever funcoes existentes sem auditoria.
3. Preservar reservas, vouchers e dados financeiros.
4. Validar cada migration em ambiente isolado.
5. Versionar SQL junto ao codigo no Git.
6. Nunca incluir credenciais ou senhas nos arquivos.

## Protecao de vouchers - 26/10/2026

A funcao ern_preparar_voucher_reserva foi atualizada
diretamente no Supabase.

A alteracao impede novas emissoes e reativacoes
quando a reserva nao estiver operacional.

A versao SQL aplicada ainda precisa ser capturada
e arquivada antes da sincronizacao com o Git.

Esta pasta ainda nao representa o historico completo
do banco de producao.