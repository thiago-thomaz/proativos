export type UserRole = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "OPERATOR";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}

export type OpeningDateMode = "PRESET" | "CUSTOM" | "FROM_DATE" | "UNTIL_DATE";

export type OpeningDatePreset =
  | "TODAY"
  | "LAST_3_DAYS"
  | "LAST_7_DAYS"
  | "LAST_15_DAYS"
  | "LAST_30_DAYS"
  | "LAST_60_DAYS"
  | "LAST_90_DAYS"
  | "LAST_180_DAYS"
  | "LAST_365_DAYS";

export interface OpeningDateFilter {
  mode: OpeningDateMode;
  preset?: OpeningDatePreset | null;
  from?: string | Date | null;
  to?: string | Date | null;
}

export interface ResolvedDateRange {
  from: Date | null;
  to: Date | null;
  label: string;
  calculatedPeriodText?: string;
  mode: OpeningDateMode;
  preset: OpeningDatePreset | null;
}

// -------------------------------------------------------------
// ICP ENGINE STRUCTURED DEFINITIONS (FASE 2)
// -------------------------------------------------------------

export interface ICPSegmentConfig {
  terms: string[];
  mainCnaes: string[];
  secondaryCnaes: string[];
  acceptSecondaryCnae: boolean;
  strictMainCnaeOnly: boolean;
}

export interface ICPLocationConfig {
  country: string;
  regions: string[];
  ufs: string[];
  cities: string[];
  strictLocation: boolean;
}

export interface ICPCompanySizeConfig {
  allowedPortes: string[];
}

export interface ICPCapitalSocialConfig {
  min?: number;
  max?: number | null;
}

export interface ICPLegalNatureConfig {
  allowed: string[];
}

export interface ICPContactRequirement {
  requirePhone?: boolean;
  requireEmail?: boolean;
  requireWhatsapp?: boolean;
  requireDecisionMaker?: boolean;
  anyContactPreferred?: boolean;
}

export interface ICPWeightsConfig {
  cnaeMain: number;
  cnaeSec: number;
  location: number;
  openingDate: number;
  porte: number;
  contact: number;
  capital: number;
  legalNature?: number;
}

export interface ICPStructuredDefinition {
  version: number;
  industry: ICPSegmentConfig;
  location: ICPLocationConfig;
  companySize: ICPCompanySizeConfig;
  capitalSocial?: ICPCapitalSocialConfig;
  legalNature?: ICPLegalNatureConfig;
  openingDate: OpeningDateFilter;
  status: string[];
  contactRequirements?: ICPContactRequirement;
  weights?: ICPWeightsConfig;
  minScore: number;
}

export interface ICPFilterConfig {
  states: string[];
  cities: string[];
  cnaes: string[];
  portes: string[];
  naturezasJuridicas?: string[];
  minCapital?: number;
  maxCapital?: number | null;
  openingDate?: OpeningDateFilter;
  maxDaysOpened?: number;
  onlyWithPhone?: boolean;
  onlyWithEmail?: boolean;
  structuredIcp?: ICPStructuredDefinition;
}

