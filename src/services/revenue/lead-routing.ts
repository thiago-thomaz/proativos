import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const routingLogger = new AppLogger("lead-routing");

export interface RoutingCriteria {
  states?: string[];
  cities?: string[];
  cnaes?: string[];
  minScore?: number;
  portes?: string[];
}

/**
 * Motor de Smart Lead Routing (Fase 7)
 * Atribui leads automaticamente para operadores/vendedores ativos respeitando regras e round-robin
 */
export async function routeLeadToOwner(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      company: true,
      campaign: true,
      organization: {
        include: {
          users: { where: { active: true } },
          leadRoutingRules: { where: { active: true }, orderBy: { priority: "asc" } },
        },
      },
    },
  });

  if (!lead || !lead.organization) {
    throw new Error("Lead ou organização não encontrados para roteamento.");
  }

  const activeUsers = lead.organization.users;
  if (activeUsers.length === 0) {
    return { routed: false, reason: "Nenhum usuário ativo na organização." };
  }

  const rules = lead.organization.leadRoutingRules;
  let assignedUser: any = null;
  let matchedRule: any = null;

  for (const rule of rules) {
    try {
      const criteria: RoutingCriteria = JSON.parse(rule.criteria);
      let match = true;

      if (criteria.states && criteria.states.length > 0 && !criteria.states.includes(lead.company.uf)) {
        match = false;
      }
      if (criteria.cnaes && criteria.cnaes.length > 0 && !criteria.cnaes.includes(lead.company.cnaePrincipal)) {
        match = false;
      }
      if (criteria.minScore !== undefined && lead.score < criteria.minScore) {
        match = false;
      }

      if (match) {
        matchedRule = rule;
        if (rule.targetType === "USER" && rule.targetId) {
          assignedUser = activeUsers.find((u) => u.id === rule.targetId);
        } else if (rule.targetType === "TEAM" && rule.targetId) {
          const teamUsers = activeUsers.filter((u) => u.team === rule.targetId);
          if (teamUsers.length > 0) {
            // Round-robin entre usuários da equipe
            const idx = rule.roundRobinState % teamUsers.length;
            assignedUser = teamUsers[idx];
            await prisma.leadRoutingRule.update({
              where: { id: rule.id },
              data: { roundRobinState: { increment: 1 } },
            });
          }
        } else if (rule.targetType === "ROUND_ROBIN") {
          const idx = rule.roundRobinState % activeUsers.length;
          assignedUser = activeUsers[idx];
          await prisma.leadRoutingRule.update({
            where: { id: rule.id },
            data: { roundRobinState: { increment: 1 } },
          });
        }
        if (assignedUser) break;
      }
    } catch {
      continue;
    }
  }

  // Fallback padrão se nenhuma regra casar: primeiro operador ativo
  if (!assignedUser) {
    assignedUser = activeUsers[0];
  }

  // Persistir atribuição no Lead
  await prisma.lead.update({
    where: { id: lead.id },
    data: { ownerId: assignedUser.id },
  });

  // Gravar histórico de evento
  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      type: "LEAD_ROUTED",
      description: `Lead atribuído a ${assignedUser.name} (${assignedUser.email})${
        matchedRule ? ` via regra '${matchedRule.name}'` : " via fallback padrão"
      }`,
    },
  });

  routingLogger.info("LEAD_ROUTED", {
    leadId: lead.id,
    ownerId: assignedUser.id,
    ownerName: assignedUser.name,
    ruleUsed: matchedRule?.name || "DEFAULT_FALLBACK",
  }, { organizationId: lead.organizationId, userId: assignedUser.id });

  return {
    routed: true,
    leadId: lead.id,
    ownerId: assignedUser.id,
    ownerName: assignedUser.name,
    ruleUsed: matchedRule?.name || "DEFAULT_FALLBACK",
  };
}
