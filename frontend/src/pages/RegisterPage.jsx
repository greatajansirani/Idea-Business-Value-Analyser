import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '../context/authStore.js'

export default function RegisterPage() {
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' })
  const { register, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 8) { toast.error('Min 8 characters'); return }
    try { await register(form.name, form.email, form.password); toast.success('Account created!'); navigate('/dashboard') }
    catch (err) { toast.error(err.message) }
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'"DM Sans",sans-serif' }}>
      <div style={{ flex:'0 0 460px', background:'#1e1b4b', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'52px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ width:52, height:52, background:'#4F46E5', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}><span style={{ color:'#fff', fontWeight:800, fontSize:19 }}>IB</span></div>
          <h1 style={{ color:'#fff', fontSize:26, fontWeight:700, margin:0 }}>IdeaBVA</h1>
        </div>
        <div style={{ position:'relative', zIndex:1 }}>
          <h2 style={{ color:'#fff', fontSize:36, fontWeight:700, lineHeight:1.2, margin:'0 0 22px' }}>Quantify the value of every idea.</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[['ROI & Financial Analysis','ROI, NPV, IRR, Payback (computed output)'],['Scenario Analysis','Best, worst, most-likely projections'],['AI-Powered Insights','Groq Llama 3.3 generates insights'],['Export Reports','PDF, Excel, PowerPoint, Word']].map(([t,d]) => (
              <div key={t} style={{ display:'flex', gap:12 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#818CF8', marginTop:5, flexShrink:0 }} />
                <div><div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>{t}</div><div style={{ color:'rgba(255,255,255,0.45)', fontSize:12, marginTop:2 }}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
        <span style={{ color:'rgba(255,255,255,0.32)', fontSize:11, position:'relative', zIndex:1 }}>Larsen and Toubro Digital Energy Solutions</span>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.055) 1px,transparent 0)', backgroundSize:'32px 32px', pointerEvents:'none' }} />
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 40px', background:'#f8f8f5' }}>
        <div style={{ background:'#fff', borderRadius:22, padding:'44px', width:'100%', maxWidth:420, boxShadow:'0 4px 48px rgba(0,0,0,0.07)', border:'1px solid #ebebeb' }}>
          <h2 style={{ fontSize:22, fontWeight:700, color:'#111', margin:'0 0 6px' }}>Create account</h2>
          <p style={{ color:'#999', fontSize:13, margin:'0 0 24px' }}>Join your team workspace</p>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[['name','Full Name','text','Your full name'],['email','Email address','email','you@lntconstruction.com'],['password','Password','password','Min. 8 characters'],['confirm','Confirm Password','password','Repeat password']].map(([k,l,t,ph]) => (
              <div key={k} style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'#444' }}>{l}</label>
                <input type={t} value={form[k]} onChange={set(k)} placeholder={ph} required style={{ padding:'12px 14px', border:'1.5px solid #e8e8e8', borderRadius:10, fontSize:14, color:'#111', outline:'none', background:'#fafafa', fontFamily:'inherit' }} />
              </div>
            ))}
            <button type="submit" disabled={isLoading} style={{ padding:'13px', background:'#4F46E5', color:'#fff', border:'none', borderRadius:11, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginTop:4 }}>
              {isLoading ? 'Creating...' : 'Create account'}
            </button>
          </form>
          <p style={{ textAlign:'center', fontSize:13, color:'#999', marginTop:20 }}>Already have an account? <Link to="/login" style={{ color:'#4F46E5', fontWeight:600 }}>Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
