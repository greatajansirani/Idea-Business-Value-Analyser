const express=require('express'); const router=express.Router()
const {body,validationResult}=require('express-validator')
const {PrismaClient}=require('@prisma/client')
const {authenticate}=require('../middleware/auth')
const prisma=new PrismaClient()

router.get('/',authenticate,async(req,res,next)=>{
  try {
    const{page=1,limit=10,status,category,search}=req.query; const skip=(parseInt(page)-1)*parseInt(limit)
    const where={...(req.user.role!=='ADMIN'&&{userId:req.user.id}),...(status&&{status}),...(category&&{category}),...(search&&{OR:[{title:{contains:search,mode:'insensitive'}},{description:{contains:search,mode:'insensitive'}}]})}
    const[ideas,total]=await Promise.all([prisma.idea.findMany({where,skip,take:parseInt(limit),orderBy:{updatedAt:'desc'},include:{user:{select:{name:true,email:true}},roiAnalysis:{select:{roiRatio:true,npv:true,goNoGo:true,riskScore:true}}}}),prisma.idea.count({where})])
    res.json({ideas,total,page:parseInt(page),totalPages:Math.ceil(total/parseInt(limit))})
  } catch(e){next(e)}
})

router.get('/:id',authenticate,async(req,res,next)=>{
  try {
    const idea=await prisma.idea.findUnique({where:{id:req.params.id},include:{user:{select:{id:true,name:true,email:true}},roiAnalysis:true,scenarios:true,reports:{orderBy:{generatedAt:'desc'}},auditLogs:{include:{user:{select:{name:true}}},orderBy:{createdAt:'desc'},take:20}}})
    if(!idea) return res.status(404).json({error:'Idea not found'})
    res.json(idea)
  } catch(e){next(e)}
})

router.post('/',[body('title').trim().notEmpty(),body('category').notEmpty(),body('description').trim().notEmpty(),body('investmentCost').isFloat({min:0}),body('expectedBenefit').isFloat({min:0})],authenticate,async(req,res,next)=>{
  try {
    const errors=validationResult(req); if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()})
    const{title,category,description,targetMarket,investmentCost,expectedBenefit,paybackTimeline,riskLevel,userExpectation}=req.body
    const idea=await prisma.idea.create({data:{title,category,description,targetMarket,investmentCost:parseFloat(investmentCost),expectedBenefit:parseFloat(expectedBenefit),paybackTimeline:paybackTimeline||'',riskLevel:riskLevel||'MEDIUM',userExpectation,userId:req.user.id,status:'DRAFT'},include:{user:{select:{name:true,email:true}}}})
    await prisma.auditLog.create({data:{ideaId:idea.id,userId:req.user.id,action:'CREATED',details:{title},version:1}})
    res.status(201).json(idea)
  } catch(e){next(e)}
})

router.put('/:id',authenticate,async(req,res,next)=>{
  try {
    const existing=await prisma.idea.findUnique({where:{id:req.params.id}}); if(!existing) return res.status(404).json({error:'Not found'})
    const allowed=['title','category','description','targetMarket','investmentCost','expectedBenefit','paybackTimeline','riskLevel','userExpectation','status']
    const updates={}; allowed.forEach(f=>{if(req.body[f]!==undefined) updates[f]=req.body[f]})
    const updated=await prisma.idea.update({where:{id:req.params.id},data:{...updates,version:{increment:1}},include:{user:{select:{name:true,email:true}},roiAnalysis:true}})
    await prisma.auditLog.create({data:{ideaId:updated.id,userId:req.user.id,action:'UPDATED',details:{changes:Object.keys(updates)},version:updated.version}})
    res.json(updated)
  } catch(e){next(e)}
})

router.delete('/:id',authenticate,async(req,res,next)=>{
  try {
    const idea=await prisma.idea.findUnique({where:{id:req.params.id}}); if(!idea) return res.status(404).json({error:'Not found'})
    await prisma.idea.delete({where:{id:req.params.id}}); res.json({message:'Idea deleted'})
  } catch(e){next(e)}
})

module.exports=router
