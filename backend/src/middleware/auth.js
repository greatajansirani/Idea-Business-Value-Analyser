const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const authenticate = async (req, res, next) => {
  try {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' })
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id:true, name:true, email:true, role:true } })
    if (!user) return res.status(401).json({ error: 'User not found' })
    req.user = user
    next()
  } catch (e) {
    if (e.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' })
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' })
    next(e)
  }
}

module.exports = { authenticate }
