import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ideasAPI, analysisAPI } from '../services/api.js'

const GO_CLR = { GO:'#10b981', NO_GO:'#ef4444', CONDITIONAL:'#f59e0b' }

function stripEmojis(t) {
  if (!t) return ''
  return t.replace(/[\u{1F300}-\u{1F9FF}]/gu,'').replace(/[\u{2600}-\u{26FF}]/gu,'').replace(/[\u{2700}-\u{27BF}]/gu,'').replace(/[\u{1F600}-\u{1F64F}]/gu,'').replace(/[\u{1F680}-\u{1F6FF}]/gu,'').replace(/\*\*/g,'').replace(/\*/g,'').trim()
}

function MCard({ label, value, color='#4F46E5', sub, formula }) {
  const [showF, setShowF] = useState(false)
  return (
    <div style={{ background:'#fff', borderRadius:14, padding:'16px 14px', border:'1px solid #eee', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }} />
      <div style={{ fontSize:20, fontWeight:700, color:'#111', letterSpacing:'-0.5px' }}>{value}</div>
      <div style={{ fontSize:11, color:'#888', marginTop:3 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:'#bbb', marginTop:1 }}>{sub}</div>}
      {formula && (
        <>
          <button style={{ background:'none', border:'none', color:'#4F46E5', fontSize:9, cursor:'pointer', padding:'5px 0 0', fontFamily:'inherit' }} onClick={() => setShowF(v=>!v)}>{showF?'hide':'show formula'}</button>
          {showF && <div style={{ marginTop:5, padding:'7px 9px', background:'#f5f5f5', borderRadius:6, fontSize:9, color:'#555', lineHeight:1.5, borderLeft:'3px solid #4F46E5' }}>{formula}</div>}
        </>
      )}
    </div>
  )
}

