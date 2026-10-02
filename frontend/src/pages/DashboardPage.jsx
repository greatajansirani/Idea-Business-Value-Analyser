import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { dashboardAPI, ideasAPI } from '../services/api.js'
import useAuthStore from '../context/authStore.js'

const GO_CLR = { GO:'#10b981', NO_GO:'#ef4444', CONDITIONAL:'#f59e0b' }
const ST_CLR = { DRAFT:'#f59e0b', UNDER_REVIEW:'#3b82f6', APPROVED:'#10b981', REJECTED:'#ef4444', FINALIZED:'#8b5cf6' }

export default function DashboardPage() {
  const [data, setData]   = useState(null)
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([dashboardAPI.get(), ideasAPI.list({ limit:10 })])
      .then(([d,i]) => { setData(d.data); setIdeas(i.data.ideas) })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'#888', fontFamily:'"DM Sans",sans-serif' }}>Loading dashboard...</div>

  const sm = data?.summary || {}
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.trim().split(' ')[0] || 'there'

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>{greet}, {firstName}</h1>
          <p style={s.sub}>{user?.email} · {user?.role}</p>
        </div>
        <Link to="/ideas/new" style={s.newBtn}>+ New Idea</Link>
      </div>

      <div style={s.statsGrid}>
        {[
          { label:'Total Ideas',    val:sm.totalIdeas||0,                        color:'#4F46E5' },
          { label:'Avg ROI',        val:`${(sm.averageROI||0).toFixed(1)}%`,     color:'#10b981' },
          { label:'Avg NPV',        val:`Rs.${((sm.averageNPV||0)/1000).toFixed(0)}K`, color:'#3b82f6' },
          { label:'GO Decisions',   val:sm.byGoNoGo?.GO||0,                      color:'#10b981' },
          { label:'Avg Risk Score', val:`${(sm.averageRiskScore||0).toFixed(0)}%`, color:'#f59e0b' },
          { label:'Under Review',   val:sm.byStatus?.UNDER_REVIEW||0,            color:'#8b5cf6' },
        ].map(c => (
          <div key={c.label} style={s.stat}>
            <div style={{ ...s.statBar, background:c.color }} />
            <div style={s.statVal}>{c.val}</div>
            <div style={s.statLbl}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={s.section}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <h2 style={s.secTitle}>Your Ideas</h2>
          <span style={{ fontSize:11, color:'#aaa', background:'#f0f0f0', padding:'2px 8px', borderRadius:20 }}>{ideas.length}</span>
        </div>
        {ideas.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize:40, marginBottom:14 }}>💡</div>
            <div style={{ fontSize:17, fontWeight:600, color:'#333', marginBottom:8 }}>No ideas yet, {firstName}!</div>
            <div style={{ fontSize:13, color:'#888', maxWidth:340, margin:'0 auto 22px' }}>Create your first idea to start business value analysis</div>
            <Link to="/ideas/new" style={s.emptyBtn}>Create Idea</Link>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {ideas.map(idea => {
              const roi = idea.roiAnalysis
              return (
                <div key={idea.id} style={s.row} onClick={() => navigate(`/ideas/${idea.id}`)}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#111', marginBottom:5 }}>{idea.title}</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <span style={{ fontSize:11, fontWeight:500, padding:'2px 7px', borderRadius:6, background:'#eef2ff', color:'#4F46E5' }}>{idea.category?.replace(/_/g,' ')}</span>
                      <span style={{ fontSize:11, fontWeight:500, padding:'2px 7px', borderRadius:6, color:ST_CLR[idea.status]||'#888', background:'#f9f9f9' }}>{idea.status}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {roi ? (
                      <>
                        <div style={s.chip}><div style={s.chipLbl}>ROI</div><div style={s.chipVal}>{roi.roiRatio?.toFixed(1)}%</div></div>
                        <div style={s.chip}><div style={s.chipLbl}>NPV</div><div style={s.chipVal}>Rs.{((roi.npv||0)/1000).toFixed(0)}K</div></div>
                        <div style={s.chip}><div style={s.chipLbl}>RISK</div><div style={s.chipVal}>{roi.riskScore}%</div></div>
                        <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:6, background:(GO_CLR[roi.goNoGo]||'#888')+'22', color:GO_CLR[roi.goNoGo]||'#888' }}>{roi.goNoGo}</span>
                      </>
                    ) : <span style={{ fontSize:12, color:'#bbb', fontStyle:'italic' }}>Not evaluated</span>}
                  </div>
                  <span style={{ color:'#ccc', fontSize:16, marginLeft:8 }}>→</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  page:     { padding:'40px 48px', maxWidth:1100, fontFamily:'"DM Sans",sans-serif' },
  header:   { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:36 },
  title:    { fontSize:26, fontWeight:700, color:'#111', margin:0, letterSpacing:'-0.5px' },
  sub:      { color:'#888', fontSize:13, margin:'5px 0 0' },
  newBtn:   { padding:'10px 20px', background:'#4F46E5', color:'#fff', borderRadius:10, textDecoration:'none', fontSize:14, fontWeight:600 },
  statsGrid:{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:14, marginBottom:36 },
  stat:     { background:'#fff', borderRadius:14, padding:'18px 16px', border:'1px solid #eee', position:'relative', overflow:'hidden' },
  statBar:  { position:'absolute', top:0, left:0, right:0, height:3, borderRadius:'14px 14px 0 0' },
  statVal:  { fontSize:24, fontWeight:700, color:'#111', letterSpacing:'-0.5px' },
  statLbl:  { fontSize:11, color:'#888', marginTop:4 },
  section:  { marginBottom:32 },
  secTitle: { fontSize:17, fontWeight:600, color:'#111', margin:0 },
  row:      { display:'flex', alignItems:'center', gap:14, background:'#fff', border:'1px solid #eee', borderRadius:12, padding:'14px 18px', cursor:'pointer' },
  chip:     { background:'#f8f8f8', borderRadius:8, padding:'4px 10px', textAlign:'center' },
  chipLbl:  { fontSize:9, color:'#aaa', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' },
  chipVal:  { fontSize:12, fontWeight:700, color:'#111' },
  empty:    { background:'#fff', borderRadius:16, padding:'56px 40px', textAlign:'center', border:'1px dashed #ddd' },
  emptyBtn: { padding:'10px 22px', background:'#4F46E5', color:'#fff', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:600 },
}
