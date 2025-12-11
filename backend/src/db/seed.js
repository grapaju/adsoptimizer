require('dotenv').config();
const { pool } = require('./index');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...');
  
  try {
    // Criar gestor de exemplo
    const managerPassword = await bcrypt.hash('manager123', 10);
    const managerId = uuidv4();
    
    await pool.query(`
      INSERT INTO users (id, email, password_hash, name, role, company, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
    `, [managerId, 'gestor@adsoptimizer.com', managerPassword, 'João Gestor', 'manager', 'AdsOptimizer Agency', true]);
    
    console.log('✅ Gestor criado: gestor@adsoptimizer.com / manager123');
    
    // Criar cliente de exemplo
    const clientPassword = await bcrypt.hash('client123', 10);
    const clientId = uuidv4();
    
    await pool.query(`
      INSERT INTO users (id, email, password_hash, name, role, company, manager_id, google_ads_customer_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (email) DO NOTHING
    `, [clientId, 'cliente@empresa.com', clientPassword, 'Maria Cliente', 'client', 'Empresa XYZ', managerId, '123-456-7890', true]);
    
    console.log('✅ Cliente criado: cliente@empresa.com / client123');
    
    // Criar campanha de exemplo
    const campaignId = uuidv4();
    
    await pool.query(`
      INSERT INTO campaigns (id, user_id, name, status, budget_daily, target_roas, final_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [campaignId, clientId, 'Performance Max - Vendas', 'active', 100.00, 4.00, 'https://empresa.com']);
    
    console.log('✅ Campanha de exemplo criada');
    
    // Criar métricas de exemplo (últimos 7 dias)
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const impressions = Math.floor(Math.random() * 10000) + 5000;
      const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.02));
      const cost = Math.random() * 80 + 20;
      const conversions = Math.floor(clicks * (Math.random() * 0.1 + 0.02));
      const conversionValue = conversions * (Math.random() * 100 + 50);
      
      await pool.query(`
        INSERT INTO campaign_metrics (campaign_id, date, impressions, clicks, cost, conversions, conversion_value, ctr, cpc, cpa, roas)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        campaignId, 
        dateStr, 
        impressions, 
        clicks, 
        cost.toFixed(2), 
        conversions, 
        conversionValue.toFixed(2),
        ((clicks / impressions) * 100).toFixed(2),
        (cost / clicks).toFixed(2),
        conversions > 0 ? (cost / conversions).toFixed(2) : 0,
        cost > 0 ? (conversionValue / cost).toFixed(2) : 0
      ]);
    }
    
    console.log('✅ Métricas de exemplo criadas');
    
    // Criar alerta de exemplo
    await pool.query(`
      INSERT INTO alerts (campaign_id, user_id, type, severity, title, message, metric_name, current_value, threshold_value)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      campaignId, 
      clientId, 
      'performance_drop', 
      'medium', 
      'Queda no CTR', 
      'O CTR da campanha caiu 15% em comparação com a semana anterior.',
      'ctr',
      2.5,
      3.0
    ]);
    
    console.log('✅ Alerta de exemplo criado');
    
    // Criar conversa de exemplo
    const conversationId = uuidv4();
    
    await pool.query(`
      INSERT INTO conversations (id, campaign_id, participant_1, participant_2)
      VALUES ($1, $2, $3, $4)
    `, [conversationId, campaignId, managerId, clientId]);
    
    await pool.query(`
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES ($1, $2, $3)
    `, [conversationId, managerId, 'Olá! Bem-vindo ao AdsOptimizer. Como posso ajudar com suas campanhas?']);
    
    console.log('✅ Conversa de exemplo criada');
    
    console.log('\n🎉 Seed concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
