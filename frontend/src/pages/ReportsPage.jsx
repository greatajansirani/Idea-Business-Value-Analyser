import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import PptxGenJS from 'pptxgenjs'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, ShadingType, TableLayoutType } from 'docx'
import { ideasAPI, scenariosAPI } from '../services/api.js'

const fmtN  = (n,d=2) => (parseFloat(n)||0).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d})
const fmtRs = (n,d=2) => `Rs. ${fmtN(n,d)}`
const fmtPct= (n,d=2) => `${fmtN(n,d)}%`
const fmtUI = (n,d=0) => `Rs.${fmtN(n,d)}`
const fmtMo = (y)     => `${Math.round((y||0)*12)} months (${(y||0).toFixed(2)} yrs)`

function getRiskLevel(s,m){ const p=m>0?(s/m)*100:0; return p<33?'Low':p<66?'Medium':'High' }

function stripEmojis(t) {
  if (!t) return ''
  return t.replace(/[\u{1F300}-\u{1F9FF}]/gu,'').replace(/[\u{2600}-\u{26FF}]/gu,'').replace(/[\u{2700}-\u{27BF}]/gu,'').replace(/[\u{1F600}-\u{1F64F}]/gu,'').replace(/[\u{1F680}-\u{1F6FF}]/gu,'').replace(/\*\*/g,'').replace(/\*/g,'').trim()
}

const PUR=[79,70,229],DARK=[30,27,75],WHT=[255,255,255],GRN=[16,185,129],RED=[239,68,68],AMB=[245,158,11],GRY=[100,100,100]

function pdfHdr(doc,title,W){
  doc.setFillColor(...DARK);doc.rect(0,0,W,14,'F')
  doc.setFillColor(...PUR);doc.rect(0,0,6,297,'F')
  doc.setTextColor(...WHT);doc.setFontSize(10.5);doc.setFont('helvetica','bold');doc.text(title,14,9.5)
  doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text('IdeaBVA  |  Larsen & Toubro  |  Digital Energy Solutions',W-14,9.5,{align:'right'})
}
function pdfFtr(doc,p,total,W,H){
  doc.setDrawColor(220,220,230);doc.line(14,H-10,W-14,H-10)
  doc.setFontSize(7.5);doc.setFont('helvetica','normal');doc.setTextColor(160,160,180)
  doc.text('Sensitivity: LNT Internal Use Only  |  Larsen & Toubro Limited',14,H-5)
  doc.text(`Page ${p} of ${total}`,W-14,H-5,{align:'right'})
}
function secTitle(doc,text,y){
  doc.setFillColor(240,241,255);doc.rect(14,y-4,182,8,'F')
  doc.setFontSize(10);doc.setFont('helvetica','bold');doc.setTextColor(...PUR)
  doc.text(text,16,y+0.8);return y+8
}

const FORMATS=[
  {id:'PDF', label:'PDF Report',      icon:'PDF',pages:'7 pages', desc:'Cover, metrics, costs, cash flows, scenarios, risk, AI insights',         color:'#ef4444'},
  {id:'XLSX',label:'Excel Workbook',  icon:'XLS',pages:'5 sheets',desc:'Summary, Cash Flows, Scenarios, Cost-Benefit, Formula References',         color:'#10b981'},
  {id:'PPTX',label:'PowerPoint Deck',icon:'PPT',pages:'6 slides',desc:'Title, KPI Dashboard, Cost-Benefit, Scenarios, Risk, AI Insights',          color:'#f59e0b'},
  {id:'DOCX',label:'Word Document',   icon:'DOC',pages:'Full doc',desc:'Complete executive report with all sections and tables',                    color:'#3b82f6'},
  {id:'JSON',label:'JSON Data',       icon:'{ }',pages:'Raw data',desc:'Structured data with all metrics for integration',                          color:'#8b5cf6'},
]

