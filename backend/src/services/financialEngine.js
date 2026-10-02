/**
 * IdeaBVA Financial Calculation Engine v4
 * ─────────────────────────────────────────
 * KEY FIX: Returns individual risk component scores (0-100 each)
 * so frontend can display DIFFERENT percentages for each risk category.
 *
 * Root cause of bug: frontend was computing (composite * weight / weight) = same %
 * Fix: engine returns { riskScore, riskComponents: { market, technology, financial, payback } }
 */

function calculateNPV(cashFlows, discountRate, initialInvestment) {
  let npv = -initialInvestment
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + discountRate, t + 1)
  }
  return npv
}

function calculateIRR(cashFlows, initialInvestment) {
  if (initialInvestment <= 0) return 0
  const allFlows = [-initialInvestment, ...cashFlows]
  let rate = 0.15
  for (let iter = 0; iter < 1000; iter++) {
    let npv = 0, dnpv = 0
    for (let t = 0; t < allFlows.length; t++) {
      const denom = Math.pow(1 + rate, t)
      npv  += allFlows[t] / denom
      if (t > 0) dnpv -= t * allFlows[t] / (denom * (1 + rate))
    }
    if (Math.abs(dnpv) < 1e-12) break
    const newRate = rate - npv / dnpv
    if (Math.abs(newRate - rate) < 0.000001) { rate = newRate; break }
    rate = Math.max(-0.99, Math.min(20, newRate))
  }
  return rate * 100
}

function calculatePaybackPeriod(annualNetCashFlow, initialInvestment) {
  if (annualNetCashFlow <= 0 || initialInvestment <= 0) return initialInvestment > 0 ? 99 : 0
  return initialInvestment / annualNetCashFlow
}

function calculateBCR(annualBenefit, annualCost, initialInvestment, discountRate, years) {
  let pvB = 0, pvC = initialInvestment
  for (let t = 1; t <= years; t++) {
    pvB += annualBenefit / Math.pow(1 + discountRate, t)
    pvC += annualCost    / Math.pow(1 + discountRate, t)
  }
  return pvC > 0 ? pvB / pvC : (annualBenefit > 0 ? 5 : 0)
}

function generateCashFlows(annualBenefit, annualCost, years, riskLevel, category) {
  const growthRates = {
    AI_ML: 0.15, ENERGY_SUSTAINABILITY: 0.08, INFRASTRUCTURE_TECH: 0.06,
    DATA_ANALYTICS: 0.12, PROCESS_AUTOMATION: 0.10, DIGITAL_TRANSFORMATION: 0.09, OTHER: 0.07,
  }
  const riskDiscounts = { LOW: 0.95, MEDIUM: 0.85, HIGH: 0.70 }
  const gr = growthRates[category] || 0.08
  const rd = riskDiscounts[riskLevel] || 0.85
  return Array.from({ length: years }, (_, i) => {
    return (annualBenefit * Math.pow(1 + gr, i) * rd) - (annualCost * Math.pow(1.03, i))
  })
}

/**
 * FIXED: Returns 4 independent component scores (each 0–100)
 * Each reflects different aspects — they will differ from each other.
 */
