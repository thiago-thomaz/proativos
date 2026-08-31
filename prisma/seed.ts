import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de demonstração...");

  // Limpar tabelas prévias
  await prisma.auditLog.deleteMany({});
  await prisma.creditTransaction.deleteMany({});
  await prisma.creditAccount.deleteMany({});
  await prisma.suppressionList.deleteMany({});
  await prisma.template.deleteMany({});
  await prisma.leadEvent.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  // 1. Criar Organização Demo
  const org = await prisma.organization.create({
    data: {
      name: "Acme Tecnologia & Vendas B2B",
      slug: "acme-corp",
      plan: "PROFESSIONAL",
      active: true,
    },
  });

  // 2. Criar Usuários com diferentes papéis (RBAC)
  const passwordHash = await bcrypt.hash("proactive123", 10);

  const owner = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Thiago Thomaz",
      email: "thiago@acmecorp.com.br",
      passwordHash,
      role: "OWNER",
      active: true,
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Super Admin Platform",
      email: "admin@proactiveleadengine.com.br",
      passwordHash,
      role: "SUPER_ADMIN",
      active: true,
    },
  });

  // 3. Criar Conta de Crédito
  const creditAccount = await prisma.creditAccount.create({
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

  // 4. Criar Campanhas Demonstrativas
  const camp1 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: "Novos Restaurantes de São Paulo",
      productName: "ERP de Gestão para Bares & Restaurantes",
      productDescription: "Software completo com PDV touch, integração iFood, controle de estoque e comandas digitais.",
      status: "SIMULATION",
      minScore: 75,
      allowedChannels: "WHATSAPP,EMAIL",
      dailyLeadLimit: 50,
      dailyMessageLimit: 50,
      sendTimeStart: "09:00",
      sendTimeEnd: "18:00",
      icpFilters: JSON.stringify({
        states: ["SP"],
        cities: ["São Paulo", "Bauru", "Campinas", "Ribeirão Preto"],
        cnaes: ["5611201", "5611203", "5611204"], // Restaurantes e similares
        portes: ["ME", "EPP", "MEI"],
        maxDaysOpened: 15,
        minCapital: 10000,
        maxCapital: 500000,
      }),
    },
  });

  const camp2 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: "Fintech Conta PJ — Abertura Expressa",
      productName: "Conta Jurídica Digital com Pix Gratuito",
      productDescription: "Conta bancária para novos negócios com cartão de crédito sem anuidade e emissão de boletos sem taxa.",
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
        cnaes: [], // Aberto a qualquer segmento
        portes: ["MEI", "ME"],
        maxDaysOpened: 7,
        minCapital: 0,
        maxCapital: null,
      }),
    },
  });

  // 5. Criar Empresas Fictícias Recém-Abertas
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const company1 = await prisma.company.create({
    data: {
      cnpj: "00000001000191", // Fictício
      razaoSocial: "Bella Pasta Cantina & Pizzaria Fictícia Ltda",
      nomeFantasia: "Cantina Bella Pasta",
      dataAbertura: daysAgo(2),
      situacao: "ATIVA",
      dataSituacao: daysAgo(2),
      naturezaJuridica: "206-2 - Sociedade Empresária Limitada",
      porte: "ME",
      capitalSocial: 85000.0,
      cnaePrincipal: "56.11-2-01 - Restaurantes e similares",
      cnaesSecundarios: JSON.stringify(["56.20-1-04 - Fornecimento de alimentos preparados para consumo domiciliar"]),
      endereco: "Rua das Flores",
      numero: "142",
      bairro: "Centro",
      municipio: "Bauru",
      uf: "SP",
      cep: "17010-000",
      telefone: "14998765432",
      email: "contato@bellapastaficticia.com.br",
      fonte: "PUBLIC_REGISTRY_MOCK",
    },
  });

  const company2 = await prisma.company.create({
    data: {
      cnpj: "00000002000172", // Fictício
      razaoSocial: "TechVortex Soluções de TI Fictícia Ltda",
      nomeFantasia: "TechVortex",
      dataAbertura: daysAgo(1),
      situacao: "ATIVA",
      dataSituacao: daysAgo(1),
      naturezaJuridica: "206-2 - Sociedade Empresária Limitada",
      porte: "ME",
      capitalSocial: 50000.0,
      cnaePrincipal: "62.01-5-01 - Desenvolvimento de programas de computador sob encomenda",
      cnaesSecundarios: JSON.stringify(["62.02-3-00 - Desenvolvimento e licenciamento de programas customizáveis"]),
      endereco: "Av. Paulista",
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
  });

  const company3 = await prisma.company.create({
    data: {
      cnpj: "00000003000153", // Fictício
      razaoSocial: "Sabor & Brasa Churrascaria Fictícia ME",
      nomeFantasia: "Churrascaria Sabor & Brasa",
      dataAbertura: daysAgo(0), // Aberta hoje
      situacao: "ATIVA",
      dataSituacao: daysAgo(0),
      naturezaJuridica: "213-5 - Empresário Individual",
      porte: "ME",
      capitalSocial: 120000.0,
      cnaePrincipal: "56.11-2-01 - Restaurantes e similares",
      cnaesSecundarios: JSON.stringify([]),
      endereco: "Av. Independência",
      numero: "500",
      bairro: "Alto da Boa Vista",
      municipio: "Ribeirão Preto",
      uf: "SP",
      cep: "14025-000",
      telefone: "16997654321",
      email: "financeiro@saborebrasaficticia.com.br",
      fonte: "PUBLIC_REGISTRY_MOCK",
    },
  });

  // 6. Criar Contatos Institucionais e Decisores
  await prisma.contact.create({
    data: {
      companyId: company1.id,
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
      confidenceScore: 92,
      optOut: false,
    },
  });

  await prisma.contact.create({
    data: {
      companyId: company2.id,
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
      confidenceScore: 90,
      optOut: false,
    },
  });

  // 7. Criar Leads Qualificados no Motor
  const lead1 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      campaignId: camp1.id,
      companyId: company1.id,
      ownerId: owner.id,
      score: 94,
      status: "READY_TO_CONTACT",
      qualificationReason: JSON.stringify([
        { criterion: "CNAE Principal", matched: true, points: 30, maxPoints: 30, detail: "CNAE de restaurante compatível" },
        { criterion: "Localização", matched: true, points: 20, maxPoints: 20, detail: "Localizada em Bauru/SP" },
        { criterion: "Recência de Abertura", matched: true, points: 15, maxPoints: 15, detail: "Aberta há 2 dias" },
        { criterion: "Porte Empresarial", matched: true, points: 10, maxPoints: 10, detail: "Porte ME compatível" },
        { criterion: "Capital Social", matched: true, points: 10, maxPoints: 10, detail: "Capital social de R$ 85.000" },
        { criterion: "Telefone Cadastral", matched: true, points: 10, maxPoints: 10, detail: "Telefone verificado" },
      ]),
      firstDetectedAt: daysAgo(2),
    },
  });

  await prisma.leadEvent.createMany({
    data: [
      {
        leadId: lead1.id,
        type: "DETECTED",
        description: "Nova empresa identificada pelo motor de ingestão pública.",
        createdAt: daysAgo(2),
      },
      {
        leadId: lead1.id,
        type: "SCORED",
        description: "Motor de ICP atribuiu pontuação 94/100 para a campanha 'Novos Restaurantes de São Paulo'.",
        createdAt: daysAgo(2),
      },
      {
        leadId: lead1.id,
        type: "ENRICHED",
        description: "Decisor identificado (Carlos Eduardo Silva - Sócio Administrador) via enriquecimento autorizado.",
        createdAt: daysAgo(1),
      },
      {
        leadId: lead1.id,
        type: "STATUS_CHANGED",
        description: "Lead aprovado no motor de regras e marcado como READY_TO_CONTACT.",
        createdAt: daysAgo(1),
      },
    ],
  });

  const lead2 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      campaignId: camp2.id,
      companyId: company2.id,
      ownerId: owner.id,
      score: 91,
      status: "CONTACTED",
      qualificationReason: JSON.stringify([
        { criterion: "CNAE", matched: true, points: 30, maxPoints: 30, detail: "Segmento de TI aderente" },
        { criterion: "Localização", matched: true, points: 20, maxPoints: 20, detail: "São Paulo/SP" },
        { criterion: "Recência", matched: true, points: 15, maxPoints: 15, detail: "Aberta há 24h" },
      ]),
      firstDetectedAt: daysAgo(1),
      contactedAt: daysAgo(0),
    },
  });

  await prisma.leadEvent.createMany({
    data: [
      {
        leadId: lead2.id,
        type: "DETECTED",
        description: "Nova empresa identificada.",
        createdAt: daysAgo(1),
      },
      {
        leadId: lead2.id,
        type: "MESSAGE_SENT",
        description: "Primeiro e-mail institucional enviado com oferta de Conta PJ.",
        createdAt: daysAgo(0),
      },
    ],
  });

  // 8. Templates Padrão
  await prisma.template.create({
    data: {
      organizationId: org.id,
      campaignId: camp1.id,
      name: "Abordagem Inicial Restaurantes",
      channel: "EMAIL",
      subject: "Parabéns pela abertura da {{nome_fantasia}} em {{cidade}}!",
      body: "Olá, {{nome_contato}}! Parabéns pela abertura da {{nome_fantasia}} em {{cidade}}/{{uf}}.\n\nNotamos o registro recente do seu restaurante e sabemos que organizar PDV, comandas e estoque logo no primeiro mês é crucial para o sucesso da operação.\n\nGostaria de conhecer o nosso {{produto}} com condições especiais para inaugurações?\n\nCaso não deseje receber contatos, clique no link de descadastro.",
    },
  });

  // 9. Suppression List Exemplo
  await prisma.suppressionList.create({
    data: {
      organizationId: org.id,
      identifier: "optout-exemplo@dominio.com.br",
      channel: "ALL",
      reason: "Solicitação de descadastro via link de e-mail.",
      source: "USER_REQUEST",
    },
  });

  console.log("Seed executado com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
