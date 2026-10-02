import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ideasAPI } from '../services/api.js'

const CATEGORIES = [
  {value:'AI_ML',label:'AI & Machine Learning'},{value:'ENERGY_SUSTAINABILITY',label:'Energy & Sustainability'},
  {value:'INFRASTRUCTURE_TECH',label:'Infrastructure Tech'},{value:'DATA_ANALYTICS',label:'Data Analytics'},
  {value:'PROCESS_AUTOMATION',label:'Process Automation'},{value:'DIGITAL_TRANSFORMATION',label:'Digital Transformation'},
  {value:'OTHER',label:'Other'},
]
const TARGET_MARKETS = [
  'Power Transmission & Distribution Utilities','State Electricity Boards (SEBs)','Grid Operators & ISOs',
  'Renewable Energy Developers','Independent Power Producers (IPPs)','Smart City Projects',
  'Industrial & Manufacturing Plants','EV Charging Infrastructure Operators','Oil & Gas Sector',
  'Railway Electrification','Government & Public Sector','Private Distribution Companies','Other',
]
const DURATIONS = [
  {value:'6 months',label:'6 months'},{value:'1 year',label:'1 year (12 months)'},
  {value:'18 months',label:'18 months'},{value:'2 years',label:'2 years (24 months)'},
  {value:'3 years',label:'3 years (36 months)'},{value:'4 years',label:'4 years (48 months)'},
  {value:'5 years',label:'5 years (60 months)'},
]

