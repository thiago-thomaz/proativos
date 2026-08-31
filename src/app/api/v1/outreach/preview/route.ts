import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { personalizeMessage } from "@/services/message-personalizer";
import { checkOutreachEligibility } from "@/services/outreach-eligibility";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, templateText, templateSubject } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "Parâmetro 'leadId' é obrigatório." },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        company: { include: { contacts: true } },
        campaign: true,
        organization: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead não encontrado." },
        { status: 404 }
      );
    }

    const contact = lead.company.contacts[0];
    const eligibility = await checkOutreachEligibility(lead.id, lead.campaignId, {
      simulationMode: true,
    });

    const defaultBody =
      templateText ||
      "Olá, {{contact_name}}! Parabéns pela abertura da {{company_name}} em {{city}}. Temos soluções para {{cnae}}. {{cta}}";
    const defaultSubject = templateSubject || "Apresentação Comercial: {{product_name}}";

    const rendered = personalizeMessage(defaultBody, {
      company: lead.company,
      contact,
      campaign: {
        productName: lead.campaign.productName,
        productDescription: lead.campaign.productDescription,
        organizationName: lead.organization.name,
      },
    });

    const renderedSubject = personalizeMessage(defaultSubject, {
      company: lead.company,
      contact,
      campaign: {
        productName: lead.campaign.productName,
        productDescription: lead.campaign.productDescription,
        organizationName: lead.organization.name,
      },
    }).personalized;

    return NextResponse.json({
      success: true,
      preview: {
        leadId: lead.id,
        companyName: lead.company.razaoSocial,
        contactName: contact?.nome || "Responsável",
        channel: eligibility.recommendedChannel || "EMAIL",
        subject: renderedSubject,
        body: rendered.personalized,
        missingVariables: rendered.missingVariables,
        eligibility,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao gerar preview da mensagem", detail: error.message },
      { status: 500 }
    );
  }
}
