const express  = require('express')
const router   = express.Router()
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const prisma = new PrismaClient()

router.post('/register',[body('name').trim().notEmpty(),body('email').isEmail(),body('password').isLength({min:8})], async(req,res,next)=>{
  try {
    const errors=validationResult(req); if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()})
    const {name,email,password,role}=req.body
    const existing=await prisma.user.findUnique({where:{email}})
    if(existing) return res.status(409).json({error:'Email already registered'})
    const hashed=await bcrypt.hash(password,12)
    const user=await prisma.user.create({data:{name,email,password:hashed,role:role||'ANALYST'},select:{id:true,name:true,email:true,role:true}})
    const token=jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'7d'})
    res.status(201).json({user,token})
  } catch(e){next(e)}
})

router.post('/login',[body('email').isEmail(),body('password').notEmpty()],async(req,res,next)=>{
  try {
    const errors=validationResult(req); if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()})
    const {email,password}=req.body
    const user=await prisma.user.findUnique({where:{email}})
    if(!user||!(await bcrypt.compare(password,user.password))) return res.status(401).json({error:'Invalid credentials'})
    const token=jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'7d'})
    const {password:_,...u}=user
    res.json({user:u,token})
  } catch(e){next(e)}
})

router.get('/me',authenticate,(req,res)=>res.json({user:req.user}))

router.put('/profile',authenticate,async(req,res,next)=>{
  try {
    const {name,currentPassword,newPassword}=req.body
    const updates={}; if(name) updates.name=name
    if(newPassword){
      const u=await prisma.user.findUnique({where:{id:req.user.id}})
      if(!(await bcrypt.compare(currentPassword,u.password))) return res.status(400).json({error:'Current password incorrect'})
      updates.password=await bcrypt.hash(newPassword,12)
    }
    const updated=await prisma.user.update({where:{id:req.user.id},data:updates,select:{id:true,name:true,email:true,role:true}})
    res.json({user:updated})
  } catch(e){next(e)}
})

module.exports = router