export default function NewIdeaPage() {
  const navigate = useNavigate()
  const [saving, setSaving]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showCatDrop, setShowCatDrop] = useState(false)
  const [showMktDrop, setShowMktDrop] = useState(false)
  const [form, setForm] = useState({
    title:'', category:'', description:'', targetMarket:'',
    investmentCost:'', expectedBenefit:'', projectDuration:'',
    riskLevel:'MEDIUM', userExpectation:'',
  })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const selectedCat = CATEGORIES.find(c => c.value === form.category)

  const buildPayload = () => ({
    ...form,
    investmentCost:  parseFloat(form.investmentCost)  || 0,
    expectedBenefit: parseFloat(form.expectedBenefit) || 0,
    paybackTimeline: form.projectDuration,
  })

  const handleSaveDraft = async () => {
    if (!form.title.trim()) { toast.error('Please enter an idea title'); return }
    setSaving(true)
    try { const {data} = await ideasAPI.create({...buildPayload(),status:'DRAFT'}); toast.success('Draft saved!'); navigate(`/ideas/${data.id}`) }
    catch (err) { toast.error(err.response?.data?.error||'Failed to save') }
    finally { setSaving(false) }
  }

  const handleRunEvaluation = async () => {
    if (!form.title.trim()||!form.category||!form.description.trim()) { toast.error('Fill in title, category, and description'); return }
    if (!form.investmentCost||!form.expectedBenefit) { toast.error('Enter investment cost and expected benefit'); return }
    setSubmitting(true)
    try { const {data} = await ideasAPI.create(buildPayload()); toast.success('Idea created! Opening ROI analysis...'); navigate(`/ideas/${data.id}/roi`) }
    catch (err) { toast.error(err.response?.data?.error||'Failed to create') }
    finally { setSubmitting(false) }
  }

  const inp = { padding:'9px 12px', border:'1.5px solid #e8e8e8', borderRadius:8, fontSize:13, color:'#111', outline:'none', background:'#fff', fontFamily:'inherit', boxSizing:'border-box', width:'100%' }
  const dropItemStyle = (active) => ({ padding:'9px 14px', fontSize:13, cursor:'pointer', color:'#333', background:active?'#eef2ff':'transparent', fontWeight:active?500:400 })

  return (
    <div style={{ padding:'36px 44px', maxWidth:1200, fontFamily:'"DM Sans",sans-serif' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:'#111', margin:0, letterSpacing:'-0.5px' }}>New Ideas</h1>
        <p style={{ color:'#888', fontSize:13, margin:'5px 0 0' }}>Build, analyze, and validate your idea with structured intelligence</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:20 }}>
        {/* LEFT */}
        <div style={{ background:'#fff', borderRadius:16, padding:'26px', border:'1px solid #eee' }}>
          <h2 style={{ fontSize:15, fontWeight:600, color:'#111', margin:'0 0 18px' }}>Idea Details</h2>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Idea Title <span style={{color:'#ef4444'}}>*</span></label>
            <input value={form.title} onChange={set('title')} placeholder="Enter idea name" style={inp} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            {/* Category */}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Category</label>
              <div style={{ position:'relative' }}>
                <button type="button" style={{ ...inp, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => { setShowCatDrop(v=>!v); setShowMktDrop(false) }}>
                  <span style={{ color:form.category?'#111':'#bbb' }}>{selectedCat?.label||'Select category'}</span>
                  <span style={{ color:'#aaa', fontSize:11 }}>▾</span>
                </button>
                {showCatDrop && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, zIndex:50, boxShadow:'0 8px 30px rgba(0,0,0,0.1)', overflow:'hidden', marginTop:4 }}>
                    {CATEGORIES.map(c => <div key={c.value} style={dropItemStyle(form.category===c.value)} onClick={() => { setForm(f=>({...f,category:c.value})); setShowCatDrop(false) }}>{c.label}</div>)}
                  </div>
                )}
              </div>
            </div>
            {/* Target Market */}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Target Market</label>
              <div style={{ position:'relative' }}>
                <button type="button" style={{ ...inp, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => { setShowMktDrop(v=>!v); setShowCatDrop(false) }}>
                  <span style={{ color:form.targetMarket?'#111':'#bbb', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:130 }}>{form.targetMarket||'Select target market'}</span>
                  <span style={{ color:'#aaa', fontSize:11, flexShrink:0 }}>▾</span>
                </button>
                {showMktDrop && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, zIndex:50, boxShadow:'0 8px 30px rgba(0,0,0,0.1)', overflow:'hidden', marginTop:4, maxHeight:220, overflowY:'auto' }}>
                    {TARGET_MARKETS.map(m => <div key={m} style={dropItemStyle(form.targetMarket===m)} onClick={() => { setForm(f=>({...f,targetMarket:m})); setShowMktDrop(false) }}>{m}</div>)}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Description <span style={{color:'#ef4444'}}>*</span></label>
            <textarea value={form.description} onChange={set('description')} placeholder="Describe the idea scope, business context, expected outcomes, and business impact..." rows={5} style={{ ...inp, resize:'vertical' }} />
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ background:'#fff', borderRadius:16, padding:'26px', border:'1px solid #eee' }}>
          <h2 style={{ fontSize:15, fontWeight:600, color:'#111', margin:'0 0 4px' }}>Only the key details</h2>
          <p style={{ fontSize:12, color:'#aaa', margin:'0 0 18px' }}>Enter the most critical details to get a quick and accurate evaluation</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Investment Cost (Rs.)</label>
              <input type="number" value={form.investmentCost} onChange={set('investmentCost')} placeholder="Enter total setup cost" style={inp} min="0" />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Expected Annual Benefit (Rs.)</label>
              <input type="number" value={form.expectedBenefit} onChange={set('expectedBenefit')} placeholder="Enter revenue or savings" style={inp} min="0" />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>
                Expected Project Duration
                <span style={{ fontSize:9, fontWeight:700, background:'#eef2ff', color:'#4F46E5', padding:'1px 6px', borderRadius:4, marginLeft:6 }}>INPUT</span>
              </label>
              <select value={form.projectDuration} onChange={set('projectDuration')} style={{ ...inp, cursor:'pointer' }}>
                <option value="">Select duration</option>
                {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <span style={{ fontSize:11, color:'#aaa', marginTop:3, display:'block' }}>Payback period is a <strong>computed output</strong></span>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Risk Level</label>
              <div style={{ display:'flex', gap:8 }}>
                {[['LOW','Low','#10b981'],['MEDIUM','Medium','#f59e0b'],['HIGH','High','#ef4444']].map(([v,l,c]) => (
                  <button key={v} type="button" onClick={() => setForm(f=>({...f,riskLevel:v}))}
                    style={{ flex:1, padding:'8px 4px', border:`1.5px solid ${form.riskLevel===v?c:'#e8e8e8'}`, borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', background:form.riskLevel===v?c:'#fff', color:form.riskLevel===v?'#fff':'#555', fontFamily:'inherit' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>User Expectation</label>
            <textarea value={form.userExpectation} onChange={set('userExpectation')} placeholder="Describe your expectation from this analysis..." rows={4} style={{ ...inp, resize:'vertical' }} />
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:16 }}>
        {[['Revenue','Tracks expected income potential'],['Costs','Captures setup and operational expenses'],['ROI','Measures return on investment'],['Risk','Reflects uncertainty factors'],['Review','Analyst validation and version tracking'],['Exports','PDF, DOCX, PPTX and XLSX']].map(([t,d]) => (
          <div key={t} style={{ background:'#fff', borderRadius:12, padding:'16px 14px', border:'1px solid #eee' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#111', marginBottom:5 }}>{t}</div>
            <div style={{ fontSize:11, color:'#888', lineHeight:1.5 }}>{d}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ background:'#fff', borderRadius:16, padding:'22px 26px', border:'1px solid #eee', display:'flex', alignItems:'center', gap:18 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#111', marginBottom:4 }}>Ready to create your business value analysis</div>
          <div style={{ fontSize:12, color:'#888', lineHeight:1.5 }}>Generate ROI, NPV, IRR, payback period (Investment / Annual CF), scenarios, AI insights, and export-ready reports.</div>
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={handleSaveDraft} disabled={saving} style={{ padding:'10px 18px', background:'#fff', color:'#333', border:'1.5px solid #ddd', borderRadius:10, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>{saving?'Saving...':'Save Draft'}</button>
          <button onClick={handleRunEvaluation} disabled={submitting} style={{ padding:'10px 22px', background:'#4F46E5', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{submitting?'Creating...':'Run Evaluation'}</button>
        </div>
      </div>
    </div>
  )
}
