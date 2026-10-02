const https = require('https')

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL   = 'llama-3.3-70b-versatile'

function callGroq(messages, systemPrompt, maxTokens = 1024) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: GROQ_MODEL, max_tokens: maxTokens,
      messages: [...(systemPrompt ? [{ role:'system', content:systemPrompt }] : []), ...messages],
    })
    const req = https.request({
      hostname: 'api.groq.com', path: '/openai/v1/chat/completions', method: 'POST',
      headers: { 'Authorization':`Bearer ${GROQ_API_KEY}`, 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body) },
    }, res => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try { const p=JSON.parse(data); if(p.error) return reject(new Error(p.error.message)); resolve(p.choices?.[0]?.message?.content||'') }
        catch(e) { reject(e) }
      })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}

function stripEmojis(text) {
  if (!text) return ''
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu,'').replace(/[\u{2600}-\u{26FF}]/gu,'')
    .replace(/[\u{2700}-\u{27BF}]/gu,'').replace(/[\u{1F600}-\u{1F64F}]/gu,'')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu,'').replace(/\*\*/g,'').replace(/\*/g,'')
    .replace(/#{1,6} /g,'').trim()
}

async function generateAnalysisInsights(idea, metrics) {
  const paybackMonths = Math.round((metrics.paybackPeriodYears || 0) * 12)

  const prompt = `You are a Senior Business Value Analyst at Larsen and Toubro Digital Energy Solutions.
Write a professional assessment. Do NOT use emojis or markdown. Write in plain professional text only.
Respond ONLY as valid JSON: {"financial":"...","market":"..."}

IDEA: ${idea.title}
Category: ${(idea.category||'').replace(/_/g,' ')}
Description: ${idea.description}
Risk Level: ${idea.riskLevel}
Target Market: ${idea.targetMarket||'Not specified'}

COMPUTED FINANCIAL METRICS (do NOT use project duration as payback — use paybackPeriodYears below):
ROI: ${metrics.roiRatio?.toFixed(2)}%
NPV: Rs.${(metrics.npv||0).toLocaleString('en-IN')}
IRR: ${metrics.irr?.toFixed(2)}%
Payback Period: ${paybackMonths} months (${metrics.paybackPeriodYears?.toFixed(2)} years) — Formula: Investment / Annual Net CF
BCR: ${metrics.bcr?.toFixed(2)}
Risk Score: ${metrics.riskScore}%
Decision: ${metrics.goNoGo}
Short-term Revenue: Rs.${(metrics.shortTermRevenue||0).toLocaleString('en-IN')}
Long-term Revenue: Rs.${(metrics.longTermRevenue||0).toLocaleString('en-IN')}

For financial field: 3-4 sentences on the financial performance using these exact numbers. Then list exactly 3 risks as "Risk 1: ...", "Risk 2: ...", "Risk 3: ...". End with one recommendation sentence.
For market field: 2-3 sentences on market opportunity and competitive positioning.`

  try {
    const text = await callGroq([{ role:'user', content:prompt }], null, 900)
    const cleaned = text.replace(/```json|```/g,'').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      return { financial: stripEmojis(parsed.financial||cleaned), market: stripEmojis(parsed.market||'') }
    }
    return { financial: stripEmojis(cleaned), market: '' }
  } catch (e) {
    return {
      financial: `This idea demonstrates an ROI of ${metrics.roiRatio?.toFixed(1)}% with a Net Present Value of Rs.${(metrics.npv||0).toLocaleString('en-IN')} and an IRR of ${metrics.irr?.toFixed(1)}%, which ${(metrics.irr||0)>10?'exceeds':'is below'} the 10% hurdle rate. The payback period is ${paybackMonths} months (computed as Initial Investment divided by Annual Net Cash Flow). Risk Score: ${metrics.riskScore}%. Risk 1: Market adoption may be slower than projected. Risk 2: Implementation costs may exceed estimates. Risk 3: Regulatory changes could affect timeline. Recommendation: ${metrics.goNoGo==='GO'?'Proceed with phased implementation.':'Revise financial assumptions before proceeding.'}`,
      market: 'The target market presents significant growth opportunities for digital energy solutions. Competitive positioning depends on execution speed and technology differentiation.',
    }
  }
}

async function chatWithIdea(idea, roiAnalysis, scenarios, conversationHistory, userMessage) {
  const paybackMonths = Math.round((roiAnalysis?.paybackPeriodYears || 0) * 12)

  const systemPrompt = `You are IdeaBVA Assistant for Larsen and Toubro Digital Energy Solutions.
Do NOT use emojis or markdown. Write in plain professional text only.
IMPORTANT: Payback period = Initial Investment / Annual Net Cash Flow. It is NOT the project duration.

IDEA: ${idea.title}
Description: ${idea.description}

FINANCIAL RESULTS:
ROI: ${roiAnalysis?.roiRatio?.toFixed(2)||'N/A'}%
NPV: Rs.${(roiAnalysis?.npv||0).toLocaleString('en-IN')}
IRR: ${roiAnalysis?.irr?.toFixed(2)||'N/A'}%
Payback: ${paybackMonths} months (${roiAnalysis?.paybackPeriodYears?.toFixed(2)||'N/A'} years) = Investment / Annual Net CF
BCR: ${roiAnalysis?.bcr?.toFixed(2)||'N/A'}
Risk Score: ${roiAnalysis?.riskScore||'N/A'}%
Decision: ${roiAnalysis?.goNoGo||'Pending evaluation'}

SCENARIOS:
${scenarios?.map(s=>`${s.label}: ROI=${s.roi?.toFixed(1)}%, Payback=${Math.round((s.payback||0)*12)} months`).join('\n')||'Not computed'}`

  const messages = [
    ...conversationHistory.slice(-8).map(m => ({ role:m.role==='USER'?'user':'assistant', content:m.content })),
    { role:'user', content:userMessage },
  ]
  try {
    const response = await callGroq(messages, systemPrompt, 500)
    return stripEmojis(response)
  } catch (err) {
    throw new Error('AI assistant temporarily unavailable.')
  }
}

async function generateReportNarrative(idea, roiAnalysis, scenarios) {
  const paybackMonths = Math.round((roiAnalysis.paybackPeriodYears || 0) * 12)
  const prompt = `Write a professional 300-word executive summary for L&T. No emojis, no markdown.
Idea: ${idea.title}
ROI: ${roiAnalysis.roiRatio?.toFixed(2)}% | NPV: Rs.${(roiAnalysis.npv||0).toLocaleString('en-IN')} | IRR: ${roiAnalysis.irr?.toFixed(2)}% | Payback: ${paybackMonths} months | Decision: ${roiAnalysis.goNoGo}`
  try {
    const r = await callGroq([{ role:'user', content:prompt }], null, 800)
    return stripEmojis(r)
  } catch {
    return `Business Value Analysis: ${idea.title}. ROI: ${roiAnalysis.roiRatio?.toFixed(2)}%. Decision: ${roiAnalysis.goNoGo}`
  }
}

module.exports = { generateAnalysisInsights, chatWithIdea, generateReportNarrative }
