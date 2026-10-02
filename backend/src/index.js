require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const rateLimit  = require('express-rate-limit')

const app = express()
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth',      require('./routes/auth'))
app.use('/api/ideas',     require('./routes/ideas'))
app.use('/api/analysis',  require('./routes/analysis'))
app.use('/api/scenarios', require('./routes/scenarios'))
app.use('/api/reports',   require('./routes/reports'))
app.use('/api/chat',      require('./routes/chat'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.get('/api/health', (req, res) => res.json({ status:'ok', timestamp:new Date().toISOString() }))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`IdeaBVA API running on port ${PORT}`))
module.exports = app
