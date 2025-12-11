// =============================================================================
// SEED - Dados iniciais do banco de dados
// Execute: npm run db:seed
// =============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // ---------------------------------------------------------------------------
  // 1. Criar usuário gestor
  // ---------------------------------------------------------------------------
  const hashedPassword = await bcrypt.hash('password123', 10);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@adsoptimizer.com' },
    update: {
      password: hashedPassword, // Sempre atualiza a senha para garantir acesso
    },
    create: {
      email: 'manager@adsoptimizer.com',
      password: hashedPassword,
      name: 'João Silva',
      role: 'MANAGER',
      company: 'AdsOptimizer Agency',
      phone: '(11) 99999-9999',
    },
  });
  console.log('✅ Gestor criado:', manager.email);

  // ---------------------------------------------------------------------------
  // 2. Criar cliente de exemplo
  // ---------------------------------------------------------------------------
  const client = await prisma.client.upsert({
    where: { email: 'cliente@empresa.com' },
    update: {},
    create: {
      email: 'cliente@empresa.com',
      name: 'Maria Santos',
      phone: '(11) 88888-8888',
      company: 'Loja Virtual LTDA',
      googleAdsId: '123-456-7890',
      managerId: manager.id,
    },
  });
  console.log('✅ Cliente criado:', client.email);

  // ---------------------------------------------------------------------------
  // 3. Criar campanha de exemplo
  // ---------------------------------------------------------------------------
  const campaign = await prisma.campaign.upsert({
    where: { googleCampaignId: 'PMAX-12345678' },
    update: {},
    create: {
      googleCampaignId: 'PMAX-12345678',
      name: 'Performance Max - Produtos Gerais',
      status: 'ENABLED',
      budgetDaily: 150.00,
      targetRoas: 4.5,
      biddingStrategy: 'MAXIMIZE_CONVERSION_VALUE',
      clientId: client.id,
      createdById: manager.id,
    },
  });
  console.log('✅ Campanha criada:', campaign.name);

  // ---------------------------------------------------------------------------
  // 4. Criar métricas de exemplo (últimos 7 dias)
  // ---------------------------------------------------------------------------
  const today = new Date();
  const metricsData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Gerar dados aleatórios mas realistas
    const impressions = Math.floor(Math.random() * 5000) + 8000;
    const clicks = Math.floor(impressions * (Math.random() * 0.03 + 0.02));
    const cost = parseFloat((clicks * (Math.random() * 0.5 + 0.8)).toFixed(2));
    const conversions = Math.floor(clicks * (Math.random() * 0.05 + 0.03));
    const conversionValue = parseFloat((conversions * (Math.random() * 50 + 80)).toFixed(2));
    const ctr = parseFloat((clicks / impressions).toFixed(4));
    const cpc = parseFloat((cost / clicks).toFixed(2));
    const roas = parseFloat((conversionValue / cost).toFixed(2));

    metricsData.push({
      campaignId: campaign.id,
      date,
      impressions,
      clicks,
      cost,
      conversions,
      conversionValue,
      ctr,
      cpc,
      roas,
    });
  }

  // Deletar métricas existentes e inserir novas
  await prisma.campaignMetric.deleteMany({
    where: { campaignId: campaign.id },
  });

  await prisma.campaignMetric.createMany({
    data: metricsData,
  });
  console.log('✅ Métricas criadas: 7 dias de dados');

  // ---------------------------------------------------------------------------
  // 5. Criar Asset Group de exemplo
  // ---------------------------------------------------------------------------
  await prisma.assetGroup.upsert({
    where: { googleAssetId: 'AG-123456' },
    update: {},
    create: {
      googleAssetId: 'AG-123456',
      name: 'Asset Group Principal',
      status: 'ENABLED',
      finalUrl: 'https://loja.exemplo.com',
      headlines: [
        'Produtos com até 50% OFF',
        'Frete Grátis Brasil Todo',
        'Compre Agora e Economize',
        'Qualidade Garantida',
        'Entrega Rápida',
      ],
      descriptions: [
        'Os melhores produtos com os melhores preços. Confira nossas ofertas!',
        'Compre online com segurança e receba em casa.',
      ],
      performanceLabel: 'GOOD',
      campaignId: campaign.id,
    },
  });
  console.log('✅ Asset Group criado');

  // ---------------------------------------------------------------------------
  // 6. Criar alguns alertas de exemplo
  // ---------------------------------------------------------------------------
  await prisma.alert.createMany({
    data: [
      {
        type: 'ROAS_DROP',
        priority: 'HIGH',
        title: 'Queda no ROAS detectada',
        message: 'O ROAS caiu 15% nos últimos 3 dias.',
        data: { currentRoas: 3.8, previousRoas: 4.5, changePercent: -15 },
        campaignId: campaign.id,
        userId: manager.id,
      },
      {
        type: 'BUDGET_EXCEEDED',
        priority: 'MEDIUM',
        title: 'Orçamento próximo do limite',
        message: 'A campanha consumiu 90% do orçamento diário às 15h.',
        data: { budgetUsed: 135, budgetTotal: 150, percentUsed: 90 },
        campaignId: campaign.id,
        userId: manager.id,
      },
    ],
  });
  console.log('✅ Alertas criados: 2 alertas');

  // ---------------------------------------------------------------------------
  // 7. Criar recomendação de exemplo
  // ---------------------------------------------------------------------------
  await prisma.recommendation.create({
    data: {
      type: 'BUDGET',
      status: 'PENDING',
      title: 'Aumentar orçamento da campanha',
      description: 'A campanha está com bom desempenho e pode escalar. Recomendamos aumentar o orçamento em 20%.',
      details: {
        currentBudget: 150,
        suggestedBudget: 180,
        expectedRoasIncrease: '5-10%',
      },
      expectedImpact: 'Aumento de 15-20% nas conversões',
      priority: 'MEDIUM',
      campaignId: campaign.id,
      userId: manager.id,
    },
  });
  console.log('✅ Recomendação criada');

  // ---------------------------------------------------------------------------
  // 8. Criar conversa e mensagens de chat de exemplo
  // ---------------------------------------------------------------------------
  const conversation = await prisma.chatConversation.upsert({
    where: {
      managerId_clientId: {
        managerId: manager.id,
        clientId: client.id,
      },
    },
    update: {},
    create: {
      managerId: manager.id,
      clientId: client.id,
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        content: 'Olá! Vi que a campanha está indo bem. Podemos aumentar o orçamento?',
        senderId: manager.id,
        conversationId: conversation.id,
      },
      {
        content: 'Claro! Qual valor você sugere?',
        senderId: manager.id,
        conversationId: conversation.id,
      },
    ],
  });
  console.log('✅ Conversa e mensagens de chat criadas');

  console.log('\n✨ Seed concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('   Email: manager@adsoptimizer.com');
  console.log('   Senha: password123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
