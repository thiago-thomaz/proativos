import {
  validateInternalServiceRequest,
  hashApiKey,
  generateHmacSignature,
  InternalSecurityValidationResult,
} from "./internal-security";

export { hashApiKey, generateHmacSignature };

export type N8nSecurityValidationResult = InternalSecurityValidationResult;

/**
 * @deprecated Utilize `validateInternalServiceRequest` do módulo `internal-security`.
 * Mantido para compatibilidade retroativa com suítes de teste legadas.
 */
export const validateN8nRequest = validateInternalServiceRequest;