export default function ROIPage() {
  const { id } = useParams()
  const [idea, setIdea]         = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [running, setRunning]   = useState(false)
  const [params, setParams] = useState({
    projectLifeYears:'', capex:'', opex:'', maintenanceCost:'', developmentCost:'',
    revenueGeneration:'', efficiencyGains:'', costSavings:''
  })

  useEffect(() => {
    ideasAPI.get(id)
      .then(r => { setIdea(r.data); if (r.data.roiAnalysis) setAnalysis(r.data.roiAnalysis) })
      .catch(() => toast.error('Failed to load'))
  }, [id])

  const setP = k => e => setParams(p => ({ ...p, [k]: e.target.value }))

  const handleRun = async () => {
    if (!params.capex && !params.revenueGeneration) { toast.error('Enter at least CAPEX and revenue values'); return }
    setRunning(true)
    try {
      const { data } = await analysisAPI.run(id, {
        projectLifeYears:  parseInt(params.projectLifeYears)   || 5,
        capex:             parseFloat(params.capex)             || 0,
        opex:              parseFloat(params.opex)              || 0,
        maintenanceCost:   parseFloat(params.maintenanceCost)   || 0,
        developmentCost:   parseFloat(params.developmentCost)   || 0,
        revenueGeneration: parseFloat(params.revenueGeneration) || 0,
        efficiencyGains:   parseFloat(params.efficiencyGains)   || 0,
        costSavings:       parseFloat(params.costSavings)       || 0,
      })
      setAnalysis(data.roiAnalysis)
      toast.success('Evaluation complete!')
    } catch (err) { toast.error(err.response?.data?.error || 'Evaluation failed') }
    finally { setRunning(false) }
  }

  const cashFlows     = analysis ? (Array.isArray(analysis.annualCashFlows) ? analysis.annualCashFlows : JSON.parse(analysis.annualCashFlows || '[]')) : []
  const paybackMonths = analysis ? Math.round((analysis.paybackPeriodYears || 0) * 12) : 0
  const rs            = analysis?.riskScore || 0

  // Use individual component scores stored in DB (not derived from composite)
  const riskComponents = analysis ? [
    { label:'Market Volatility',    score: analysis.riskMarket     || 0, hint:'Market adoption, competition & uncertainty',    weight:'30% weight' },
    { label:'Technology Adoption',  score: analysis.riskTechnology || 0, hint:'Integration, maturity & rollout complexity',    weight:'25% weight' },
    { label:'Financial / ROI',      score: analysis.riskFinancial  || 0, hint:'ROI, NPV, IRR vs 10% hurdle rate performance',  weight:'25% weight' },
    { label:'Policy / Regulatory',  score: analysis.riskRegulatory || 0, hint:'Compliance & regulatory exposure',              weight:'20% weight' },
  ] : []

  const inp = { padding:'9px 11px', border:'1.5px solid #e8e8e8', borderRadius:8, fontSize:13, color:'#111', background:'#fff', outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }

  if (!idea) return <div style={{ padding:60, textAlign:'center', color:'#888' }}>Loading...</div>

  return (
    <div style={{ padding:'36px 44px', maxWidth:1200, fontFamily:'"DM Sans",sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:22, fontSize:13 }}>
        <Link to="/dashboard" style={{ color:'#4F46E5', textDecoration:'none', fontWeight:500 }}>Dashboard</Link>
        <span style={{ color:'#ccc' }}>/</span>
        <Link to={`/ideas/${id}`} style={{ color:'#4F46E5', textDecoration:'none', fontWeight:500 }}>{idea.title}</Link>
        <span style={{ color:'#ccc' }}>/</span>
        <span style={{ color:'#888' }}>ROI & Financials</span>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:'#111', margin:0 }}>ROI & Financial Analysis</h1>
          <p style={{ color:'#888', fontSize:13, margin:'5px 0 0' }}>
            Investment = CAPEX + Development Cost. Payback = Investment / Annual Net Cash Flow.
          </p>
        </div>
        <Link to={`/ideas/${id}/scenarios`} style={{ padding:'9px 16px', background:'#fff', color:'#4F46E5', border:'1.5px solid #4F46E5', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:600 }}>View Scenarios</Link>
      </div>

      {/* Input Panel */}
      <div style={{ background:'#fff', borderRadius:16, padding:'26px', border:'1px solid #eee', marginBottom:24 }}>
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#333', marginBottom:12 }}>Project Parameters</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:4 }}>Project Life (years)</label>
              <input type="number" value={params.projectLifeYears} onChange={setP('projectLifeYears')} placeholder="e.g. 5" style={inp} min="1" max="20" />
              <div style={{ fontSize:10, color:'#bbb', marginTop:3 }}>Evaluation horizon (default: 5 yrs)</div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:4 }}>Return Rate (WACC)</label>
              <div style={{ padding:'9px 12px', background:'#f5f5f5', borderRadius:8, fontSize:13, color:'#888', border:'1.5px solid #eee' }}>10% (standard)</div>
              <div style={{ fontSize:10, color:'#bbb', marginTop:3 }}>Applied automatically</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#333', marginBottom:4 }}>
            Direct Costs (Rs.) <span style={{ fontSize:11, color:'#4F46E5', fontWeight:400 }}>— Initial Investment = CAPEX + Development Cost</span>
          </div>
          <div style={{ fontSize:11, color:'#ef4444', marginBottom:10, fontWeight:500 }}>
            Important: Enter the actual cost values here. These are used for all financial calculations.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[['capex','CAPEX','Capital expenditure (hardware, infrastructure)'],['developmentCost','Development Cost','Software development & integration'],['opex','OPEX per Year','Annual operating expenses'],['maintenanceCost','Maintenance per Year','Annual maintenance & support']].map(([k,l,h]) => (
              <div key={k}>
                <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:4 }}>{l}</label>
                <input type="number" value={params[k]} onChange={setP(k)} placeholder="0" style={inp} min="0" />
                <div style={{ fontSize:10, color:'#bbb', marginTop:3 }}>{h}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#333', marginBottom:4 }}>
            Annual Benefits (Rs.) <span style={{ fontSize:11, color:'#4F46E5', fontWeight:400 }}>— all values per year</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[['revenueGeneration','Revenue Generation','New revenue streams'],['efficiencyGains','Efficiency Gains','Productivity improvement'],['costSavings','Cost Savings','Operational savings']].map(([k,l,h]) => (
              <div key={k}>
                <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:4 }}>{l}</label>
                <input type="number" value={params[k]} onChange={setP(k)} placeholder="0" style={inp} min="0" />
                <div style={{ fontSize:10, color:'#bbb', marginTop:3 }}>{h}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleRun} disabled={running} style={{ padding:'13px', background:'#4F46E5', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', width:'100%', fontFamily:'inherit' }}>
          {running ? 'Running evaluation and generating AI insights...' : 'Run Full Evaluation'}
        </button>
      </div>

      {analysis && (
        <>
          {/* Decision Banner */}
          <div style={{ borderRadius:12, padding:'14px 22px', border:'1.5px solid', marginBottom:22, display:'flex', justifyContent:'space-between', alignItems:'center', background:(GO_CLR[analysis.goNoGo]||'#888')+'15', borderColor:(GO_CLR[analysis.goNoGo]||'#888')+'40' }}>
            <span style={{ fontSize:16, fontWeight:700, color:GO_CLR[analysis.goNoGo]||'#888' }}>
              Decision: {analysis.goNoGo?.replace('_',' ')}
            </span>
            <span style={{ fontSize:13, color:'#666' }}>
              Investment: <strong>Rs.{Number(analysis.initialInvestment||0).toLocaleString('en-IN')}</strong>
              &nbsp;·&nbsp; BCR: <strong>{analysis.bcr?.toFixed(2)}</strong>
              &nbsp;·&nbsp; Break-even: <strong>Year {analysis.breakEvenYear?.toFixed(1)}</strong>
            </span>
          </div>

          {/* Metric Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:14, marginBottom:20 }}>
            <MCard label="ROI" value={`${analysis.roiRatio?.toFixed(2)}%`} color="#4F46E5"
              formula="ROI = (Net Benefit / Total Cost) x 100  [CFA Institute; PMBOK 7th Ed.]" />
            <MCard label="NPV" value={`Rs.${Number(analysis.npv||0).toLocaleString('en-IN')}`} color={analysis.npv>=0?'#10b981':'#ef4444'}
              formula="NPV = SUM[CFt/(1+r)^t] - C0  [Brealey, Myers & Allen 13th Ed.]" />
            <MCard label="IRR" value={`${analysis.irr?.toFixed(2)}%`} color="#3b82f6"
              formula="IRR: rate where NPV=0 via Newton-Raphson  [Ross, Westerfield & Jordan]" />
            <MCard label="Payback Period" value={`${paybackMonths} months`} sub={`${analysis.paybackPeriodYears?.toFixed(2)} years`} color="#f59e0b"
              formula={`Payback = Initial Investment / Annual Net CF = Rs.${Number(analysis.initialInvestment||0).toLocaleString('en-IN')} / Rs.${Number(((analysis.revenueGeneration||0)+(analysis.efficiencyGains||0)+(analysis.costSavings||0)-(analysis.opex||0)-(analysis.maintenanceCost||0))).toLocaleString('en-IN')}  [Brigham & Houston 16th Ed.]`} />
            <MCard label="BCR" value={analysis.bcr?.toFixed(2)} sub="Accept if > 1" color="#8b5cf6"
              formula="BCR = PV(Benefits) / PV(Costs)  [HM Treasury Green Book]" />
            <MCard label="Risk Score" value={`${rs}%`} sub={rs<33?'Low Risk':rs<66?'Medium Risk':'High Risk'} color={rs<33?'#10b981':rs<66?'#f59e0b':'#ef4444'}
              formula="Weighted: Market(30%) + Technology(25%) + Financial(25%) + Payback(20%)" />
          </div>

          {/* Risk Breakdown — individual scores (all different) */}
          {riskComponents.length > 0 && riskComponents.some(c => c.score > 0) && (
            <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee', marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#111', marginBottom:4 }}>Risk Score Breakdown — Overall: {rs}%</div>
              <div style={{ fontSize:12, color:'#888', marginBottom:16 }}>Each component scored independently — different values reflect specific risk factors for this idea</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }}>
                {riskComponents.map(({ label, score, hint, weight }) => {
                  const color = score < 33 ? '#10b981' : score < 66 ? '#f59e0b' : '#ef4444'
                  const level = score < 33 ? 'Low' : score < 66 ? 'Medium' : 'High'
                  return (
                    <div key={label} style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:12, color:'#555', fontWeight:500 }}>{label}</span>
                        <span style={{ fontSize:14, fontWeight:700, color }}>{score}%</span>
                      </div>
                      <div style={{ height:9, background:'#f0f0f0', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:`${Math.max(score, 2)}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.4s' }} />
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10 }}>
                        <span style={{ color:'#aaa' }}>{hint}</span>
                        <span style={{ color, fontWeight:600 }}>{level}</span>
                      </div>
                      <div style={{ fontSize:9, color:'#ccc' }}>{weight}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop:16, padding:'10px 14px', background:'#f9f9f9', borderRadius:8, fontSize:12, color:'#666' }}>
                Composite = Market(30%) + Technology(25%) + Financial(25%) + Payback Efficiency(20%). Each component reflects different idea-specific risk factors.
              </div>
            </div>
          )}

          {/* Secondary metrics */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginBottom:20 }}>
            <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:14 }}>Profitability</div>
              {[
                ['Gross Margin',               `${analysis.grossMargin?.toFixed(1)}%`],
                ['Net Profit Margin',           `${analysis.netProfitMargin?.toFixed(1)}%`],
                ['Short-Term Revenue (Yr 1-2)', `Rs.${Number(analysis.shortTermRevenue||0).toLocaleString('en-IN')}`],
                ['Long-Term Revenue (Yr 3+)',   `Rs.${Number(analysis.longTermRevenue||0).toLocaleString('en-IN')}`],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f5f5', fontSize:13 }}>
                  <span style={{ color:'#666' }}>{l}</span><span style={{ fontWeight:600, color:'#111' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:14 }}>Cost Breakdown</div>
              <div style={{ padding:'8px 10px', background:'#fffbeb', borderRadius:6, fontSize:11, color:'#92400e', marginBottom:8 }}>
                Investment = CAPEX + Dev Cost = Rs.{Number((analysis.capex||0)+(analysis.developmentCost||0)).toLocaleString('en-IN')}
              </div>
              {[
                ['CAPEX',             analysis.capex],
                ['Dev Cost',          analysis.developmentCost],
                ['OPEX / Year',       analysis.opex],
                ['Maintenance / Year',analysis.maintenanceCost],
                ['Total Investment',  analysis.initialInvestment],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f5f5f5', fontSize:13 }}>
                  <span style={{ color:'#666' }}>{l}</span>
                  <span style={{ fontWeight: l==='Total Investment'?700:600, color:l==='Total Investment'?'#4F46E5':'#111' }}>Rs.{Number(v||0).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:14 }}>Annual Cash Flows</div>
              {cashFlows.map((cf, i) => {
                const cum = cashFlows.slice(0, i+1).reduce((a,b) => a+b, 0)
                return (
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'6px 0', borderBottom:'1px solid #f5f5f5', fontSize:12 }}>
                    <span style={{ color:'#888', width:46, flexShrink:0 }}>Year {i+1}</span>
                    <span style={{ fontWeight:600, flex:1, color:cf>=0?'#10b981':'#ef4444' }}>{cf>=0?'+':''}Rs.{Number(Math.round(cf)).toLocaleString('en-IN')}</span>
                    <span style={{ color:'#aaa', fontSize:10 }}>Rs.{Number(Math.round(cum)).toLocaleString('en-IN')}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Insights */}
          <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:14 }}>AI-Generated Insights (Groq Llama 3.3 70B)</div>
            {analysis.aiInsights ? (
              <>
                <div style={{ fontSize:11, fontWeight:700, color:'#4F46E5', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Financial Assessment</div>
                <p style={{ fontSize:13, color:'#444', lineHeight:1.8, margin:'0 0 16px', whiteSpace:'pre-line' }}>{stripEmojis(analysis.aiInsights)}</p>
              </>
            ) : (
              <div style={{ padding:'20px', background:'#f9f9f9', borderRadius:8, fontSize:13, color:'#888', textAlign:'center' }}>AI insights appear after running evaluation</div>
            )}
            {analysis.marketInsights && (
              <div style={{ paddingTop:16, borderTop:'1px solid #f0f0f0' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#10b981', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Market Insights</div>
                <p style={{ fontSize:13, color:'#444', lineHeight:1.8, margin:0 }}>{stripEmojis(analysis.marketInsights)}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
