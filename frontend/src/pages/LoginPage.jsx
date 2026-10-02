import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '../context/authStore.js'

export default function LoginPage() {
  const [form, setForm] = useState({ email:'', password:'' })
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const handleSubmit = async e => {
    e.preventDefault()
    try { await login(form.email, form.password); toast.success('Welcome back!'); navigate('/dashboard') }
    catch (err) { toast.error(err.message) }
  }
  return (
    <div style={s.root}>
      <div style={s.left}>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={s.logo}><span style={{ color:'#fff', fontWeight:800, fontSize:19 }}>IB</span></div>
          <h1 style={s.brandName}>IdeaBVA</h1>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, margin:'4px 0 0' }}>Business Value Analyzer</p>
        </div>
        <div style={{ position:'relative', zIndex:1 }}>
          <h2 style={{ color:'#fff', fontSize:36, fontWeight:700, lineHeight:1.2, margin:'0 0 24px', letterSpacing:'-1px' }}>Quantify the value<br />of every idea.</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[['ROI and NPV and IRR and Payback Period (computed)'],['Best, Worst, Most-Likely Scenarios'],['Dynamic Visual Dashboards and Risk Heatmap'],['PDF, Excel, PowerPoint, Word Export'],['AI-Powered Analysis via Groq Llama 3.3']].map(([text]) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#818CF8', flexShrink:0 }} />
                <span style={{ color:'rgba(255,255,255,0.6)', fontSize:13 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <span style={{ color:'rgba(255,255,255,0.32)', fontSize:11, position:'relative', zIndex:1 }}>Larsen and Toubro Limited | Digital Energy Solutions | LNT Internal Use Only</span>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.055) 1px,transparent 0)', backgroundSize:'32px 32px', pointerEvents:'none' }} />
      </div>
      <div style={s.right}>
        <div style={s.card}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:30 }}>
            <div style={{ width:36, height:36, background:'#4F46E5', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'#fff', fontWeight:700, fontSize:13 }}>IB</span></div>
            <div><div style={{ fontSize:15, fontWeight:700, color:'#111' }}>IdeaBVA</div><div style={{ fontSize:11, color:'#aaa' }}>Business Value Analyzer</div></div>
          </div>
          <h2 style={{ fontSize:22, fontWeight:700, color:'#111', margin:'0 0 6px', letterSpacing:'-0.4px' }}>Sign in to your account</h2>
          <p style={{ color:'#999', fontSize:13, margin:'0 0 26px' }}>Welcome back. Enter your credentials to continue.</p>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div style={s.field}><label style={s.label}>Email address</label><input type="email" value={form.email} onChange={set('email')} placeholder="you@lntconstruction.com" required style={s.input} autoComplete="email" /></div>
            <div style={s.field}><label style={s.label}>Password</label><input type="password" value={form.password} onChange={set('password')} placeholder="Enter your password" required style={s.input} autoComplete="current-password" /></div>
            <button type="submit" disabled={isLoading} style={s.btn}>{isLoading ? 'Signing in...' : 'Sign in'}</button>
          </form>
          <p style={{ textAlign:'center', fontSize:13, color:'#999', marginTop:20 }}>New to IdeaBVA? <Link to="/register" style={{ color:'#4F46E5', fontWeight:600 }}>Create an account</Link></p>
          <div style={{ height:1, background:'#f0f0f0', margin:'22px 0 16px' }} />
          <p style={{ textAlign:'center', fontSize:11, color:'#ccc' }}>Larsen and Toubro | Digital Energy Solutions | LNT Internal Use Only</p>
        </div>
      </div>
    </div>
  )
}
const s = {
  root:     { display:'flex', minHeight:'100vh', fontFamily:'"DM Sans",sans-serif', background:'#f4f4f0' },
  left:     { flex:'0 0 460px', background:'#1e1b4b', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'52px', position:'relative', overflow:'hidden' },
  logo:     { width:52, height:52, background:'#4F46E5', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, boxShadow:'0 4px 16px rgba(79,70,229,0.4)' },
  brandName:{ color:'#fff', fontSize:26, fontWeight:700, margin:0, letterSpacing:'-0.5px' },
  right:    { flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 40px', background:'#f8f8f5' },
  card:     { background:'#fff', borderRadius:22, padding:'44px 44px 36px', width:'100%', maxWidth:420, boxShadow:'0 4px 48px rgba(0,0,0,0.07)', border:'1px solid #ebebeb' },
  field:    { display:'flex', flexDirection:'column', gap:6 },
  label:    { fontSize:12, fontWeight:600, color:'#444' },
  input:    { padding:'12px 14px', border:'1.5px solid #e8e8e8', borderRadius:10, fontSize:14, color:'#111', outline:'none', background:'#fafafa', fontFamily:'inherit' },
  btn:      { padding:'13px', background:'#4F46E5', color:'#fff', border:'none', borderRadius:11, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginTop:4 },
}
