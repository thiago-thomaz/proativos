# CONFORMIDADE LGPD & PRIVACIDADE DE DADOS (DATA COMPLIANCE)

Diretrizes obrigatórias de tratamento de dados pessoais no Proactive Lead Engine.

---

## 1. Separação Rigorosa de Dados
* **Dados Públicos da Empresa (Pessoa Jurídica):** Razão Social, CNPJ, CNAE, Endereço e Data de Abertura são dados cadastrais públicos.
* **Dados Pessoais de Contato (Pessoa Física):** Nome de sócios, e-mails nominais e telefones de decisores são tratados sob a base legal de **Legítimo Interesse Comercial (B2B)** com direito assegurado de Opt-Out imediato.

---

## 2. Garantias Mandatórias
1. **Opt-Out Imediato:** Qualquer mensagem contendo palavras de cancelamento inclui o contato automaticamente na `SuppressionList` e interrompe qualquer cadência ativa.
2. **Direito de Exclusão:** Rota `/api/v1/compliance/opt-out` e `/api/v1/contacts/[id]/suppress` para bloqueio universal de identificadores.
3. **Auditoria de Proveniência:** Cada campo de contato mantém documentado `sourceProvider` e `confidenceScore`.
