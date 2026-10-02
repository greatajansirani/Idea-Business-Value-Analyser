const aiService = require('./aiService')

async function buildReportData(idea, roiAnalysis, scenarios) {
  let narrative = ''
  try { narrative = await aiService.generateReportNarrative(idea, roiAnalysis, scenarios) }
  catch { narrative = `Business Value Analysis Report — ${idea.title}` }

  const cashFlows = Array.isArray(roiAnalysis.annualCashFlows)
    ? roiAnalysis.annualCashFlows
    : JSON.parse(roiAnalysis.annualCashFlows || '[]')

  const paybackMonths = Math.round((roiAnalysis.paybackPeriodYears || 0) * 12)

  return {
    meta: { reportTitle:`Business Value Analysis: ${idea.title}`, generatedAt:new Date().toISOString(), organization:'Larsen & Toubro Limited – Digital Energy Solutions', sensitivity:'LNT Internal Use Only', version:idea.version },
    idea: { title:idea.title, category:idea.category, description:idea.description, targetMarket:idea.targetMarket, riskLevel:idea.riskLevel, status:idea.status, userExpectation:idea.userExpectation, projectDuration:idea.paybackTimeline },
    metrics: { roiRatio:roiAnalysis.roiRatio, npv:roiAnalysis.npv, irr:roiAnalysis.irr, paybackPeriodYears:roiAnalysis.paybackPeriodYears, paybackMonths, bcr:roiAnalysis.bcr, breakEvenYear:roiAnalysis.breakEvenYear, grossMargin:roiAnalysis.grossMargin, netProfitMargin:roiAnalysis.netProfitMargin, riskScore:roiAnalysis.riskScore, goNoGo:roiAnalysis.goNoGo, discountRate:roiAnalysis.discountRate, projectLifeYears:roiAnalysis.projectLifeYears, shortTermRevenue:roiAnalysis.shortTermRevenue, longTermRevenue:roiAnalysis.longTermRevenue },
    cashFlows: cashFlows.map((cf, i) => ({ year:i+1, cashFlow:cf, cumulative:cashFlows.slice(0,i+1).reduce((a,b)=>a+b,0) })),
    scenarios: scenarios.map(s => ({ type:s.type, label:s.label, roi:s.roi, npv:s.npv, irr:s.irr, payback:s.payback, totalCost:s.totalCost, totalBenefit:s.totalBenefit, revenueMultiplier:s.revenueMultiplier, costMultiplier:s.costMultiplier })),
    insights: { financial:roiAnalysis.aiInsights, market:roiAnalysis.marketInsights },
    narrative,
  }
}

async function generateReport(idea, roiAnalysis, scenarios, format) {
  const data = await buildReportData(idea, roiAnalysis, scenarios)
  const json = JSON.stringify(data, null, 2)
  const buffer = Buffer.from(json, 'utf-8')
  const safeName = (idea.title || 'Report').replace(/[^a-z0-9]/gi, '_').toLowerCase()
  return { buffer, filename:`${safeName}_data.json`, contentType:'application/json', size:buffer.length }
}

module.exports = { generateReport, buildReportData }
