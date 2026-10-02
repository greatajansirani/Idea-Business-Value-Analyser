import React from 'react'
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom'
import useAuthStore from '../../context/authStore.js'
import toast from 'react-hot-toast'

const NAV = [
  { label:'Dashboard',        href:'/dashboard',      icon:'▣', section:'MAIN' },
  { label:'New Idea',         href:'/ideas/new',      icon:'+', section:'ANALYSIS' },
  { label:'ROI & Financials', ideaPath:'roi',         icon:'▲', section:'ANALYSIS' },
  { label:'Scenario Analysis',ideaPath:'scenarios',   icon:'◇', section:'ANALYSIS' },
  { label:'Visuals',          ideaPath:'visuals',     icon:'▶', section:'ANALYSIS' },
  { label:'Report Generation',ideaPath:'reports',     icon:'□', section:'OUTPUT' },
  { label:'ChatBot Q&A',      ideaPath:'chat',        icon:'●', section:'OUTPUT' },
]

function NavItem({ item, ideaId }) {
  const href = item.href || (ideaId && item.ideaPath ? `/ideas/${ideaId}/${item.ideaPath}` : null)
  const base = { display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, color:'rgba(255,255,255,0.6)', fontSize:13, textDecoration:'none', cursor: href ? 'pointer' : 'default' }
  if (!href) return <div style={{ ...base, opacity:0.28, pointerEvents:'none' }}><span style={{ fontSize:11, width:16, textAlign:'center' }}>{item.icon}</span>{item.label}</div>
  return (
    <NavLink to={href} style={({ isActive }) => ({ ...base, ...(isActive ? { background:'rgba(79,70,229,0.35)', color:'#fff', fontWeight:500 } : {}) })}>
      <span style={{ fontSize:11, width:16, textAlign:'center', opacity:0.8 }}>{item.icon}</span>
      {item.label}
    </NavLink>
  )
}

export default function Layout() {
  const { id: ideaId } = useParams()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const initials = user?.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'U'
  const sections = ['MAIN','ANALYSIS','OUTPUT']
  const sectionLabels = { ANALYSIS:'ANALYSIS', OUTPUT:'OUTPUT' }

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'"DM Sans",sans-serif', background:'#f5f5f2' }}>
      <aside style={{ width:224, background:'#1e1b4b', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, height:'100vh', overflowY:'auto', zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'18px 14px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ width:34, height:34, background:'#4F46E5', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:'#fff', fontWeight:700, fontSize:13 }}>IB</span>
          </div>
          <div>
            <div style={{ color:'#fff', fontSize:13, fontWeight:700 }}>IdeaBVA</div>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:9 }}>Business Value Analyzer</div>
          </div>
        </div>
        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2 }}>
          {sections.map(sec => {
            const items = NAV.filter(n => n.section === sec)
            return (
              <React.Fragment key={sec}>
                {sectionLabels[sec] && <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.28)', letterSpacing:'0.08em', padding:'12px 10px 3px', textTransform:'uppercase' }}>{sectionLabels[sec]}</div>}
                {items.map(item => <NavItem key={item.label} item={item} ideaId={ideaId} />)}
              </React.Fragment>
            )
          })}
        </nav>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'#4F46E5', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'#fff', fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10 }}>{user?.role}</div>
          </div>
          <button onClick={() => { logout(); toast.success('Signed out'); navigate('/login') }}
            style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontSize:15, padding:4 }} title="Sign out">↩</button>
        </div>
      </aside>
      <main style={{ marginLeft:224, flex:1, minHeight:'100vh', background:'#f5f5f2' }}>
        <Outlet />
      </main>
    </div>
  )
}
