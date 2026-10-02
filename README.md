# IdeaBVA — Idea Business Value Analyzer
### Larsen & Toubro | Digital Energy Solutions | MVP-1

---

## CRITICAL FIXES IN THIS VERSION

### Fix 1 — Investment Calculation Bug (CRITICAL)
**Bug:** System was using `idea.investmentCost` (rough estimate from idea form) as the
base for ALL financial calculations. This caused 13x errors in payback, ROI, IRR, NPV.

**Fix:** `initialInvestment = CAPEX + Development Cost` (from detailed ROI page inputs).
The idea form's "Investment Cost" is just an initial rough estimate — never used in formulas.

Before fix: idea.investmentCost=1,00,000 → payback=1 month, ROI=4000%, IRR=899%
After fix:  capex+devCost=13,62,233 → payback=20 months, ROI=156%, IRR=55%  ← CORRECT

### Fix 2 — Risk Score Always Showing Same % for All Components
**Bug:** Frontend derived each component as (composite * weight / weight) = same number.
e.g. composite=22% → market=22*0.30/30*100=22%, tech=22*0.25/25*100=22% — identical!

**Fix:** Financial engine now returns 4 INDEPENDENT scores stored in DB:
  riskMarket, riskTechnology, riskFinancial, riskRegulatory
Each scored 0-100 based on different idea-specific factors.
Result: Market=7%, Technology=12%, Financial=1%, Regulatory=35% — all different.

### Fix 3 — Go/No-Go Too Lenient (Every Project Was GO)
Raised thresholds: ROI>20% (was 15%), IRR>12% (was 10%), payback<55% life (was 60%), risk<50% (was 60%)

### Fix 4 — New Charts Added
- Project Efficiency Score (gauge chart showing return per rupee)
- Financial Insights panel (5 criteria with PASS/FAIL signals)

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
