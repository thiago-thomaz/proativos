# PRIVACIDADE E REGISTRO DE CONSENTIMENTO EM OUTREACH (LGPD)

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 5 — OUTREACH ENGINE

---

## 1. Tratamento B2B e Legítimo Interesse

1. **Abordagem Relevante e Proporcional:** As mensagens comerciais são direcionadas exclusivamente a pessoas jurídicas com CNAE e localização estritamente pertinentes ao produto ou serviço ofertado.
2. **Minimização de Conteúdo:** O corpo da mensagem contém apenas dados institucionais públicos (Razão Social, Cidade, Data de Abertura) sem menção a dados sensíveis ou informações privadas não corporativas.
3. **Mecanismo de Descadastro Claro:** Toda mensagem enviada contém instrução clara de opt-out (Ex: *"Para não receber mais mensagens, responda SAIR ou clique aqui"*).
4. **Armazenamento de Auditoria:** Cada envio registra `OutreachEvent` com timestamp, destinatário, IP/provedor de envio e ID de correlação para fins de comprovação regulatória.
