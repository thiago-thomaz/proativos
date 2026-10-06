import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AppLogger } from "@/lib/logger";

const logger = new AppLogger("bootstrap");

export async function ensureDatabaseBootstrapped(force = false) {
  try {
    const userCount = await prisma.user.count();
    const companyCount = await prisma.company.count();

    if (!force && userCount > 0 && companyCount > 0) {
      logger.info("DATABASE_ALREADY_BOOTSTRAPPED", { userCount, companyCount });
      return { bootstrapped: false, message: "Banco de dados já contém dados ativos." };
    }

    logger.info("STARTING_DATABASE_BOOTSTRAP", { force });

    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const passwordHash = await bcrypt.hash("proactive123", 10);

    // 1. Organização Principal
    let org = await prisma.organization.findFirst({ where: { slug: "acme-corp" } });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "Acme Tecnologia & Vendas B2B",
          slug: "acme-corp",
          plan: "PROFESSIONAL",
          active: true,
        },
      });
    }

    // 2. Usuários
    let owner = await prisma.user.findUnique({ where: { email: "thiago@acmecorp.com.br" } });
    if (!owner) {
      owner = await prisma.user.create({
        data: {
          organizationId: org.id,
          name: "Thiago Thomaz",
          email: "thiago@acmecorp.com.br",
          passwordHash,
          role: "OWNER",
          active: true,
        },
      });
    }

    let superAdmin = await prisma.user.findUnique({ where: { email: "admin@proactiveleadengine.com.br" } });
    if (!superAdmin) {
      superAdmin = await prisma.user.create({
        data: {
          organizationId: org.id,
          name: "Super Admin Platform",
          email: "admin@proactiveleadengine.com.br",
          passwordHash,
          role: "SUPER_ADMIN",
          active: true,
        },
      });
    }

    // 3. Conta de Créditos
    let creditAccount = await prisma.creditAccount.findUnique({ where: { organizationId: org.id } });
    if (!creditAccount) {
      creditAccount = await prisma.creditAccount.create({
        data: {
          organizationId: org.id,
          balance: 1450,
        },
      });

      await prisma.creditTransaction.create({
        data: {
          accountId: creditAccount.id,
          amount: 1500,
          type: "CREDIT_RECHARGE",
          description: "Recarga inicial do plano Professional",
        },
      });
    }

    // 4. Campanhas
    let camp1 = await prisma.campaign.findFirst({ where: { organizationId: org.id, name: "Novos Restaurantes de São Paulo" } });
    if (!camp1) {
      camp1 = await prisma.campaign.create({
        data: {
          organizationId: org.id,
          name: "Novos Restaurantes de São Paulo",
          productName: "ERP de Gestão para Bares & Restaurantes",
          productDescription: "Software completo com PDV touch, integração iFood, controle de estoque e comandas digitais.",
          status: "LIVE",
          minScore: 75,
          allowedChannels: "WHATSAPP,EMAIL",
          dailyLeadLimit: 50,
          dailyMessageLimit: 50,
          sendTimeStart: "09:00",
          sendTimeEnd: "18:00",
          icpFilters: JSON.stringify({
            states: ["SP"],
            cities: ["São Paulo", "Bauru", "Campinas", "Ribeirão Preto"],
            cnaes: ["5611201", "5611203", "5611204"],
            portes: ["ME", "EPP", "MEI"],
            maxDaysOpened: 15,
            minCapital: 10000,
            maxCapital: 500000,
          }),
        },
      });
    }

    let camp2 = await prisma.campaign.findFirst({ where: { organizationId: org.id, name: "Fintech Conta PJ — Abertura Expressa" } });
    if (!camp2) {
      camp2 = await prisma.campaign.create({
        data: {
          organizationId: org.id,
          name: "Fintech Conta PJ — Abertura Expressa",
          productName: "Conta Jurídica Digital com Pix Gratuito",
          productDescription: "Conta bancária para novos negócios com cartão corporativo sem anuidade.",
          status: "LIVE",
          minScore: 80,
          allowedChannels: "EMAIL",
          dailyLeadLimit: 100,
          dailyMessageLimit: 80,
          sendTimeStart: "09:00",
          sendTimeEnd: "18:00",
          icpFilters: JSON.stringify({
            states: ["SP", "RJ", "MG", "PR", "SC", "RS"],
            cities: [],
            cnaes: [],
            portes: ["MEI", "ME"],
            maxDaysOpened: 7,
            minCapital: 0,
            maxCapital: null,
          }),
        },
      });
    }

    // 5. Empresas Base
    const companiesData = [
      {
        cnpj: "00000001000191",
        razaoSocial: "Bella Pasta Cantina & Pizzaria Fictícia Ltda",
        nomeFantasia: "Cantina Bella Pasta",
        dataAbertura: daysAgo(2),
        situacao: "ATIVA",
        dataSituacao: daysAgo(2),
        naturezaJuridica: "206-2 - Sociedade Empresária Limitada",
        porte: "ME",
        capitalSocial: 85000.0,
        cnaePrincipal: "56.11-2-01 - Restaurantes e similares",
        cnaesSecundarios: JSON.stringify(["56.20-1-04 - Fornecimento de alimentos preparados"]),
        endereco: "Rua das Flores, 142",
        numero: "142",
        bairro: "Centro",
        municipio: "Bauru",
        uf: "SP",
        cep: "17010-000",
        telefone: "14998765432",
        email: "contato@bellapastaficticia.com.br",
        fonte: "PUBLIC_REGISTRY_MOCK",
      },
      {
        cnpj: "00000002000172",
        razaoSocial: "TechVortex Soluções de TI Fictícia Ltda",
        nomeFantasia: "TechVortex",
        dataAbertura: daysAgo(1),
        situacao: "ATIVA",
        dataSituacao: daysAgo(1),
        naturezaJuridica: "206-2 - Sociedade Empresária Limitada",
        porte: "ME",
        capitalSocial: 50000.0,
        cnaePrincipal: "62.01-5-01 - Desenvolvimento de programas de computador sob encomenda",
        cnaesSecundarios: JSON.stringify(["62.02-3-00 - Consultoria em TI"]),
        endereco: "Av. Paulista, 1000",
        numero: "1000",
        complemento: "Sala 52",
        bairro: "Bela Vista",
        municipio: "São Paulo",
        uf: "SP",
        cep: "01310-100",
        telefone: "11987654321",
        email: "admin@techvortexficticia.com.br",
        fonte: "PUBLIC_REGISTRY_MOCK",
      },
      {
        cnpj: "00000003000153",
        razaoSocial: "Sabor & Brasa Churrascaria Fictícia ME",
        nomeFantasia: "Churrascaria Sabor & Brasa",
        dataAbertura: daysAgo(0),
        situacao: "ATIVA",
        dataSituacao: daysAgo(0),
        naturezaJuridica: "213-5 - Empresário Individual",
        porte: "ME",
        capitalSocial: 120000.0,
        cnaePrincipal: "56.11-2-01 - Restaurantes e similares",
        cnaesSecundarios: JSON.stringify([]),
        endereco: "Av. Independência, 500",
        numero: "500",
        bairro: "Alto da Boa Vista",
        municipio: "Ribeirão Preto",
        uf: "SP",
        cep: "14025-000",
        telefone: "16997654321",
        email: "financeiro@saborebrasaficticia.com.br",
        fonte: "PUBLIC_REGISTRY_MOCK",
      },
      {
        cnpj: "00000004000134",
        razaoSocial: "Lumina Consultoria Estratégica & Gestão Ltda",
        nomeFantasia: "Lumina Partners",
        dataAbertura: daysAgo(3),
        situacao: "ATIVA",
        dataSituacao: daysAgo(3),
        naturezaJuridica: "206-2 - Sociedade Empresária Limitada",
        porte: "EPP",
        capitalSocial: 200000.0,
        cnaePrincipal: "70.20-4-00 - Atividades de consultoria em gestão empresarial",
        cnaesSecundarios: JSON.stringify([]),
        endereco: "Av. Faria Lima, 2200",
        numero: "2200",
        bairro: "Itaim Bibi",
        municipio: "São Paulo",
        uf: "SP",
        cep: "01452-000",
        telefone: "11991234567",
        email: "contato@luminapartners.com.br",
        fonte: "PUBLIC_REGISTRY_MOCK",
      },
      {
        cnpj: "00000005000115",
        razaoSocial: "Nexus Soluções Logísticas & Distribuição Ltda",
        nomeFantasia: "Nexus Express",
        dataAbertura: daysAgo(4),
        situacao: "ATIVA",
        dataSituacao: daysAgo(4),
        naturezaJuridica: "206-2 - Sociedade Empresária Limitada",
        porte: "ME",
        capitalSocial: 75000.0,
        cnaePrincipal: "49.30-2-02 - Transporte rodoviário de carga",
        cnaesSecundarios: JSON.stringify([]),
        endereco: "Rodovia Anhanguera, km 98",
        numero: "S/N",
        bairro: "Distrito Industrial",
        municipio: "Campinas",
        uf: "SP",
        cep: "13065-000",
        telefone: "19981234567",
        email: "operacoes@nexusexpress.com.br",
        fonte: "PUBLIC_REGISTRY_MOCK",
      },
    ];

    const createdCompanies: any[] = [];
    for (const c of companiesData) {
      let comp = await prisma.company.findUnique({ where: { cnpj: c.cnpj } });
      if (!comp) {
        comp = await prisma.company.create({ data: c });
      }
      createdCompanies.push(comp);
    }

    // 6. Contatos & Decisores
    const contactsData = [
      {
        companyId: createdCompanies[0].id,
        nome: "Carlos Eduardo Silva",
        cargo: "Sócio Administrador",
        email: "carlos@bellapastaficticia.com.br",
        telefone: "14998765432",
        whatsapp: "14998765432",
        tipo: "DECISION_MAKER",
        sourceProvider: "ENRICHMENT_API",
        phoneStatus: "PROVIDER_VERIFIED",
        whatsappStatus: "VERIFIED",
        emailStatus: "FORMAT_VALID",
        confidenceScore: 95,
        optOut: false,
      },
      {
        companyId: createdCompanies[1].id,
        nome: "Mariana Costa",
        cargo: "Fundadora & CTO",
        email: "mariana@techvortexficticia.com.br",
        telefone: "11987654321",
        whatsapp: "11987654321",
        tipo: "DECISION_MAKER",
        sourceProvider: "ENRICHMENT_API",
        phoneStatus: "PROVIDER_VERIFIED",
        whatsappStatus: "VERIFIED",
        emailStatus: "FORMAT_VALID",
        confidenceScore: 92,
        optOut: false,
      },
      {
        companyId: createdCompanies[2].id,
        nome: "Rodrigo Mendonça",
        cargo: "Diretor Geral",
        email: "rodrigo@saborebrasaficticia.com.br",
        telefone: "16997654321",
        whatsapp: "16997654321",
        tipo: "DECISION_MAKER",
        sourceProvider: "ENRICHMENT_API",
        phoneStatus: "PROVIDER_VERIFIED",
        whatsappStatus: "VERIFIED",
        emailStatus: "FORMAT_VALID",
        confidenceScore: 90,
        optOut: false,
      },
      {
        companyId: createdCompanies[3].id,
        nome: "Fernanda Albuquerque",
        cargo: "Managing Partner",
        email: "fernanda@luminapartners.com.br",
        telefone: "11991234567",
        whatsapp: "11991234567",
        tipo: "DECISION_MAKER",
        sourceProvider: "ENRICHMENT_API",
        phoneStatus: "PROVIDER_VERIFIED",
        whatsappStatus: "VERIFIED",
        emailStatus: "FORMAT_VALID",
        confidenceScore: 88,
        optOut: false,
      },
      {
        companyId: createdCompanies[4].id,
        nome: "Guilherme Santos",
        cargo: "Diretor de Operações",
        email: "guilherme@nexusexpress.com.br",
        telefone: "19981234567",
        whatsapp: "19981234567",
        tipo: "DECISION_MAKER",
        sourceProvider: "ENRICHMENT_API",
        phoneStatus: "PROVIDER_VERIFIED",
        whatsappStatus: "VERIFIED",
        emailStatus: "FORMAT_VALID",
        confidenceScore: 85,
        optOut: false,
      },
    ];

    for (const ct of contactsData) {
      const exists = await prisma.contact.findFirst({
        where: { companyId: ct.companyId, email: ct.email },
      });
      if (!exists) {
        await prisma.contact.create({ data: ct });
      }
    }

    // 7. Leads Qualificados
    const lead1 = await prisma.lead.upsert({
      where: {
        organizationId_campaignId_companyId: {
          organizationId: org.id,
          campaignId: camp1.id,
          companyId: createdCompanies[0].id,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        campaignId: camp1.id,
        companyId: createdCompanies[0].id,
        ownerId: owner.id,
        score: 95,
        readiness: "READY",
        status: "READY_TO_CONTACT",
        qualificationReason: JSON.stringify([
          { criterion: "CNAE Principal", matched: true, points: 30, maxPoints: 30, detail: "Restaurante" },
          { criterion: "Localização", matched: true, points: 20, maxPoints: 20, detail: "Bauru/SP" },
          { criterion: "Recência", matched: true, points: 20, maxPoints: 20, detail: "Aberta há 2 dias" },
          { criterion: "Decisor Identificado", matched: true, points: 25, maxPoints: 25, detail: "Sócio Administrador verificado" },
        ]),
        firstDetectedAt: daysAgo(2),
      },
    });

    const lead2 = await prisma.lead.upsert({
      where: {
        organizationId_campaignId_companyId: {
          organizationId: org.id,
          campaignId: camp2.id,
          companyId: createdCompanies[1].id,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        campaignId: camp2.id,
        companyId: createdCompanies[1].id,
        ownerId: owner.id,
        score: 91,
        readiness: "READY",
        status: "CONTACTED",
        qualificationReason: JSON.stringify([
          { criterion: "CNAE", matched: true, points: 30, maxPoints: 30, detail: "TI e Software" },
          { criterion: "Localização", matched: true, points: 20, maxPoints: 20, detail: "São Paulo/SP" },
          { criterion: "Recência", matched: true, points: 20, maxPoints: 20, detail: "Aberta há 24h" },
        ]),
        firstDetectedAt: daysAgo(1),
        contactedAt: daysAgo(0),
      },
    });

    const lead3 = await prisma.lead.upsert({
      where: {
        organizationId_campaignId_companyId: {
          organizationId: org.id,
          campaignId: camp1.id,
          companyId: createdCompanies[2].id,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        campaignId: camp1.id,
        companyId: createdCompanies[2].id,
        ownerId: owner.id,
        score: 92,
        readiness: "READY",
        status: "READY_TO_CONTACT",
        qualificationReason: JSON.stringify([
          { criterion: "CNAE", matched: true, points: 30, maxPoints: 30, detail: "Churrascaria / Restaurante" },
          { criterion: "Localização", matched: true, points: 20, maxPoints: 20, detail: "Ribeirão Preto/SP" },
          { criterion: "Recência", matched: true, points: 25, maxPoints: 25, detail: "Aberta hoje" },
        ]),
        firstDetectedAt: daysAgo(0),
      },
    });

    // 8. Opportunity Scores (CRÍTICO PARA O RADAR DE OPORTUNIDADES!)
    const opportunityScoresData = [
      {
        organizationId: org.id,
        companyId: createdCompanies[0].id,
        leadId: lead1.id,
        campaignId: camp1.id,
        opportunityScore: 96,
        priority: "VERY_HIGH",
        recommendedAction: "CONTACT_TODAY",
        reasons: JSON.stringify([
          "Abertura em 48h com alvará ativo",
          "Decisor com WhatsApp e E-mail corporativo confirmados",
          "Segmento prioritário (Restaurante com demanda imediata de ERP)",
          "Score ICP de 95 pontos",
        ]),
        warnings: JSON.stringify([]),
        estimatedMRR: 850,
      },
      {
        organizationId: org.id,
        companyId: createdCompanies[1].id,
        leadId: lead2.id,
        campaignId: camp2.id,
        opportunityScore: 92,
        priority: "VERY_HIGH",
        recommendedAction: "CONTACT_TODAY",
        reasons: JSON.stringify([
          "Startup aberta há 24h na Av. Paulista",
          "Necessidade urgente de Conta PJ e emissão de notas fiscais",
          "Sócia Administradora identificada e contactável",
        ]),
        warnings: JSON.stringify([]),
        estimatedMRR: 1200,
      },
      {
        organizationId: org.id,
        companyId: createdCompanies[2].id,
        leadId: lead3.id,
        campaignId: camp1.id,
        opportunityScore: 94,
        priority: "VERY_HIGH",
        recommendedAction: "CONTACT_TODAY",
        reasons: JSON.stringify([
          "Churrascaria inaugurada hoje em Ribeirão Preto",
          "Capital social de R$ 120.000",
          "WhatsApp do Diretor Geral verificado",
        ]),
        warnings: JSON.stringify([]),
        estimatedMRR: 950,
      },
      {
        organizationId: org.id,
        companyId: createdCompanies[3].id,
        campaignId: camp2.id,
        opportunityScore: 84,
        priority: "HIGH",
        recommendedAction: "ENRICH_FIRST",
        reasons: JSON.stringify([
          "Consultoria executiva no Itaim Bibi",
          "Capital social de R$ 200.000",
          "Alta propensão para serviços financeiros e gestão",
        ]),
        warnings: JSON.stringify(["Requer validação adicional de sócios"]),
        estimatedMRR: 1500,
      },
      {
        organizationId: org.id,
        companyId: createdCompanies[4].id,
        campaignId: camp2.id,
        opportunityScore: 81,
        priority: "HIGH",
        recommendedAction: "CONTACT_TODAY",
        reasons: JSON.stringify([
          "Transportadora em expansão em Campinas",
          "Demanda de conta digital e conciliação de fretes",
        ]),
        warnings: JSON.stringify([]),
        estimatedMRR: 1100,
      },
    ];

    for (const opp of opportunityScoresData) {
      const exists = await prisma.opportunityScore.findFirst({
        where: { organizationId: opp.organizationId, companyId: opp.companyId },
      });
      if (!exists) {
        await prisma.opportunityScore.create({ data: opp });
      }
    }

    // 9. Deals no CRM (Fase 7)
    let deal1 = await prisma.deal.findFirst({ where: { organizationId: org.id } });
    if (!deal1) {
      deal1 = await prisma.deal.create({
        data: {
          organizationId: org.id,
          leadId: lead1.id,
          companyId: createdCompanies[0].id,
          campaignId: camp1.id,
          title: "Implantação PDV & Gestão — Cantina Bella Pasta",
          expectedValue: 10200,
          stage: "NEGOTIATION",
          probability: 85,
          expectedCloseDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          ownerId: owner.id,
        },
      });

      await prisma.deal.create({
        data: {
          organizationId: org.id,
          leadId: lead2.id,
          companyId: createdCompanies[1].id,
          campaignId: camp2.id,
          title: "Contrato Anual ERP — TechVortex",
          expectedValue: 14400,
          stage: "PROPOSAL",
          probability: 70,
          expectedCloseDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          ownerId: owner.id,
        },
      });
    }

    // 10. Reuniões Agendadas
    const existingMeetings = await prisma.meeting.count({ where: { organizationId: org.id } });
    if (existingMeetings === 0) {
      await prisma.meeting.create({
        data: {
          organizationId: org.id,
          leadId: lead1.id,
          dealId: deal1.id,
          title: "Demonstração Técnica da Solução com Carlos Silva",
          scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Amanhã
          durationMinutes: 45,
          status: "CONFIRMED",
          meetingLink: "https://meet.google.com/ple-demo-meeting",
        },
      });

      await prisma.meeting.create({
        data: {
          organizationId: org.id,
          leadId: lead2.id,
          title: "Alinhamento Comercial & Apresentação de Proposta",
          scheduledAt: new Date(now.getTime() + 48 * 60 * 60 * 1000), // Em 2 dias
          durationMinutes: 30,
          status: "SCHEDULED",
          meetingLink: "https://zoom.us/j/ple-demo-zoom",
        },
      });
    }

    // 11. Templates & Copy
    const existingTpl = await prisma.template.findFirst({ where: { organizationId: org.id } });
    if (!existingTpl) {
      await prisma.template.create({
        data: {
          organizationId: org.id,
          campaignId: camp1.id,
          name: "Abordagem Inicial Restaurantes",
          channel: "EMAIL",
          subject: "Parabéns pela abertura da {{nome_fantasia}} em {{cidade}}!",
          body: "Olá, {{nome_contato}}! Parabéns pela abertura da {{nome_fantasia}} em {{cidade}}/{{uf}}.\n\nNotamos o registro recente do seu restaurante e sabemos que organizar PDV e estoque no primeiro mês é crucial.\n\nGostaria de conhecer nossas condições especiais para inaugurações?",
        },
      });
    }

    // 12. Métricas e Atribuição de Receita
    const existingAttribution = await prisma.revenueAttribution.count({ where: { organizationId: org.id } });
    if (existingAttribution === 0 && deal1) {
      await prisma.revenueAttribution.create({
        data: {
          organizationId: org.id,
          campaignId: camp1.id,
          dealId: deal1.id,
          leadId: lead1.id,
          attributedValue: 10200,
          channel: "EMAIL",
          touchType: "LAST_TOUCH",
          percentage: 100,
        },
      });
    }

    logger.info("DATABASE_BOOTSTRAP_COMPLETED_SUCCESSFULLY");
    return {
      bootstrapped: true,
      message: "Banco de dados inicializado com sucesso!",
      organization: org.name,
      user: owner.email,
    };
  } catch (error: any) {
    logger.error("BOOTSTRAP_ERROR", error);
    throw error;
  }
}
