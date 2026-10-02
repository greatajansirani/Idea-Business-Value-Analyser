const express=require('express'); const router=express.Router()
const {PrismaClient}=require('@prisma/client'); const {authenticate}=require('../middleware/auth')
const prisma=new PrismaClient()

router.get('/',authenticate,async(req,res,next)=>{
  try {
    const userId=req.user.role==='ADMIN'?undefined:req.user.id; const where=userId?{userId}:{}
    const[total,byStatus,byGoNoGo,recentIdeas,avgMetrics]=await Promise.all([prisma.idea.count({where}),prisma.idea.groupBy({by:['status'],where,_count:true}),prisma.roiAnalysis.groupBy({by:['goNoGo'],_count:true}),prisma.idea.findMany({where,orderBy:{createdAt:'desc'},take:8,include:{roiAnalysis:{select:{roiRatio:true,npv:true,goNoGo:true,riskScore:true}}}}),prisma.roiAnalysis.aggregate({_avg:{roiRatio:true,npv:true,irr:true,riskScore:true}})])
    res.json({summary:{totalIdeas:total,byStatus:Object.fromEntries(byStatus.map(s=>[s.status,s._count])),byGoNoGo:Object.fromEntries(byGoNoGo.map(g=>[g.goNoGo,g._count])),averageROI:avgMetrics._avg.roiRatio||0,averageNPV:avgMetrics._avg.npv||0,averageIRR:avgMetrics._avg.irr||0,averageRiskScore:avgMetrics._avg.riskScore||0},recentIdeas})
  } catch(e){next(e)}
})

module.exports=router
