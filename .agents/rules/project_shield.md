# Project Shield — Diretrizes de Isolamento e Segurança

## Confinamento Operacional
1. **Fronteira Rígida do Sistema de Arquivos**:
   - Todo comando, script, leitura, escrita ou exclusão deve operar exclusivamente dentro de:
     `c:\Users\Thiago Thomaz\OneDrive\Documentos\AntiGravity - Projetos\Leads Proativos - ok`
   - NUNCA navegar com caminhos relativos para fora da raiz (`../` que ultrapasse este repositório).
   - NUNCA inspecionar pastas vizinhas contidas em `AntiGravity - Projetos`.

2. **Isolamento de Processos e Portas**:
   - Processos de desenvolvimento (`npm run dev`, `npm run build`, `npm start`) e testes (`test-*.ts`) devem rodar estritamente dentro da sandbox local.
   - Porta padrão: `3000`. Proibido alterar portas para colidir com outros serviços.

3. **Proteção de Segredos e Credenciais**:
   - Variáveis sensíveis devem residir apenas em `.env` (ignorado pelo Git).
   - O arquivo `.env.example` deve conter apenas placeholders genéricos, sem chaves reais.
   - Nenhuma credencial ou token pode ser commitada no controle de versão.

4. **Autonomia do Motor de Automação**:
   - Zero dependência de serviços externos de workflow (n8n).
   - Todo agendamento e processamento de eventos é nativo e internalizado no código da aplicação.