function calculateRiskComponents(roiRatio, npv, irr, riskLevel, paybackYears, projectLife, category) {

  // ── Component 1: Market Volatility (0–100) ────────────────────────────────
  // Driven by user riskLevel + category market uncertainty
  // LOW category + LOW risk → ~10-20%
  // HIGH category + HIGH risk → ~80-95%
  const marketBase = { LOW: 12, MEDIUM: 48, HIGH: 82 }
  const categoryMarketAdj = {
    AI_ML: +12, DIGITAL_TRANSFORMATION: +8, DATA_ANALYTICS: +5,
    PROCESS_AUTOMATION: +2, ENERGY_SUSTAINABILITY: -5, INFRASTRUCTURE_TECH: -8, OTHER: +10,
  }
  const marketScore = Math.min(99, Math.max(1,
    (marketBase[riskLevel] || 48) + (categoryMarketAdj[category] || 0)
  ))

  // ── Component 2: Technology Adoption (0–100) ──────────────────────────────
  // Driven by category maturity level + riskLevel modifier
  // AI/ML = hardest to adopt; Infrastructure = well-established
  const techBase = {
    AI_ML: 65, DATA_ANALYTICS: 48, DIGITAL_TRANSFORMATION: 55,
    PROCESS_AUTOMATION: 38, ENERGY_SUSTAINABILITY: 30, INFRASTRUCTURE_TECH: 18, OTHER: 42,
  }
  const techRiskAdj = { LOW: -18, MEDIUM: 0, HIGH: +22 }
  const technologyScore = Math.min(99, Math.max(1,
    (techBase[category] || 42) + (techRiskAdj[riskLevel] || 0)
  ))

  // ── Component 3: Financial Performance (0–100) ────────────────────────────
  // Based on ACTUAL computed ROI, NPV, IRR — different for every idea
  // Perfect financials → ~5-15% | Terrible financials → ~85-95%
  let financialScore = 50

  // ROI adjustment (strongest signal)
  if      (roiRatio >= 200) financialScore -= 35
  else if (roiRatio >= 100) financialScore -= 28
  else if (roiRatio >= 50)  financialScore -= 18
  else if (roiRatio >= 25)  financialScore -= 10
  else if (roiRatio >= 15)  financialScore -= 5
  else if (roiRatio >= 5)   financialScore += 5
  else if (roiRatio >= 0)   financialScore += 15
  else if (roiRatio >= -20) financialScore += 25
  else                       financialScore += 38

  // NPV adjustment
  if      (npv >= 5000000)  financialScore -= 15
  else if (npv >= 1000000)  financialScore -= 10
  else if (npv >= 100000)   financialScore -= 5
  else if (npv >= 0)        financialScore += 2
  else if (npv >= -500000)  financialScore += 12
  else                       financialScore += 22

  // IRR vs 10% hurdle
  if      (irr >= 30) financialScore -= 12
  else if (irr >= 20) financialScore -= 7
  else if (irr >= 10) financialScore += 0
  else if (irr >= 5)  financialScore += 10
  else                 financialScore += 20

  financialScore = Math.min(99, Math.max(1, Math.round(financialScore)))

  // ── Component 4: Policy / Regulatory (0–100) ──────────────────────────────
  // Based on industry compliance complexity + riskLevel
  // Energy/Infrastructure = higher regulatory burden
  const regulatoryBase = {
    ENERGY_SUSTAINABILITY: 55, INFRASTRUCTURE_TECH: 48, AI_ML: 38,
    DIGITAL_TRANSFORMATION: 32, DATA_ANALYTICS: 28, PROCESS_AUTOMATION: 25, OTHER: 35,
  }
  const regRiskAdj = { LOW: -20, MEDIUM: 0, HIGH: +18 }
  const regulatoryScore = Math.min(99, Math.max(1,
    (regulatoryBase[category] || 35) + (regRiskAdj[riskLevel] || 0)
  ))

  // ── Payback efficiency (for composite only, not shown separately) ──────────
  const paybackRatio = projectLife > 0 ? paybackYears / projectLife : 1
  let paybackScore
  if      (paybackRatio <= 0.20) paybackScore = 5
  else if (paybackRatio <= 0.40) paybackScore = 20
  else if (paybackRatio <= 0.60) paybackScore = 40
  else if (paybackRatio <= 0.80) paybackScore = 60
  else if (paybackRatio <= 1.00) paybackScore = 80
  else                            paybackScore = 95

  // Composite = weighted average of all 4 components
  const composite = Math.round(
    marketScore     * 0.30 +
    technologyScore * 0.25 +
    financialScore  * 0.25 +
    paybackScore    * 0.20
  )

  return {
    market:     Math.round(marketScore),
    technology: Math.round(technologyScore),
    financial:  Math.round(financialScore),
    regulatory: Math.round(regulatoryScore),
    payback:    Math.round(paybackScore),
    composite:  Math.min(99, Math.max(1, composite)),
  }
}

function determineGoNoGo(roiRatio, npv, irr, payback, projectLife, riskScore) {
  const passes = [
    npv > 0,
    roiRatio > 20,      // raised from 15 to 20 so not everything is GO
    irr > 12,           // raised from 10 to 12
    payback < projectLife * 0.55,  // tightened from 0.6
    riskScore < 50,     // tightened from 60
  ].filter(Boolean).length
  return passes >= 4 ? 'GO' : passes >= 2 ? 'CONDITIONAL' : 'NO_GO'
}

