import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ideasAPI } from '../services/api.js'

const GO_CLR = { GO:'#10b981', NO_GO:'#ef4444', CONDITIONAL:'#f59e0b' }
const ST_CLR = { DRAFT:'#f59e0b', UNDER_REVIEW:'#3b82f6', APPROVED:'#10b981', REJECTED:'#ef4444', FINALIZED:'#8b5cf6' }

export default function IdeaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [idea, setIdea]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ideasAPI.get(id)
      .then(r => setIdea(r.data))
      .catch(() => { toast.error('Idea not found'); navigate('/dashboard') })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={s.loading}>Loading...</div>
  if (!idea) return null

  const roi = idea.roiAnalysis
  const paybackMonths = roi ? Math.round((roi.paybackPeriodYears || 0) * 12) : null

  return (
    <div style={s.page}>
      <div style={s.bc}>
        <Link to="/dashboard" style={s.bl}>Dashboard</Link>
        <span style={s.sep}>/</span>
        <span style={{ color:'#888' }}>{idea.title}</span>
      </div>
      <div style={s.header}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <h1 style={s.title}>{idea.title}</h1>
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:(ST_CLR[idea.status]||'#888')+'22', color:ST_CLR[idea.status]||'#888' }}>{idea.status}</span>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, background:'#eef2ff', color:'#4F46E5', padding:'2px 8px', borderRadius:6, fontWeight:500 }}>{idea.category?.replace(/_/g,' ')}</span>
            <span style={{ fontSize:12, color:'#888' }}>Risk: {idea.riskLevel}</span>
            <span style={{ fontSize:12, color:'#888' }}>v{idea.version}</span>
            {idea.paybackTimeline && <span style={{ fontSize:12, color:'#888' }}>Project Duration: {idea.paybackTimeline}</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Link to={`/ideas/${id}/roi`} style={s.primaryBtn}>{roi ? 'View Analysis' : 'Run Evaluation'}</Link>
          <Link to={`/ideas/${id}/reports`} style={s.secondaryBtn}>Export Report</Link>
          <Link to={`/ideas/${id}/chat`} style={s.secondaryBtn}>ChatBot</Link>
        </div>
      </div>

      <div style={s.grid}>
        <div style={{ ...s.card, gridColumn:'1 / -1' }}>
          <h3 style={s.cardTitle}>Description</h3>
          <p style={{ fontSize:14, color:'#555', lineHeight:1.7, margin:0 }}>{idea.description}</p>
          {idea.targetMarket && <div style={s.infoBox}><strong>Target Market:</strong> {idea.targetMarket}</div>}
          {idea.userExpectation && <div style={s.infoBox}><strong>User Expectation:</strong> {idea.userExpectation}</div>}
        </div>

        <div style={s.card}>
          <h3 style={s.cardTitle}>Investment Overview</h3>
          {[['Investment Cost',`Rs.${Number(idea.investmentCost).toLocaleString('en-IN')}`],['Expected Annual Benefit',`Rs.${Number(idea.expectedBenefit).toLocaleString('en-IN')}`],['Expected Project Duration',idea.paybackTimeline||'Not specified'],['Risk Level',idea.riskLevel],['Category',(idea.category||'').replace(/_/g,' ')]].map(([l,v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f5f5', fontSize:13 }}>
              <span style={{ color:'#666' }}>{l}</span><span style={{ fontWeight:600, color:'#111' }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop:12, padding:'10px 12px', background:'#f0f4ff', borderRadius:8, fontSize:12, color:'#4F46E5' }}>
            Payback period is a <strong>computed output</strong> = Investment / Annual Net Cash Flow
          </div>
        </div>

        {roi ? (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Analysis Results (Computed Outputs)</h3>
            {[
              ['ROI',          `${roi.roiRatio?.toFixed(2)}%`],
              ['NPV',          `Rs.${Number(roi.npv||0).toLocaleString('en-IN')}`],
              ['IRR',          `${roi.irr?.toFixed(2)}%`],
              ['Payback Period',`${paybackMonths} months (${roi.paybackPeriodYears?.toFixed(2)} yrs) = Investment / Annual CF`],
              ['BCR',          roi.bcr?.toFixed(2)],
              ['Break-Even Year',`Year ${roi.breakEvenYear?.toFixed(1)}`],
              ['Risk Score',   `${roi.riskScore}%`],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f5f5', fontSize:13 }}>
                <span style={{ color:'#666' }}>{l}</span><span style={{ fontWeight:600, color:'#4F46E5' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:14, padding:'11px 16px', borderRadius:10, textAlign:'center', fontWeight:700, fontSize:15, background:(GO_CLR[roi.goNoGo]||'#888')+'18', color:GO_CLR[roi.goNoGo]||'#888', border:`1.5px solid ${GO_CLR[roi.goNoGo]||'#888'}40` }}>
              Decision: {roi.goNoGo?.replace('_',' ')}
            </div>
          </div>
        ) : (
          <div style={{ ...s.card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', textAlign:'center' }}>
            <span style={{ fontSize:40, marginBottom:12 }}>📊</span>
            <div style={{ fontSize:16, fontWeight:600, color:'#333', marginBottom:8 }}>No analysis yet</div>
            <p style={{ fontSize:13, color:'#888', maxWidth:280, lineHeight:1.6, marginBottom:20 }}>Run evaluation to compute ROI, NPV, IRR, payback period, risk score, and AI insights.</p>
            <Link to={`/ideas/${id}/roi`} style={s.primaryBtn}>Run Evaluation</Link>
          </div>
        )}

        <div style={{ ...s.card, gridColumn:'1 / -1' }}>
          <h3 style={s.cardTitle}>Analysis Modules</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
            {[['roi','ROI & Financials','NPV · IRR · Payback (months) · BCR'],['scenarios','Scenario Analysis','Best · Worst · Most Likely'],['visuals','Visuals & Charts','Dashboards & risk heatmap'],['reports','Report Generation','PDF · Excel · PowerPoint · Word'],['chat','ChatBot Q&A','AI assistant for this idea']].map(([href,label,desc]) => (
              <Link key={href} to={`/ideas/${id}/${href}`} style={{ background:'#f9f9f9', borderRadius:12, padding:'16px', textDecoration:'none', border:'1px solid #eee' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:11, color:'#aaa' }}>{desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {idea.auditLogs?.length > 0 && (
          <div style={{ ...s.card, gridColumn:'1 / -1' }}>
            <h3 style={s.cardTitle}>Audit Trail</h3>
            {idea.auditLogs.slice(0,8).map(log => (
              <div key={log.id} style={{ display:'flex', gap:14, alignItems:'center', padding:'7px 12px', background:'#f9f9f9', borderRadius:8, fontSize:12, marginBottom:4 }}>
                <span style={{ fontWeight:600, color:'#4F46E5', flex:1 }}>{log.action}</span>
                <span style={{ color:'#555' }}>{log.user?.name}</span>
                <span style={{ color:'#aaa' }}>{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                <span style={{ background:'#eee', padding:'1px 6px', borderRadius:4, color:'#666' }}>v{log.version}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
const s = {
  page:       { padding:'36px 44px', maxWidth:1100, fontFamily:'"DM Sans",sans-serif' },
  loading:    { padding:60, textAlign:'center', color:'#888' },
  bc:         { display:'flex', alignItems:'center', gap:6, marginBottom:22, fontSize:13 },
  bl:         { color:'#4F46E5', textDecoration:'none', fontWeight:500 },
  sep:        { color:'#ccc' },
  header:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, gap:20, flexWrap:'wrap' },
  title:      { fontSize:24, fontWeight:700, color:'#111', margin:0, letterSpacing:'-0.5px' },
  primaryBtn: { padding:'9px 18px', background:'#4F46E5', color:'#fff', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:600 },
  secondaryBtn:{ padding:'9px 14px', background:'#fff', color:'#333', border:'1.5px solid #ddd', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:500 },
  grid:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 },
  card:       { background:'#fff', borderRadius:16, padding:'22px', border:'1px solid #eee' },
  cardTitle:  { fontSize:14, fontWeight:600, color:'#111', margin:'0 0 14px' },
  infoBox:    { fontSize:13, color:'#555', padding:'9px 12px', background:'#f9f9f9', borderRadius:8, marginTop:10, lineHeight:1.6 },
}