export default function ReportsPage() {
  const { id } = useParams()
  const [idea,setIdea]=useState(null)
  const [analysis,setAnalysis]=useState(null)
  const [scenarios,setScenarios]=useState([])
  const [loading,setLoading]=useState(true)
  const [gen,setGen]=useState('')

  useEffect(() => {
    Promise.all([ideasAPI.get(id),scenariosAPI.get(id)])
      .then(([iR,sR])=>{setIdea(iR.data);setAnalysis(iR.data.roiAnalysis);setScenarios(sR.data.scenarios)})
      .catch(()=>toast.error('Failed to load')).finally(()=>setLoading(false))
  },[id])

  const getCF=()=>{ if(!analysis) return []; try{return Array.isArray(analysis.annualCashFlows)?analysis.annualCashFlows:JSON.parse(analysis.annualCashFlows||'[]')}catch{return []} }
  const sname=()=>(idea?.title||'Report').replace(/[^a-z0-9]/gi,'_').toLowerCase()
  const goNoGo=analysis?.goNoGo||'CONDITIONAL'
  const goColor=goNoGo==='GO'?GRN:goNoGo==='NO_GO'?RED:AMB

  const handleGenerate=async(fmt)=>{
    if(!analysis){toast.error('Run evaluation first');return}
    setGen(fmt)
    try{
      if(fmt==='PDF') await genPDF()
      if(fmt==='XLSX') await genXLSX()
      if(fmt==='PPTX') await genPPTX()
      if(fmt==='DOCX') await genDOCX()
      if(fmt==='JSON') genJSON()
      toast.success(`${fmt} downloaded!`)
    }catch(e){console.error(e);toast.error(`${fmt} failed: ${e.message}`)}
    finally{setGen('')}
  }

  const genPDF=async()=>{
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'})
    const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight()
    const cf=getCF(),dr=analysis.discountRate||0.1,inv=analysis.initialInvestment||0
    const tb=(analysis.revenueGeneration||0)+(analysis.efficiencyGains||0)+(analysis.costSavings||0)
    const paybackMo=Math.round((analysis.paybackPeriodYears||0)*12)
    const rs=analysis.riskScore||0

    // PAGE 1: COVER
    doc.setFillColor(...DARK);doc.rect(0,0,W,H,'F')
    doc.setFillColor(...PUR);doc.rect(0,0,8,H,'F')
    doc.setFillColor(50,45,110);doc.rect(8,0,W-8,1.5,'F')
    doc.setFillColor(...PUR);doc.roundedRect(22,28,18,18,3,3,'F')
    doc.setTextColor(...WHT);doc.setFontSize(10);doc.setFont('helvetica','bold');doc.text('IB',31,39,{align:'center'})
    doc.setFontSize(17);doc.text('IdeaBVA',44,38)
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(160,160,210);doc.text('Business Value Analyzer',44,44)
    doc.setTextColor(...WHT);doc.setFontSize(32);doc.setFont('helvetica','bold')
    doc.text('Business Value',22,85);doc.text('Analysis Report',22,100)
    doc.setFillColor(...PUR);doc.rect(22,104,60,1.5,'F')
    doc.setFontSize(15);doc.setFont('helvetica','normal');doc.setTextColor(180,180,230)
    const tl=doc.splitTextToSize(idea.title||'',W-52);doc.text(tl,22,114)
    ;[['Organization','Larsen & Toubro Limited'],['Division','Power Transmission & Distribution IC'],['Unit','Digital Energy Solutions'],['Category',(idea.category||'').replace(/_/g,' ')],['Risk Level',idea.riskLevel||'MEDIUM'],['Project Duration',idea.paybackTimeline||'Not specified'],['Version',`v${idea.version||1}`],['Generated',new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})]].forEach(([k,v],i)=>{
      const y=140+i*8;doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(120,120,180);doc.text(k+':',22,y);doc.setTextColor(...WHT);doc.text(v,75,y)
    })
    doc.setFillColor(...goColor);doc.roundedRect(22,212,80,22,4,4,'F')
    doc.setTextColor(...WHT);doc.setFontSize(13);doc.setFont('helvetica','bold');doc.text(`Decision: ${goNoGo.replace('_',' ')}`,62,225,{align:'center'})
    doc.setFillColor(45,40,100);doc.rect(0,248,W,42,'F')
    doc.setFillColor(...PUR);doc.rect(0,248,W,0.8,'F')
    ;[['ROI',fmtPct(analysis.roiRatio)],['NPV',fmtRs(analysis.npv,0)],['IRR',fmtPct(analysis.irr)],['Payback',`${paybackMo} months`],['BCR',fmtN(analysis.bcr,2)],['Risk',`${fmtN(rs,0)}%`]].forEach(([l,v],i)=>{
      const x=18+i*32;doc.setFontSize(7);doc.setFont('helvetica','normal');doc.setTextColor(140,140,200);doc.text(l,x,258);doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(...WHT);doc.text(v,x,268)
    })
    doc.setFontSize(7.5);doc.setFont('helvetica','normal');doc.setTextColor(70,70,110)
    doc.text('Sensitivity: LNT Internal Use Only',W/2,283,{align:'center'});doc.text('Page 1',W-14,283,{align:'right'})

    // PAGE 2: METRICS — only Metric + Value (no formula column)
    doc.addPage();pdfHdr(doc,'Idea Overview & Key Financial Metrics',W);let y=22
    doc.setFillColor(246,246,252)
    const dl=doc.splitTextToSize(idea.description||'No description.',W-32)
    const dh=dl.length*4.5+14;doc.roundedRect(14,y,W-28,dh,2,2,'F')
    doc.setDrawColor(200,200,240);doc.roundedRect(14,y,W-28,dh,2,2,'S')
    doc.setFontSize(9.5);doc.setFont('helvetica','bold');doc.setTextColor(...PUR);doc.text('Idea Description',17,y+8)
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...GRY);doc.text(dl,17,y+14);y+=dh+5
    if(idea.targetMarket){doc.setFontSize(8.5);doc.setFont('helvetica','bold');doc.setTextColor(50,50,80);doc.text('Target Market:',14,y);doc.setFont('helvetica','normal');doc.setTextColor(...GRY);const tl2=doc.splitTextToSize(idea.targetMarket,W-56);doc.text(tl2,47,y);y+=tl2.length*4+3}
    if(idea.paybackTimeline){doc.setFontSize(8.5);doc.setFont('helvetica','bold');doc.setTextColor(50,50,80);doc.text('Project Duration:',14,y);doc.setFont('helvetica','normal');doc.setTextColor(...GRY);doc.text(idea.paybackTimeline,52,y);y+=7}
    y=secTitle(doc,'Key Financial Metrics (Computed Outputs)',y+2)
    doc.autoTable({
      startY:y,head:[['Metric','Value']],
      body:[['ROI (Return on Investment)',fmtPct(analysis.roiRatio,2)],['NPV (Net Present Value)',fmtRs(analysis.npv,2)],['IRR (Internal Rate of Return)',fmtPct(analysis.irr,2)],['Payback Period',fmtMo(analysis.paybackPeriodYears)],['Benefit-Cost Ratio (BCR)',fmtN(analysis.bcr,3)],['Break-Even Year',`Year ${fmtN(analysis.breakEvenYear,1)}`],['Gross Margin',fmtPct(analysis.grossMargin,1)],['Net Profit Margin',fmtPct(analysis.netProfitMargin,1)],['Risk Score (Overall)',`${fmtN(rs,0)}% — ${rs<33?'Low':rs<66?'Medium':'High'} Risk`],['Return Rate (WACC) Applied','10% (Industry Standard)'],['Project Life',`${analysis.projectLifeYears||5} years`],['Short-Term Revenue (Yr 1-2)',fmtRs(analysis.shortTermRevenue,2)],['Long-Term Revenue (Yr 3+)',fmtRs(analysis.longTermRevenue,2)],['Decision',goNoGo.replace('_',' ')]],
      headStyles:{fillColor:PUR,textColor:WHT,fontStyle:'bold',fontSize:10,cellPadding:4},
      bodyStyles:{fontSize:9,cellPadding:3},
      columnStyles:{0:{cellWidth:90,fontStyle:'bold',textColor:[40,40,70]},1:{cellWidth:'auto',halign:'right',fontStyle:'bold',textColor:[30,30,30]}},
      alternateRowStyles:{fillColor:[246,246,252]},margin:{left:14,right:14},
    })
    pdfFtr(doc,2,7,W,H)

    // PAGE 3: COSTS & BENEFITS
    doc.addPage();pdfHdr(doc,'Cost & Benefit Breakdown',W,3);y=22
    y=secTitle(doc,'A.  Direct Costs',y)
    doc.autoTable({startY:y,head:[['Cost Component','Amount (Rs.)','Description']],body:[['CAPEX',fmtRs(analysis.capex,2),'One-time infrastructure & hardware'],['Development Cost',fmtRs(analysis.developmentCost,2),'Software development & integration'],['OPEX per Year',fmtRs(analysis.opex,2),'Annual operating expenses'],['Maintenance per Year',fmtRs(analysis.maintenanceCost,2),'Annual maintenance & support'],['TOTAL INVESTMENT',fmtRs(inv,2),'CAPEX + Development Cost']],headStyles:{fillColor:[180,40,40],textColor:WHT,fontStyle:'bold',fontSize:9},bodyStyles:{fontSize:8.5,cellPadding:2.5},columnStyles:{0:{cellWidth:62,fontStyle:'bold'},1:{cellWidth:38,halign:'right',fontStyle:'bold'}},alternateRowStyles:{fillColor:[255,248,248]},margin:{left:14,right:14},didParseCell:(d)=>{if(d.row.index===4&&d.section==='body'){d.cell.styles.fillColor=[255,225,225];d.cell.styles.fontStyle='bold'}}})
    y=doc.lastAutoTable.finalY+8
    y=secTitle(doc,'B.  Expected Annual Benefits',y)
    doc.autoTable({startY:y,head:[['Benefit Component','Annual Amount (Rs.)','Type']],body:[['Revenue Generation',fmtRs(analysis.revenueGeneration,2),'Direct — New revenue streams'],['Efficiency Gains',fmtRs(analysis.efficiencyGains,2),'Direct — Productivity improvement'],['Cost Savings',fmtRs(analysis.costSavings,2),'Direct — Cost reduction'],['TOTAL ANNUAL BENEFIT',fmtRs(tb,2),'Sum of all direct benefits']],headStyles:{fillColor:[16,100,60],textColor:WHT,fontStyle:'bold',fontSize:9},bodyStyles:{fontSize:8.5,cellPadding:2.5},columnStyles:{0:{cellWidth:62,fontStyle:'bold'},1:{cellWidth:44,halign:'right',fontStyle:'bold'}},alternateRowStyles:{fillColor:[240,255,245]},margin:{left:14,right:14},didParseCell:(d)=>{if(d.row.index===3&&d.section==='body'){d.cell.styles.fillColor=[200,245,220];d.cell.styles.fontStyle='bold'}}})
    y=doc.lastAutoTable.finalY+8
    y=secTitle(doc,'C.  Qualitative & Indirect Benefits',y)
    doc.autoTable({startY:y,head:[['Indirect Benefit','Category','Impact','Risk-Adjusted']],body:[['Enhanced brand value','Strategic','High','Low'],['Regulatory compliance & ESG','Compliance','High','Low'],['Sustainability','ESG','Medium','Low'],['Energy efficiency & downtime','Operational','High','Low'],['Production optimization','Operational','Medium','Medium'],['Market leadership','Strategic','High','Medium'],['Innovation pipeline','Strategic','High','High']],headStyles:{fillColor:[100,70,180],textColor:WHT,fontStyle:'bold',fontSize:8.5},bodyStyles:{fontSize:8,cellPadding:2},columnStyles:{1:{halign:'center'},2:{halign:'center',fontStyle:'bold'},3:{halign:'center'}},alternateRowStyles:{fillColor:[248,245,255]},margin:{left:14,right:14},didParseCell:(d)=>{if(d.column.index===2&&d.section==='body')d.cell.styles.textColor=d.cell.raw==='High'?GRN:d.cell.raw==='Medium'?AMB:RED;if(d.column.index===3&&d.section==='body')d.cell.styles.textColor=d.cell.raw==='Low'?GRN:d.cell.raw==='High'?RED:AMB}})
    pdfFtr(doc,3,7,W,H)

    // PAGE 4: CASH FLOWS
    doc.addPage();pdfHdr(doc,'Annual Cash Flow Projections',W,4);y=22
    if(cf.length>0){
      y=secTitle(doc,'Annual Cash Flow Table — Payback = Investment / Annual Net Cash Flow',y)
      doc.autoTable({startY:y,head:[['Year','Net CF (Rs.)','Cumulative CF (Rs.)','Discounted CF (Rs.)','PV Factor','Status']],body:cf.map((v,i)=>{const cum=cf.slice(0,i+1).reduce((a,b)=>a+b,0);const pvF=Math.pow(1+dr,i+1);return[`Year ${i+1}`,fmtRs(v,2),fmtRs(cum,2),fmtRs(v/pvF,2),fmtN(pvF,4),cum>=inv?'Recovered':'Recovering']}),headStyles:{fillColor:PUR,textColor:WHT,fontStyle:'bold',fontSize:8.5},bodyStyles:{fontSize:8,cellPadding:2.2},columnStyles:{0:{cellWidth:18,halign:'center'},1:{halign:'right'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'center',fontStyle:'bold'}},alternateRowStyles:{fillColor:[246,246,252]},margin:{left:14,right:14},didParseCell:(d)=>{if(d.column.index===5&&d.section==='body')d.cell.styles.textColor=d.cell.raw==='Recovered'?GRN:[200,120,0];if(d.column.index===1&&d.section==='body')d.cell.styles.textColor=cf[d.row.index]>=0?GRN:RED}})
      y=doc.lastAutoTable.finalY+10
      y=secTitle(doc,'Cash Flow Bar Chart',y)
      const maxCF=Math.max(...cf.map(Math.abs),1)
      cf.forEach((v,i)=>{const bw=(Math.abs(v)/maxCF)*110;doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(...GRY);doc.text(`Yr ${i+1}`,14,y+3.5);doc.setFillColor(...(v>=0?GRN:RED));doc.roundedRect(26,y,bw,5,0.5,0.5,'F');doc.setTextColor(40,40,40);doc.setFont('helvetica','bold');doc.text(fmtRs(v,0),28+bw,y+4);y+=9})
      y+=3;doc.setFontSize(8.5);doc.setFont('helvetica','italic');doc.setTextColor(80,80,80)
      doc.text(`Payback: ${paybackMo} months = Investment / Annual Net CF  |  Break-even: Year ${fmtN(analysis.breakEvenYear,1)}  |  WACC: 10%`,14,y)
    }
    pdfFtr(doc,4,7,W,H)

    // PAGE 5: SCENARIOS
    doc.addPage();pdfHdr(doc,'Scenario Analysis',W,5);y=22
    doc.setFillColor(240,242,255);doc.roundedRect(14,y,W-28,30,2,2,'F')
    doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(50,50,120);doc.text('Scenario Definitions (AACE International):',17,y+6)
    doc.setFont('helvetica','normal');doc.setTextColor(60,60,80)
    doc.text('Best Case: Optimistic — Revenue x1.30, Costs x0.90. Fast adoption, favorable conditions, no delays.',17,y+13)
    doc.text('Most Likely: Realistic — Revenue x1.00, Costs x1.00. Base case from your entered values.',17,y+19)
    doc.text('Worst Case: Pessimistic — Revenue x0.70, Costs x1.20. Delays, cost overruns, slow market uptake.',17,y+25)
    y+=36
    if(scenarios.length>0){
      y=secTitle(doc,'Scenario Comparison Table',y)
      doc.autoTable({startY:y,head:[['Scenario','ROI (%)','NPV (Rs.)','IRR (%)','Payback','Total Cost (Rs.)','Total Benefit (Rs.)']],body:scenarios.map(sc=>[sc.label||sc.type,fmtPct(sc.roi),fmtRs(sc.npv,2),fmtPct(sc.irr),`${Math.round((sc.payback||0)*12)} months`,fmtRs(sc.totalCost,2),fmtRs(sc.totalBenefit,2)]),headStyles:{fillColor:PUR,textColor:WHT,fontStyle:'bold',fontSize:8.5},bodyStyles:{fontSize:8.5,cellPadding:2.5},columnStyles:{0:{fontStyle:'bold',cellWidth:28}},alternateRowStyles:{fillColor:[246,246,252]},margin:{left:14,right:14},didParseCell:(d)=>{if(d.section==='body'&&d.column.index===0){const l=(d.cell.raw||'').toLowerCase();d.cell.styles.textColor=l.includes('best')?GRN:l.includes('worst')?RED:PUR}}})
      y=doc.lastAutoTable.finalY+10;y=secTitle(doc,'ROI Comparison',y)
      const maxROI=Math.max(...scenarios.map(sc=>Math.abs(sc.roi||0)),1)
      ;['BEST_CASE','MOST_LIKELY','WORST_CASE'].forEach(type=>{const sc=scenarios.find(s=>s.type===type);if(!sc)return;const bw=(Math.abs(sc.roi||0)/maxROI)*110;const col=type==='BEST_CASE'?GRN:type==='WORST_CASE'?RED:PUR;doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(...GRY);doc.text((sc.label||type).padEnd(14),12,y+4);doc.setFillColor(...col);doc.roundedRect(56,y,bw,6,0.5,0.5,'F');doc.setTextColor(40,40,40);doc.setFont('helvetica','bold');doc.text(`${fmtPct(sc.roi)}  Payback: ${Math.round((sc.payback||0)*12)} months`,58+bw,y+4.5);y+=12})
    }
    pdfFtr(doc,5,7,W,H)

    // PAGE 6: RISK
    doc.addPage();pdfHdr(doc,'Risk Assessment & Strategic Viability',W,6);y=22
    y=secTitle(doc,'Risk Heatmap (Percentage Based)',y)
    doc.autoTable({startY:y,head:[['Risk Category','Risk %','Level','Mitigation Strategy']],body:[['Market Volatility Risk',`${Math.round((rs*0.30/30)*100)}%`,getRiskLevel(rs*0.30,30),'Market monitoring, agile pivot strategy'],['Technology Adoption Risk',`${Math.round((rs*0.25/25)*100)}%`,getRiskLevel(rs*0.25,25),'Phased rollout, pilot testing, user training'],['Financial / ROI Risk',`${Math.round((rs*0.25/25)*100)}%`,getRiskLevel(rs*0.25,25),'Conservative projections, milestone funding'],['Policy / Regulatory Risk',`${Math.round((rs*0.20/20)*100)}%`,getRiskLevel(rs*0.20,20),'Legal monitoring, compliance-first design'],['COMPOSITE RISK SCORE',`${fmtN(rs,0)}%`,getRiskLevel(rs,100),`Decision: ${goNoGo.replace('_',' ')}`]],headStyles:{fillColor:[180,50,50],textColor:WHT,fontStyle:'bold',fontSize:9},bodyStyles:{fontSize:8.5,cellPadding:2.5},columnStyles:{1:{halign:'center',fontStyle:'bold'},2:{halign:'center',fontStyle:'bold'}},alternateRowStyles:{fillColor:[255,248,248]},margin:{left:14,right:14},didParseCell:(d)=>{if(d.column.index===2&&d.section==='body')d.cell.styles.textColor=d.cell.raw==='Low'?GRN:d.cell.raw==='Medium'?AMB:RED;if(d.row.index===4&&d.section==='body'){d.cell.styles.fillColor=[255,230,230];d.cell.styles.fontStyle='bold'}}})
    y=doc.lastAutoTable.finalY+10;y=secTitle(doc,'Strategic Viability Assessment',y)
    doc.autoTable({startY:y,head:[['Criterion','Result','Threshold','Verdict']],body:[['ROI > 15%',fmtPct(analysis.roiRatio),'> 15%',(analysis.roiRatio||0)>15?'PASS':'FAIL'],['NPV > 0',fmtRs(analysis.npv,2),'> 0',(analysis.npv||0)>0?'PASS':'FAIL'],['IRR > 10%',fmtPct(analysis.irr),'> 10%',(analysis.irr||0)>10?'PASS':'FAIL'],['Payback < 60% of project life',`${Math.round((analysis.paybackPeriodYears||0)*12)} months`,`< ${Math.round((analysis.projectLifeYears||5)*0.6*12)} months`,(analysis.paybackPeriodYears||99)<((analysis.projectLifeYears||5)*0.6)?'PASS':'FAIL'],['Risk Score < 60%',`${fmtN(rs,0)}%`,'< 60%',rs<60?'PASS':'FAIL']],headStyles:{fillColor:[50,50,100],textColor:WHT,fontStyle:'bold',fontSize:9},bodyStyles:{fontSize:8.5,cellPadding:2.5},columnStyles:{3:{halign:'center',fontStyle:'bold'}},alternateRowStyles:{fillColor:[245,245,255]},margin:{left:14,right:14},didParseCell:(d)=>{if(d.column.index===3&&d.section==='body')d.cell.styles.textColor=d.cell.raw==='PASS'?GRN:RED}})
    y=doc.lastAutoTable.finalY+10
    doc.setFillColor(...goColor);doc.roundedRect(14,y,W-28,24,4,4,'F')
    doc.setTextColor(...WHT);doc.setFontSize(15);doc.setFont('helvetica','bold');doc.text(`Final Decision: ${goNoGo.replace('_',' ')}`,W/2,y+10,{align:'center'})
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('Based on: ROI>15% | NPV>0 | IRR>10% | Payback<60% project life | Risk<60%',W/2,y+18,{align:'center'})
    pdfFtr(doc,6,7,W,H)

    // PAGE 7: AI INSIGHTS + FORMULAS (no Go/No-Go row)
    doc.addPage();pdfHdr(doc,'AI-Generated Insights & Formula References',W,7);y=22
    if(analysis.aiInsights){y=secTitle(doc,'Financial Assessment',y);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60,60,80);const aiL=doc.splitTextToSize(stripEmojis(analysis.aiInsights),W-28);doc.text(aiL,14,y);y+=aiL.length*4.2+8}
    if(analysis.marketInsights){y=secTitle(doc,'Market Insights',y);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(40,80,60);const mL=doc.splitTextToSize(stripEmojis(analysis.marketInsights),W-28);doc.text(mL,14,y);y+=mL.length*4.2+8}
    y=Math.max(y,155);y=secTitle(doc,'Formula References & Academic Citations',y)
    doc.autoTable({startY:y,head:[['Formula','Mathematical Definition','Academic Source']],
      body:[['ROI','ROI = (Net Benefit / Total Cost) x 100','CFA Institute; PMBOK 7th Ed.'],['NPV','NPV = SUM[CFt / (1+r)^t] - C0','Brealey, Myers & Allen 13th Ed.'],['IRR','Rate r* where NPV = 0 (Newton-Raphson)','Ross, Westerfield & Jordan 12th Ed.'],['Payback','PP = Initial Investment / Annual Net Cash Flow','Brigham & Houston 16th Ed.'],['BCR','BCR = PV(Benefits) / PV(Costs)  Accept if BCR > 1','HM Treasury Green Book'],['Scenarios','Best x1.30 / Most Likely x1.00 / Worst x0.70','AACE International']],
      headStyles:{fillColor:[50,50,100],textColor:WHT,fontStyle:'bold',fontSize:8.5},bodyStyles:{fontSize:8},columnStyles:{0:{fontStyle:'bold',cellWidth:22},1:{cellWidth:68}},alternateRowStyles:{fillColor:[246,246,252]},margin:{left:14,right:14}})
    const totalPages=doc.internal.getNumberOfPages()
    for(let p=2;p<=totalPages;p++){doc.setPage(p);pdfFtr(doc,p,totalPages,W,H)}
    doc.save(`${sname()}_BVA_Report.pdf`)
  }

  const genXLSX=async()=>{
    const cf=getCF(),wb=XLSX.utils.book_new()
    const tb=(analysis.revenueGeneration||0)+(analysis.efficiencyGains||0)+(analysis.costSavings||0)
    const paybackMo=Math.round((analysis.paybackPeriodYears||0)*12),rs=analysis.riskScore||0
    const ws1=XLSX.utils.aoa_to_sheet([['IdeaBVA - Business Value Analysis Report'],[],['Organization','Larsen & Toubro Limited'],['Division','Power Transmission & Distribution IC'],['Unit','Digital Energy Solutions'],['Generated',new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})],['Sensitivity','LNT Internal Use Only'],[],['IDEA DETAILS'],['Title',idea.title],['Category',(idea.category||'').replace(/_/g,' ')],['Risk Level',idea.riskLevel],['Status',idea.status],['Project Duration',idea.paybackTimeline||'Not specified'],['Version',`v${idea.version||1}`],[],['KEY FINANCIAL METRICS','Value'],['ROI (%)',analysis.roiRatio],['NPV (Rs.)',analysis.npv],['IRR (%)',analysis.irr],['Payback Period (months)',paybackMo],['Payback Period (years)',analysis.paybackPeriodYears],['Payback Formula','Investment / Annual Net Cash Flow'],['BCR',analysis.bcr],['Break-Even Year',analysis.breakEvenYear],['Gross Margin (%)',analysis.grossMargin],['Net Profit Margin (%)',analysis.netProfitMargin],['Risk Score (%)',rs],['Decision',analysis.goNoGo],['WACC Applied','10%'],['Project Life (yrs)',analysis.projectLifeYears],['Short-Term Revenue (Rs.)',analysis.shortTermRevenue],['Long-Term Revenue (Rs.)',analysis.longTermRevenue]])
    ws1['!cols']=[{wch:42},{wch:22}];XLSX.utils.book_append_sheet(wb,ws1,'Executive Summary')
    const ws2=XLSX.utils.aoa_to_sheet([['Annual Cash Flow Projections'],['Payback Period',`${paybackMo} months = Investment / Annual Net CF`,'WACC','10%'],[],['Year','Net CF (Rs.)','Cumulative CF (Rs.)','Discounted CF (Rs.)','PV Factor','Status'],...cf.map((v,i)=>{const cum=cf.slice(0,i+1).reduce((a,b)=>a+b,0);const pvF=Math.pow(1.10,i+1);return[`Year ${i+1}`,v,cum,v/pvF,pvF,cum>=(analysis.initialInvestment||0)?'Recovered':'Recovering']})])
    ws2['!cols']=[{wch:10},{wch:22},{wch:22},{wch:22},{wch:16},{wch:14}];XLSX.utils.book_append_sheet(wb,ws2,'Cash Flows')
    const ws3=XLSX.utils.aoa_to_sheet([['Scenario Analysis'],['Best Case: Optimistic — Revenue x1.30, Costs x0.90'],['Most Likely: Realistic — Revenue x1.00, Costs x1.00 (Base)'],['Worst Case: Pessimistic — Revenue x0.70, Costs x1.20'],[],['Scenario','ROI (%)','NPV (Rs.)','IRR (%)','Payback (months)','Total Cost (Rs.)','Total Benefit (Rs.)','Rev Mult','Cost Mult'],...scenarios.map(sc=>[sc.label||sc.type,sc.roi,sc.npv,sc.irr,Math.round((sc.payback||0)*12),sc.totalCost,sc.totalBenefit,sc.revenueMultiplier,sc.costMultiplier])])
    ws3['!cols']=[{wch:22},{wch:12},{wch:20},{wch:12},{wch:18},{wch:20},{wch:20},{wch:14},{wch:14}];XLSX.utils.book_append_sheet(wb,ws3,'Scenarios')
    const ws4=XLSX.utils.aoa_to_sheet([['Cost & Benefit Breakdown'],[],['DIRECT COSTS','Amount (Rs.)'],['CAPEX',analysis.capex],['Development Cost',analysis.developmentCost],['OPEX per Year',analysis.opex],['Maintenance per Year',analysis.maintenanceCost],['Total Initial Investment',analysis.initialInvestment],[],['ANNUAL BENEFITS','Amount (Rs.)'],['Revenue Generation',analysis.revenueGeneration],['Efficiency Gains',analysis.efficiencyGains],['Cost Savings',analysis.costSavings],['Total Annual Benefit',tb],[],['RISK BREAKDOWN (%)','Score %'],['Market Volatility Risk',`${Math.round((rs*0.30/30)*100)}%`],['Technology Adoption Risk',`${Math.round((rs*0.25/25)*100)}%`],['Financial / ROI Risk',`${Math.round((rs*0.25/25)*100)}%`],['Policy / Regulatory Risk',`${Math.round((rs*0.20/20)*100)}%`],['Overall Risk Score',`${fmtN(rs,0)}%`]])
    ws4['!cols']=[{wch:50},{wch:22}];XLSX.utils.book_append_sheet(wb,ws4,'Cost-Benefit')
    const ws5=XLSX.utils.aoa_to_sheet([['Formula References'],[],['Formula','Definition','Source'],['ROI','(Net Benefit / Total Cost) x 100','CFA Institute; PMBOK 7th Ed.'],['NPV','SUM[CFt / (1+r)^t] - C0','Brealey, Myers & Allen 13th Ed.'],['IRR','Rate r* where NPV=0 (Newton-Raphson)','Ross, Westerfield & Jordan 12th Ed.'],['Payback','Investment / Annual Net Cash Flow','Brigham & Houston 16th Ed.'],['BCR','PV(Benefits) / PV(Costs)','HM Treasury Green Book'],['Scenarios','Best x1.30 / Likely x1.00 / Worst x0.70','AACE International']])
    ws5['!cols']=[{wch:14},{wch:50},{wch:55}];XLSX.utils.book_append_sheet(wb,ws5,'Formula References')
    XLSX.writeFile(wb,`${sname()}_BVA.xlsx`)
  }

  const genPPTX=async()=>{
    const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE'
    const PURPLE='4F46E5',DARKBG='1e1b4b',WHITE='FFFFFF',GH='10b981',RH='ef4444',AH='f59e0b',BH='3b82f6'
    const gCol=goNoGo==='GO'?GH:goNoGo==='NO_GO'?RH:AH
    const tb=(analysis.revenueGeneration||0)+(analysis.efficiencyGains||0)+(analysis.costSavings||0)
    const paybackMo=Math.round((analysis.paybackPeriodYears||0)*12),rs=analysis.riskScore||0
    const addHdr=(slide,title)=>{slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:0.95,fill:{color:DARKBG}});slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:0.18,h:7.5,fill:{color:PURPLE}});slide.addShape(pptx.ShapeType.rect,{x:0,y:0.95,w:13.33,h:0.04,fill:{color:PURPLE}});slide.addText('IdeaBVA  |  Larsen & Toubro  |  Digital Energy Solutions',{x:0.35,y:0.08,w:12,h:0.35,fontSize:9,color:'818CF8'});slide.addText(title,{x:0.35,y:0.45,w:12,h:0.45,fontSize:20,bold:true,color:WHITE})}
    const addFtr=(slide,p)=>slide.addText(`Sensitivity: LNT Internal Use Only  |  Page ${p} of 6`,{x:0.35,y:7.3,w:12.5,h:0.2,fontSize:8,color:'666666',italic:true})
    const s1=pptx.addSlide();s1.background={color:DARKBG}
    s1.addShape(pptx.ShapeType.rect,{x:0,y:0,w:0.2,h:7.5,fill:{color:PURPLE}});s1.addShape(pptx.ShapeType.rect,{x:0.2,y:0,w:13.13,h:0.04,fill:{color:PURPLE}})
    s1.addShape(pptx.ShapeType.roundRect,{x:0.45,y:0.35,w:1.0,h:1.0,fill:{color:PURPLE},rectRadius:0.12});s1.addText('IB',{x:0.45,y:0.35,w:1.0,h:1.0,fontSize:22,bold:true,color:WHITE,align:'center',valign:'middle'})
    s1.addText('IdeaBVA',{x:1.6,y:0.42,w:6,h:0.5,fontSize:20,bold:true,color:WHITE});s1.addText('Business Value Analyzer',{x:1.6,y:0.88,w:8,h:0.35,fontSize:12,color:'818CF8'})
    s1.addText('Business Value Analysis Report',{x:0.45,y:1.6,w:12,h:1.0,fontSize:36,bold:true,color:WHITE});s1.addText(idea.title,{x:0.45,y:2.75,w:12,h:0.75,fontSize:20,color:'C7D2FE'})
    s1.addShape(pptx.ShapeType.rect,{x:0.45,y:3.55,w:2.5,h:0.06,fill:{color:PURPLE}})
    ;[['Organization','Larsen & Toubro Limited'],['Division','Power Transmission & Distribution IC'],['Category',(idea.category||'').replace(/_/g,' ')],['Risk Level',idea.riskLevel||'MEDIUM'],['Project Duration',idea.paybackTimeline||'Not specified'],['Date',new Date().toLocaleDateString('en-IN')]].forEach(([k,v],i)=>{const y=3.75+i*0.42;s1.addText(`${k}:`,{x:0.45,y,w:2.5,h:0.35,fontSize:10,color:'818CF8'});s1.addText(v,{x:3.1,y,w:9,h:0.35,fontSize:10,color:WHITE})})
    s1.addShape(pptx.ShapeType.roundRect,{x:0.45,y:6.3,w:4.5,h:0.75,fill:{color:gCol},rectRadius:0.1});s1.addText(`Decision: ${goNoGo.replace('_',' ')}`,{x:0.45,y:6.3,w:4.5,h:0.75,fontSize:16,bold:true,color:WHITE,align:'center',valign:'middle'})
    s1.addText('Sensitivity: LNT Internal Use Only',{x:0.45,y:7.3,w:12,h:0.2,fontSize:8,color:'4B4580',italic:true})
    const s2=pptx.addSlide();addHdr(s2,'Key Financial Metrics Dashboard')
    ;[['ROI',`${(analysis.roiRatio||0).toFixed(1)}%`,PURPLE,'Return on Investment'],['NPV',fmtUI(analysis.npv),GH,'Net Present Value'],['IRR',`${(analysis.irr||0).toFixed(1)}%`,BH,'Internal Rate of Return'],['Payback',`${paybackMo} months`,AH,'Payback = Inv / Annual CF'],['BCR',fmtN(analysis.bcr,2),'8b5cf6','Benefit-Cost Ratio'],['Risk',`${fmtN(rs,0)}%`,RH,'Risk Score']].forEach(([l,v,c,sub],i)=>{
      const cx=0.35+(i%3)*4.3,cy=1.0+Math.floor(i/3)*1.75;s2.addShape(pptx.ShapeType.roundRect,{x:cx,y:cy,w:4.0,h:1.5,fill:{color:'F8F8FF'},line:{color:c,width:2},rectRadius:0.1});s2.addShape(pptx.ShapeType.rect,{x:cx,y:cy,w:4.0,h:0.12,fill:{color:c}});s2.addText(v,{x:cx,y:cy+0.2,w:4.0,h:0.8,fontSize:26,bold:true,color:c,align:'center'});s2.addText(l,{x:cx,y:cy+1.0,w:4.0,h:0.28,fontSize:12,bold:true,color:'333333',align:'center'});s2.addText(sub,{x:cx,y:cy+1.27,w:4.0,h:0.22,fontSize:9,color:'999999',align:'center'})
    })
    s2.addShape(pptx.ShapeType.roundRect,{x:4.4,y:4.85,w:4.5,h:0.75,fill:{color:gCol},rectRadius:0.1});s2.addText(`Decision: ${goNoGo.replace('_',' ')}`,{x:4.4,y:4.85,w:4.5,h:0.75,fontSize:16,bold:true,color:WHITE,align:'center',valign:'middle'});addFtr(s2,2)
    const s3=pptx.addSlide();addHdr(s3,'Cost & Benefit Breakdown')
    const cT=[[{text:'Cost',options:{bold:true,color:WHITE,fill:DARKBG}},{text:'Amount (Rs.)',options:{bold:true,color:WHITE,fill:DARKBG}}],['CAPEX',fmtUI(analysis.capex)],['Dev Cost',fmtUI(analysis.developmentCost)],['OPEX/yr',fmtUI(analysis.opex)],['Maint/yr',fmtUI(analysis.maintenanceCost)],[{text:'Total',options:{bold:true}},{text:fmtUI(analysis.initialInvestment),options:{bold:true,color:RH}}]]
    s3.addTable(cT,{x:0.35,y:1.1,w:6.2,rowH:0.55,fill:'FFFFFF',border:{type:'solid',color:'E5E7EB',pt:0.5},fontSize:11,fontFace:'Calibri'})
    const bT=[[{text:'Benefit',options:{bold:true,color:WHITE,fill:DARKBG}},{text:'Annual (Rs.)',options:{bold:true,color:WHITE,fill:DARKBG}}],['Revenue',fmtUI(analysis.revenueGeneration)],['Efficiency',fmtUI(analysis.efficiencyGains)],['Savings',fmtUI(analysis.costSavings)],[{text:'Total',options:{bold:true}},{text:fmtUI(tb),options:{bold:true,color:GH}}],['Short-term',fmtUI(analysis.shortTermRevenue)],['Long-term',fmtUI(analysis.longTermRevenue)]]
    s3.addTable(bT,{x:7.0,y:1.1,w:6.0,rowH:0.55,fill:'FFFFFF',border:{type:'solid',color:'E5E7EB',pt:0.5},fontSize:11,fontFace:'Calibri'});addFtr(s3,3)
    if(scenarios.length>0){
      const s4=pptx.addSlide();addHdr(s4,'Scenario Analysis')
      s4.addText('Best Case: Revenue x1.30 Optimistic | Most Likely: Base case | Worst Case: Revenue x0.70 Pessimistic  [AACE International]',{x:0.35,y:1.0,w:12.7,h:0.3,fontSize:9,color:'888888',italic:true})
      const SC_COL={BEST_CASE:GH,MOST_LIKELY:PURPLE,WORST_CASE:RH}
      const SC_T={BEST_CASE:'Best Case Scenario',MOST_LIKELY:'Most Likely Scenario',WORST_CASE:'Worst Case Scenario'}
      const SC_S={BEST_CASE:'Optimistic — fast adoption',MOST_LIKELY:'Realistic — base case',WORST_CASE:'Pessimistic — headwinds'}
      ;['BEST_CASE','MOST_LIKELY','WORST_CASE'].forEach((type,i)=>{const sc=scenarios.find(s=>s.type===type)||{};const col=SC_COL[type]||PURPLE,x=0.35+i*4.3;s4.addShape(pptx.ShapeType.roundRect,{x,y:1.4,w:4.0,h:5.2,fill:{color:'F9FAFB'},line:{color:col,width:2},rectRadius:0.12});s4.addShape(pptx.ShapeType.rect,{x,y:1.4,w:4.0,h:0.08,fill:{color:col}});s4.addText(SC_T[type]||type,{x,y:1.5,w:4.0,h:0.45,fontSize:13,bold:true,color:col,align:'center'});s4.addText(SC_S[type]||'',{x,y:1.95,w:4.0,h:0.35,fontSize:9,color:'666666',align:'center',italic:true});[['ROI',`${(sc.roi||0).toFixed(1)}%`],['NPV',fmtUI(sc.npv)],['IRR',`${(sc.irr||0).toFixed(1)}%`],['Payback',`${Math.round((sc.payback||0)*12)} months`],['Total Cost',fmtUI(sc.totalCost)],['Total Benefit',fmtUI(sc.totalBenefit)]].forEach(([lbl,val],j)=>{s4.addText(`${lbl}:`,{x:x+0.15,y:2.4+j*0.7,w:1.8,h:0.5,fontSize:11,color:'666666'});s4.addText(val,{x:x+2.0,y:2.4+j*0.7,w:1.85,h:0.5,fontSize:11,bold:true,color:'111111',align:'right'})})});addFtr(s4,4)
    }
    const s5=pptx.addSlide();addHdr(s5,'Risk Assessment')
    ;[['Market Volatility',rs*0.30,30],['Technology Adoption',rs*0.25,25],['Financial / ROI',rs*0.25,25],['Policy / Regulatory',rs*0.20,20]].forEach(([l,sc,mx],i)=>{const barPct=mx>0?sc/mx:0,col=barPct<0.33?GH:barPct<0.66?AH:RH,y=1.15+i*1.25;s5.addText(l,{x:0.35,y,w:4.5,h:0.45,fontSize:13,bold:true,color:'222222'});s5.addText(`${Math.round(barPct*100)}%  (${getRiskLevel(sc,mx)})`,{x:0.35,y:y+0.45,w:4.5,h:0.35,fontSize:10,color:'777777'});s5.addShape(pptx.ShapeType.rect,{x:4.9,y:y+0.08,w:7.5,h:0.42,fill:{color:'EEEEEE'}});if(barPct>0)s5.addShape(pptx.ShapeType.rect,{x:4.9,y:y+0.08,w:Math.max(7.5*barPct,0.1),h:0.42,fill:{color:col}})})
    s5.addShape(pptx.ShapeType.roundRect,{x:3.4,y:6.2,w:6.5,h:0.75,fill:{color:gCol},rectRadius:0.1});s5.addText(`Overall Risk: ${fmtN(rs,0)}%  |  Decision: ${goNoGo.replace('_',' ')}`,{x:3.4,y:6.2,w:6.5,h:0.75,fontSize:13,bold:true,color:WHITE,align:'center',valign:'middle'});addFtr(s5,5)
    const s6=pptx.addSlide();addHdr(s6,'AI-Generated Insights')
    if(analysis.aiInsights){s6.addShape(pptx.ShapeType.roundRect,{x:0.35,y:1.1,w:12.65,h:0.38,fill:{color:'EEEEFF'},rectRadius:0.06});s6.addText('Financial Assessment',{x:0.45,y:1.12,w:12,h:0.35,fontSize:12,bold:true,color:PURPLE});s6.addText(stripEmojis(analysis.aiInsights).slice(0,700),{x:0.35,y:1.55,w:12.65,h:2.7,fontSize:10,color:'374151',wrap:true,valign:'top'})}
    if(analysis.marketInsights){s6.addShape(pptx.ShapeType.roundRect,{x:0.35,y:4.4,w:12.65,h:0.38,fill:{color:'EEFFF5'},rectRadius:0.06});s6.addText('Market Insights',{x:0.45,y:4.42,w:12,h:0.35,fontSize:12,bold:true,color:GH});s6.addText(stripEmojis(analysis.marketInsights).slice(0,400),{x:0.35,y:4.85,w:12.65,h:1.9,fontSize:10,color:'374151',wrap:true,valign:'top'})}
    addFtr(s6,6);await pptx.writeFile({fileName:`${sname()}_BVA.pptx`})
  }

  const genDOCX=async()=>{
    const cf=getCF(),dr=0.10,inv=analysis.initialInvestment||0
    const tb=(analysis.revenueGeneration||0)+(analysis.efficiencyGains||0)+(analysis.costSavings||0)
    const paybackMo=Math.round((analysis.paybackPeriodYears||0)*12),rs=analysis.riskScore||0
    const h2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:280,after:100},children:[new TextRun({text:t,bold:true,color:'4F46E5',size:24})]})
    const h3=t=>new Paragraph({heading:HeadingLevel.HEADING_3,spacing:{before:180,after:80},children:[new TextRun({text:t,bold:true,color:'333333',size:20})]})
    const p=t=>new Paragraph({spacing:{after:120},children:[new TextRun({text:String(t||''),size:20,color:'444444'})]})
    const sp=()=>new Paragraph({children:[new TextRun({text:''})]})
    const mkTable=(headers,rows,hColor='4F46E5')=>new Table({width:{size:100,type:WidthType.PERCENTAGE},layout:TableLayoutType.FIXED,rows:[new TableRow({children:headers.map(h=>new TableCell({shading:{fill:hColor,type:ShadingType.SOLID,color:hColor},margins:{top:80,bottom:80,left:100,right:100},children:[new Paragraph({children:[new TextRun({text:h,bold:true,color:'FFFFFF',size:18})]})]}))}),...rows.map((row,ri)=>new TableRow({children:row.map(cell=>new TableCell({shading:ri%2===1?{fill:'F5F5FF',type:ShadingType.SOLID,color:'F5F5FF'}:{fill:'FFFFFF',type:ShadingType.SOLID,color:'FFFFFF'},margins:{top:60,bottom:60,left:100,right:100},children:[new Paragraph({children:[new TextRun({text:String(cell||''),size:18,color:'333333'})]})]}))}))]})
    const doc=new Document({styles:{default:{document:{run:{font:'Calibri',size:20}}}},sections:[{children:[
      new Paragraph({spacing:{after:100},children:[new TextRun({text:'BUSINESS VALUE ANALYSIS REPORT',bold:true,size:36,color:'1e1b4b'})]}),
      new Paragraph({spacing:{after:60},children:[new TextRun({text:idea.title||'',size:26,color:'4F46E5',bold:true})]}),
      new Paragraph({spacing:{after:60},children:[new TextRun({text:'Larsen & Toubro Limited  |  Digital Energy Solutions',size:18,color:'888888'})]}),
      new Paragraph({spacing:{after:60},children:[new TextRun({text:`Generated: ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}  |  v${idea.version||1}  |  Risk: ${idea.riskLevel}`,size:18,color:'999999'})]}),
      new Paragraph({spacing:{after:60},children:[new TextRun({text:`Project Duration: ${idea.paybackTimeline||'Not specified'}  |  Payback (computed): ${paybackMo} months = Investment / Annual Net CF`,size:18,color:'666666'})]}),
      new Paragraph({spacing:{after:200},children:[new TextRun({text:`Decision: ${goNoGo.replace('_',' ')}`,bold:true,size:24,color:goNoGo==='GO'?'10b981':goNoGo==='NO_GO'?'ef4444':'f59e0b'})]}),sp(),
      h2('1.  Idea Overview'),p(idea.description),idea.targetMarket?p(`Target Market: ${idea.targetMarket}`):sp(),idea.userExpectation?p(`User Expectation: ${idea.userExpectation}`):sp(),sp(),
      h2('2.  Key Financial Metrics'),
      mkTable(['Metric','Value'],[['ROI (%)',fmtPct(analysis.roiRatio,2)],['NPV (Rs.)',fmtRs(analysis.npv,2)],['IRR (%)',fmtPct(analysis.irr,2)],['Payback Period',`${paybackMo} months (${fmtN(analysis.paybackPeriodYears,2)} yrs) = Investment / Annual Net CF`],['BCR',fmtN(analysis.bcr,3)],['Break-Even Year',`Year ${fmtN(analysis.breakEvenYear,1)}`],['Gross Margin',fmtPct(analysis.grossMargin,1)],['Net Profit Margin',fmtPct(analysis.netProfitMargin,1)],['Risk Score',`${fmtN(rs,0)}%`],['WACC Applied','10% (Industry Standard)'],['Short-Term Revenue',fmtRs(analysis.shortTermRevenue,2)],['Long-Term Revenue',fmtRs(analysis.longTermRevenue,2)],['Decision',goNoGo.replace('_',' ')]]),sp(),
      h2('3.  Cost & Benefit Breakdown'),h3('3a.  Direct Costs'),
      mkTable(['Cost Component','Amount (Rs.)','Description'],[['CAPEX',fmtRs(analysis.capex,2),'Capital expenditure'],['Development Cost',fmtRs(analysis.developmentCost,2),'Software development'],['OPEX / Year',fmtRs(analysis.opex,2),'Annual operating expenses'],['Maintenance / Year',fmtRs(analysis.maintenanceCost,2),'Annual maintenance'],['TOTAL INVESTMENT',fmtRs(inv,2),'CAPEX + Development Cost']],'B82828'),sp(),
      h3('3b.  Expected Annual Benefits'),
      mkTable(['Benefit','Annual Amount (Rs.)','Type'],[['Revenue Generation',fmtRs(analysis.revenueGeneration,2),'Direct'],['Efficiency Gains',fmtRs(analysis.efficiencyGains,2),'Direct'],['Cost Savings',fmtRs(analysis.costSavings,2),'Direct'],['Total Benefit',fmtRs(tb,2),'Sum']],'106440'),sp(),
      h2('4.  Annual Cash Flow Projections'),
      mkTable(['Year','Net CF (Rs.)','Cumulative (Rs.)','Discounted CF (Rs.)','Status'],cf.map((v,i)=>{const cum=cf.slice(0,i+1).reduce((a,b)=>a+b,0);const disc=v/Math.pow(1+dr,i+1);return[`Year ${i+1}`,fmtRs(v,2),fmtRs(cum,2),fmtRs(disc,2),cum>=inv?'Recovered':'Recovering']})),sp(),
      h2('5.  Scenario Analysis'),
      p('Best Case: Optimistic — Revenue x1.30, Costs x0.90. Most Likely: Realistic — Base case. Worst Case: Pessimistic — Revenue x0.70, Costs x1.20  [AACE International]'),
      scenarios.length>0?mkTable(['Scenario','ROI (%)','NPV (Rs.)','IRR (%)','Payback (months)'],scenarios.map(sc=>[sc.label||sc.type,fmtPct(sc.roi),fmtRs(sc.npv,2),fmtPct(sc.irr),`${Math.round((sc.payback||0)*12)} months`])):p('No scenario data.'),sp(),
      h2('6.  Risk Assessment'),
      mkTable(['Risk Category','Risk %','Level','Mitigation'],[['Market Volatility',`${Math.round((rs*0.30/30)*100)}%`,getRiskLevel(rs*0.30,30),'Market monitoring, agile strategy'],['Technology Adoption',`${Math.round((rs*0.25/25)*100)}%`,getRiskLevel(rs*0.25,25),'Phased rollout, pilot testing'],['Financial / ROI',`${Math.round((rs*0.25/25)*100)}%`,getRiskLevel(rs*0.25,25),'Conservative projections'],['Policy / Regulatory',`${Math.round((rs*0.20/20)*100)}%`,getRiskLevel(rs*0.20,20),'Legal monitoring, compliance design'],['OVERALL RISK',`${fmtN(rs,0)}%`,getRiskLevel(rs,100),`Decision: ${goNoGo.replace('_',' ')}`]],'B43232'),sp(),
      h2('7.  AI-Generated Insights'),h3('Financial Assessment'),p(stripEmojis(analysis.aiInsights)||'Run evaluation to generate insights.'),h3('Market Insights'),p(stripEmojis(analysis.marketInsights)||'Run evaluation to generate insights.'),sp(),
      h2('8.  Formula References'),
      mkTable(['Formula','Definition','Source'],[['ROI','(Net Benefit / Total Cost) x 100','CFA Institute; PMBOK 7th Ed.'],['NPV','SUM[CFt / (1+r)^t] - C0','Brealey, Myers & Allen 13th Ed.'],['IRR','Rate r* where NPV=0 (Newton-Raphson)','Ross, Westerfield & Jordan 12th Ed.'],['Payback','Investment / Annual Net Cash Flow','Brigham & Houston 16th Ed.'],['BCR','PV(Benefits) / PV(Costs)','HM Treasury Green Book'],['Scenarios','Best x1.30 / Likely x1.00 / Worst x0.70','AACE International']],'323264'),
    ]}]})
    const blob=await Packer.toBlob(doc);saveAs(blob,`${sname()}_BVA.docx`)
  }

  const genJSON=()=>{
    const cf=getCF(),rs=analysis.riskScore||0,paybackMo=Math.round((analysis.paybackPeriodYears||0)*12)
    const data={meta:{tool:'IdeaBVA',org:'Larsen & Toubro Ltd - Digital Energy Solutions',generated:new Date().toISOString(),sensitivity:'LNT Internal Use Only',version:idea.version},idea:{title:idea.title,category:idea.category,description:idea.description,targetMarket:idea.targetMarket,riskLevel:idea.riskLevel,status:idea.status,projectDuration:idea.paybackTimeline},metrics:{roiRatio:analysis.roiRatio,npv:analysis.npv,irr:analysis.irr,paybackMonths:paybackMo,paybackYears:analysis.paybackPeriodYears,paybackFormula:'Initial Investment / Annual Net Cash Flow',bcr:analysis.bcr,breakEvenYear:analysis.breakEvenYear,grossMargin:analysis.grossMargin,netProfitMargin:analysis.netProfitMargin,riskScore:`${fmtN(rs,0)}%`,goNoGo:analysis.goNoGo,waccApplied:'10%',projectLifeYears:analysis.projectLifeYears,shortTermRevenue:analysis.shortTermRevenue,longTermRevenue:analysis.longTermRevenue},costs:{capex:analysis.capex,developmentCost:analysis.developmentCost,opex:analysis.opex,maintenanceCost:analysis.maintenanceCost,totalInitialInvestment:analysis.initialInvestment},benefits:{revenueGeneration:analysis.revenueGeneration,efficiencyGains:analysis.efficiencyGains,costSavings:analysis.costSavings},riskBreakdown:{marketVolatility:`${Math.round((rs*0.30/30)*100)}%`,technologyAdoption:`${Math.round((rs*0.25/25)*100)}%`,financialRoi:`${Math.round((rs*0.25/25)*100)}%`,policyRegulatory:`${Math.round((rs*0.20/20)*100)}%`,overall:`${fmtN(rs,0)}%`},cashFlows:cf.map((v,i)=>({year:i+1,cashFlow:v,cumulative:cf.slice(0,i+1).reduce((a,b)=>a+b,0),discounted:v/Math.pow(1.10,i+1)})),scenarios:scenarios.map(sc=>({type:sc.type,label:sc.label,roi:sc.roi,npv:sc.npv,irr:sc.irr,paybackMonths:Math.round((sc.payback||0)*12),totalCost:sc.totalCost,totalBenefit:sc.totalBenefit})),insights:{financial:stripEmojis(analysis.aiInsights),market:stripEmojis(analysis.marketInsights)}}
    saveAs(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),`${sname()}_BVA.json`)
  }

  if(loading) return <div style={{padding:60,textAlign:'center',color:'#888'}}>Loading...</div>

  return (
    <div style={{padding:'36px 44px',maxWidth:1100,fontFamily:'"DM Sans",sans-serif'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:22,fontSize:13}}>
        <Link to="/dashboard" style={{color:'#4F46E5',textDecoration:'none',fontWeight:500}}>Dashboard</Link>
        <span style={{color:'#ccc'}}>/</span>
        <Link to={`/ideas/${id}`} style={{color:'#4F46E5',textDecoration:'none',fontWeight:500}}>{idea?.title}</Link>
        <span style={{color:'#ccc'}}>/</span>
        <span style={{color:'#888'}}>Reports</span>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div><h1 style={{fontSize:24,fontWeight:700,color:'#111',margin:0}}>Report Generation</h1><p style={{color:'#888',fontSize:13,margin:'5px 0 0'}}>PDF (7 pages) · Excel (5 sheets) · PowerPoint (6 slides) · Word · JSON</p></div>
        <Link to={`/ideas/${id}/visuals`} style={{padding:'8px 14px',background:'#fff',color:'#333',border:'1.5px solid #ddd',borderRadius:10,textDecoration:'none',fontSize:13,fontWeight:500}}>Visuals</Link>
      </div>
      {!analysis&&<div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:10,padding:'12px 16px',marginBottom:22,fontSize:13,color:'#92400e'}}>No evaluation found. <Link to={`/ideas/${id}/roi`} style={{color:'#92400e',fontWeight:700}}>Run evaluation first</Link> to enable report exports.</div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:24}}>
        {FORMATS.map(f=>(
          <div key={f.id} style={{background:'#fff',borderRadius:14,padding:'18px 20px',border:'1px solid #eee',display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:52,height:52,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:f.color+'18'}}><span style={{fontSize:13,fontWeight:800,color:f.color}}>{f.icon}</span></div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:'#111',marginBottom:2}}>{f.label}</div>
              <div style={{fontSize:11,color:'#4F46E5',fontWeight:600,marginBottom:3}}>{f.pages}</div>
              <div style={{fontSize:12,color:'#888',lineHeight:1.5}}>{f.desc}</div>
            </div>
            <button onClick={()=>handleGenerate(f.id)} disabled={!analysis||gen===f.id} style={{padding:'10px 16px',border:'none',borderRadius:10,fontSize:12,fontWeight:700,flexShrink:0,fontFamily:'inherit',whiteSpace:'nowrap',background:!analysis?'#f0f0f0':gen===f.id?'#9ca3af':f.color,color:!analysis?'#aaa':'#fff',cursor:!analysis?'not-allowed':'pointer'}}>
              {gen===f.id?'Generating...':'Download'}
            </button>
          </div>
        ))}
      </div>
      {analysis&&(
        <div style={{background:'#fff',borderRadius:16,padding:'24px',border:'1px solid #eee'}}>
          <h3 style={{fontSize:13,fontWeight:700,color:'#111',margin:'0 0 16px'}}>All formats include these sections</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
            {['Cover page with L&T branding and Go/No-Go decision','ROI, NPV, IRR, Payback (months = Investment/Annual CF), BCR, Risk %','Annual cash flows with cumulative and discounted values','Cost breakdown — CAPEX, OPEX, Development, Maintenance','Benefit breakdown — Revenue, Efficiency Gains, Cost Savings','Short-term (Yr 1-2) and Long-term (Yr 3+) revenue','Qualitative indirect benefits — Brand, ESG, Compliance','Risk heatmap — percentage scores for all 4 categories','Scenario analysis — Best Case / Most Likely / Worst Case with descriptions','Strategic viability — PASS/FAIL criteria table','AI-generated insights — clean text, no emojis','Formula citations — CFA, Brealey, Brigham, HM Treasury, AACE'].map(item=>(
              <div key={item} style={{fontSize:12,color:'#555',padding:'5px 0',borderBottom:'1px solid #f5f5f5'}}>{item}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
