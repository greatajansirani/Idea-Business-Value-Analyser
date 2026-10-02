const express=require('express'); const router=express.Router()
const {PrismaClient}=require('@prisma/client'); const {authenticate}=require('../middleware/auth')
const prisma=new PrismaClient()
router.post('/:ideaId/generate',authenticate,async(req,res,next)=>{
  try {
    const{format='JSON'}=req.body
    const[idea,roiAnalysis,scenarios]=await Promise.all([prisma.idea.findUnique({where:{id:req.params.ideaId}}),prisma.roiAnalysis.findUnique({where:{ideaId:req.params.ideaId}}),prisma.scenario.findMany({where:{ideaId:req.params.ideaId}})])
    if(!idea) return res.status(404).json({error:'Idea not found'})
    if(!roiAnalysis) return res.status(400).json({error:'Run evaluation first'})
    const data={meta:{tool:'IdeaBVA',org:'L&T Digital Energy Solutions',generated:new Date().toISOString()},idea,metrics:roiAnalysis,scenarios}
    await prisma.report.create({data:{ideaId:idea.id,format}})
    res.setHeader('Content-Type','application/json')
    res.setHeader('Content-Disposition',`attachment; filename="${idea.title.replace(/[^a-z0-9]/gi,'_')}_BVA.json"`)
    res.send(Buffer.from(JSON.stringify(data,null,2)))
  } catch(e){next(e)}
})
router.get('/:ideaId',authenticate,async(req,res,next)=>{
  try { const reports=await prisma.report.findMany({where:{ideaId:req.params.ideaId},orderBy:{generatedAt:'desc'}}); res.json({reports}) } catch(e){next(e)}
})
module.exports=router
