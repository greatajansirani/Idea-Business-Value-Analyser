const express = require('express')
const router  = express.Router()
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { computeFullAnalysis, computeScenarios } = require('../services/financialEngine')
const aiService = require('../services/aiService')
const prisma = new PrismaClient()

router.post('/:ideaId/run', authenticate, async (req, res, next) => {
  try {
    const idea = await prisma.idea.findUnique({ where: { id: req.params.ideaId } })
    if (!idea) return res.status(404).json({ error: 'Idea not found' })

    const params = {
      projectLifeYears:  parseInt(req.body.projectLifeYears)   || 5,
      discountRate:      0.10,
      capex:             parseFloat(req.body.capex)             || 0,
      opex:              parseFloat(req.body.opex)              || 0,
      maintenanceCost:   parseFloat(req.body.maintenanceCost)   || 0,
      developmentCost:   parseFloat(req.body.developmentCost)   || 0,
      revenueGeneration: parseFloat(req.body.revenueGeneration) || 0,
      efficiencyGains:   parseFloat(req.body.efficiencyGains)   || 0,
      costSavings:       parseFloat(req.body.costSavings)       || 0,
    }

    // CRITICAL: initialInvestment = capex + developmentCost (NOT idea.investmentCost)
    const metrics = computeFullAnalysis(idea, params)

    let aiInsights = null, marketInsights = null
    try {
      const ins = await aiService.generateAnalysisInsights(idea, metrics)
      aiInsights     = ins.financial
      marketInsights = ins.market
    } catch (e) { console.warn('AI insights failed:', e.message) }

    // Save all fields including individual risk components
    const roiAnalysis = await prisma.roiAnalysis.upsert({
      where:  { ideaId: idea.id },
      update: {
        ...metrics,
        riskMarket:     metrics.riskMarket     || 0,
        riskTechnology: metrics.riskTechnology || 0,
        riskFinancial:  metrics.riskFinancial  || 0,
        riskRegulatory: metrics.riskRegulatory || 0,
        aiInsights, marketInsights,
      },
      create: {
        ideaId: idea.id, ...metrics,
        riskMarket:     metrics.riskMarket     || 0,
        riskTechnology: metrics.riskTechnology || 0,
        riskFinancial:  metrics.riskFinancial  || 0,
        riskRegulatory: metrics.riskRegulatory || 0,
        aiInsights, marketInsights,
      },
    })

    const scenarioData = computeScenarios(idea, params)
    await prisma.scenario.deleteMany({ where: { ideaId: idea.id } })
    await prisma.scenario.createMany({ data: scenarioData.map(s => ({ ...s, ideaId: idea.id })) })

    await prisma.idea.update({ where: { id: idea.id }, data: { status: 'UNDER_REVIEW' } })
    await prisma.auditLog.create({
      data: {
        ideaId: idea.id, userId: req.user.id, action: 'EVALUATION_RUN',
        details: {
          roi: metrics.roiRatio, npv: metrics.npv, goNoGo: metrics.goNoGo,
          riskScore: metrics.riskScore, paybackMonths: Math.round(metrics.paybackPeriodYears * 12),
          initialInvestment: metrics.initialInvestment,
          note: 'initialInvestment = capex + developmentCost (NOT idea.investmentCost)',
        },
        version: idea.version,
      },
    })

    const scenarios = await prisma.scenario.findMany({ where: { ideaId: idea.id } })
    res.json({ roiAnalysis, scenarios })
  } catch (e) { next(e) }
})

router.get('/:ideaId', authenticate, async (req, res, next) => {
  try {
    const [analysis, scenarios] = await Promise.all([
      prisma.roiAnalysis.findUnique({ where: { ideaId: req.params.ideaId } }),
      prisma.scenario.findMany({ where: { ideaId: req.params.ideaId } }),
    ])
    if (!analysis) return res.status(404).json({ error: 'No analysis found. Run evaluation first.' })
    res.json({ analysis, scenarios })
  } catch (e) { next(e) }
})

router.put('/:ideaId', authenticate, async (req, res, next) => {
  try {
    const allowed = ['aiInsights','marketInsights','goNoGo','riskScore']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const updated = await prisma.roiAnalysis.update({ where: { ideaId: req.params.ideaId }, data: updates })
    const idea = await prisma.idea.findUnique({ where: { id: req.params.ideaId } })
    await prisma.auditLog.create({ data: { ideaId: req.params.ideaId, userId: req.user.id, action: 'MANUAL_EDIT', details: { fields: Object.keys(updates) }, version: idea.version } })
    res.json(updated)
  } catch (e) { next(e) }
})

module.exports = router
