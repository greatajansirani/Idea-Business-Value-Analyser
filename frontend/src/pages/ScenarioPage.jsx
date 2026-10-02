import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ideasAPI, scenariosAPI } from '../services/api.js'

const SC = {
  BEST_CASE:   { color:'#10b981', bg:'#f0fdf4', border:'#86efac' },
  MOST_LIKELY: { color:'#4F46E5', bg:'#eef2ff', border:'#a5b4fc' },
  WORST_CASE:  { color:'#ef4444', bg:'#fef2f2', border:'#fca5a5' },
}
const SC_DESC = {
  BEST_CASE:   { heading:'Best Case Scenario', subtitle:'Optimistic projection — everything goes right', explanation:'Revenue is 30% higher than base case. Costs are 10% lower. Assumes fast market adoption, efficient execution, no major delays, and favorable regulatory conditions.', mult:'Revenue x1.30 | Costs x0.90' },
  MOST_LIKELY: { heading:'Most Likely Scenario', subtitle:'Realistic projection — base case estimate', explanation:'Revenue and costs match your entered values exactly. This represents the expected outcome based on current market conditions and realistic assumptions.', mult:'Revenue x1.00 | Costs x1.00 (Base)' },
  WORST_CASE:  { heading:'Worst Case Scenario', subtitle:'Pessimistic projection — significant headwinds', explanation:'Revenue is 30% lower than base case. Costs are 20% higher. Assumes slow adoption, delays, cost overruns, and competitive or regulatory challenges.', mult:'Revenue x0.70 | Costs x1.20' },
}

