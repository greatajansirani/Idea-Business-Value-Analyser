# IdeaBVA — Idea Business Value Analyzer
### Larsen & Toubro | Digital Energy Solutions | MVP-1

 

---

## SETUP

### Database
```
psql -U postgres -c "CREATE DATABASE ibva_db;"
# OR: docker-compose up -d
```

### Backend
```
cd ibva/backend
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```

### Frontend
```
cd ibva/frontend
npm install
npm run dev
```

Open: http://localhost:3000
Login: demo@lnt.com / demo1234 | admin@lnt.com / admin1234

---

## FINANCIAL FORMULAS

| Formula | Definition | Source |
|---|---|---|
| Investment | CAPEX + Development Cost (NOT idea form estimate) | Internal |
| Payback | Investment / Annual Net Cash Flow | Brigham & Houston 16th Ed. |
| ROI | (Net Benefit / Total Cost) x 100 | CFA Institute; PMBOK 7th Ed. |
| NPV | SUM[CFt/(1+r)^t] - C0 | Brealey, Myers & Allen 13th Ed. |
| IRR | Rate where NPV=0 (Newton-Raphson) | Ross, Westerfield & Jordan |
| BCR | PV(Benefits)/PV(Costs) | HM Treasury Green Book |
| Scenarios | Best x1.30 / Likely x1.00 / Worst x0.70 | AACE International |

## RISK COMPONENTS (all independent, all different)
| Component | Weight | Driven By |
|---|---|---|
| Market Volatility | 30% | riskLevel input + category market uncertainty |
| Technology Adoption | 25% | category maturity + riskLevel |
| Financial Performance | 25% | actual ROI, NPV, IRR vs thresholds |
| Policy / Regulatory | 20% | industry compliance complexity + riskLevel |

LNT Internal Use Only
