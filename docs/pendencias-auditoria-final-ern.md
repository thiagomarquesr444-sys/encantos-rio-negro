# ERN — Pendências para auditoria final
Atualizado em 21/10/2026.

Este registro não declara conformidade jurídica ou de acessibilidade.

## Imagem do teste escolar
- Publicação arquivada: 56f98fa0-1891-4dd6-b79f-34f857c9c6d8.
- Mídia: bfd2bfe7-aa93-4f4d-aecd-937e3e1048eb.
- Exclusão do arquivo e do vínculo NÃO confirmada.
- Arquivar não remove o arquivo do bucket público.
- Bucket: rede-publica.
- Caminho: cddb30b6-906f-4284-8494-ac8e12345678/publicacoes/56f98fa0-1891-4dd6-b79f-34f857c9c6d8/bfd2bfe7-aa93-4f4d-aecd-937e3e1048eb.jpg
- Procedimento pendente: excluir o arquivo pelo Storage/API; depois excluir somente seu vínculo em publicacao_midias; conferir o resultado.
- Não apagar diretamente registros de storage.objects.

## Privacidade e segurança
- Rever o rótulo "Prévia privada": imagens de rascunhos estão em bucket público.
- Planejar proteção dos rascunhos sem quebrar imagens publicadas.
- Conferir políticas de Storage, demais tabelas, funções e caminhos de publicação.
- Revisar retenção, exclusão, atendimento aos titulares e compartilhamentos.
- Validar consentimento conforme cada finalidade e chamadas externas reais.
- Varredura de código não comprova ausência de tracking em execução.

## Acessibilidade e mobile
- Adaptar e testar todo o portal público em telas pequenas.
- Validar contraste no tema público, teclado, foco, menus, formulários e zoom.
- Revisar a qualidade das descrições; campo preenchido não garante descrição adequada.
- Revisar acessibilidade dos vídeos: pausa programada não comprova atendimento aos critérios.
- Preservar o padrão visual ERN e evitar ajustes baseados apenas em capturas roladas.

## Conteúdo e comercial
- Verificação: definir critérios, evidências e responsáveis.
- Destaque por assinatura: validar automação, vigência, cancelamento e identificação comercial.
- Revisar avaliações, números e promessas em todo o portal.
- Concierge e agentes seguem planejados; não apresentar como serviço disponível.

## Documentos e identificação
- Revisar privacidade, termos e reembolso contra o funcionamento real.
- Não inventar CNPJ, razão social ou outros dados empresariais.
- Orientação de formalização e enquadramento permanece pendente.
- Direitos de imagens e vídeos adiados pelo responsável; não considerados resolvidos.

## Evidências concluídas nesta etapa
- Build aprovado após ajuste do alt na Rede.
- Regra de descrição obrigatória para imagens aplicada e validada no banco.
- Registro SQL versionado em docs/sql.
- Prévia exibiu imagem e textos no teste desktop.
- Commits enviados: 6f40b49 e 9c9072c.
- Testes mobile, auditoria final e deploy não confirmados por essas evidências.