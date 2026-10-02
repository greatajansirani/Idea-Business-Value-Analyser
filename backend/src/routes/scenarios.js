const express=require('express'); const router=express.Router()
const {PrismaClient}=require('@prisma/client'); const {authenticate}=require('../middleware/auth')
const prisma=new PrismaClient()
router.get('/:ideaId',authenticate,async(req,res,next)=>{
  try { const scenarios=await prisma.scenario.findMany({where:{ideaId:req.params.ideaId},orderBy:{type:'asc'}}); res.json({scenarios}) } catch(e){next(e)}
})
module.exports=router