export default function ScenarioPage() {
  const { id } = useParams()
  const [idea, setIdea]           = useState(null)
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([ideasAPI.get(id), scenariosAPI.get(id)])
      .then(([iR, sR]) => { setIdea(iR.data); setScenarios(sR.data.scenarios) })
      .catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'#888' }}>Loading...</div>

  const best=scenarios.find(s=>s.type==='BEST_CASE'), likely=scenarios.find(s=>s.type==='MOST_LIKELY'), worst=scenarios.find(s=>s.type==='WORST_CASE')
  const ordered=[best,likely,worst].filter(Boolean)

  return (
    <div style={{ padding:'36px 44px', maxWidth:1100, fontFamily:'"DM Sans",sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:22, fontSize:13 }}>
        <Link to="/dashboard" style={{ color:'#4F46E5', textDecoration:'none', fontWeight:500 }}>Dashboard</Link>
        <span style={{ color:'#ccc' }}>/</span>
        <Link to={`/ideas/${id}`} style={{ color:'#4F46E5', textDecoration:'none', fontWeight:500 }}>{idea?.title}</Link>
        <span style={{ color:'#ccc' }}>/</span>
        <span style={{ color:'#888' }}>Scenario Analysis</span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:'#111', margin:0 }}>Scenario Analysis</h1>
          <p style={{ color:'#888', fontSize:13, margin:'5px 0 0' }}>Three financial projections: optimistic, realistic, and pessimistic outcomes</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Link to={`/ideas/${id}/roi`} style={{ padding:'8px 14px', background:'#fff', color:'#333', border:'1.5px solid #ddd', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:500 }}>ROI</Link>
          <Link to={`/ideas/${id}/visuals`} style={{ padding:'8px 14px', background:'#fff', color:'#333', border:'1.5px solid #ddd', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:500 }}>Visuals</Link>
        </div>
      </div>

      {scenarios.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:16, padding:'56px 40px', textAlign:'center', border:'1px dashed #ddd' }}>
          <div style={{ fontSize:36, marginBottom:14 }}>📊</div>
          <h3 style={{ fontSize:17, fontWeight:600, color:'#333', margin:'0 0 8px' }}>No scenarios yet</h3>
          <p style={{ fontSize:13, color:'#888', maxWidth:380, margin:'0 auto 22px' }}>Run an evaluation on the ROI page first.</p>
          <Link to={`/ideas/${id}/roi`} style={{ padding:'10px 22px', background:'#4F46E5', color:'#fff', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:600 }}>Run Evaluation</Link>
        </div>
      ) : (
        <>
          <div style={{ background:'#f8f8f8', borderRadius:12, padding:'14px 18px', marginBottom:22, border:'1px solid #eee' }}>
            <div style={{ fontWeight:600, color:'#333', marginBottom:4 }}>Scenario Methodology (AACE International Recommended Practices)</div>
            <div style={{ fontSize:12, color:'#555' }}>Three scenarios are computed from your base inputs. Each adjusts revenue and costs to model different market and execution outcomes.</div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginBottom:20 }}>
            {ordered.map(sc => {
              const st=SC[sc.type]||SC.MOST_LIKELY, desc=SC_DESC[sc.type]||{}
              const paybackMo=Math.round((sc.payback||0)*12)
              return (
                <div key={sc.type} style={{ borderRadius:16, padding:'22px', background:st.bg, border:`1.5px solid ${st.border}` }}>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:17, fontWeight:700, color:st.color, marginBottom:3 }}>{desc.heading}</div>
                    <div style={{ fontSize:12, color:st.color, fontWeight:500, opacity:0.85, marginBottom:8 }}>{desc.subtitle}</div>
                    <div style={{ fontSize:11, color:'#555', lineHeight:1.5, background:'rgba(255,255,255,0.6)', borderRadius:8, padding:'8px 10px', marginBottom:8 }}>{desc.explanation}</div>
                    <div style={{ fontSize:10, fontWeight:600, color:st.color, background:'rgba(255,255,255,0.5)', padding:'3px 8px', borderRadius:6, display:'inline-block' }}>{desc.mult}</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[['ROI',`${sc.roi?.toFixed(1)}%`],['NPV',`Rs.${((sc.npv||0)/1000).toFixed(0)}K`],['IRR',`${sc.irr?.toFixed(1)}%`],['Payback',`${paybackMo} months`]].map(([l,v]) => (
                      <div key={l} style={{ background:'rgba(255,255,255,0.75)', borderRadius:10, padding:'9px 12px' }}>
                        <div style={{ fontSize:9, color:'#888', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>{l}</div>
                        <div style={{ fontSize:16, fontWeight:700, color:st.color, marginTop:2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.55)', borderRadius:10, padding:'11px 14px', marginTop:14 }}>
                    <div><div style={{ fontSize:10, color:'#888' }}>Total Cost</div><div style={{ fontSize:13, fontWeight:700, color:'#111', marginTop:2 }}>Rs.{Number((sc.totalCost||0).toFixed(0)).toLocaleString('en-IN')}</div></div>
                    <div style={{ flex:1, textAlign:'center', color:'#ccc', fontSize:16 }}>→</div>
                    <div><div style={{ fontSize:10, color:'#888' }}>Total Benefit</div><div style={{ fontSize:13, fontWeight:700, color:st.color, marginTop:2 }}>Rs.{Number((sc.totalBenefit||0).toFixed(0)).toLocaleString('en-IN')}</div></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Comparison table */}
          <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee', marginBottom:18 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#111', marginBottom:16 }}>Side-by-Side Comparison</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Metric',...ordered.map(sc=>SC_DESC[sc.type]?.heading||sc.label)].map((h,i)=>(
                      <th key={i} style={{ padding:'10px 14px', fontSize:12, fontWeight:600, color:i===0?'#888':SC[ordered[i-1]?.type]?.color||'#888', borderBottom:'2px solid #f0f0f0', textAlign:i===0?'left':'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[['ROI (%)',sc=>`${sc.roi?.toFixed(2)}%`],['NPV (Rs.)',sc=>`Rs.${Number((sc.npv||0).toFixed(0)).toLocaleString('en-IN')}`],['IRR (%)',sc=>`${sc.irr?.toFixed(2)}%`],['Payback Period',sc=>`${Math.round((sc.payback||0)*12)} months`],['Total Cost',sc=>`Rs.${Number((sc.totalCost||0).toFixed(0)).toLocaleString('en-IN')}`],['Total Benefit',sc=>`Rs.${Number((sc.totalBenefit||0).toFixed(0)).toLocaleString('en-IN')}`]].map(([label,fmt]) => (
                    <tr key={label}>
                      <td style={{ padding:'10px 14px', fontSize:13, color:'#555', borderBottom:'1px solid #f5f5f5' }}>{label}</td>
                      {ordered.map(sc=><td key={sc.type} style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:'#111', borderBottom:'1px solid #f5f5f5', textAlign:'right' }}>{fmt(sc)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {best&&worst&&likely&&(
            <div style={{ background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#111', marginBottom:12 }}>ROI Range Analysis</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, marginBottom:10 }}>
                <span style={{ color:'#ef4444' }}>Worst: {worst.roi?.toFixed(1)}%</span>
                <span style={{ color:'#4F46E5' }}>Most Likely: {likely.roi?.toFixed(1)}%</span>
                <span style={{ color:'#10b981' }}>Best: {best.roi?.toFixed(1)}%</span>
              </div>
              <div style={{ height:12, background:'#f0f0f0', borderRadius:6, overflow:'hidden', display:'flex' }}>
                <div style={{ flex:1, background:'#ef4444' }} /><div style={{ flex:1.2, background:'#4F46E5' }} /><div style={{ flex:1, background:'#10b981' }} />
              </div>
              <p style={{ fontSize:13, color:'#666', margin:'12px 0 0', lineHeight:1.6 }}>
                Payback range: {Math.round((best.payback||0)*12)} months (best) to {Math.round((worst.payback||0)*12)} months (worst). NPV range: Rs.{Number((worst.npv||0).toFixed(0)).toLocaleString('en-IN')} to Rs.{Number((best.npv||0).toFixed(0)).toLocaleString('en-IN')}.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