function computeFullAnalysis(idea, params) {
  const {
    projectLifeYears = 5, discountRate = 0.10,
    capex = 0, opex = 0, maintenanceCost = 0, developmentCost = 0,
    revenueGeneration = 0, efficiencyGains = 0, costSavings = 0,
  } = params

  // CRITICAL FIX: initialInvestment = capex + developmentCost from DETAILED user inputs
  // idea.investmentCost is only a rough estimate entered on the idea creation form.
  // The detailed ROI page inputs (capex, developmentCost) are the accurate values.
  // Using idea.investmentCost here caused all financial metrics to be wrong
  // (e.g. Rs.1,00,000 idea estimate used instead of Rs.13,62,233 actual CAPEX+Dev).
  const initialInvestment = (capex + developmentCost) > 0
    ? (capex + developmentCost)
    : parseFloat(idea.investmentCost) || 0
  const annualBenefit     = revenueGeneration + efficiencyGains + costSavings
  const annualCost        = opex + maintenanceCost
  const annualNetCashFlow = annualBenefit - annualCost

  const paybackPeriodYears = calculatePaybackPeriod(annualNetCashFlow, initialInvestment)
  const cashFlows          = generateCashFlows(annualBenefit, annualCost, projectLifeYears, idea.riskLevel, idea.category)
  const npv                = calculateNPV(cashFlows, discountRate, initialInvestment)
  const irr                = calculateIRR(cashFlows, initialInvestment)
  const bcr                = calculateBCR(annualBenefit, annualCost, initialInvestment, discountRate, projectLifeYears)
  const breakEvenYear      = calculatePaybackPeriod(annualNetCashFlow, initialInvestment)

  const totalBenefits   = annualBenefit * projectLifeYears
  const totalCosts      = initialInvestment + annualCost * projectLifeYears
  const roiRatio        = totalCosts > 0 ? ((totalBenefits - totalCosts) / totalCosts) * 100 : 0

  const shortTermRevenue = cashFlows.slice(0, 2).reduce((a, b) => a + b, 0)
  const longTermRevenue  = cashFlows.slice(2).reduce((a, b) => a + b, 0)
  const grossMargin      = totalBenefits > 0 ? ((totalBenefits - (capex + developmentCost + opex * projectLifeYears + maintenanceCost * projectLifeYears)) / totalBenefits) * 100 : 0
  const netProfitMargin  = totalBenefits > 0 ? (npv / totalBenefits) * 100 : 0

  // Get individual component scores
  const components = calculateRiskComponents(roiRatio, npv, irr, idea.riskLevel, paybackPeriodYears, projectLifeYears, idea.category)
  const riskScore  = components.composite

  const goNoGo = determineGoNoGo(roiRatio, npv, irr, paybackPeriodYears, projectLifeYears, riskScore)

  const r = v => Math.round(v * 100) / 100

  return {
    initialInvestment: r(initialInvestment),
    annualCashFlows:   cashFlows.map(r),
    discountRate, projectLifeYears,
    capex: r(capex), opex: r(opex), maintenanceCost: r(maintenanceCost), developmentCost: r(developmentCost),
    revenueGeneration: r(revenueGeneration), efficiencyGains: r(efficiencyGains), costSavings: r(costSavings),
    roiRatio: r(roiRatio), npv: r(npv), irr: r(irr),
    paybackPeriodYears: r(paybackPeriodYears),
    bcr: r(bcr), breakEvenYear: r(breakEvenYear),
    grossMargin: r(grossMargin), netProfitMargin: r(netProfitMargin),
    shortTermRevenue: r(shortTermRevenue), longTermRevenue: r(longTermRevenue),
    riskScore: r(riskScore),
    // Individual component scores for frontend display
    riskMarket:     components.market,
    riskTechnology: components.technology,
    riskFinancial:  components.financial,
    riskRegulatory: components.regulatory,
    riskPayback:    components.payback,
    goNoGo,
  }
}

function computeScenarios(idea, params) {
  const configs = [
    { type:'BEST_CASE',   label:'Best Case',   revenueMultiplier:1.30, costMultiplier:0.90, riskMultiplier:0.70 },
    { type:'MOST_LIKELY', label:'Most Likely', revenueMultiplier:1.00, costMultiplier:1.00, riskMultiplier:1.00 },
    { type:'WORST_CASE',  label:'Worst Case',  revenueMultiplier:0.70, costMultiplier:1.20, riskMultiplier:1.40 },
  ]
  return configs.map(cfg => {
    const adjParams = {
      ...params,
      revenueGeneration: (params.revenueGeneration || 0) * cfg.revenueMultiplier,
      efficiencyGains:   (params.efficiencyGains   || 0) * cfg.revenueMultiplier,
      costSavings:       (params.costSavings        || 0) * cfg.revenueMultiplier,
      opex:              (params.opex               || 0) * cfg.costMultiplier,
      maintenanceCost:   (params.maintenanceCost    || 0) * cfg.costMultiplier,
    }
    const m = computeFullAnalysis(idea, adjParams)
    const annualBenefit = adjParams.revenueGeneration + adjParams.efficiencyGains + adjParams.costSavings
    const annualCost    = adjParams.opex + adjParams.maintenanceCost
    return {
      ...cfg,
      roi: m.roiRatio, npv: m.npv, irr: m.irr, payback: m.paybackPeriodYears,
      totalCost:    m.initialInvestment + annualCost * (params.projectLifeYears || 5),
      totalBenefit: annualBenefit * (params.projectLifeYears || 5),
    }
  })
}

module.exports = { calculateNPV, calculateIRR, calculatePaybackPeriod, calculateBCR, computeFullAnalysis, computeScenarios }
