import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ideasAPI, scenariosAPI } from '../services/api.js'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadarController, RadialLinearScale, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar, Line, Doughnut, Radar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadarController, RadialLinearScale, Title, Tooltip, Legend, Filler)

export default function VisualsPage() {
  const { id } = useParams()
  const [idea, setIdea]         = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([ideasAPI.get(id), scenariosAPI.get(id)])
      .then(([iR, sR]) => { setIdea(iR.data); setAnalysis(iR.data.roiAnalysis); setScenarios(sR.data.scenarios) })
      .catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'#888' }}>Loading visuals...</div>

  if (!analysis) return (
    <div style={{ padding:'36px 44px', fontFamily:'"DM Sans",sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'56px 40px', textAlign:'center', border:'1px dashed #ddd' }}>
        <h3 style={{ fontSize:17, fontWeight:600, color:'#333', margin:'0 0 8px' }}>No data yet</h3>
        <p style={{ fontSize:13, color:'#888', maxWidth:340, margin:'0 auto 22px' }}>Run evaluation first.</p>
        <Link to={`/ideas/${id}/roi`} style={{ padding:'10px 22px', background:'#4F46E5', color:'#fff', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:600 }}>Run Evaluation</Link>
      </div>
    </div>
  )

  const cashFlows    = Array.isArray(analysis.annualCashFlows) ? analysis.annualCashFlows : JSON.parse(analysis.annualCashFlows || '[]')
  const years        = cashFlows.map((_, i) => `Year ${i + 1}`)
  const cumulative   = cashFlows.reduce((acc, cf) => { acc.push((acc[acc.length - 1] || 0) + cf); return acc }, [])
  const paybackMonths = Math.round((analysis.paybackPeriodYears || 0) * 12)
  const rs = analysis.riskScore || 0

  // FIXED: Use individual component scores from engine (not derived from composite)
  // These come from the backend riskMarket, riskTechnology, riskFinancial, riskRegulatory fields
  const riskComponents = [
    {
      label:   'Market Volatility Risk',
      score:   analysis.riskMarket || 0,
      hint:    'Market adoption, competition & uncertainty',
      weight:  '30% weight',
    },
    {
      label:   'Technology Adoption Risk',
      score:   analysis.riskTechnology || 0,
      hint:    'Integration, maturity & rollout complexity',
      weight:  '25% weight',
    },
    {
      label:   'Financial / ROI Risk',
      score:   analysis.riskFinancial || 0,
      hint:    'NPV, IRR vs hurdle rate performance',
      weight:  '25% weight',
    },
    {
      label:   'Policy / Regulatory Risk',
      score:   analysis.riskRegulatory || 0,
      hint:    'Compliance & regulatory exposure',
      weight:  '20% weight',
    },
  ]

  // Efficiency score — how efficiently the investment generates returns
  const investmentUsed   = analysis.initialInvestment || 1
  const annualBenefit    = (analysis.revenueGeneration || 0) + (analysis.efficiencyGains || 0) + (analysis.costSavings || 0)
  const annualCost       = (analysis.opex || 0) + (analysis.maintenanceCost || 0)
  const annualNetCF      = annualBenefit - annualCost
  const returnPerRupee   = investmentUsed > 0 ? annualNetCF / investmentUsed : 0
  const efficiencyScore  = Math.min(100, Math.max(0, Math.round(returnPerRupee * 100)))

  const chartOpts = {
    responsive: true,
    plugins: { legend:{ display:false } },
    scales: { x:{ grid:{ display:false } }, y:{ grid:{ color:'#f0f0f0' } } },
  }

  return (
    <div style={{ padding:'36px 44px', maxWidth:1200, fontFamily:'"DM Sans",sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:22, fontSize:13 }}>
        <Link to="/dashboard" style={{ color:'#4F46E5', textDecoration:'none', fontWeight:500 }}>Dashboard</Link>
        <span style={{ color:'#ccc' }}>/</span>
        <Link to={`/ideas/${id}`} style={{ color:'#4F46E5', textDecoration:'none', fontWeight:500 }}>{idea?.title}</Link>
        <span style={{ color:'#ccc' }}>/</span>
        <span style={{ color:'#888' }}>Visuals</span>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:'#111', margin:0 }}>Visuals & Insights</h1>
          <p style={{ color:'#888', fontSize:13, margin:'5px 0 0' }}>Dynamic dashboards for financial and strategic metrics</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Link to={`/ideas/${id}/scenarios`} style={{ padding:'8px 14px', background:'#fff', color:'#333', border:'1.5px solid #ddd', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:500 }}>Scenarios</Link>
          <Link to={`/ideas/${id}/reports`}   style={{ padding:'8px 14px', background:'#fff', color:'#333', border:'1.5px solid #ddd', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:500 }}>Reports</Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        {[
          { l:'ROI',     v:`${analysis.roiRatio?.toFixed(1)}%`,          c:'#4F46E5' },
          { l:'NPV',     v:`Rs.${Number(analysis.npv||0).toLocaleString('en-IN')}`, c:analysis.npv>=0?'#10b981':'#ef4444' },
          { l:'IRR',     v:`${analysis.irr?.toFixed(1)}%`,                c:'#3b82f6' },
          { l:'Payback', v:`${paybackMonths} months`,                     c:'#f59e0b' },
          { l:'BCR',     v:analysis.bcr?.toFixed(2),                      c:'#8b5cf6' },
          { l:'Risk',    v:`${rs}%`,                                       c:rs<33?'#10b981':rs<66?'#f59e0b':'#ef4444' },
          { l:'Decision',v:(analysis.goNoGo||'—').replace('_',' '),       c:analysis.goNoGo==='GO'?'#10b981':analysis.goNoGo==='NO_GO'?'#ef4444':'#f59e0b' },
        ].map(k => (
          <div key={k.l} style={{ background:'#fff', borderRadius:12, padding:'10px 14px', border:'1px solid #eee', textAlign:'center', minWidth:80 }}>
            <div style={{ fontSize:9, color:'#aaa', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>{k.l}</div>
            <div style={{ fontSize:15, fontWeight:700, color:k.c, marginTop:2 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginBottom:18 }}>
        <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:16 }}>Annual Cash Flow</div>
          <Bar data={{ labels:years, datasets:[{ data:cashFlows, backgroundColor:cashFlows.map(v=>v>=0?'rgba(79,70,229,0.7)':'rgba(239,68,68,0.7)'), borderRadius:6 }] }} options={chartOpts} />
        </div>

        <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:16 }}>Cumulative Cash Flow</div>
          <Line data={{ labels:years, datasets:[{ data:cumulative, fill:true, borderColor:'#4F46E5', backgroundColor:'rgba(79,70,229,0.08)', tension:0.4, pointBackgroundColor:'#4F46E5' }] }} options={chartOpts} />
        </div>

        <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:16 }}>Cost Breakdown</div>
          <Doughnut
            data={{ labels:['CAPEX','OPEX/yr','Dev Cost','Maintenance/yr'], datasets:[{ data:[analysis.capex, analysis.opex, analysis.developmentCost, analysis.maintenanceCost], backgroundColor:['#4F46E5','#818CF8','#C7D2FE','#E0E7FF'], borderWidth:0 }] }}
            options={{ responsive:true, plugins:{ legend:{ position:'bottom', labels:{ font:{ family:'DM Sans' }, boxWidth:12, fontSize:11 } } } }}
          />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginBottom:18 }}>
        <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:16 }}>Strategic Performance Radar</div>
          <Radar data={{
            labels: ['ROI Score','NPV Score','IRR Score','Profitability','Low Risk','Payback Speed'],
            datasets: [{
              data: [
                Math.min(100, Math.max(0, analysis.roiRatio || 0)),
                analysis.npv > 0 ? Math.min(100, 50 + (analysis.npv / 1000000) * 5) : 10,
                Math.min(100, Math.max(0, analysis.irr || 0)),
                Math.min(100, Math.max(0, analysis.grossMargin || 0)),
                Math.min(100, Math.max(0, 100 - rs)),
                Math.min(100, Math.max(0, 100 - ((analysis.paybackPeriodYears || 5) / (analysis.projectLifeYears || 5)) * 100)),
              ],
              borderColor:'#4F46E5', backgroundColor:'rgba(79,70,229,0.15)', pointBackgroundColor:'#4F46E5', fill:true,
            }],
          }} options={{ responsive:true, plugins:{ legend:{ display:false } }, scales:{ r:{ min:0, max:100, grid:{ color:'#eee' }, ticks:{ display:false }, pointLabels:{ font:{ size:10, family:'DM Sans' } } } } }} />
        </div>

        {scenarios.length > 0 && (
          <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:16 }}>Scenario ROI Comparison</div>
            <Bar data={{ labels:scenarios.map(sc => sc.label), datasets:[{ data:scenarios.map(sc => sc.roi), backgroundColor:['rgba(16,185,129,0.75)','rgba(79,70,229,0.75)','rgba(239,68,68,0.75)'], borderRadius:8 }] }} options={chartOpts} />
          </div>
        )}

        <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:16 }}>Revenue Timeline</div>
          <Bar data={{ labels:['Short-term (Yr 1-2)','Long-term (Yr 3+)'], datasets:[{ data:[analysis.shortTermRevenue, analysis.longTermRevenue], backgroundColor:['rgba(79,70,229,0.75)','rgba(16,185,129,0.75)'], borderRadius:8 }] }} options={chartOpts} />
        </div>
      </div>

      {/* NEW: Project Efficiency & Insight Panel */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        {/* Efficiency Gauge */}
        <div style={{ background:'#fff', borderRadius:16, padding:'24px', border:'1px solid #eee' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:4 }}>Project Efficiency Score</div>
          <div style={{ fontSize:12, color:'#888', marginBottom:18 }}>Net return generated per rupee invested annually</div>

          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            {/* Circular gauge */}
            <div style={{ position:'relative', width:100, height:100, flexShrink:0 }}>
              <svg width="100" height="100" style={{ transform:'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f0f0f0" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none"
                  stroke={efficiencyScore>=70?'#10b981':efficiencyScore>=40?'#f59e0b':'#ef4444'}
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40 * Math.min(efficiencyScore,100) / 100} ${2 * Math.PI * 40}`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontSize:18, fontWeight:700, color:'#111' }}>{Math.min(efficiencyScore,100)}%</div>
              </div>
            </div>

            <div style={{ flex:1 }}>
              <div style={{ fontSize:22, fontWeight:700, color:'#111', marginBottom:4 }}>
                {efficiencyScore >= 70 ? 'High Efficiency' : efficiencyScore >= 40 ? 'Moderate Efficiency' : 'Low Efficiency'}
              </div>
              <div style={{ fontSize:12, color:'#666', lineHeight:1.6, marginBottom:12 }}>
                Annual Net Cash Flow: <strong>Rs.{Number(Math.round(annualNetCF)).toLocaleString('en-IN')}</strong><br />
                Per Rs.1 invested: <strong>Rs.{returnPerRupee.toFixed(2)}</strong> annual return
              </div>
              {[
                ['Annual Benefit',  `Rs.${Number(Math.round(annualBenefit)).toLocaleString('en-IN')}`],
                ['Annual Cost',     `Rs.${Number(Math.round(annualCost)).toLocaleString('en-IN')}`],
                ['Net Annual CF',   `Rs.${Number(Math.round(annualNetCF)).toLocaleString('en-IN')}`],
                ['Investment Used', `Rs.${Number(Math.round(investmentUsed)).toLocaleString('en-IN')}`],
              ].map(([l, v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0', borderBottom:'1px solid #f5f5f5' }}>
                  <span style={{ color:'#888' }}>{l}</span>
                  <span style={{ fontWeight:600, color:'#111' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Insights Panel */}
        <div style={{ background:'#fff', borderRadius:16, padding:'24px', border:'1px solid #eee' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:4 }}>Financial Insights</div>
          <div style={{ fontSize:12, color:'#888', marginBottom:16 }}>Key performance signals for this idea</div>

          {[
            {
              label:  'ROI vs Threshold (20%)',
              value:  analysis.roiRatio?.toFixed(1) + '%',
              pass:   (analysis.roiRatio || 0) > 20,
              hint:   (analysis.roiRatio || 0) > 20 ? `Exceeds 20% threshold by ${((analysis.roiRatio||0)-20).toFixed(1)}%` : `Below 20% threshold by ${(20-(analysis.roiRatio||0)).toFixed(1)}%`,
            },
            {
              label:  'IRR vs Hurdle Rate (10%)',
              value:  analysis.irr?.toFixed(1) + '%',
              pass:   (analysis.irr || 0) > 10,
              hint:   (analysis.irr || 0) > 10 ? `${((analysis.irr||0)-10).toFixed(1)}% above WACC` : `${(10-(analysis.irr||0)).toFixed(1)}% below WACC — value destruction risk`,
            },
            {
              label:  'NPV (Value Created)',
              value:  `Rs.${Number(Math.round(analysis.npv||0)).toLocaleString('en-IN')}`,
              pass:   (analysis.npv || 0) > 0,
              hint:   (analysis.npv || 0) > 0 ? 'Positive — idea creates value in today\'s money' : 'Negative — costs exceed benefits at 10% discount rate',
            },
            {
              label:  'Payback vs Project Life',
              value:  `${paybackMonths} months`,
              pass:   (analysis.paybackPeriodYears || 99) < (analysis.projectLifeYears || 5) * 0.55,
              hint:   `${(((analysis.paybackPeriodYears||5)/(analysis.projectLifeYears||5))*100).toFixed(0)}% of project life — ${(analysis.paybackPeriodYears||99)<(analysis.projectLifeYears||5)*0.55?'good recovery speed':'slow recovery'}`,
            },
            {
              label:  'BCR (Benefits vs Costs)',
              value:  analysis.bcr?.toFixed(2),
              pass:   (analysis.bcr || 0) > 1,
              hint:   (analysis.bcr || 0) > 1 ? `Rs.${analysis.bcr?.toFixed(2)} benefit per Re.1 cost` : 'Costs exceed benefits — reconsider scope',
            },
          ].map(item => (
            <div key={item.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid #f5f5f5' }}>
              <div style={{ width:20, height:20, borderRadius:'50%', background:item.pass?'#10b981':'#ef4444', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>{item.pass?'✓':'✗'}</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:'#555', fontWeight:500 }}>{item.label}</div>
                <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>{item.hint}</div>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:item.pass?'#10b981':'#ef4444', flexShrink:0 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FIXED Risk Heatmap — uses individual engine component scores */}
      <div style={{ background:'#fff', borderRadius:16, padding:'24px', border:'1px solid #eee', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>Risk Assessment Heatmap</div>
            <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Each component scored independently based on idea-specific data</div>
          </div>
          <div style={{ fontSize:13, fontWeight:600, color:rs<33?'#10b981':rs<66?'#f59e0b':'#ef4444' }}>
            Overall Risk: {rs}% — {rs<33?'Low':rs<66?'Medium':'High'}
          </div>
        </div>

        {rs === 0 ? (
          <div style={{ padding:'24px', textAlign:'center', color:'#aaa', fontSize:13 }}>Run evaluation first.</div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
              {riskComponents.map(({ label, score, hint, weight }) => {
                const color = score < 33 ? '#10b981' : score < 66 ? '#f59e0b' : '#ef4444'
                const level = score < 33 ? 'LOW' : score < 66 ? 'MEDIUM' : 'HIGH'
                return (
                  <div key={label}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <div>
                        <div style={{ fontSize:13, color:'#333', fontWeight:600 }}>{label}</div>
                        <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{hint}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:18, fontWeight:700, color }}>{score}%</div>
                        <div style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.3px' }}>{level}</div>
                      </div>
                    </div>
                    <div style={{ height:10, background:'#f0f0f0', borderRadius:5, overflow:'hidden' }}>
                      <div style={{ width:`${Math.max(score, 2)}%`, height:'100%', background:color, borderRadius:5, transition:'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize:10, color:'#aaa', marginTop:4 }}>{weight}</div>
                  </div>
                )
              })}
            </div>

            <div style={{ display:'flex', gap:20, marginTop:20, paddingTop:16, borderTop:'1px solid #f0f0f0' }}>
              {[['#10b981','Low Risk','0 - 33%'],['#f59e0b','Medium Risk','34 - 66%'],['#ef4444','High Risk','67 - 100%']].map(([c,l,r]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:12, height:12, borderRadius:3, background:c }} />
                  <div><div style={{ fontSize:12, fontWeight:600, color:'#333' }}>{l}</div><div style={{ fontSize:10, color:'#aaa' }}>{r}</div></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Payback info */}
      <div style={{ background:'#eef2ff', borderRadius:14, padding:'16px 20px', border:'1px solid #c7d7fc' }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#4F46E5', marginBottom:4 }}>
          Payback Period: {paybackMonths} months ({analysis.paybackPeriodYears?.toFixed(2)} years)
          — Investment: Rs.{Number(Math.round(analysis.initialInvestment||0)).toLocaleString('en-IN')}
          / Annual Net CF: Rs.{Number(Math.round(annualNetCF)).toLocaleString('en-IN')}
        </div>
        <div style={{ fontSize:12, color:'#666', lineHeight:1.6 }}>
          Formula: Payback = CAPEX + Development Cost / (Annual Benefits - Annual Costs). This is independent of project duration. [Brigham and Houston 16th Ed.]
        </div>
      </div>
    </div>
  )
}