export interface MatchReasonItem {
  criterion: string;
  matched: boolean;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface ScoreCalculationResult {
  score: number;
  isMatch: boolean;
  reasons: MatchReasonItem[];
  rejections?: string[];
  breakdown?: MatchReasonItem[];
  appliedRule?: string;
  leadExplanation?: {
    positiveMatches: string[];
    gapsAndRejections: string[];
    detailedScoreSummary: string;
  };
}

export interface ICPEngineResult {
  matched: boolean;
  score: number;
  reasons: string[];
  rejections: string[];
  breakdown: MatchReasonItem[];
  hardFiltersPassed: boolean;
  failedHardFilterReason?: string;
}

export type ICPQualityRating = "Excelente" | "Bom" | "Muito amplo" | "Muito restritivo";

export interface ICPQualityAssessment {
  rating: ICPQualityRating;
  matchedRatio: number;
  totalUniverse: number;
  matchedCount: number;
  scoreDistribution: {
    "90-100": number;
    "80-89": number;
    "70-79": number;
    "60-69": number;
    "<60": number;
  };
  suggestions: string[];
}

export interface NLPInterpretationResult {
  structuredIcp: ICPStructuredDefinition;
  confidenceScore: number;
  isAmbiguous: boolean;
  ambiguityWarning?: string;
  ambiguityOptions?: {
    label: string;
    description: string;
    cnaes: string[];
  }[];
  extractedEntities: {
    segments: string[];
    locations: string[];
    timeframe: string;
    sizes: string[];
  };
}

// -------------------------------------------------------------
// CONTACT & ENRICHMENT ENGINE (FASE 4)
// -------------------------------------------------------------

export type ContactType =
  | "COMPANY_PHONE"
  | "COMPANY_EMAIL"
  | "INSTITUTIONAL_CONTACT"
  | "DECISION_MAKER"
  | "UNKNOWN";

export type VerificationStatus =
  | "UNKNOWN"
  | "FORMAT_VALID"
  | "PROVIDER_VERIFIED"
  | "USER_VERIFIED"
  | "INVALID"
  | "SUPPRESSED";

export type WhatsAppStatus =
  | "UNKNOWN"
  | "LIKELY"
  | "VERIFIED"
  | "INVALID"
  | "SUPPRESSED";

export type LeadReadiness = "READY" | "PARTIALLY_READY" | "NOT_READY";

export interface ContactabilityBreakdownItem {
  criterion: string;
  points: number;
  maxPoints: number;
  verified: boolean;
  detail: string;
}

export interface ContactabilityResult {
  contactabilityScore: number;
  leadReadiness: LeadReadiness;
  priorityScore: number;
  hasDecisionMaker: boolean;
  hasVerifiedWhatsApp: boolean;
  hasValidEmail: boolean;
  hasValidPhone: boolean;
  breakdown: ContactabilityBreakdownItem[];
  reasons: string[];
  warnings: string[];
}

export interface EnrichedContactPayload {
  nome: string;
  cargo?: string | null;
  tipo: ContactType;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  emailStatus?: VerificationStatus;
  whatsappStatus?: WhatsAppStatus;
  phoneStatus?: VerificationStatus;
  confidenceScore: number;
  sourceProvider: string;
  sourceRecordId?: string | null;
  nameSource?: string | null;
  roleSource?: string | null;
  emailSource?: string | null;
  phoneSource?: string | null;
  whatsappSource?: string | null;
}

export interface EnrichmentResult {
  companyId: string;
  provider: string;
  status: "COMPLETED" | "FAILED" | "SIMULATION";
  contacts: EnrichedContactPayload[];
  fieldsFound: string[];
  overallConfidence: number;
  creditsUsed: number;
  errorMessage?: string;
  retrievedAt: Date;
}

// -------------------------------------------------------------
// OUTREACH ENGINE (FASE 5)
// -------------------------------------------------------------

export type CampaignObjective =
  | "NEW_BUSINESS"
  | "PRODUCT_OFFER"
  | "SERVICE_OFFER"
  | "PARTNERSHIP"
  | "DEMO_REQUEST"
  | "QUOTE_REQUEST"
  | "APPOINTMENT"
  | "OTHER";

export type ApprovalMode = "AUTO" | "APPROVAL_REQUIRED" | "MANUAL";
export type ChannelStrategy = "EMAIL" | "WHATSAPP" | "BOTH" | "MANUAL";
export type ChannelPriority = "WHATSAPP_FIRST" | "EMAIL_FIRST";

export type MessageStatus =
  | "DRAFT"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "REPLIED"
  | "FAILED"
  | "CANCELLED"
  | "SUPPRESSED";

export type ReplyIntent =
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "QUESTION"
  | "PRICE_REQUEST"
  | "MEETING_REQUEST"
  | "CALL_REQUEST"
  | "NOT_NOW"
  | "WRONG_PERSON"
  | "OPT_OUT"
  | "UNSUBSCRIBE"
  | "UNKNOWN";

export interface CadenceStepConfig {
  stepOrder: number;
  channel: "EMAIL" | "WHATSAPP";
  templateId?: string;
  subject?: string;
  body: string;
  delayDays: number;
}

export interface OutreachEligibilityResult {
  eligible: boolean;
  reasons: string[];
  blockedReasons: string[];
  recommendedChannel: "EMAIL" | "WHATSAPP" | null;
  targetContact?: {
    id: string;
    nome: string;
    cargo?: string | null;
    tipo: ContactType;
    telefone?: string | null;
    email?: string | null;
    whatsappStatus: WhatsAppStatus;
    emailStatus: VerificationStatus;
  } | null;
  nextAllowedAt?: Date | null;
}

// -------------------------------------------------------------
// OPPORTUNITY INTELLIGENCE ENGINE (FASE 6.5)
// -------------------------------------------------------------

export type OpportunityPriority =
  | "VERY_HIGH"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "DISQUALIFIED";

export type RecommendedAction =
  | "CONTACT_NOW"
  | "CONTACT_TODAY"
  | "ENRICH_FIRST"
  | "WAIT"
  | "DO_NOT_CONTACT"
  | "HUMAN_REVIEW"
  | "REACTIVATE_LATER";

export type PricePeriodicity = "ONE_TIME" | "MONTHLY" | "ANNUAL";
export type AutopilotMode = "OFF" | "SHADOW" | "CONTROLLED" | "LIVE";

export type EventTriggerType =
  | "NEW_COMPANY"
  | "COMPANY_UPDATED"
  | "NEW_CONTACT"
  | "CONTACT_UPDATED"
  | "LOCATION_CHANGED"
  | "ACTIVITY_CHANGED"
  | "STATUS_CHANGED"
  | "NEW_BRANCH"
  | "CAPITAL_CHANGED";

export interface OpportunityScoreResult {
  opportunityScore: number;
  priority: OpportunityPriority;
  recommendedAction: RecommendedAction;
  reasons: string[];
  warnings: string[];
  breakdown: {
    icpFitPoints: number;
    recencyPoints: number;
    contactabilityPoints: number;
    locationPoints: number;
    portePoints: number;
    capitalPoints: number;
    opportunitySignalsPoints: number;
    engagementPoints: number;
  };
  financial: {
    estimatedValue: number;
    estimatedMRR: number;
    estimatedARR: number;
  };
  calculationVersion: string;
  calculatedAt: Date;
}

export interface MarketSizeMetrics {
  universeCount: number;
  icpMatchedCount: number;
  contactableCount: number;
  readyCount: number;
  opportunityHighPlusCount: number;
  neverContactedCount: number;
  contactedCount: number;
  respondedCount: number;
  interestedCount: number;
  meetingCount: number;
  convertedCount: number;
  estimatedTotalMRR: number;
  estimatedTotalARR: number;
  funnelConversionRates: {
    universeToIcp: number;
    icpToContactable: number;
    contactableToReady: number;
    readyToContacted: number;
    contactedToResponded: number;
    respondedToInterested: number;
    interestedToMeeting: number;
    meetingToConverted: number;
  };
}

export interface FinancialPotentialConfig {
  productPrice: number;
  periodicity: PricePeriodicity;
  estimatedConversionRate: number;
  ltv?: number;
}

// -------------------------------------------------------------
// REVENUE & AUTONOMOUS SALES (FASE 7)
// -------------------------------------------------------------

export type CrmStage =
  | "NEW"
  | "QUALIFIED"
  | "CONTACTED"
  | "RESPONDED"
  | "INTERESTED"
  | "MEETING"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type AttributionTouchType = "FIRST_TOUCH" | "LAST_TOUCH" | "ASSISTED" | "LINEAR";

export type ExperimentType =
  | "MESSAGE_COPY"
  | "SUBJECT_LINE"
  | "CADENCE"
  | "CHANNEL"
  | "SEND_TIME";

export type MeetingStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type RefundReason =
  | "INEXISTENT_COMPANY"
  | "INVALID_CNPJ"
  | "OPT_OUT_BEFORE_PURCHASE"
  | "INVALID_CONTACT";

export type CustomerWebhookEvent =
  | "lead.created"
  | "lead.qualified"
  | "lead.contacted"
  | "lead.replied"
  | "lead.interested"
  | "meeting.created"
  | "deal.won"
  | "credits.low"
  | "campaign.completed";

export interface RoiMetrics {
  leadsGenerated: number;
  qualifiedLeads: number;
  contactedCount: number;
  responseCount: number;
  positiveResponses: number;
  meetingsBooked: number;
  proposalsSent: number;
  dealsWon: number;
  totalRevenue: number;
  outreachCost: number;
  enrichmentCost: number;
  creditCost: number;
  totalCost: number;
  netProfit: number;
  roiPercentage: number;
  roas: number;
  cac: number;
  cpl: number;
  cpql: number;
  costPerMeeting: number;
  ltv: number;
}
