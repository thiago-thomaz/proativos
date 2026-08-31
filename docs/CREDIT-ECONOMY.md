# CREDIT ECONOMY — PROTOCOLO ATÔMICO 2-PHASE

## 1. Fluxo de Transações Atômicas
Para garantir zero cobranças duplicadas ou inconsistências de saldo em ambientes concorrentes:
1. **ESTIMATE:** O sistema estima a quantidade necessária de créditos para a operação.
2. **RESERVE:** O saldo de créditos é reservado (`reservedBalance`) gerando um `CreditReservation` com `correlationId` único.
3. **EXECUTE:** A operação externa (disparo, compra de lote, consulta externa) é executada.
4. **COMMIT:** Em caso de sucesso, a reserva é liquidada, debitando do saldo real.
5. **REFUND:** Em caso de falha da operação externa, os créditos reservados são devolvidos imediatamente ao saldo disponível.
