import React, { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { chatAPI, ideasAPI } from '../services/api.js'
import useAuthStore from '../context/authStore.js'

const SUGGESTED = [
  'What is the ROI of this idea?',
  'How many months is the payback period?',
  'Is this a good investment?',
  'What are the main financial risks?',
  'Compare best case vs worst case scenario',
  'Explain the NPV result',
  'How does the IRR compare to the 10% hurdle rate?',
  'What is the break-even year?',
  'What cost savings can we expect?',
]

function stripEmojis(t) {
  if (!t) return ''
  return t.replace(/[\u{1F300}-\u{1F9FF}]/gu,'').replace(/[\u{2600}-\u{26FF}]/gu,'').replace(/[\u{1F600}-\u{1F64F}]/gu,'').replace(/[\u{1F680}-\u{1F6FF}]/gu,'').replace(/\*\*/g,'').replace(/\*/g,'').trim()
}

export default function ChatPage() {
  const { id } = useParams()
  const user = useAuthStore(s => s.user)
  const [idea, setIdea]       = useState(null)
  const [msgs, setMsgs]       = useState([])
  const [input, setInput]     = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    Promise.all([ideasAPI.get(id), chatAPI.history(id)])
      .then(([iR,cR]) => { setIdea(iR.data); setMsgs(cR.data.messages) })
      .catch(() => toast.error('Failed to load chat')).finally(() => setLoading(false))
  }, [id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || sending) return
    setInput(''); setSending(true)
    const temp = { id:'tmp', role:'USER', content:msg, createdAt:new Date().toISOString() }
    setMsgs(m => [...m, temp])
    try {
      const { data } = await chatAPI.send(id, msg)
      setMsgs(m => [...m.filter(x=>x.id!=='tmp'), { ...temp, id:'u_'+Date.now() }, data.message])
    } catch (err) {
      setMsgs(m => m.filter(x=>x.id!=='tmp'))
      toast.error(err.response?.data?.error||'Failed to send')
    } finally { setSending(false) }
  }

  const handleClear = async () => {
    if (!window.confirm('Clear all chat messages?')) return
    await chatAPI.clear(id); setMsgs([]); toast.success('Chat cleared')
  }

  const initials = user?.name?.charAt(0)?.toUpperCase() || 'U'
  const roi = idea?.roiAnalysis
  const paybackMonths = roi ? Math.round((roi.paybackPeriodYears||0)*12) : null

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'#888' }}>Loading chat...</div>

  return (
    <div style={{ padding:'36px 44px', maxWidth:1200, fontFamily:'"DM Sans",sans-serif', height:'100vh', display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:18, fontSize:13, flexShrink:0 }}>
        <Link to="/dashboard" style={{ color:'#4F46E5', textDecoration:'none', fontWeight:500 }}>Dashboard</Link>
        <span style={{ color:'#ccc' }}>/</span>
        <Link to={`/ideas/${id}`} style={{ color:'#4F46E5', textDecoration:'none', fontWeight:500 }}>{idea?.title}</Link>
        <span style={{ color:'#ccc' }}>/</span>
        <span style={{ color:'#888' }}>ChatBot Q&A</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 290px', gap:18, flex:1, minHeight:0 }}>
        {/* Chat panel */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eee', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid #f0f0f0', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, background:'#4F46E5', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🤖</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#111' }}>IdeaBVA Assistant</div>
                <div style={{ fontSize:11, color:'#888' }}>AI analyst for: {idea?.title}</div>
              </div>
            </div>
            {msgs.length > 0 && <button onClick={handleClear} style={{ padding:'5px 12px', background:'#fee2e2', color:'#ef4444', border:'none', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Clear</button>}
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'18px', display:'flex', flexDirection:'column', gap:14 }}>
            {msgs.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 20px' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🤖</div>
                <h3 style={{ fontSize:17, fontWeight:600, color:'#111', margin:'0 0 10px' }}>IdeaBVA Assistant</h3>
                <p style={{ fontSize:13, color:'#666', lineHeight:1.7, maxWidth:380, margin:'0 auto' }}>
                  Ask me anything about <strong>{idea?.title}</strong> — financial performance, ROI, payback period (in months), risks, scenarios.
                  {!roi && ' Run an evaluation first for the most accurate answers.'}
                </p>
              </div>
            )}
            {msgs.map((msg, i) => {
              const isUser = msg.role === 'USER'
              return (
                <div key={msg.id||i} style={{ display:'flex', gap:10, justifyContent:isUser?'flex-end':'flex-start', alignItems:'flex-end' }}>
                  {!isUser && <div style={{ width:30, height:30, background:'#4F46E5', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginBottom:4 }}><span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>AI</span></div>}
                  <div style={{ maxWidth:'72%', borderRadius:14, padding:'11px 14px', wordBreak:'break-word', ...(isUser ? { background:'#4F46E5', color:'#fff', borderBottomRightRadius:4 } : { background:'#f5f5f5', color:'#111', borderBottomLeftRadius:4 }) }}>
                    <div style={{ fontSize:13, lineHeight:1.65, whiteSpace:'pre-wrap' }}>{isUser ? msg.content : stripEmojis(msg.content)}</div>
                    <div style={{ fontSize:10, opacity:0.55, marginTop:4 }}>{new Date(msg.createdAt||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  {isUser && <div style={{ width:30, height:30, background:'#e5e7eb', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, fontWeight:600, color:'#555', marginBottom:4 }}>{initials}</div>}
                </div>
              )
            })}
            {sending && (
              <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                <div style={{ width:30, height:30, background:'#4F46E5', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>AI</span></div>
                <div style={{ background:'#f5f5f5', borderRadius:14, padding:'11px 14px', borderBottomLeftRadius:4 }}>
                  <div style={{ display:'flex', gap:4 }}>
                    {[0,0.2,0.4].map(d => <div key={d} style={{ width:8, height:8, background:'#aaa', borderRadius:'50%', animation:`bounce 1.4s ${d}s infinite` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ display:'flex', gap:10, padding:'14px 18px', borderTop:'1px solid #f0f0f0', alignItems:'flex-end', flexShrink:0 }}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }} placeholder="Ask about ROI, payback period, risk, scenarios..." rows={2} disabled={sending} style={{ flex:1, padding:'10px 12px', border:'1.5px solid #e8e8e8', borderRadius:12, fontSize:13, resize:'none', outline:'none', fontFamily:'inherit', background:'#fafafa' }} />
            <button onClick={()=>send()} disabled={!input.trim()||sending} style={{ width:40, height:40, background:'#4F46E5', color:'#fff', border:'none', borderRadius:12, fontSize:18, cursor:'pointer', opacity:!input.trim()||sending?0.45:1, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>↑</button>
          </div>
          <div style={{ padding:'0 18px 10px', fontSize:10, color:'#bbb' }}>Enter to send · Shift+Enter for new line</div>
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:'18px', border:'1px solid #eee' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#111', marginBottom:12 }}>Suggested Questions</div>
            {SUGGESTED.map(q => (
              <button key={q} onClick={()=>send(q)} disabled={sending} style={{ display:'block', width:'100%', padding:'8px 11px', background:'#f9f9f9', border:'1px solid #eee', borderRadius:8, fontSize:12, color:'#444', cursor:'pointer', textAlign:'left', lineHeight:1.4, marginBottom:6, fontFamily:'inherit' }}>{q}</button>
            ))}
          </div>
          {roi ? (
            <div style={{ background:'#fff', borderRadius:14, padding:'18px', border:'1px solid #eee' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#111', marginBottom:12 }}>Quick Stats</div>
              {[['ROI',`${roi.roiRatio?.toFixed(1)}%`],['NPV',`Rs.${Number(roi.npv||0).toLocaleString('en-IN')}`],['IRR',`${roi.irr?.toFixed(1)}%`],['Payback',paybackMonths?`${paybackMonths} months`:'—'],['Risk Score',`${roi.riskScore}%`],['Decision',(roi.goNoGo||'—').replace('_',' ')]].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f5f5f5', fontSize:13 }}>
                  <span style={{ color:'#888' }}>{l}</span>
                  <span style={{ fontWeight:600, color:'#4F46E5' }}>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background:'#fff', borderRadius:14, padding:'18px', border:'1px solid #eee' }}>
              <div style={{ fontSize:13, color:'#92400e', lineHeight:1.6 }}>No evaluation yet. <Link to={`/ideas/${id}/roi`} style={{ color:'#4F46E5', fontWeight:600 }}>Run it</Link> for richer AI answers.</div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
    </div>
  )
}
