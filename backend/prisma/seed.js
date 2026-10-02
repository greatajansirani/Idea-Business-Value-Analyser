const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  const adminPwd = await bcrypt.hash('admin1234', 12)
  const demoPwd  = await bcrypt.hash('demo1234', 12)
  const admin = await prisma.user.upsert({ where:{email:'admin@lnt.com'}, update:{}, create:{name:'Admin User',   email:'admin@lnt.com', password:adminPwd, role:'ADMIN'}   })
  const demo  = await prisma.user.upsert({ where:{email:'demo@lnt.com'},  update:{}, create:{name:"John D'Souza", email:'demo@lnt.com',  password:demoPwd,  role:'ANALYST'} })
  const sme   = await prisma.user.upsert({ where:{email:'sme@lnt.com'},   update:{}, create:{name:'Priya Sharma', email:'sme@lnt.com',   password:demoPwd,  role:'SME'}    })
  console.log('Users:', admin.email, demo.email, sme.email)

  const idea1 = await prisma.idea.upsert({
    where:{ id:'seed-idea-001' }, update:{},
    create:{
      id:'seed-idea-001',
      title:'AI-Powered Predictive Maintenance for Transmission Lines',
      category:'AI_ML', description:'Deploy ML models on sensor data to predict failures. Reduces downtime 60%, extends asset life.',
      targetMarket:'Power Transmission & Distribution Utilities',
      investmentCost:5000000, expectedBenefit:2000000, paybackTimeline:'5 years',
      riskLevel:'LOW', userExpectation:'Expect 30%+ ROI within 3 years.',
      status:'UNDER_REVIEW', userId:demo.id,
    },
  })

  // Values computed by fixed engine: initialInvestment = capex+devCost = 4000000
  await prisma.roiAnalysis.upsert({
    where:{ ideaId:idea1.id }, update:{},
    create:{
      ideaId:idea1.id,
      initialInvestment:4000000,  // capex(2500000) + devCost(1500000) — NOT idea.investmentCost
      annualCashFlows:[532500,612375,703231,808316,929163],
      discountRate:0.10, projectLifeYears:5,
      capex:2500000, opex:500000, maintenanceCost:250000, developmentCost:1500000,
      revenueGeneration:1200000, efficiencyGains:500000, costSavings:300000,
      roiRatio:29.03, npv:2456043, irr:28.79,
      paybackPeriodYears:3.20,   // = 4000000 / (2000000-750000) = 3.2 yrs = 38 months
      bcr:1.11, breakEvenYear:3.20,
      grossMargin:40.8, netProfitMargin:22.6,
      shortTermRevenue:1144875, longTermRevenue:2440710,
      riskScore:37,
      riskMarket:24, riskTechnology:47, riskFinancial:23, riskRegulatory:18,
      goNoGo:'GO',
      aiInsights:'This AI-powered predictive maintenance solution demonstrates a solid ROI of 29.0% with a Net Present Value of Rs.24,56,043 and an IRR of 28.8%, which significantly exceeds the 10% hurdle rate. The payback period is 38 months (3.2 years), computed as Initial Investment divided by Annual Net Cash Flow (Rs.40,00,000 / Rs.12,50,000).\n\nRisk 1: Technology adoption curve may slow initial deployment in legacy grid infrastructure.\nRisk 2: Data quality from aging sensors could reduce ML model accuracy in early phases.\nRisk 3: Regulatory approvals for automated interventions may create timeline delays.\n\nRecommendation: Proceed with GO. BCR of 1.11 confirms benefits outweigh costs. Recommend phased rollout starting with highest-failure-risk transmission corridors.',
      marketInsights:'The global predictive maintenance market is growing at 25%+ CAGR. India power sector modernisation agenda creates strong demand. L&T existing infrastructure relationships provide competitive advantage for rapid deployment.',
    },
  })

  await prisma.scenario.deleteMany({ where:{ ideaId:idea1.id } })
  await prisma.scenario.createMany({ data:[
    { ideaId:idea1.id, type:'BEST_CASE',   label:'Best Case',   revenueMultiplier:1.30, costMultiplier:0.90, riskMultiplier:0.70, roi:68.5,  npv:3850000, irr:44.2, payback:2.1, totalCost:4675000, totalBenefit:13000000 },
    { ideaId:idea1.id, type:'MOST_LIKELY', label:'Most Likely', revenueMultiplier:1.00, costMultiplier:1.00, riskMultiplier:1.00, roi:29.0,  npv:2456043, irr:28.8, payback:3.2, totalCost:5000000, totalBenefit:10000000 },
    { ideaId:idea1.id, type:'WORST_CASE',  label:'Worst Case',  revenueMultiplier:0.70, costMultiplier:1.20, riskMultiplier:1.40, roi:-8.4,  npv:-320000, irr:6.2,  payback:6.1, totalCost:6000000, totalBenefit:7000000  },
  ]})

  await prisma.auditLog.create({ data:{ ideaId:idea1.id, userId:demo.id, action:'EVALUATION_RUN', details:{ roi:29.03, npv:2456043, paybackMonths:38, riskScore:37, goNoGo:'GO', note:'initialInvestment=capex+devCost=4000000' }, version:1 } })

  await prisma.idea.upsert({ where:{id:'seed-idea-002'}, update:{}, create:{id:'seed-idea-002', title:'Smart Grid Energy Analytics Platform', category:'DATA_ANALYTICS', description:'Cloud-based analytics for real-time grid data, anomaly detection, and load optimization.', targetMarket:'State Electricity Boards (SEBs)', investmentCost:3500000, expectedBenefit:1500000, paybackTimeline:'3 years', riskLevel:'LOW', userExpectation:'Clear ROI within 2-3 years.', status:'DRAFT', userId:demo.id} })
  await prisma.idea.upsert({ where:{id:'seed-idea-003'}, update:{}, create:{id:'seed-idea-003', title:'Renewable Energy Integration Optimizer', category:'ENERGY_SUSTAINABILITY', description:'Software to optimize solar and wind energy integration and reduce curtailment by 40%.', targetMarket:'Renewable Energy Developers', investmentCost:8000000, expectedBenefit:3200000, paybackTimeline:'4 years', riskLevel:'MEDIUM', userExpectation:'High investment but strong market opportunity.', status:'DRAFT', userId:sme.id} })

  console.log('Seed complete.')
  console.log('Login: demo@lnt.com/demo1234 | admin@lnt.com/admin1234 | sme@lnt.com/demo1234')
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
