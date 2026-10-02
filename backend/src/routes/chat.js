const express=require('express'); const router=express.Router()
const {PrismaClient}=require('@prisma/client'); const {authenticate}=require('../middleware/auth')
const aiService=require('../services/aiService'); const prisma=new PrismaClient()

router.post('/:ideaId',authenticate,async(req,res,next)=>{
  try {
    const{message}=req.body; if(!message?.trim()) return res.status(400).json({error:'Message required'})
    const[idea,roiAnalysis,scenarios,history]=await Promise.all([prisma.idea.findUnique({where:{id:req.params.ideaId}}),prisma.roiAnalysis.findUnique({where:{ideaId:req.params.ideaId}}),prisma.scenario.findMany({where:{ideaId:req.params.ideaId}}),prisma.chatMessage.findMany({where:{ideaId:req.params.ideaId},orderBy:{createdAt:'asc'},take:20})])
    if(!idea) return res.status(404).json({error:'Idea not found'})
    await prisma.chatMessage.create({data:{ideaId:req.params.ideaId,userId:req.user.id,role:'USER',content:message}})
    const aiResponse=await aiService.chatWithIdea(idea,roiAnalysis,scenarios,history,message)
    const saved=await prisma.chatMessage.create({data:{ideaId:req.params.ideaId,userId:req.user.id,role:'ASSISTANT',content:aiResponse}})
    res.json({message:saved})
  } catch(e){next(e)}
})

router.get('/:ideaId',authenticate,async(req,res,next)=>{
  try { const messages=await prisma.chatMessage.findMany({where:{ideaId:req.params.ideaId},orderBy:{createdAt:'asc'},include:{user:{select:{name:true}}}}); res.json({messages}) } catch(e){next(e)}
})

router.delete('/:ideaId',authenticate,async(req,res,next)=>{
  try { await prisma.chatMessage.deleteMany({where:{ideaId:req.params.ideaId}}); res.json({message:'Chat cleared'}) } catch(e){next(e)}
})

module.exports=router
