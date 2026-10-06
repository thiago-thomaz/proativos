# Regras de Agentes e Confinamento de Workspace (Project Shield)

## 1. Confinamento Estrito de Workspace
- **Raiz Obrigatória**: Qualquer agente de IA ou automação que opere neste repositório está ESTRITAMENTE CONFINADO à pasta raiz deste workspace:
  `c:\Users\Thiago Thomaz\OneDrive\Documentos\AntiGravity - Projetos\Leads Proativos - ok`
- **Proibição de Cruzamento de Diretórios**: É TERMINANTEMENTE PROIBIDO acessar, listar, ler, alterar, criar ou deletar qualquer arquivo ou pasta fora deste diretório, especialmente em diretórios-irmãos localizados em `AntiGravity - Projetos`.
- **Blindagem do Projeto "Arena Play"**: O projeto "Arena Play" é 100% blindado e intocável. Nenhuma operação pode interagir com arquivos, dependências, configurações ou portas associadas a ele.

## 2. Isolamento Operacional e Ambiental
- **Escopo 100% Local**: Todas as variáveis de ambiente, processos de desenvolvimento, servidores de teste, portas e containers pertencem exclusivamente a este projeto.
- **Porta Padrão Local**: A aplicação roda na porta `3000` (mapeada no container e localmente). Nenhuma porta externa ou de outro projeto pode ser consumida ou modificada.
- **Bancos de Dados Locais**: Banco de dados isolado via volume próprio (`/app/prisma/data` ou `./dev.db`). É proibido conectar ou alterar bancos compartilhados sem credenciais explícitas deste projeto.

## 3. Arquitetura Autônoma Nativa (Zero n8n)
- **Proibição Total de Dependência Externa**: Nenhum fluxo, cron, orquestração, webhook ou régua de mensageria pode depender do n8n ou delegar processamento para fora da aplicação.
- **Internalização Completa**: Todas as automações, agendamentos (T-24h, T-6h, etc.) e disparos multicanal são executados internamente pelo motor nativo da aplicação.
