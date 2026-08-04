
/* ════════════════════════════════════════
   SUPABASE CONNECTION
   Fill these three values to connect real accounts. Until then, the app runs in
   "local mode" — accounts are simulated in your browser so you can still test.
   Get these from: Supabase dashboard → Project Settings → API
     supabaseUrl  = Project URL
     supabaseKey  = the "anon / public" key (safe to expose in frontend)
   And from Google Cloud Console → Credentials → OAuth 2.0 Client ID (for Gmail).
════════════════════════════════════════ */
const CARDIQ_CONFIG = {
  supabaseUrl:    "",   // e.g. "https://xxxx.supabase.co"  — leave "" for local mode
  supabaseKey:    "",   // your anon/public key
  googleClientId: "",   // Google OAuth client id (only needed for Gmail sync)
  functionsBase:  ""    // e.g. "https://xxxx.supabase.co/functions/v1"
};

// Create the Supabase client if keys are present AND the library loaded.
// `sb` is null in local mode; every auth function checks for it and falls back.
let sb = null;
(function initSupabase(){
  try{
    if(CARDIQ_CONFIG.supabaseUrl && CARDIQ_CONFIG.supabaseKey && window.supabase){
      sb = window.supabase.createClient(CARDIQ_CONFIG.supabaseUrl, CARDIQ_CONFIG.supabaseKey);
      console.log("CardIQ: connected to Supabase.");
    } else {
      console.log("CardIQ: running in LOCAL mode (no Supabase keys set). Accounts are browser-only.");
    }
  }catch(e){ console.warn("CardIQ: Supabase init failed, using local mode.", e); sb=null; }
})();
function backendReady(){ return !!sb; }

/* ════════════════════════════════════════
   SHARED CONSTANTS
════════════════════════════════════════ */
const CATS=['online','dining','groceries','fuel','utilities','rent','travel','upi'];
const CAT_LABELS={online:'Online Shopping',dining:'Dining & Food',groceries:'Groceries',fuel:'Fuel',utilities:'Bills & Utilities',rent:'Rent',travel:'Travel',upi:'UPI Spends'};
const CAT_ICONS={online:'🛍',dining:'🍽',groceries:'🛒',fuel:'⛽',utilities:'💡',rent:'🏠',travel:'✈️',upi:'📱'};
const CAT_DEFAULTS={online:12000,dining:6000,groceries:8000,fuel:4000,utilities:5000,rent:20000,travel:3000,upi:10000};
const CAT_SHORT={online:'Online',dining:'Dining',groceries:'Groc',fuel:'Fuel',utilities:'Bills',rent:'Rent',travel:'Travel',upi:'UPI'};
const CARD_COLORS=['#534AB7','#3B6D11','#085041','#0C447C','#3B6D11','#1A4D2E','#7A3B00','#7A3B00','#633806','#1A3F6F','#712B13','#0C447C'];
const BADGE_STYLES=[
  {bg:'#EEEDFE',fg:'#3C3489'},{bg:'#EAF3DE',fg:'#27500A'},{bg:'#E1F5EE',fg:'#085041'},
  {bg:'#E6F1FB',fg:'#0C447C'},{bg:'#EAF3DE',fg:'#27500A'},{bg:'#EAF3DE',fg:'#1A4D2E'},
  {bg:'#FFF4E5',fg:'#7A3B00'},{bg:'#FFF4E5',fg:'#7A3B00'},{bg:'#FAEEDA',fg:'#633806'},
  {bg:'#E6F1FB',fg:'#1A3F6F'},{bg:'#FAECE7',fg:'#712B13'},{bg:'#E6F1FB',fg:'#0C447C'}
];
const SL_LABELS=['Low','Med','High','V.High','Max'];

/* ════════════════════════════════════════
   DEFAULT DATABASE
════════════════════════════════════════ */
const DEFAULT_DB=[{"id":0,"name":"HDFC Millennia","bank":"HDFC Bank","network":"Visa/Mastercard","annualFee":1000,"minSpend":0,"minSalary":35000,"rewardType":"cashback","pointValue":1.0,"pointValueHigh":1.0,"pointValueLow":1.0,"overallCap":2000,"rewards":{"online":5.0,"dining":5.0,"fuel":0,"groceries":1.0,"utilities":1.0,"travel":1.0,"upi":0,"rent":0},"caps":{"online":20000,"dining":20000,"fuel":null,"groceries":null,"utilities":null,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":100000,"milestones":[{"spend":100000,"period":"quarter","value":1000,"label":"\u20b91,000 voucher or lounge access per quarter at \u20b91L spend"}],"excludedCats":["rent","fuel"],"welcomeBonus":{"value":1000,"label":"1,000 CashPoints on joining fee payment"},"stability":"High","verifiedDate":"2026-08-02","lifetimeFree":false,"benefits":"5% on Amazon/Flipkart/Swiggy/Zomato/Myntra/Uber (10 partners, \u20b91000/mo cap), 1% others, fee waived at \u20b91L/yr, \u20b91000 quarterly milestone voucher at \u20b91L/qtr. Excludes rent, fuel, EMI, wallet, govt.","minCibil":750,"ecosystem":null},{"id":1,"name":"SBI Cashback","bank":"SBI Card","network":"Visa/Mastercard/RuPay","annualFee":999,"minSpend":0,"minSalary":30000,"rewardType":"cashback","pointValue":1.0,"pointValueHigh":1.0,"pointValueLow":1.0,"overallCap":2000,"rewards":{"online":5.0,"dining":5.0,"fuel":0,"groceries":5.0,"utilities":5.0,"travel":5.0,"upi":0,"rent":0},"caps":{"online":40000,"dining":40000,"fuel":null,"groceries":40000,"utilities":40000,"travel":40000,"upi":null,"rent":null},"feeWaiverSpend":200000,"milestones":[],"excludedCats":["rent","fuel"],"welcomeBonus":null,"stability":"Med","verifiedDate":"2026-08-02","lifetimeFree":false,"benefits":"5% on ALL online spends any merchant (\u20b92000/mo cap after Apr 2026 devaluation), 1% offline, fee waived at \u20b92L/yr. Excludes rent, fuel, wallet.","minCibil":750,"ecosystem":null},{"id":2,"name":"Amazon Pay ICICI","bank":"ICICI Bank","network":"Visa","annualFee":0,"minSpend":0,"minSalary":25000,"rewardType":"cashback","pointValue":1.0,"pointValueHigh":1.0,"pointValueLow":1.0,"overallCap":null,"rewards":{"online":5.0,"dining":2.0,"fuel":1.0,"groceries":2.0,"utilities":2.0,"travel":2.0,"upi":0,"rent":0},"caps":{"online":null,"dining":null,"fuel":null,"groceries":null,"utilities":null,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":null,"milestones":[],"excludedCats":["rent"],"welcomeBonus":null,"stability":"High","verifiedDate":"2026-08-02","lifetimeFree":true,"benefits":"Lifetime free. 5% on Amazon (Prime, uncapped), 2% Amazon Pay partners, 1% others. Auto-credited Amazon Pay balance, no expiry. Excludes rent.","minCibil":720,"ecosystem":"Amazon Prime"},{"id":3,"name":"Axis Ace","bank":"Axis Bank","network":"Visa","annualFee":499,"minSpend":0,"minSalary":25000,"rewardType":"cashback","pointValue":1.0,"pointValueHigh":1.0,"pointValueLow":1.0,"overallCap":null,"rewards":{"online":1.5,"dining":4.0,"fuel":0,"groceries":1.5,"utilities":5.0,"travel":1.5,"upi":0,"rent":1.5},"caps":{"online":null,"dining":12500,"fuel":null,"groceries":null,"utilities":10000,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":200000,"milestones":[],"excludedCats":["fuel"],"welcomeBonus":null,"stability":"High","verifiedDate":"2026-08-02","lifetimeFree":false,"benefits":"5% on utility bills via Google Pay (\u20b9500/mo cap), 4% Swiggy/Zomato/Ola (\u20b9500/mo cap), 1.5% unlimited others incl rent (via GPay), 4 lounge/yr, fee waived at \u20b92L/yr.","minCibil":720,"ecosystem":null},{"id":4,"name":"SBI SimplyCLICK","bank":"SBI Card","network":"Visa/Mastercard","annualFee":499,"minSpend":0,"minSalary":20000,"rewardType":"points","pointValue":0.25,"pointValueHigh":0.3,"pointValueLow":0.15,"overallCap":null,"rewards":{"online":10.0,"dining":2.5,"fuel":0,"groceries":2.5,"utilities":2.5,"travel":2.5,"upi":0,"rent":0},"caps":{"online":10000,"dining":null,"fuel":null,"groceries":null,"utilities":null,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":100000,"milestones":[{"spend":100000,"period":"year","value":2000,"label":"\u20b92,000 Cleartrip/Yatra voucher at \u20b91L annual"},{"spend":200000,"period":"year","value":2000,"label":"\u20b92,000 voucher at \u20b92L annual"}],"excludedCats":["rent","fuel"],"welcomeBonus":{"value":500,"label":"\u20b9500 Amazon voucher on joining"},"stability":"High","verifiedDate":"2026-08-02","lifetimeFree":false,"benefits":"10X points (2.5% value) on Amazon/Myntra/BookMyShow/Cleartrip partners, 5X other online, 1 pt/\u20b9100 offline. \u20b9500 welcome + \u20b92000 milestone vouchers. Fee waived at \u20b91L/yr.","minCibil":700,"ecosystem":null},{"id":5,"name":"IDFC First Wealth","bank":"IDFC First Bank","network":"Visa","annualFee":0,"minSpend":0,"minSalary":30000,"rewardType":"points","pointValue":0.25,"pointValueHigh":0.3,"pointValueLow":0.2,"overallCap":null,"rewards":{"online":2.5,"dining":2.5,"fuel":0,"groceries":2.5,"utilities":2.5,"travel":2.5,"upi":0.75,"rent":0},"caps":{"online":null,"dining":null,"fuel":null,"groceries":null,"utilities":null,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":null,"milestones":[],"excludedCats":["fuel","rent"],"welcomeBonus":null,"stability":"High","verifiedDate":"2026-08-02","lifetimeFree":true,"benefits":"Lifetime free. 10X points (2.5%) above \u20b920k/mo spend, 3X below, never expire. 4 lounge/qtr (\u20b920k prev month). Low forex 1.5%. Excludes fuel, rent, EMI.","minCibil":730,"ecosystem":null},{"id":6,"name":"Tata Neu Infinity HDFC","bank":"HDFC Bank","network":"RuPay","annualFee":1499,"minSpend":0,"minSalary":35000,"rewardType":"cashback","pointValue":1.0,"pointValueHigh":1.0,"pointValueLow":1.0,"overallCap":null,"rewards":{"online":5.0,"dining":5.0,"fuel":1.5,"groceries":5.0,"utilities":1.5,"travel":1.5,"upi":1.5,"rent":0},"caps":{"online":null,"dining":null,"fuel":null,"groceries":null,"utilities":null,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":300000,"milestones":[],"excludedCats":["rent"],"welcomeBonus":{"value":1499,"label":"1,499 NeuCoins on joining (offsets fee)"},"stability":"Med","verifiedDate":"2026-08-02","lifetimeFree":false,"benefits":"5% NeuCoins on Tata brands (BigBasket/Croma/Tata1mg/Titan/Tanishq), 1.5% others incl UPI (RuPay), fee waived at \u20b93L/yr, lounge access. Excludes rent.","minCibil":750,"ecosystem":"Tata Neu app"},{"id":7,"name":"Flipkart Axis","bank":"Axis Bank","network":"Visa/Mastercard","annualFee":500,"minSpend":0,"minSalary":25000,"rewardType":"cashback","pointValue":1.0,"pointValueHigh":1.0,"pointValueLow":1.0,"overallCap":null,"rewards":{"online":5.0,"dining":4.0,"fuel":0,"groceries":1.5,"utilities":1.5,"travel":4.0,"upi":0,"rent":0},"caps":{"online":null,"dining":null,"fuel":null,"groceries":null,"utilities":null,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":350000,"milestones":[],"excludedCats":["rent","fuel"],"welcomeBonus":{"value":500,"label":"\u20b9500 Flipkart voucher on joining"},"stability":"High","verifiedDate":"2026-08-02","lifetimeFree":false,"benefits":"5% unlimited on Flipkart/Myntra/Cleartrip, 4% Swiggy/PVR/Uber/Cultfit, 1.5% others, fee waived at \u20b93.5L/yr, 4 lounge/yr. Excludes rent, fuel.","minCibil":720,"ecosystem":"Flipkart"},{"id":8,"name":"HDFC Regalia Gold","bank":"HDFC Bank","network":"Visa/Mastercard","annualFee":2500,"minSpend":0,"minSalary":100000,"rewardType":"points","pointValue":0.65,"pointValueHigh":1.0,"pointValueLow":0.35,"overallCap":null,"rewards":{"online":2.6,"dining":2.6,"fuel":0,"groceries":2.6,"utilities":2.6,"travel":5.2,"upi":0,"rent":0},"caps":{"online":null,"dining":null,"fuel":null,"groceries":null,"utilities":null,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":400000,"milestones":[{"spend":150000,"period":"year","value":2500,"label":"\u20b92,500 voucher at \u20b91.5L annual"},{"spend":500000,"period":"year","value":5000,"label":"\u20b95,000 voucher at \u20b95L annual"}],"excludedCats":["rent","fuel"],"welcomeBonus":{"value":2500,"label":"2,500 reward points on joining"},"stability":"High","verifiedDate":"2026-08-02","lifetimeFree":false,"benefits":"4 pts/\u20b9150 (2.6% base, 5.2% on travel via SmartBuy), 12 domestic + 6 intl lounge/yr, 5X on M&S/Reliance/Nykaa, fee waived at \u20b94L/yr. Milestone vouchers. Excludes rent, fuel.","minCibil":770,"ecosystem":null},{"id":9,"name":"Axis Airtel","bank":"Axis Bank","network":"Visa","annualFee":500,"minSpend":0,"minSalary":25000,"rewardType":"cashback","pointValue":1.0,"pointValueHigh":1.0,"pointValueLow":1.0,"overallCap":null,"rewards":{"online":1.0,"dining":1.0,"fuel":0,"groceries":1.0,"utilities":10.0,"travel":1.0,"upi":0,"rent":0},"caps":{"online":null,"dining":null,"fuel":null,"groceries":null,"utilities":3000,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":200000,"milestones":[],"excludedCats":["rent","fuel"],"welcomeBonus":null,"stability":"Med","verifiedDate":"2026-08-02","lifetimeFree":false,"benefits":"25% cashback on Airtel services (mobile/broadband/DTH via Airtel Thanks), 10% on utility bills via Airtel Thanks (\u20b9300/mo cap), 1% others, fee waived at \u20b92L/yr. Changed Apr 2026.","minCibil":720,"ecosystem":"Airtel"},{"id":10,"name":"SBI BPCL Octane","bank":"SBI Card","network":"Visa/RuPay","annualFee":1499,"minSpend":0,"minSalary":30000,"rewardType":"points","pointValue":0.25,"pointValueHigh":0.25,"pointValueLow":0.25,"overallCap":null,"rewards":{"online":2.5,"dining":2.5,"fuel":7.25,"groceries":2.5,"utilities":1.0,"travel":2.5,"upi":0,"rent":0},"caps":{"online":null,"dining":null,"fuel":10000,"groceries":null,"utilities":null,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":200000,"milestones":[],"excludedCats":["rent"],"welcomeBonus":{"value":1499,"label":"1,499 bonus points offsetting fee"},"stability":"High","verifiedDate":"2026-08-02","lifetimeFree":false,"benefits":"7.25% value-back at BPCL pumps (25 pts/\u20b9100, \u20b910k/mo fuel cap), 10X on dining/groceries/movies, fee waived at \u20b92L/yr. Best for car commuters. Excludes rent.","minCibil":740,"ecosystem":null},{"id":11,"name":"Kotak League Platinum","bank":"Kotak Mahindra","network":"Visa","annualFee":0,"minSpend":0,"minSalary":20000,"rewardType":"points","pointValue":0.25,"pointValueHigh":0.3,"pointValueLow":0.2,"overallCap":null,"rewards":{"online":1.0,"dining":2.0,"fuel":0,"groceries":1.0,"utilities":1.0,"travel":1.0,"upi":0,"rent":0},"caps":{"online":null,"dining":null,"fuel":null,"groceries":null,"utilities":null,"travel":null,"upi":null,"rent":null},"feeWaiverSpend":null,"milestones":[],"excludedCats":["rent","fuel"],"welcomeBonus":null,"stability":"Med","verifiedDate":"2026-08-02","lifetimeFree":true,"benefits":"Lifetime free. 8X points on weekend dining, 4 pts/\u20b9150 base (1% value), fuel surcharge waiver. Entry-level. Excludes rent, fuel.","minCibil":700,"ecosystem":null}];

/* ════════════════════════════════════════
   LIVE STATE (loaded from localStorage)
════════════════════════════════════════ */
let DB=[];
let auditLog=[];
let nextId=12;
let expandedId=null;

const prefs={rewardType:'any',milesValue:'avg',
  income:null,          // net monthly income in ₹ (null = not provided)
  cibil:null,           // approx CIBIL band: 'excellent'(750+),'good'(700-749),'fair'(650-699),'building'(<650),null
  ecosystems:[],        // memberships: 'Amazon Prime','Flipkart','Airtel','Tata Neu app'
  hideIneligible:true   // whether to hide cards the user likely can't get
};
// CIBIL band → representative score for comparison against card minCibil
const CIBIL_SCORE={excellent:780,good:725,fair:675,building:620};
let walletSize=2;
const spendB={...CAT_DEFAULTS};

/* ════════════════════════════════════════
   ACCOUNT & PLAN STATE
   Three layers:
   - 'anon' : no login. Full recommendation engine, session-only (nothing saved).
   - 'free' : logged in. Everything anon has + persistence, tracking, reports,
              manual reminders (≤5 cards), export, referrals.
   - 'pro'  : paid ₹499/yr (Pro) or ₹999/yr (Pro+). + Gmail sync, reconciliation, auto-alerts,
              unlimited cards, priority support.
   This is a client-side simulation of the account system; when the Supabase
   backend is connected, session.user + subscriptions table drive `account`.
════════════════════════════════════════ */
const account={
  status:'anon',            // 'anon' | 'free' | 'pro' | 'proplus'
  email:null,
  userId:null,              // Supabase user id when signed in for real
  MAX_FREE_TRACKED:5        // free tier: up to 5 tracked cards for reminders
};

/* ════════════════════════════════════════
   DEMOGRAPHIC STRATEGY  (India 2026, evidence-based)
   Sources: RBI/TransUnion CIBIL/SBI Card FY26 reports.
   - Cardholders grew 3.6x in a decade to 5.2cr; ~118.6M cards in circulation.
   - HALF of new-to-credit users are Gen Z and live BEYOND metros.
   - 77% of UPI-active credit users + 81% of UPI-credit spend = Tier 2/3 cities.
   - Avg cards per user rising 1.5 to 2.5 by 2026 (multi-card = optimizer's TAM).
   - Indians lose THOUSANDS OF CRORES/yr in expired/unredeemed points.
   Implication: the mass-market wedge is UPI-first, tier-2/3, Gen Z, and the
   sharpest quantified pain is EXPIRING POINTS + banks UNDERPAYING rewards.
   SaveSage has moved upmarket to premium travel-hacking (metro affluent),
   leaving this segment open. CardIQ targets it deliberately.
════════════════════════════════════════ */
const DEMOGRAPHIC={
  primarySegment:'Gen Z & young professionals, Tier 2/3 India, UPI-first',
  acutePains:['points expiring unused','banks underpaying earned rewards','paying fees that rewards never offset'],
  painHeadline:'Indians lose thousands of crores in expired card points every year.',
  painSub:'CardIQ tells you what you earn, warns you before points lapse, and checks the bank actually paid you.'
};

/* ════════════════════════════════════════
   CASE-STUDY WISDOM  (encoded failure lessons)
   Hard guardrails distilled from real fintech post-mortems so the product
   never repeats them. Surfaced in How-It-Works and used to keep positioning honest.
════════════════════════════════════════ */
const FAILURE_LESSONS=[
  {name:'Voly (neobank, 2022)',lesson:'Budgeting/gamification is a feature, not a product \u2014 near-zero willingness to pay.',applied:'Our paid tier solves ACUTE pain (expiring points, underpaid rewards), not "nicer analytics".'},
  {name:'Coin / Plastc (hardware wallets)',lesson:'A 10% better product loses to funded incumbents; you need a 10x wedge.',applied:'Our wedge is web-first + no forced email access + reconciliation \u2014 things SaveSage structurally can\u2019t copy.'},
  {name:'Flooz (points currency, 2001)',lesson:'Died from fraud exposure and thin trust; became a laundering vehicle.',applied:'We move no money and read ONLY bank-sender emails, storing none \u2014 trust is the moat.'},
  {name:'Sleek (SMB cards)',lesson:'"We do what Brex does but smaller" is a losing pitch against deep-pocketed incumbents.',applied:'We don\u2019t copy SaveSage; we out-trust and out-honest them for the mass market they abandoned.'},
  {name:'Thrillist / Punch\u2019d (loyalty)',lesson:'Two-sided merchant subsidies and manual sales never scaled.',applied:'Zero merchant subsidy: we\u2019re pure software with ~90% margins and no marketplace to bootstrap.'}
];

/* ════════════════════════════════════════
   REVENUE MODEL  (pure software, ~90% margin, no inventory)
   Three streams, none of which require negotiating with banks/merchants:
     1. SUBSCRIPTION — Pro at ₹499/yr, Pro+ at ₹999/yr (undercuts SaveSage; volume play, not price)
     2. AFFILIATE    — commission when a user we ALREADY recommend a card applies.
                       CRITICAL RULE: affiliate NEVER changes ranking. Links appear
                       only on cards the engine independently ranked. This is the moat.
     3. REDEMPTION   — referral cut when a user converts expiring points into a gift
                       card via a partner aggregator. We hold no inventory (Flooz-safe).
   We do NOT: issue points, move money, run a marketplace, or take bank sponsorships.
════════════════════════════════════════ */
// Affiliate availability is metadata ABOUT a card, deliberately separate from the
// ranking fields, so it can never leak into the scoring math.
const AFFILIATE = {
  // cardId : {available, estCommission (₹ per approved application, indicative)}
  0:{available:true, est:1500}, 1:{available:true, est:1200}, 2:{available:true, est:800},
  3:{available:true, est:1000}, 4:{available:true, est:900},  5:{available:true, est:1100},
  6:{available:true, est:1300}, 7:{available:true, est:1000}, 8:{available:true, est:2000},
  9:{available:false,est:0},    10:{available:true,est:1200}, 11:{available:false,est:0}
};
function affiliateFor(cardId){return AFFILIATE[cardId]||{available:false,est:0};}
// Apply link — in production this is your tracked affiliate URL per bank.
// Bank application URLs — replace with your tracked affiliate links in production
const BANK_APPLY_URLS = {
  0: 'https://www.hdfcbank.com/personal/pay/cards/credit-cards',  // HDFC
  1: 'https://www.hdfcbank.com/personal/pay/cards/credit-cards',
  2: 'https://www.sbicard.com/en/personal/credit-cards.page',
  3: 'https://www.sbicard.com/en/personal/credit-cards.page',
  4: 'https://www.axisbank.com/retail/cards/credit-card',
  5: 'https://www.axisbank.com/retail/cards/credit-card',
  6: 'https://www.idfcfirstbank.com/credit-card',
  7: 'https://www.idfcfirstbank.com/credit-card',
  8: 'https://www.icicibank.com/card/credit-cards',
  9: 'https://www.kotak.com/en/personal-banking/cards/credit-cards.html',
  10: 'https://www.axisbank.com/retail/cards/credit-card',
  11: 'https://www.hdfcbank.com/personal/pay/cards/credit-cards'
};

function affiliateApply(cardId){
  const card=DB.find(c=>c.id===cardId);if(!card)return;
  const aff=affiliateFor(cardId);
  // record intent locally (for conversion analytics when backend is connected)
  try{const log=JSON.parse(localStorage.getItem('cardiq_apply_intent')||'[]');log.push({cardId,at:new Date().toISOString()});localStorage.setItem('cardiq_apply_intent',JSON.stringify(log));}catch(e){}
  
  if(aff.available){
    toastC(\`Opening \${card.name} application… (CardIQ earns a referral fee only if you're approved — it never changes our ranking.)\`);
  } else {
    toastC(\`Opening \${card.bank} cards page — search for \${card.name}.\`);
  }
  const url = BANK_APPLY_URLS[cardId] || \`https://www.google.com/search?q=\${encodeURIComponent(card.name+' apply online')}\`;
  window.open(url, '_blank');
}

// Gift-card redemption partners (referral cut, no inventory held).
const REDEMPTION_PARTNERS=[
  {name:'Amazon Pay',rate:0.03,minPts:500},
  {name:'Flipkart',rate:0.03,minPts:500},
  {name:'Myntra',rate:0.04,minPts:500},
  {name:'Swiggy Money',rate:0.05,minPts:300},
  {name:'BookMyShow',rate:0.05,minPts:300}
];
function isLoggedIn(){return account.status==='free'||account.status==='pro';}
function isPro(){return account.status==='pro'||account.status==='proplus';}

// Which features require which layer. Used by gate().
const FEATURE_TIER={
  // free (no login): category ranker + eligibility only
  // pro (₹499/yr): full wallet optimizer, tracking, reports, reminders
  saveWallet:'pro', tracking:'pro', monthlyReport:'pro', smsLog:'pro',
  manualReminders:'pro', dataExport:'pro', referrals:'pro',
  walletOptimizer:'pro', transactionTracker:'pro',
  // pro+ (₹999/yr): automation, reconciliation, gmail, family
  gmailSync:'proplus', reconciliation:'proplus', autoAlerts:'proplus',
  unlimitedCards:'proplus', prioritySupport:'proplus', familySharing:'proplus'
};
function tierRank(t){return t==='proplus'?3:t==='pro'?2:t==='free'?1:0;}
function hasAccessTo(feature){
  const need=FEATURE_TIER[feature]||'anon';
  const have=account.status;
  return tierRank(have)>=tierRank(need);
}
// Central gate: returns true if allowed; otherwise shows the right prompt and returns false.
function gate(feature){
  if(hasAccessTo(feature))return true;
  const need=FEATURE_TIER[feature]||'anon';
  if(need==='proplus'){showUpgradePrompt(feature, 'proplus');}
  else if(need==='pro'){showUpgradePrompt(feature, 'pro');}
  else if(need==='free'&&!isLoggedIn()){showLoginPrompt(feature);}
  else{showUpgradePrompt(feature, 'pro');}
  return false;
}

/* ── Auth modal rendering ── */
const FEATURE_NAMES={
  saveWallet:'save your wallet across devices',tracking:'transaction tracking & history',
  monthlyReport:'monthly reports',smsLog:'SMS-paste logging',manualReminders:'points & payment reminders',
  dataExport:'data export',referrals:'referrals',walletOptimizer:'full wallet optimizer',
  transactionTracker:'transaction tracker',gmailSync:'Gmail auto-sync',
  reconciliation:'reward reconciliation & dispute letters',autoAlerts:'automated email alerts',
  unlimitedCards:'unlimited tracked cards',prioritySupport:'priority support',
  familySharing:'family sharing (up to 3 accounts)'
};

function showLoginPrompt(feature){
  const feat=FEATURE_NAMES[feature]||'this feature';
  document.getElementById('auth-modal-body').innerHTML=`
    <div style="text-align:center;margin-bottom:1.25rem">
      <div style="font-family:'DM Serif Display',serif;font-size:24px;color:var(--navy);margin-bottom:.375rem">Create a free account</div>
      <div style="font-size:13px;color:var(--slate)">To ${feat}, sign in — it's free. Your recommendations stay free forever; logging in just lets us <strong>remember your data</strong>.</div>
    </div>
    <div style="background:var(--green-bg);border:1px solid rgba(29,184,122,.2);border-radius:10px;padding:.75rem 1rem;margin-bottom:1.25rem;font-size:12px;color:var(--green-text)">
      ✓ Free forever · ✓ No card required · ✓ Everything you use now stays free
    </div>
    <div class="fg" style="margin-bottom:.75rem"><label>Email</label><input type="email" id="auth-email" placeholder="you@example.com" style="width:100%;padding:9px 11px;border:1px solid var(--border-strong);border-radius:8px"></div>
    <div class="fg" style="margin-bottom:.75rem"><label>Password</label><input type="password" id="auth-pass" placeholder="At least 6 characters" style="width:100%;padding:9px 11px;border:1px solid var(--border-strong);border-radius:8px"></div>
    <button class="btn-run" onclick="doLogin('free')" style="width:100%;margin-bottom:.5rem">Create free account →</button>
    <div style="text-align:center;font-size:12px;color:var(--slate)">Same button signs you in if you already have an account.</div>
    <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);text-align:center;font-size:11px;color:var(--slate)">We only ever store what you choose to save. <a href="#" onclick="showTab('e');closeAuthModal();return false" style="color:var(--blue)">Privacy details</a></div>`;
  document.getElementById('auth-modal').style.display='flex';
}

function showUpgradePrompt(feature){
  const feat=FEATURE_NAMES[feature]||'this feature';
  const needLogin=!isLoggedIn();
  document.getElementById('auth-modal-body').innerHTML=`
    <div style="text-align:center;margin-bottom:1.25rem">
      <div style="display:inline-block;background:var(--gold);color:var(--navy);font-size:11px;font-weight:700;padding:3px 12px;border-radius:99px;margin-bottom:.75rem">PRO</div>
      <div style="font-family:'DM Serif Display',serif;font-size:24px;color:var(--navy);margin-bottom:.375rem">Unlock ${feat}</div>
      <div style="font-size:13px;color:var(--slate)">This is a Pro feature — the automation and analysis that save you the most money each month.</div>
    </div>
    <div style="background:var(--surface2);border-radius:12px;padding:1rem 1.25rem;margin-bottom:1.25rem">
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:.75rem"><span style="font-family:'DM Serif Display',serif;font-size:32px;color:var(--navy)">₹149</span><span style="font-size:13px;color:var(--slate)">/year</span><span style="margin-left:auto;font-size:11px;color:var(--gold);background:rgba(201,168,76,.15);padding:2px 8px;border-radius:99px;border:1px solid rgba(201,168,76,.3)">FOUNDING MEMBER</span></div>
      <div style="font-size:12px;color:var(--slate);line-height:1.9">
        ✓ Gmail auto-sync — no manual entry<br>
        ✓ Reconciliation — did the bank actually pay you?<br>
        ✓ Auto email alerts for expiry & payments<br>
        ✓ Unlimited tracked cards<br>
        ✓ Dispute letter generator<br>
        ✓ Priority support · 7-day free trial<br>
        ✓ This price is locked forever — never increases for you
      </div>
    </div>
    ${needLogin?`
    <div class="fg" style="margin-bottom:.6rem"><input type="email" id="auth-email" placeholder="you@example.com" style="width:100%;padding:9px 11px;border:1px solid var(--border-strong);border-radius:8px"></div>
    <div class="fg" style="margin-bottom:.75rem"><input type="password" id="auth-pass" placeholder="Create a password (min 6 chars)" style="width:100%;padding:9px 11px;border:1px solid var(--border-strong);border-radius:8px"></div>
    <button class="btn-run" onclick="doLogin('pro')" style="width:100%;margin-bottom:.5rem">Create account & start trial →</button>`:`<button class="btn-run" onclick="doUpgrade()" style="width:100%;margin-bottom:.5rem">Start 7-day free trial →</button>`}
    <div style="text-align:center;font-size:11px;color:var(--slate)">Clear refund policy · Cancel anytime</div>`;
  document.getElementById('auth-modal').style.display='flex';
}

function closeAuthModal(){document.getElementById('auth-modal').style.display='none';}

/* ════════════════════════════════════════
   AUTHENTICATION
   Real Supabase auth when connected; browser-only simulation otherwise.
   Both paths end by calling applyAccount() so the rest of the app is identical.
════════════════════════════════════════ */

// Create a free account (email + password). targetPlan lets the Pro flow reuse it.
async function doLogin(targetPlan){
  const emailEl=document.getElementById('auth-email');
  const passEl=document.getElementById('auth-pass');
  const email=emailEl?emailEl.value.trim():'';
  const pass=passEl?passEl.value:'';
  if(emailEl&&!email){emailEl.style.borderColor='var(--red)';return;}
  if(passEl&&(!pass||pass.length<6)){passEl.style.borderColor='var(--red)';toastC('Password must be at least 6 characters.');return;}

  if(backendReady()){
    // ---- REAL AUTH ----
    try{
      // Try sign-in first; if the user doesn't exist, sign them up.
      let { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if(error){
        const su = await sb.auth.signUp({ email, password: pass });
        if(su.error){ toastC('Sign-in failed: '+su.error.message); return; }
        data = su.data;
        // Supabase may require email confirmation depending on your project settings.
        if(!data.session){ toastC('Check your email to confirm your account, then sign in.'); closeAuthModal(); return; }
      }
      await afterAuth(data.user, targetPlan);
    }catch(e){ toastC('Auth error: '+e.message); }
  } else {
    // ---- LOCAL SIMULATION (no keys configured) ----
    account.status = targetPlan==='pro' ? 'pro' : 'free';
    account.email  = email || account.email || 'you@example.com';
    persistAccount();
    finishLogin(targetPlan);
  }
}

// Runs after a successful real sign-in/up: load or create the profile row,
// pull the plan, then sync any local data up to the cloud.
async function afterAuth(user, targetPlan){
  account.email = user.email;
  account.userId = user.id;
  // Ensure a profile row exists and read the plan.
  let plan='free';
  try{
    const { data: prof } = await sb.from('profiles').select('plan').eq('id', user.id).single();
    if(prof && prof.plan) plan = prof.plan;
    else { await sb.from('profiles').upsert({ id:user.id, email:user.email, plan:'free' }); }
  }catch(e){ /* table may not exist yet; default to free */ }
  account.status = (targetPlan==='pro') ? 'pro' : plan;
  await pullProfileFromCloud();   // cross-device: bring saved prefs/wallet down
  finishLogin(targetPlan);
}

function finishLogin(targetPlan){
  closeAuthModal();
  updateAccountUI();
  toastC(targetPlan==='pro'?'Pro trial started — all features unlocked':'Signed in — your data now syncs across devices');
  const active=document.querySelector('.nav-btn.active');
  if(active)active.click();
}

async function doUpgrade(tier){
  if(backendReady() && account.userId){
    // In production this happens via the Razorpay webhook server-side.
    // Here we optimistically flip; the webhook is the source of truth.
    try{ await sb.from('profiles').update({ plan:'pro' }).eq('id', account.userId); }catch(e){}
  }
  account.status=tier||'pro'; persistAccount(); closeAuthModal(); updateAccountUI();
  toastC('Pro trial started — all features unlocked');
}

async function doLogout(){
  if(backendReady()){ try{ await sb.auth.signOut(); }catch(e){} }
  account.status='anon'; account.email=null; account.userId=null;
  persistAccount(); updateAccountUI();
  toastC('Signed out.');
}

function persistAccount(){try{localStorage.setItem('cardiq_account',JSON.stringify({status:account.status,email:account.email,userId:account.userId||null}));}catch(e){}}
function loadAccount(){try{const s=localStorage.getItem('cardiq_account');if(s){const a=JSON.parse(s);account.status=a.status||'anon';account.email=a.email||null;account.userId=a.userId||null;}}catch(e){}}

// On page load, if a real Supabase session exists, restore it (this is what makes
// "stay logged in" and cross-device work).
async function restoreSession(){
  if(!backendReady()){ loadAccount(); return; }
  try{
    const { data:{ session } } = await sb.auth.getSession();
    if(session && session.user){ await afterAuthSilent(session.user); }
    else { account.status='anon'; }
  }catch(e){ loadAccount(); }
}
async function afterAuthSilent(user){
  account.email=user.email; account.userId=user.id;
  let plan='free';
  try{ const { data:prof } = await sb.from('profiles').select('plan').eq('id',user.id).single(); if(prof&&prof.plan) plan=prof.plan; }catch(e){}
  account.status=plan;
  await pullProfileFromCloud();
  updateAccountUI();
}

// Header account chip
function updateAccountUI(){
  const el=document.getElementById('account-chip');if(!el)return;
  if(account.status==='anon'){
    el.innerHTML=`<button class="acct-btn" onclick="showLoginPrompt('saveWallet')">Sign in — free</button>`;
  }else{
    const badge=account.status==='pro'?'<span class="acct-pro">PRO</span>':'<span class="acct-free">FREE</span>';
    el.innerHTML=`${badge}<span class="acct-email">${account.email||''}</span>${account.status==='free'?'<button class="acct-btn" onclick="showUpgradePrompt(\'gmailSync\')">Upgrade</button>':''}<button class="acct-link" onclick="doLogout()">Sign out</button>`;
  }
}

/* ════════════════════════════════════════
   PERSISTENCE  (localStorage — no server)
════════════════════════════════════════ */
function saveState(){
  try{localStorage.setItem('cardiq_db',JSON.stringify({db:DB,nextId,auditLog,myCards:[...myCards]}));}catch(e){}
}
function loadState(){
  try{
    const s=localStorage.getItem('cardiq_db');
    if(s){const p=JSON.parse(s);DB=p.db||deepCopy(DEFAULT_DB);nextId=p.nextId||8;auditLog=p.auditLog||[];myCards=new Set(p.myCards||[]);}
    else{DB=deepCopy(DEFAULT_DB);}
  }catch(e){DB=deepCopy(DEFAULT_DB);}
}
function deepCopy(o){return JSON.parse(JSON.stringify(o));}

/* ════════════════════════════════════════
   SHARED ENGINE HELPERS
════════════════════════════════════════ */
function today(){return new Date().toISOString().split('T')[0];}
function daysAgo(d){if(!d)return 999;return Math.floor((Date.now()-new Date(d).getTime())/86400000);}
function fresh(d){const n=daysAgo(d);if(n<=30)return{dot:'fdot-f',badge:'fb-f',label:'Fresh'};if(n<=90)return{dot:'fdot-a',badge:'fb-a',label:n+'d ago'};return{dot:'fdot-s',badge:'fb-s',label:n+'d — stale'};}
function getPV(card){if(prefs.milesValue==='high')return card.pointValueHigh;if(prefs.milesValue==='low')return card.pointValueLow;return card.pointValue;}

// Exclusion-aware, redemption-aware effective reward rate. Returns 0 for excluded categories.
// For point-type cards, the stored reward rate is the effective % at the card's BASE point value
// (pointValue). When the user selects a different redemption method (high/low), we rescale
// the effective rate by the ratio of the selected point value to the base.
function effRate(card,cat){
  if(card.excludedCats&&card.excludedCats.includes(cat))return 0;
  const raw=card.rewards[cat]||0;
  if(card.rewardType==='cashback')return raw; // cashback unaffected by redemption method
  // point card: rescale by redemption preference relative to base pointValue
  const base=card.pointValue||1;
  const selected=getPV(card);
  if(base>0&&selected!==base)return raw*(selected/base);
  return raw;
}
function topRate(card){return Math.max(...CATS.map(c=>effRate(card,c)));}

// GST rate on Indian card fees
const FEE_GST=0.18;

// Effective annual fee accounting for waiver threshold and GST.
// projectedAnnualSpend: total yearly spend across all categories on THIS card
function effectiveFee(card,projectedAnnualSpend){
  if(card.annualFee===0)return 0;
  // fee waived if annual spend clears the threshold
  if(card.feeWaiverSpend&&projectedAnnualSpend>=card.feeWaiverSpend)return 0;
  return card.annualFee*(1+FEE_GST);
}

// Annual milestone value earned given projected annual spend on this card.
// Quarterly milestones can be hit up to 4x/year if per-quarter spend clears the bar.
function milestoneValue(card,projectedAnnualSpend){
  if(!card.milestones||!card.milestones.length)return 0;
  let total=0;
  card.milestones.forEach(m=>{
    if(m.period==='quarter'){
      const perQuarter=projectedAnnualSpend/4;
      if(perQuarter>=m.spend)total+=m.value*4;
    }else{ // yearly
      if(projectedAnnualSpend>=m.spend)total+=m.value;
    }
  });
  return total;
}

// Assess whether the user is likely eligible for a card given income + CIBIL.
// Returns {eligible:bool, reasons:[...], severity:'ok'|'stretch'|'unlikely'}
function assessEligibility(card){
  const reasons=[];let severity='ok';
  // income check
  if(prefs.income!==null&&card.minSalary&&prefs.income<card.minSalary){
    const ratio=prefs.income/card.minSalary;
    if(ratio<0.7){reasons.push(`needs ₹${card.minSalary.toLocaleString('en-IN')}/mo income (you entered ₹${prefs.income.toLocaleString('en-IN')})`);severity='unlikely';}
    else{reasons.push(`income slightly below the ₹${card.minSalary.toLocaleString('en-IN')}/mo guideline`);if(severity==='ok')severity='stretch';}
  }
  // CIBIL check
  if(prefs.cibil!==null&&card.minCibil){
    const userScore=CIBIL_SCORE[prefs.cibil]||700;
    if(userScore<card.minCibil-30){reasons.push(`typically needs CIBIL ${card.minCibil}+ (your band ~${userScore})`);severity='unlikely';}
    else if(userScore<card.minCibil){reasons.push(`CIBIL ${card.minCibil}+ preferred`);if(severity==='ok')severity='stretch';}
  }
  return{eligible:severity!=='unlikely',reasons,severity};
}

// Ecosystem value factor: if a card's headline value needs a membership the user
// doesn't have, its top-category rewards are worth less. Returns 0..1 multiplier
// applied to the card's PRIMARY (online) reward when messaging value.
function ecosystemPenalty(card){
  if(!card.ecosystem)return{ok:true,note:null};
  const has=prefs.ecosystems.includes(card.ecosystem);
  if(has)return{ok:true,note:null};
  return{ok:false,note:`Needs ${card.ecosystem} for full value`};
}

function getPool(totalSpend){
  const ltfOnly=document.getElementById('g-sharia')?.checked;
  const noFeeOnly=document.getElementById('g-nofee')?.checked;
  const warnings=[];const eligible=[];const ineligible=[];
  DB.forEach(card=>{
    if(ltfOnly&&!card.lifetimeFree)return;
    if(noFeeOnly&&card.annualFee>0)return;
    if(prefs.rewardType==='cashback'&&card.rewardType!=='cashback')return;
    if(prefs.rewardType==='miles'&&card.rewardType==='cashback')return;
    if(totalSpend!==null&&card.minSpend&&totalSpend<card.minSpend){
      warnings.push({card,reason:`Requires ₹${card.minSpend.toLocaleString('en-IN')} monthly spend — your total is ₹${Math.round(totalSpend).toLocaleString('en-IN')}. Rewards will not be earned.`});
      return;
    }
    // eligibility gate
    const elig=assessEligibility(card);
    card._elig=elig; // stash for display
    card._eco=ecosystemPenalty(card);
    if(!elig.eligible&&prefs.hideIneligible){
      ineligible.push({card,elig});
      return;
    }
    eligible.push(card);
  });
  return{eligible,warnings,ineligible};
}

function renderWarnings(warnings,ineligible){
  let html='';
  if(warnings&&warnings.length){
    html+=`<div class="warn-list">${warnings.map(w=>`<div class="warn-item"><span>⚠</span><span><strong>${w.card.name}</strong> — ${w.reason}</span></div>`).join('')}</div>`;
  }
  if(ineligible&&ineligible.length){
    html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem;margin-bottom:1rem;font-size:12px;color:var(--slate)">
      <div style="font-weight:600;color:var(--navy);margin-bottom:6px">${ineligible.length} card${ineligible.length>1?'s':''} hidden — likely out of reach for your profile</div>
      ${ineligible.map(x=>`<div style="margin-bottom:3px">• <strong>${x.card.name}</strong>: ${x.elig.reasons.join('; ')}</div>`).join('')}
      <div style="margin-top:6px"><button class="btn" style="font-size:11px;padding:3px 10px" onclick="prefs.hideIneligible=false;runA();runB&&(typeof lastRunB!=='undefined'&&lastRunB);">Show them anyway</button></div>
    </div>`;
  }
  return html;
}

/* ════════════════════════════════════════
   FUZZY TOPSIS (Mode A)
════════════════════════════════════════ */
function runTOPSIS(cards,cat,spend,wR,wF,wC){
  const data=cards.map(card=>{
    const rate=effRate(card,cat);
    const cap=card.caps[cat];
    const effSpend=(cap&&cap<spend)?cap:spend;
    const mReward=effSpend*rate/100;
    const annualSpendThisCat=spend*12;
    // effective fee accounts for waiver (if this category's annual spend alone clears it) and GST
    const effFee=effectiveFee(card,annualSpendThisCat);
    // milestone value earned from this spend
    const mile=milestoneValue(card,annualSpendThisCat);
    const annualReward=mReward*12+mile;
    const capScore=cap?(cap>=spend?1.0:cap/spend):1.0;
    const msPen=card.minSpend>spend?(card.minSpend-spend):0;
    const benScore=(card.benefits?card.benefits.split(',').length:0)/4;
    return{...card,rate,effRate:rate,cap,effSpend,monthlyReward:mReward,
      effFee,milestoneVal:mile,
      annualReward,netAnnual:annualReward-effFee,
      capScore,msPen,benScore};
  });
  const criteria=[
    {key:'effRate',type:'benefit'},{key:'effFee',type:'cost'},
    {key:'capScore',type:'benefit'},{key:'msPen',type:'cost'},{key:'benScore',type:'benefit'}
  ];
  const weights=[wR*2,wF,wC,1,1];
  const tw=weights.reduce((s,v)=>s+v,0);
  const nw=weights.map(v=>v/tw);
  const vals=criteria.map(c=>data.map(d=>d[c.key]));
  const mins=vals.map(v=>Math.min(...v));
  const maxs=vals.map(v=>Math.max(...v));
  const normed=data.map(d=>criteria.map((c,ci)=>{const r=maxs[ci]-mins[ci];return r===0?0.5:(d[c.key]-mins[ci])/r;}));
  const weighted=normed.map(row=>row.map((v,ci)=>(criteria[ci].type==='cost'?1-v:v)*nw[ci]));
  const pis=weighted[0].map((_,ci)=>Math.max(...weighted.map(r=>r[ci])));
  const nis=weighted[0].map((_,ci)=>Math.min(...weighted.map(r=>r[ci])));
  return data.map((d,i)=>{
    const dP=Math.sqrt(weighted[i].reduce((s,v,ci)=>s+(v-pis[ci])**2,0));
    const dN=Math.sqrt(weighted[i].reduce((s,v,ci)=>s+(v-nis[ci])**2,0));
    const cc=dN/(dP+dN);
    return{...d,cc,score:Math.round(cc*100)};
  }).sort((a,b)=>b.cc-a.cc);
}

/* ════════════════════════════════════════
   COMBINATORIAL OPTIMIZER (Mode B)
════════════════════════════════════════ */
function portfolioValue(combo,spendMap){
  let totalR=0;const alloc={};
  // track annual spend routed to each card (for fee waiver + milestone calc)
  const cardAnnualSpend={};
  // track monthly reward accumulated per card (for shared overallCap enforcement)
  const cardMonthlyReward={};
  combo.forEach(c=>{cardAnnualSpend[c.id]=0;cardMonthlyReward[c.id]=0;});

  // First pass: assign each category to the best card, accumulate per-card monthly reward
  CATS.forEach(cat=>{
    const s=spendMap[cat]||0;
    if(!s){alloc[cat]={reward:0,card:null,rate:0,effSpend:0};return;}
    let best=0,bCard=null,bRate=0,bEff=0;
    combo.forEach(card=>{
      const rate=effRate(card,cat); // already exclusion-aware (returns 0 for excluded)
      const cap=card.caps[cat];
      const eff=(cap&&cap<s)?cap:s;
      const r=eff*rate/100;
      if(r>best){best=r;bCard=card;bRate=rate;bEff=eff;}
    });
    if(bCard)cardMonthlyReward[bCard.id]+=best;
    alloc[cat]={reward:best,card:bCard,rate:bRate,effSpend:bEff,rawSpend:s};
  });

  // Second pass: enforce each card's shared overallCap on total monthly reward.
  // If a card's accumulated monthly reward exceeds its overallCap, scale down proportionally.
  const cardCapFactor={};
  combo.forEach(card=>{
    const earned=cardMonthlyReward[card.id]||0;
    if(card.overallCap&&earned>card.overallCap){
      cardCapFactor[card.id]=card.overallCap/earned; // proportional scale-down
    }else{
      cardCapFactor[card.id]=1;
    }
  });

  // Apply cap factor to each category's reward, recompute totals
  totalR=0;
  CATS.forEach(cat=>{
    const a=alloc[cat];
    if(!a.card){return;}
    const factor=cardCapFactor[a.card.id];
    if(factor<1){
      a.cappedReward=a.reward*factor;
      a.wasCapped=true;
    }else{
      a.cappedReward=a.reward;
      a.wasCapped=false;
    }
    totalR+=a.cappedReward;
    cardAnnualSpend[a.card.id]+=a.rawSpend*12;
    // expose the effective reward as `reward` for downstream display
    a.reward=a.cappedReward;
  });

  // Track which cards hit their overall cap (for UI messaging)
  const cappedCards=combo.filter(c=>cardCapFactor[c.id]<1).map(c=>({
    card:c,earned:cardMonthlyReward[c.id],cap:c.overallCap
  }));

  // annual fees with waiver + GST, based on spend actually routed to each card
  let totalFeeAnnual=0,totalMilestone=0;
  combo.forEach(card=>{
    const spentOnCard=cardAnnualSpend[card.id]||0;
    totalFeeAnnual+=effectiveFee(card,spentOnCard);
    totalMilestone+=milestoneValue(card,spentOnCard);
  });

  const annualReward=totalR*12+totalMilestone;
  const netAnnual=annualReward-totalFeeAnnual;
  return{netMonthly:netAnnual/12,netAnnual,totalReward:totalR,
    feeMo:totalFeeAnnual/12,feeAnnual:totalFeeAnnual,milestoneTotal:totalMilestone,
    cardAnnualSpend,cappedCards,alloc};
}

function combos(arr,k){
  const res=[];
  function go(start,chosen){
    if(chosen.length===k){res.push([...chosen]);return;}
    for(let i=start;i<arr.length;i++){chosen.push(arr[i]);go(i+1,chosen);chosen.pop();}
  }
  go(0,[]);return res;
}

/* ════════════════════════════════════════
   UI HELPERS
════════════════════════════════════════ */
function updSl(sid,oid){document.getElementById(oid).textContent=SL_LABELS[parseInt(document.getElementById(sid).value)-1];}
function toggleDet(id){const p=document.getElementById(id);if(p)p.style.display=p.style.display==='block'?'none':'block';}

function showTab(t){
  ['a','b','c','d','e','f'].forEach(x=>{
    document.getElementById('tab-panel-'+x).style.display=x===t?'':'none';
    const btn=document.getElementById('tab-'+x);
    btn.classList.toggle('active',x===t);
    btn.setAttribute('aria-selected',x===t);
  });
  const showPrefs=t==='a'||t==='b';
  document.getElementById('prefs-bar').style.display=showPrefs?'':'none';
  document.getElementById('fresh-bar').style.display=t!=='e'?'':'none';
  if(t==='c')renderEditorTable();
  if(t==='d')renderMyCards();
  if(t==='f'){buildTrkCardSelect();renderTracker();}
  if(t==='e')populateHowItWorks();
  updateFreshBar();
}

function populateHowItWorks(){
  const sel=document.getElementById('rcr-card');
  if(sel&&!sel.options.length){
    sel.innerHTML=DB.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  }
  const rc=document.getElementById('ref-code-display');
  if(rc)rc.textContent=getReferralCode();
  const fl=document.getElementById('failure-lessons');
  if(fl&&!fl.innerHTML){
    fl.innerHTML=FAILURE_LESSONS.map(l=>`
      <div style="border-left:3px solid var(--gold);padding:.625rem 0 .625rem .875rem;margin-bottom:.75rem">
        <div style="font-size:13px;font-weight:600;color:var(--navy)">${l.name}</div>
        <div style="font-size:12px;color:var(--slate);margin:3px 0;line-height:1.55"><em>Lesson:</em> ${l.lesson}</div>
        <div style="font-size:12px;color:var(--green-text);line-height:1.55"><em>How CardIQ answers it:</em> ${l.applied}</div>
      </div>`).join('');
  }
}

function setPref(key,val,btn){
  prefs[key]=val;
  btn.closest('.ptog').querySelectorAll('.ptog-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function setWS(n){walletSize=n;document.querySelectorAll('.wsbtn').forEach((b,i)=>b.classList.toggle('active',i+1===n));}

function typeTag(card){
  if(card.rewardType==='miles')return`<span class="rpill rp-miles">Miles</span>`;
  if(card.rewardType==='points')return`<span class="rpill rp-pts">Points</span>`;
  return`<span class="rpill rp-cash">Cashback</span>`;
}

function updateFreshBar(){
  const stale=DB.filter(c=>daysAgo(c.verifiedDate)>90).length;
  const newest=DB.map(c=>c.verifiedDate||'').filter(Boolean).sort().pop()||'unknown';
  document.getElementById('fresh-date').textContent=newest.replace(/-/g,' ').replace(/(\d{4}) (\d{2}) (\d{2})/,(_,y,m,d)=>{
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
  });
  document.getElementById('fresh-count').textContent=`${DB.length} cards · ${stale>0?stale+' stale':'all current'}`;
}

/* ════════════════════════════════════════
   MODE A
════════════════════════════════════════ */
function runA(){
  const cat=document.getElementById('cat-sel').value;
  const spend=parseFloat(document.getElementById('spend-a').value)||15000;
  const wR=parseInt(document.getElementById('sl-r').value);
  const wF=parseInt(document.getElementById('sl-f').value);
  const wC=parseInt(document.getElementById('sl-c').value);
  const{eligible,warnings,ineligible}=getPool(spend);
  const catLabel=document.getElementById('cat-sel').options[document.getElementById('cat-sel').selectedIndex].text;
  let html=renderWarnings(warnings,ineligible);

  if(!eligible.length){
    html+=`<div class="empty"><span class="empty-ico">🃏</span>No cards match your filters.<br>Try relaxing a constraint above.</div>`;
    document.getElementById('res-a').innerHTML=html;return;
  }

  const ranked=runTOPSIS(eligible,cat,spend,wR,wF,wC);
  html+=`<div class="res-hdr"><h3>${catLabel} · ₹${spend.toLocaleString('en-IN')}/month · ${ranked.length} cards</h3><span class="res-meta">Ranked by Fuzzy TOPSIS</span></div>`;

  ranked.forEach((card,idx)=>{
    const isTop=idx===0;
    const bs=BADGE_STYLES[card.id%BADGE_STYLES.length];
    const rawRate=card.rewards[cat]||0;
    const er=effRate(card,cat);
    const convNote=card.rewardType!=='cashback'
      ?`<div class="effnote">${rawRate} ${card.rewardType==='miles'?'miles':'pts'}/₹→ <strong>${er.toFixed(2)}% eff. cashback</strong> @ ₹${getPV(card)}/unit</div>`:'';
    const capRaw=card.caps[cat];
    const capTxt=capRaw?(capRaw>=spend?'No cap risk':`Capped ₹${capRaw.toLocaleString('en-IN')}`):'No cap';
    const capCls=capRaw&&capRaw<spend?'warn':'pos';
    const netSign=card.netAnnual>=0?'+':'';
    const netCls=card.netAnnual>=0?'nv-pos':'nv-neg';
    const isExcluded=card.excludedCats&&card.excludedCats.includes(cat);
    const feeWaived=card.effFee===0&&card.annualFee>0;
    const feeDisplay=card.annualFee===0?'Free':feeWaived?'Waived':'₹'+Math.round(card.effFee).toLocaleString('en-IN');
    const feeCls=(card.annualFee===0||feeWaived)?'pos':'';
    // fee-worth-it verdict
    let feeVerdict='';
    if(card.annualFee===0){feeVerdict='<span class="ctag ctag-good">No fee ever</span>';}
    else if(feeWaived){feeVerdict='<span class="ctag ctag-good">Fee waived at your spend</span>';}
    else{feeVerdict=`<span class="ctag ctag-warn">Fee ₹${Math.round(card.effFee)} not waived — costs you net</span>`;}
    // ecosystem note
    const eco=card._eco||ecosystemPenalty(card);
    const ecoNote=eco.ok?'':`<span class="ctag ctag-warn">${eco.note}</span>`;
    // eligibility badge
    const elig=card._elig||{severity:'ok',reasons:[]};
    let eligBadge='';
    if(elig.severity==='stretch')eligBadge=`<span class="ctag ctag-warn" title="${elig.reasons.join('; ')}">Approval: a stretch</span>`;
    else if(elig.severity==='unlikely')eligBadge=`<span class="ctag ctag-warn" title="${elig.reasons.join('; ')}">Approval: unlikely</span>`;

    html+=`<div class="crd ${isTop?'top':''}">
      ${isTop?'<div class="top-badge">★ Top pick</div>':''}
      <div class="crd-top">
        <div class="crd-left">
          <div class="bank-badge" style="background:${bs.bg};color:${bs.fg}">${card.bank.slice(0,2).toUpperCase()}</div>
          <div>
            <div class="crd-name">${card.name}${typeTag(card)}${card.lifetimeFree?'<span class="rpill rp-sh">Lifetime Free</span>':''}</div>
            <div class="crd-bank">${card.bank}</div>
          </div>
        </div>
        <div class="score-blk"><div class="score-n">${card.score}</div><div class="score-s">match score</div></div>
      </div>
      <div class="sbar"><div class="sbar-fill" style="width:${card.score}%"></div></div>
      ${isExcluded?`<div style="background:var(--red-bg);border:1px solid rgba(217,59,59,.2);border-radius:8px;padding:6px 10px;font-size:11px;color:var(--red-text);margin-bottom:.75rem">⚠ ${catLabel} is excluded on this card — earns ₹0. Shown for comparison only.</div>`:''}
      ${!eco.ok?`<div style="background:var(--amber-bg);border:1px solid rgba(232,148,10,.2);border-radius:8px;padding:6px 10px;font-size:11px;color:var(--amber-text);margin-bottom:.75rem">💡 ${eco.note} — its headline rate assumes you use ${card.ecosystem}.</div>`:''}
      <div class="mets">
        <div class="met"><div class="ml">Eff. reward rate</div><div class="mv ${isExcluded?'neg':'pos'}">${er.toFixed(2)}%</div>${convNote}</div>
        <div class="met"><div class="ml">Monthly reward</div><div class="mv ${isExcluded?'neg':'pos'}">₹${Math.round(card.monthlyReward)}</div></div>
        <div class="met"><div class="ml">Cap status</div><div class="mv ${capCls}">${capTxt}</div></div>
        <div class="met"><div class="ml">Annual fee ${feeWaived?'(GST incl.)':''}</div><div class="mv ${feeCls}">${feeDisplay}</div>${feeWaived?`<div class="effnote">Waived at ₹${(card.feeWaiverSpend/100000).toFixed(1)}L/yr spend</div>`:''}</div>
      </div>
      ${card.milestoneVal>0?`<div style="background:var(--green-bg);border:1px solid rgba(29,184,122,.2);border-radius:8px;padding:6px 10px;font-size:11px;color:var(--green-text);margin-bottom:.75rem">🎯 Milestone bonus: ₹${card.milestoneVal.toLocaleString('en-IN')}/year included in net value below</div>`:''}
      <div class="crd-bot">
        <div><div class="net-lbl">Net annual value</div><div class="net-val ${netCls}">${netSign}₹${Math.abs(Math.round(card.netAnnual)).toLocaleString('en-IN')} / year</div></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="ctags">
            ${feeVerdict}
            ${eligBadge}
            ${ecoNote}
            ${card.stability==='High'?'<span class="ctag ctag-good">Stable rewards</span>':'<span class="ctag ctag-warn">Reward risk: med</span>'}
            ${card.minSpend>spend?`<span class="ctag ctag-warn">Min spend ₹${card.minSpend.toLocaleString('en-IN')}</span>`:''}
          </div>
          <button class="det-btn" onclick="toggleDet('da-${card.id}')">Show reasoning ↓</button>
          ${(!myCards.has(card.id)&&affiliateFor(card.id).available&&isTop)?`<button class="apply-btn" onclick="affiliateApply(${card.id})" title="CardIQ earns a referral fee only if you're approved. It never changes our ranking.">Apply for this card →</button>`:''}
        </div>
      </div>
      <div class="det-panel" id="da-${card.id}">
        ${isExcluded?`<strong style="color:var(--red-text)">⚠ ${catLabel} is on this card's exclusion list — it earns ₹0 here.</strong><br>`:''}
        <strong>Reward calculation:</strong> ₹${spend.toLocaleString('en-IN')} on ${catLabel}${capRaw&&capRaw<spend?` → capped at ₹${capRaw.toLocaleString('en-IN')}`:''}
        → ${er.toFixed(2)}% → <strong>₹${Math.round(card.monthlyReward)}/month</strong> = ₹${Math.round(card.monthlyReward*12).toLocaleString('en-IN')}/yr.
        ${card.milestoneVal>0?`<br><strong>Milestone bonus:</strong> +₹${card.milestoneVal.toLocaleString('en-IN')}/yr (from ${card.milestones.map(m=>m.label).join('; ')}).`:''}
        <br><strong>Annual fee:</strong> ${card.annualFee===0?'Lifetime free (₹0).':feeWaived?`₹${card.annualFee} + 18% GST = ₹${Math.round(card.annualFee*1.18)}, but <span style="color:var(--green-text)">WAIVED</span> because annual spend clears ₹${(card.feeWaiverSpend/100000).toFixed(1)}L threshold.`:`₹${card.annualFee} + 18% GST = ₹${Math.round(card.effFee)} (not waived — needs ₹${(card.feeWaiverSpend/100000).toFixed(1)}L/yr spend).`}
        <br><strong>Net value:</strong> ₹${Math.round(card.annualReward).toLocaleString('en-IN')} rewards+milestone − ₹${Math.round(card.effFee).toLocaleString('en-IN')} fee = <strong style="color:${card.netAnnual>=0?'var(--green-text)':'var(--red-text)'}">₹${Math.abs(Math.round(card.netAnnual)).toLocaleString('en-IN')}/yr</strong>.
        ${card.welcomeBonus?`<br><strong>First-year bonus:</strong> ${card.welcomeBonus.label} (₹${card.welcomeBonus.value.toLocaleString('en-IN')} one-time, not included in recurring value above).`:''}
        <br><strong>TOPSIS score ${card.score}/100:</strong> Closeness Coefficient across reward rate (w=${wR}), effective fee (w=${wF}), cap flexibility (w=${wC}), min spend, benefits.
        ${card.excludedCats&&card.excludedCats.length?`<br><strong>Exclusions:</strong> earns ₹0 on ${card.excludedCats.map(x=>CAT_LABELS[x]).join(', ')}.`:''}
        <br><strong>About:</strong> ${card.benefits||'—'}
      </div>
    </div>`;
  });

  html+=`<div class="meth"><strong>Method:</strong> Fuzzy TOPSIS (Chen, 2000). Net value accounts for: reward caps, category exclusions (rent/fuel earn ₹0 where applicable), annual fee waivers at spend thresholds, 18% GST on fees, and quarterly/annual milestone bonuses. Points converted at ${prefs.milesValue} redemption. <strong>No sponsored rankings</strong> — where you see "Apply", CardIQ may earn a referral fee if you're approved, but this <em>never</em> affects the ranking above.</div>`;
  html+=saveNudge();
  document.getElementById('res-a').innerHTML=html;
}

// Subtle nudge shown to anonymous users under results: recommendations are free,
// login just saves them. Never blocks the result.
function saveNudge(){
  if(isLoggedIn())return'';
  return`<div style="background:var(--surface2);border:1px dashed var(--border-strong);border-radius:10px;padding:.75rem 1rem;margin-top:1rem;display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap">
    <span style="font-size:12px;color:var(--slate)">💾 This recommendation is free. <strong style="color:var(--navy)">Sign in (also free)</strong> to save your wallet, track spending, and get reminders.</span>
    <button class="btn btn-info" style="font-size:12px;white-space:nowrap" onclick="showLoginPrompt('saveWallet')">Save my results →</button>
  </div>`;
}

/* ════════════════════════════════════════
   MODE B
════════════════════════════════════════ */
function buildSpendGrid(){
  document.getElementById('spend-grid-b').innerHTML=CATS.map(cat=>`
    <div class="slrow">
      <label>${CAT_ICONS[cat]} ${CAT_LABELS[cat]} <span id="sv-${cat}">₹${spendB[cat].toLocaleString('en-IN')}</span></label>
      <input type="range" min="0" max="${cat==='fuel'?15000:cat==='utilities'?15000:cat==='upi'?40000:50000}" step="500" value="${spendB[cat]}"
        oninput="spendB['${cat}']=parseInt(this.value);document.getElementById('sv-${cat}').textContent='₹'+parseInt(this.value).toLocaleString('en-IN');updTotal()">
    </div>`).join('');
  updTotal();
}
function updTotal(){const t=Object.values(spendB).reduce((s,v)=>s+v,0);const el=document.getElementById('total-disp');if(el)el.textContent=`Total: ₹${t.toLocaleString('en-IN')}/month`;}

function runB(){
  const total=Object.values(spendB).reduce((s,v)=>s+v,0);
  const{eligible,warnings,ineligible}=getPool(total);
  let html=renderWarnings(warnings,ineligible);

  if(eligible.length<walletSize){
    html+=`<div class="empty"><span class="empty-ico">🃏</span>Not enough eligible cards for a ${walletSize}-card wallet.</div>`;
    document.getElementById('res-b').innerHTML=html;return;
  }

  const all=[];
  for(let k=1;k<=walletSize;k++)combos(eligible,k).forEach(combo=>{const r=portfolioValue(combo,spendB);all.push({combo,k,...r});});
  all.sort((a,b)=>b.netAnnual-a.netAnnual);

  const best=all[0];
  const singleBest=all.filter(x=>x.k===1).sort((a,b)=>b.netAnnual-a.netAnnual)[0];
  const uplift=best.netAnnual-(singleBest?.netAnnual||0);
  const cmap={};best.combo.forEach(c=>{cmap[c.id]=CARD_COLORS[c.id%CARD_COLORS.length];});

  html+=`<div class="winner">
    <div class="w-top">
      <div>
        <div class="w-lbl">★ Optimal ${best.combo.length}-card wallet</div>
        <div class="wpills">${best.combo.map(c=>`<div class="wpill"><div class="wpill-dot" style="background:${cmap[c.id]}"></div><span>${c.name}</span><span class="wpill-fee">${c.annualFee===0?'Free':'₹'+c.annualFee.toLocaleString('en-IN')+'/yr'}</span></div>`).join('')}</div>
      </div>
      <div class="w-net">
        <div class="w-net-big">${best.netAnnual>=0?'+':''}₹${Math.round(best.netAnnual).toLocaleString('en-IN')}</div>
        <div class="w-net-sub">net annual value</div>
        <div class="w-net-mo">₹${Math.round(best.netMonthly).toLocaleString('en-IN')}/month</div>
      </div>
    </div>
    <div class="alloc-wrap">
      <table class="atbl">
        <thead><tr><th>Category</th><th>Spend</th><th>Use this card</th><th>Rate</th><th>Reward</th></tr></thead>
        <tbody>`;

  const maxR=Math.max(...CATS.map(c=>best.alloc[c]?.reward||0));
  let totR=0;
  CATS.forEach(cat=>{
    const a=best.alloc[cat];const s=spendB[cat]||0;if(!s)return;
    const col=a.card?cmap[a.card.id]:'#666';
    const capW=a.card&&a.card.caps[cat]&&a.card.caps[cat]<s?`<div class="acap">⚠ capped ₹${a.card.caps[cat].toLocaleString('en-IN')}</div>`:'';
    const bp=maxR>0?Math.round(a.reward/maxR*100):0;totR+=a.reward;
    html+=`<tr>
      <td>${CAT_ICONS[cat]} ${CAT_LABELS[cat]}</td><td>₹${s.toLocaleString('en-IN')}</td>
      <td>${a.card?`<span class="cdot" style="background:${col}"></span>${a.card.name}${capW}`:'<span style="opacity:.4">No card</span>'}</td>
      <td style="opacity:.7">${a.rate?a.rate.toFixed(2)+'%':'—'}</td>
      <td><span class="areward">+₹${Math.round(a.reward)}</span><div class="mbar"><div class="mbar-fill" style="width:${bp}%;background:${col}"></div></div></td>
    </tr>`;
  });
  const feeNote=best.feeAnnual>0?`Fees: ₹${Math.round(best.feeAnnual).toLocaleString('en-IN')}/yr (GST incl.)`:'Fees: ₹0 (waived/LTF)';
  html+=`</tbody><tfoot><tr><td colspan="2">Total · ₹${total.toLocaleString('en-IN')}/month</td><td>${feeNote}</td><td></td><td style="color:var(--gold)">+₹${Math.round(totR).toLocaleString('en-IN')}/mo</td></tr></tfoot></table></div>
    ${best.milestoneTotal>0?`<div style="margin-top:.75rem;padding:8px 12px;background:rgba(29,184,122,.12);border-radius:8px;font-size:12px;color:var(--gold)">🎯 Includes ₹${best.milestoneTotal.toLocaleString('en-IN')}/yr in milestone bonuses from hitting quarterly/annual spend thresholds</div>`:''}
    </div>`;

  if(uplift>100&&best.combo.length>1)html+=`<div class="insight"><strong>Why multiple cards win:</strong> This ${best.combo.length}-card wallet earns <strong>₹${Math.round(uplift).toLocaleString('en-IN')} more per year</strong> than the best single card (${singleBest.combo[0].name} at ₹${Math.round(singleBest.netAnnual).toLocaleString('en-IN')}/yr). Rewards are optimised per category, fees waived where spend clears thresholds, and milestone bonuses counted.</div>`;

  const top3=all.slice(0,3);
  html+=`<div style="font-size:11px;font-weight:600;color:var(--slate);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem">Top 3 of ${all.length} combinations evaluated</div><div class="cmp-grid">`;
  top3.forEach((opt,i)=>{
    const delta=i===0?null:opt.netAnnual-best.netAnnual;
    html+=`<div class="cmp-card"><div class="cmp-rank">#${i+1} — ${opt.combo.length} card${opt.combo.length>1?'s':''}</div><div class="cmp-name">${opt.combo.map(c=>c.name.split(' ')[0]).join(' + ')}</div><div class="cmp-val ${opt.netAnnual>=0?'cv-pos':'cv-neg'}">${opt.netAnnual>=0?'+':''}₹${Math.round(opt.netAnnual).toLocaleString('en-IN')}/yr</div>${delta!==null?`<div class="cmp-delta">−₹${Math.round(Math.abs(delta)).toLocaleString('en-IN')} vs optimal</div>`:'<div class="cmp-best">Optimal ✓</div>'}</div>`;
  });
  html+=`</div>`;

  const sc=CATS.filter(c=>spendB[c]>0).sort((a,b)=>(best.alloc[b]?.reward||0)-(best.alloc[a]?.reward||0));
  const mxR=Math.max(...sc.map(c=>best.alloc[c]?.reward||0));
  html+=`<div class="cat-chart">`;
  sc.forEach(cat=>{
    const r=best.alloc[cat]?.reward||0;const card=best.alloc[cat]?.card;const col=card?cmap[card.id]:'#888';
    html+=`<div class="cat-row"><div class="cat-lbl">${CAT_ICONS[cat]} ${CAT_LABELS[cat]}</div><div class="cat-trk"><div class="cat-fill" style="width:${mxR>0?Math.round(r/mxR*100):0}%;background:${col}"></div></div><div class="cat-val">+₹${Math.round(r)}</div></div>`;
  });
  html+=`</div>`;
  html+=`<div class="meth"><strong>Method:</strong> Exhaustive combinatorial search (Pisinger, 1995; Mansini et al., 2015) over ${all.length} portfolios. Per category, spend is routed to the card maximising reward after caps and exclusions. Net value = (rewards × 12) + milestone bonuses − effective fees (waived where routed spend clears each card's threshold, else fee + 18% GST). No sponsored rankings.</div>`;
  html+=saveNudge();
  document.getElementById('res-b').innerHTML=html;
}

/* ════════════════════════════════════════
   DATABASE EDITOR
════════════════════════════════════════ */
function auditEntry(msg){auditLog.unshift({msg,ts:new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),date:new Date().toLocaleDateString('en-GB')});saveState();}

function renderAudit(){
  const el=document.getElementById('audit-list');if(!el)return;
  if(!auditLog.length){el.innerHTML='<div class="audit-empty">No changes yet</div>';return;}
  el.innerHTML=auditLog.slice(0,60).map(e=>`<div class="aentry"><span class="amsg">${e.msg}</span><span style="color:var(--slate);white-space:nowrap">${e.date} ${e.ts}</span></div>`).join('');
}

function renderEditorStats(){
  const stale=DB.filter(c=>daysAgo(c.verifiedDate)>90).length;
  const aging=DB.filter(c=>{const d=daysAgo(c.verifiedDate);return d>30&&d<=90;}).length;
  const sh=DB.filter(c=>c.sharia).length;
  document.getElementById('ed-stats').innerHTML=`
    <div class="stat"><div class="stat-lbl">Total cards</div><div class="stat-val">${DB.length}</div></div>
    <div class="stat"><div class="stat-lbl">Stale (&gt;90 days)</div><div class="stat-val ${stale>0?'swarn':'sok'}">${stale}</div></div>
    <div class="stat"><div class="stat-lbl">Aging (31–90d)</div><div class="stat-val ${aging>0?'swarn':'sok'}">${aging}</div></div>
    <div class="stat"><div class="stat-lbl">RuPay/UPI</div><div class="stat-val">${sh}</div></div>`;
  document.getElementById('ed-count').textContent=`${DB.length} cards`;
}

function renderEditorTable(){
  renderEditorStats();renderAudit();updateFreshBar();
  const tbody=document.getElementById('ed-tbody');if(!tbody)return;
  if(!DB.length){tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--slate);font-size:13px">No cards. Click "+ Add card".</td></tr>`;return;}
  tbody.innerHTML=DB.map((card,idx)=>{
    const bs=BADGE_STYLES[idx%BADGE_STYLES.length];
    const fr=fresh(card.verifiedDate);
    const tpc=card.rewardType==='cashback'?'tp-c':card.rewardType==='miles'?'tp-m':'tp-p';
    const isOpen=expandedId===card.id;

    const catFields=CATS.map(cat=>`<div class="fg" style="min-width:0">
      <label>${CAT_SHORT[cat]} %</label>
      <input type="number" min="0" max="30" step="0.1" value="${card.rewards[cat]??0}"
        oninput="updField(${card.id},'rewards','${cat}',parseFloat(this.value)||0)" style="font-size:11px;padding:4px 5px">
      <div class="fnote">Cap: <input type="number" min="0" step="100" placeholder="∞" value="${card.caps[cat]??''}"
        oninput="updField(${card.id},'caps','${cat}',parseFloat(this.value)||null)"
        style="width:52px;padding:2px 4px;font-size:10px;border:0.5px solid var(--border-strong);border-radius:4px;background:var(--white);color:var(--navy)"></div>
    </div>`).join('');

    return`<tr>
      <td>
        <div class="erow-main" onclick="toggleExpand(${card.id})">
          <div class="ebadge" style="background:${bs.bg};color:${bs.fg}">${card.bank.slice(0,2).toUpperCase()}</div>
          <div class="ename"><div class="ename-main">${card.name}</div><div class="ename-sub">${card.bank}</div></div>
          <span style="font-size:12px;color:var(--slate)">${isOpen?'▲':'▼'}</span>
        </div>
        <div class="expand-panel ${isOpen?'open':''}">
          <div class="sec-lbl">Core</div>
          <div class="g3">
            <div class="fg"><label>Card name</label><input type="text" value="${card.name}" oninput="updField(${card.id},'name',null,this.value)"></div>
            <div class="fg"><label>Bank</label><input type="text" value="${card.bank}" oninput="updField(${card.id},'bank',null,this.value)"></div>
            <div class="fg"><label>Reward type</label><select onchange="updField(${card.id},'rewardType',null,this.value)">
              <option value="cashback" ${card.rewardType==='cashback'?'selected':''}>Cashback</option>
              <option value="miles" ${card.rewardType==='miles'?'selected':''}>Miles</option>
              <option value="points" ${card.rewardType==='points'?'selected':''}>Points</option>
            </select></div>
          </div>
          <div class="g4" style="margin-top:6px">
            <div class="fg"><label>Annual fee (₹)</label><input type="number" min="0" value="${card.annualFee}" oninput="updField(${card.id},'annualFee',null,parseFloat(this.value)||0)"></div>
            <div class="fg"><label>Min spend (₹)</label><input type="number" min="0" value="${card.minSpend||0}" oninput="updField(${card.id},'minSpend',null,parseFloat(this.value)||0)"></div>
            <div class="fg"><label>Overall cap (₹)</label><input type="number" min="0" placeholder="none" value="${card.overallCap??''}" oninput="updField(${card.id},'overallCap',null,parseFloat(this.value)||null)"></div>
            <div class="fg"><label>Stability</label><select onchange="updField(${card.id},'stability',null,this.value)">
              <option value="High" ${card.stability==='High'?'selected':''}>High</option>
              <option value="Med" ${card.stability==='Med'?'selected':''}>Medium</option>
              <option value="Low" ${card.stability==='Low'?'selected':''}>Low</option>
            </select></div>
          </div>
          <div class="g3" style="margin-top:6px">
            <div class="fg"><label>Point val avg</label><input type="number" min="0" step="0.001" value="${card.pointValue||0.01}" oninput="updField(${card.id},'pointValue',null,parseFloat(this.value)||0.01)"></div>
            <div class="fg"><label>Point val high</label><input type="number" min="0" step="0.001" value="${card.pointValueHigh||0.01}" oninput="updField(${card.id},'pointValueHigh',null,parseFloat(this.value)||0.01)"></div>
            <div class="fg"><label>Point val low</label><input type="number" min="0" step="0.001" value="${card.pointValueLow||0.01}" oninput="updField(${card.id},'pointValueLow',null,parseFloat(this.value)||0.01)"></div>
          </div>
          <div class="fg" style="margin-top:6px"><label>Benefits (comma-separated)</label><input type="text" value="${card.benefits||''}" oninput="updField(${card.id},'benefits',null,this.value)"></div>
          <label style="font-size:12px;color:var(--slate);display:flex;align-items:center;gap:5px;margin-top:8px;cursor:pointer;"><input type="checkbox" ${card.sharia?'checked':''} onchange="updField(${card.id},'sharia',null,this.checked)"> RuPay/UPI</label>

          <div class="sec-lbl" style="margin-top:12px">Reward rates &amp; caps</div>
          <div class="g7">${catFields}</div>

          <div class="vrow">
            <label>Last verified:</label>
            <input type="date" value="${card.verifiedDate||''}" onchange="updVerified(${card.id},this.value)">
            <span class="fbadge ${fr.badge}">${fr.label}</span>
            <button class="btn btn-success" style="font-size:11px;padding:3px 8px" onclick="markToday(${card.id})">✓ Today</button>
          </div>
          <div class="row-acts">
            <button class="btn btn-danger" onclick="deleteCard(${card.id})">✕ Delete</button>
            <button class="btn" onclick="dupCard(${card.id})">⎘ Duplicate</button>
          </div>
        </div>
      </td>
      <td style="padding:10px 6px;vertical-align:middle"><span class="tpill ${tpc}">${card.rewardType}</span>${card.lifetimeFree?'<br><span class="spill" style="display:inline-block;margin-top:3px">LTF</span>':''}</td>
      <td style="padding:10px 6px;vertical-align:middle;font-size:13px;font-weight:600;color:var(--green-text)">${topRate(card).toFixed(1)}%</td>
      <td style="padding:10px 6px;vertical-align:middle;font-size:13px">${card.annualFee===0?'<span style="color:var(--green-text)">Free</span>':'₹'+card.annualFee.toLocaleString('en-IN')}</td>
      <td style="padding:10px 6px;vertical-align:middle;font-size:13px">₹${(card.minSpend||0).toLocaleString('en-IN')}</td>
      <td style="padding:10px 8px;vertical-align:middle"><span class="fl-dot ${fr.dot}" title="${fr.label}"></span></td>
      <td style="padding:10px 6px;vertical-align:middle"><button class="btn btn-success" style="padding:4px 8px" onclick="markToday(${card.id})" title="Mark verified today">✓</button></td>
    </tr>`;
  }).join('');
}

function toggleExpand(id){expandedId=expandedId===id?null:id;renderEditorTable();}

function updField(id,field,sub,val){
  const card=DB.find(c=>c.id===id);if(!card)return;
  const old=sub?(card[field]?.[sub]??'none'):card[field];
  if(sub){if(!card[field])card[field]={};card[field][sub]=val;}else card[field]=val;
  auditEntry(`"${card.name}" → ${field}${sub?'.'+sub:''}: ${JSON.stringify(old)} → ${JSON.stringify(val)}`);
  renderEditorStats();updateFreshBar();
}

function updVerified(id,v){const card=DB.find(c=>c.id===id);if(!card)return;card.verifiedDate=v;auditEntry(`"${card.name}" verified date → ${v}`);saveState();renderEditorTable();}

function markToday(id){
  const card=DB.find(c=>c.id===id);if(!card)return;
  card.verifiedDate=today();auditEntry(`"${card.name}" marked verified today`);saveState();renderEditorTable();toastC(`${card.name} marked as verified today`);
}

function deleteCard(id){
  const card=DB.find(c=>c.id===id);if(!card)return;
  if(!confirm(`Delete "${card.name}"?`))return;
  auditEntry(`Deleted: "${card.name}" (${card.bank})`);
  DB=DB.filter(c=>c.id!==id);if(expandedId===id)expandedId=null;
  saveState();renderEditorTable();toastC(`${card.name} deleted`);
}

function dupCard(id){
  const src=DB.find(c=>c.id===id);if(!src)return;
  const copy=deepCopy(src);copy.id=nextId++;copy.name=src.name+' (copy)';copy.verifiedDate=today();
  DB.push(copy);auditEntry(`Duplicated "${src.name}" → "${copy.name}"`);saveState();expandedId=copy.id;renderEditorTable();toastC(`Duplicated as "${copy.name}"`);
}

function openAddModal(){
  ['mn-name','mn-bank'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('mn-type').value='cashback';
  document.getElementById('mn-fee').value='0';
  document.getElementById('mn-ms').value='1000';
  document.getElementById('mn-pv').value='0.01';
  document.getElementById('mn-pvh').value='0.01';
  document.getElementById('mn-pvl').value='0.01';
  document.getElementById('mn-sh').checked=false;
  document.getElementById('mn-dt').value=today();
  document.getElementById('modal-err').style.display='none';
  document.getElementById('add-modal').classList.add('open');
}

function saveNewCard(){
  const name=document.getElementById('mn-name').value.trim();
  const bank=document.getElementById('mn-bank').value.trim();
  const fee=parseFloat(document.getElementById('mn-fee').value)||0;
  const errEl=document.getElementById('modal-err');
  if(!name){errEl.textContent='Card name required.';errEl.style.display='block';return;}
  if(!bank){errEl.textContent='Bank name required.';errEl.style.display='block';return;}
  if(fee<0){errEl.textContent='Fee cannot be negative.';errEl.style.display='block';return;}
  const nc={
    id:nextId++,name,bank,
    sharia:document.getElementById('mn-sh').checked,
    annualFee:fee,minSpend:parseFloat(document.getElementById('mn-ms').value)||0,
    rewardType:document.getElementById('mn-type').value,
    pointValue:parseFloat(document.getElementById('mn-pv').value)||0.01,
    pointValueHigh:parseFloat(document.getElementById('mn-pvh').value)||0.01,
    pointValueLow:parseFloat(document.getElementById('mn-pvl').value)||0.01,
    overallCap:null,
    rewards:{dining:0,groceries:0,travel:0,fuel:0,shopping:0,utilities:0,international:0},
    caps:{dining:null,groceries:null,travel:null,fuel:null,shopping:null,utilities:null,international:null},
    stability:'Med',verifiedDate:document.getElementById('mn-dt').value||today(),benefits:''
  };
  DB.push(nc);auditEntry(`Added: "${name}" (${bank})`);saveState();closeModal('add-modal');
  expandedId=nc.id;renderEditorTable();toastC(`"${name}" added — fill in reward rates below`);
}

function openImportModal(){
  document.getElementById('import-txt').value='';
  document.getElementById('import-err').style.display='none';
  document.getElementById('import-modal').classList.add('open');
}

function importDB(){
  const txt=document.getElementById('import-txt').value.trim();
  const errEl=document.getElementById('import-err');
  try{
    const p=JSON.parse(txt);
    if(!Array.isArray(p)||!p.length)throw new Error('Must be a non-empty JSON array');
    p.forEach((c,i)=>{if(!c.name)throw new Error(`Card ${i}: missing name`);if(typeof c.annualFee!=='number')throw new Error(`Card ${i}: annualFee must be a number`);});
    DB=p;nextId=Math.max(...DB.map(c=>c.id||0))+1;
    auditEntry(`Imported ${DB.length} cards`);saveState();closeModal('import-modal');expandedId=null;
    renderEditorTable();toastC(`Imported ${DB.length} cards`);
  }catch(e){errEl.textContent='Invalid JSON: '+e.message;errEl.style.display='block';}
}

function exportDB(){
  document.getElementById('exp-txt').value=JSON.stringify(DB,null,2);
  const el=document.getElementById('exp-panel');el.style.display='block';
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
  auditEntry(`Exported ${DB.length} cards`);
}

function copyExp(){
  navigator.clipboard.writeText(document.getElementById('exp-txt').value)
    .then(()=>toastC('Copied to clipboard'))
    .catch(()=>toastC('Select all text in the box and copy manually',true));
}

function resetDB(){
  if(!confirm('Reset to the 12 verified India cards?'))return;
  DB=deepCopy(DEFAULT_DB);nextId=12;expandedId=null;
  auditEntry('Database reset to defaults');saveState();renderEditorTable();toastC('Reset to 12 verified India cards');
}

function closeModal(id){document.getElementById(id).classList.remove('open');}
function clearAudit(){auditLog=[];saveState();renderAudit();}

function toastC(msg,isErr=false){
  const t=document.getElementById('toast-c');
  t.textContent=msg;t.className='toast show '+(isErr?'toast-err':'toast-ok');
  setTimeout(()=>{t.className='toast';},3000);
}

/* ════════════════════════════════════════
   MY CARDS (Tab D)
════════════════════════════════════════ */
let myCards=new Set(); // set of card IDs the user holds

function renderMyCards(){
  const grid=document.getElementById('my-cards-grid');
  if(!grid)return;
  grid.innerHTML=DB.map((card,idx)=>{
    const bs=BADGE_STYLES[idx%BADGE_STYLES.length];
    const sel=myCards.has(card.id);
    return`<div class="mc-card ${sel?'selected':''}" onclick="toggleMyCard(${card.id})">
      <div class="mc-check">${sel?'✓':''}</div>
      <div class="mc-badge" style="background:${bs.bg};color:${bs.fg}">${card.bank.slice(0,2).toUpperCase()}</div>
      <div class="mc-info">
        <div class="mc-name">${card.name}</div>
        <div class="mc-bank">${card.bank} · ${card.rewardType} · ${card.annualFee===0?'Free':'₹'+card.annualFee.toLocaleString('en-IN')+'/yr'}</div>
      </div>
    </div>`;
  }).join('');
  const n=myCards.size;
  const fees=DB.filter(c=>myCards.has(c.id)).reduce((s,c)=>s+c.annualFee,0);
  document.getElementById('mc-summary').textContent=n===0
    ?'No cards selected'
    :`${n} card${n>1?'s':''} selected · ₹${fees.toLocaleString('en-IN')} combined annual fees`;
}

function toggleMyCard(id){
  if(myCards.has(id))myCards.delete(id);else myCards.add(id);
  saveState();renderMyCards();
}

function clearMyCards(){myCards=new Set();saveState();renderMyCards();}

function applyMyCards(){
  if(myCards.size===0){
    document.getElementById('mc-result').innerHTML=`<div class="panel" style="color:var(--amber-text);font-size:13px">Select at least one card above first.</div>`;
    return;
  }
  // Run optimizer restricted to held cards, then show uplift vs market-best
  const held=DB.filter(c=>myCards.has(c.id));
  const total=Object.values(spendB).reduce((s,v)=>s+v,0);
  const{eligible:allElig}=getPool(total);

  // Value of current held wallet
  const heldVal=portfolioValue(held,spendB);

  // Best possible wallet from full pool up to same size
  const k=Math.min(held.length+1,3);
  const allCombos=[];
  for(let i=1;i<=k;i++)combos(allElig,i).forEach(combo=>{const r=portfolioValue(combo,spendB);allCombos.push({combo,...r});});
  allCombos.sort((a,b)=>b.netAnnual-a.netAnnual);
  const marketBest=allCombos[0];
  const gap=marketBest.netAnnual-heldVal.netAnnual;

  let html=`<div class="panel">
    <div class="panel-title">Your current wallet vs optimal</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div style="background:var(--surface2);border-radius:10px;padding:1rem">
        <div style="font-size:11px;color:var(--slate);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.375rem">Your current wallet</div>
        <div style="font-size:22px;font-weight:600;color:${heldVal.netAnnual>=0?'var(--green-text)':'var(--red-text)'}">${heldVal.netAnnual>=0?'+':''}₹${Math.round(heldVal.netAnnual).toLocaleString('en-IN')}/yr</div>
        <div style="font-size:12px;color:var(--slate);margin-top:4px">${held.map(c=>c.name.split(' ')[0]).join(' + ')}</div>
      </div>
      <div style="background:var(--navy);border-radius:10px;padding:1rem">
        <div style="font-size:11px;color:var(--slate-light);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.375rem">Market best wallet</div>
        <div style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--gold)">${marketBest.netAnnual>=0?'+':''}₹${Math.round(marketBest.netAnnual).toLocaleString('en-IN')}/yr</div>
        <div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px">${marketBest.combo.map(c=>c.name.split(' ')[0]).join(' + ')}</div>
      </div>
    </div>`;

  // "Should I get a new card at all?" — graduated verdict
  // Find the single best card to ADD to the current wallet (not full replacement)
  let bestAdd=null,bestAddGain=0;
  DB.filter(c=>!myCards.has(c.id)).forEach(cand=>{
    const withCard=portfolioValue([...held,cand],spendB);
    const gain=withCard.netAnnual-heldVal.netAnnual;
    if(gain>bestAddGain){bestAddGain=gain;bestAdd=cand;}
  });

  if(gap<600){
    html+=`<div class="insight" style="background:var(--green-bg);border-color:rgba(29,184,122,.2);color:var(--green-text)">
      <strong>✓ Don't bother applying for a new card.</strong> Your current wallet is within ₹${Math.round(gap).toLocaleString('en-IN')}/year of the theoretical best for your spending. That gap is too small to justify a new application, a hard credit inquiry, or another fee to track. Keep what you have.</div>`;
  } else if(bestAdd&&bestAddGain>600){
    const addFee=bestAdd.annualFee===0?'lifetime free':`₹${bestAdd.annualFee} fee${bestAdd.feeWaiverSpend?` (waivable at ₹${(bestAdd.feeWaiverSpend/100000).toFixed(1)}L/yr)`:''}`;
    html+=`<div class="insight">
      <strong>Consider adding one card: ${bestAdd.name}.</strong> Adding it to your existing wallet (not replacing anything) would earn about <strong>₹${Math.round(bestAddGain).toLocaleString('en-IN')} more per year</strong> — ${addFee}. 
      ${bestAdd.annualFee>0&&!bestAdd.feeWaiverSpend?`At that gain the fee pays for itself ${(bestAddGain/(bestAdd.annualFee*1.18)).toFixed(1)}× over.`:''}
      Switching your whole wallet to the market best (${marketBest.combo.map(c=>c.name).join(' + ')}) would earn ₹${Math.round(gap).toLocaleString('en-IN')} more but means new applications.
      <button class="btn btn-info" style="margin-top:.5rem" onclick="showTab('b')">See full optimizer →</button></div>`;
  } else {
    html+=`<div class="insight"><strong>You could earn ₹${Math.round(gap).toLocaleString('en-IN')} more per year</strong> by switching to the market-best wallet (${marketBest.combo.map(c=>c.name).join(' + ')}). Weigh that against the effort of new applications.
      <button class="btn btn-info" style="margin-top:.5rem" onclick="showTab('b')">Run full wallet optimizer →</button></div>`;
  }

  // Category-by-category breakdown of current wallet
  html+=`<div style="font-size:12px;font-weight:600;color:var(--slate);text-transform:uppercase;letter-spacing:.05em;margin:1rem 0 .625rem">How your current cards cover your spending</div>`;
  const cmap={};held.forEach(c=>{cmap[c.id]=CARD_COLORS[c.id%CARD_COLORS.length];});
  const maxR2=Math.max(...CATS.map(c=>heldVal.alloc[c]?.reward||0));
  html+=`<div class="cat-chart">`;
  CATS.filter(c=>spendB[c]>0).sort((a,b)=>(heldVal.alloc[b]?.reward||0)-(heldVal.alloc[a]?.reward||0)).forEach(cat=>{
    const a=heldVal.alloc[cat];const col=a.card?cmap[a.card.id]||'#888':'#ccc';
    const bp=maxR2>0?Math.round((a.reward/maxR2)*100):0;
    html+=`<div class="cat-row"><div class="cat-lbl">${CAT_ICONS[cat]} ${CAT_LABELS[cat]}</div><div class="cat-trk"><div class="cat-fill" style="width:${bp}%;background:${col}"></div></div><div class="cat-val">+₹${Math.round(a.reward)}</div></div>`;
  });
  html+=`</div></div>`;
  document.getElementById('mc-result').innerHTML=html;
}

/* ════════════════════════════════════════
   ONBOARDING
════════════════════════════════════════ */
const obPrefs={rewardType:'any',income:null,cibil:null,ecosystems:[]};

function obChoice(key,val,btn){
  obPrefs[key]=val;
  btn.closest('div').querySelectorAll('.ob-choice').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
}
function obIncome(val,btn){
  obPrefs.income=val;
  document.getElementById('ob-income-grp').querySelectorAll('.ob-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function obCibil(val,btn){
  obPrefs.cibil=val;
  document.getElementById('ob-cibil-grp').querySelectorAll('.ob-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function obEco(val,btn){
  const i=obPrefs.ecosystems.indexOf(val);
  if(i>=0){obPrefs.ecosystems.splice(i,1);btn.classList.remove('active');}
  else{obPrefs.ecosystems.push(val);btn.classList.add('active');}
}

function obNext(){
  // Apply selections to global prefs
  prefs.rewardType=obPrefs.rewardType;
  prefs.income=obPrefs.income;
  prefs.cibil=obPrefs.cibil;
  prefs.ecosystems=[...obPrefs.ecosystems];
  // Sync preference buttons in prefs bar
  document.querySelectorAll('.ptog').forEach(tog=>{
    tog.querySelectorAll('.ptog-btn').forEach(b=>{
      if(b.getAttribute('onclick')?.includes(`'rewardType','${prefs.rewardType}'`))b.classList.add('active');
      else if(b.getAttribute('onclick')?.includes('rewardType'))b.classList.remove('active');
    });
  });
  if(document.getElementById('ob-sharia')?.checked){
    document.getElementById('g-sharia').checked=true;
  }
  if(document.getElementById('ob-nofee')?.checked){
    document.getElementById('g-nofee').checked=true;
  }
  saveProfile();
  dismissOnboarding();
}

function saveProfile(){
  const profileData={income:prefs.income,cibil:prefs.cibil,ecosystems:prefs.ecosystems,rewardType:prefs.rewardType};
  try{localStorage.setItem('cardiq_profile',JSON.stringify(profileData));}catch(e){}
  pushProfileToCloud();  // if signed in, sync up (cross-device)
}
function loadProfile(){
  try{
    const s=localStorage.getItem('cardiq_profile');
    if(s){const p=JSON.parse(s);prefs.income=p.income??null;prefs.cibil=p.cibil??null;prefs.ecosystems=p.ecosystems||[];prefs.rewardType=p.rewardType||'any';}
  }catch(e){}
}

/* ── CROSS-DEVICE SYNC ──
   When signed in, the user's profile + wallet + tracked data are stored in Supabase
   (a single JSON blob per user in the profiles table), so a second device gets it all.
   Local-mode users just keep using localStorage. */
async function pushProfileToCloud(){
  if(!backendReady() || !account.userId) return;
  const blob={
    prefs:{income:prefs.income,cibil:prefs.cibil,ecosystems:prefs.ecosystems,rewardType:prefs.rewardType,milesValue:prefs.milesValue},
    myCards:[...myCards],
    txLog: (typeof txLog!=='undefined')?txLog:[],
    points: loadPts(),
    payments: loadPays(),
    cardEndings: JSON.parse(localStorage.getItem('cardiq_endings')||'{}')
  };
  try{ await sb.from('profiles').update({ data: blob, email:account.email }).eq('id', account.userId); }
  catch(e){ /* 'data' column may not exist yet; safe to ignore until schema is applied */ }
}
async function pullProfileFromCloud(){
  if(!backendReady() || !account.userId) return;
  try{
    const { data:row } = await sb.from('profiles').select('data').eq('id', account.userId).single();
    const blob=row&&row.data;
    if(!blob) return;
    if(blob.prefs) Object.assign(prefs, blob.prefs);
    if(blob.myCards) { myCards=new Set(blob.myCards); saveState&&saveState(); }
    if(blob.txLog){ txLog=blob.txLog; saveTxState&&saveTxState(); }
    if(blob.points) localStorage.setItem('cardiq_points', JSON.stringify(blob.points));
    if(blob.payments) localStorage.setItem('cardiq_payments', JSON.stringify(blob.payments));
    if(blob.cardEndings) localStorage.setItem('cardiq_endings', JSON.stringify(blob.cardEndings));
    // refresh views if they're open
    try{ renderTracker&&renderTracker(); }catch(e){}
  }catch(e){ /* first login, no data yet */ }
}

function obSkip(){dismissOnboarding();}

function dismissOnboarding(){
  document.getElementById('onboarding').style.display='none';
  localStorage.setItem('cardiq_onboarded','1');
  runA();
}

function maybeShowOnboarding(){
  if(!localStorage.getItem('cardiq_onboarded')){
    const ob=document.getElementById('onboarding');
    ob.style.display='flex';
  }
}

/* ════════════════════════════════════════
   TRACKER (Tab F)
════════════════════════════════════════ */
let txLog = []; // [{id,date,cardId,cat,amount,merchant,rewardEarned,rewardType,wasOptimal,altCardName,altReward}]
let nextTxId = 1;

function trkCurrentMonth(){return new Date().toISOString().slice(0,7);}
function trkMonthLabel(ym){const[y,m]=ym.split('-');const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return`${months[parseInt(m)-1]} ${y}`;}

/* ── compute reward for a single transaction ── */
function calcTxReward(card,cat,amount){
  const rate=effRate(card,cat);
  const cap=card.caps[cat];
  // check overall cap remaining this month for this card
  const ym=trkCurrentMonth();
  const monthSpend=txLog.filter(t=>t.cardId===card.id&&t.date.slice(0,7)===ym).reduce((s,t)=>s+t.amount,0);
  let effAmt=amount;
  if(cap){
    const catSpendThisMonth=txLog.filter(t=>t.cardId===card.id&&t.cat===cat&&t.date.slice(0,7)===ym).reduce((s,t)=>s+t.amount,0);
    const remaining=Math.max(0,cap-catSpendThisMonth);
    effAmt=Math.min(amount,remaining);
  }
  if(card.overallCap){
    const overallEarned=txLog.filter(t=>t.cardId===card.id&&t.date.slice(0,7)===ym).reduce((s,t)=>s+t.rewardEarned,0);
    const overallRemaining=Math.max(0,card.overallCap*rate/100-overallEarned);
    effAmt=Math.min(effAmt,overallRemaining>0?amount:0);
  }
  return{reward:effAmt*rate/100,effAmt,rate,capHit:cap&&effAmt<amount};
}

/* ── populate card selector ── */
function buildTrkCardSelect(){
  const sel=document.getElementById('trk-card');
  if(!sel)return;
  const prev=sel.value;
  sel.innerHTML=DB.map(c=>`<option value="${c.id}">${c.name} (${c.bank})</option>`).join('');
  if(prev&&DB.find(c=>c.id==prev))sel.value=prev;
}

/* ── smart suggestion before logging ── */
function renderTrkSuggestion(){
  const el=document.getElementById('trk-suggestion');
  if(!el)return;
  const cardId=parseInt(document.getElementById('trk-card')?.value);
  const cat=document.getElementById('trk-cat')?.value;
  const amount=parseFloat(document.getElementById('trk-amount')?.value)||0;
  if(!amount||!cat||isNaN(cardId)){el.style.display='none';return;}
  const card=DB.find(c=>c.id===cardId);
  if(!card){el.style.display='none';return;}

  const{reward,capHit}=calcTxReward(card,cat,amount);
  const rate=effRate(card,cat);

  // find best alternative from myCards set
  const heldCards=DB.filter(c=>myCards.has(c.id)&&c.id!==cardId);
  let bestAlt=null,bestAltReward=0;
  heldCards.forEach(c=>{const{reward:r}=calcTxReward(c,cat,amount);if(r>bestAltReward){bestAltReward=r;bestAlt=c;}});

  let html='';
  if(capHit){
    html=`<div class="sugg-box sugg-warn">⚠ <strong>Cap warning:</strong> This transaction exceeds the remaining ${CAT_LABELS[cat]} cap on ${card.name}. Only part of your spend earns rewards.${bestAlt&&bestAltReward>reward?` Consider using <strong>${bestAlt.name}</strong> instead — earns ₹${bestAltReward.toFixed(2)} vs ₹${reward.toFixed(2)}.`:''}</div>`;
  } else if(bestAlt&&bestAltReward>reward+0.5){
    html=`<div class="sugg-box sugg-alt">💡 <strong>${bestAlt.name}</strong> would earn <strong>₹${bestAltReward.toFixed(2)}</strong> on this transaction (${effRate(bestAlt,cat).toFixed(1)}%) vs ₹${reward.toFixed(2)} on ${card.name} (${rate.toFixed(1)}%). Still logging to ${card.name}.</div>`;
  } else if(reward>0){
    html=`<div class="sugg-box sugg-ok">✓ <strong>₹${reward.toFixed(2)}</strong> will be earned at ${rate.toFixed(1)}% on ${card.name}.${card.rewardType!=='cashback'?` (${card.rewards[cat]||0} ${card.rewardType} units × ₹${getPV(card)}/unit)`:''}</div>`;
  }
  el.innerHTML=html;
  el.style.display=html?'':'none';
}

/* ── log a transaction ── */
function logTransaction(){
  if(!gate('tracking'))return;
  const cardId=parseInt(document.getElementById('trk-card').value);
  const cat=document.getElementById('trk-cat').value;
  const amount=parseFloat(document.getElementById('trk-amount').value)||0;
  const merchant=document.getElementById('trk-merchant').value.trim();
  const date=document.getElementById('trk-date').value||today();
  if(!amount||amount<=0){alert('Enter a valid amount.');return;}
  const card=DB.find(c=>c.id===cardId);
  if(!card)return;

  const{reward,capHit}=calcTxReward(card,cat,amount);

  // find best card from held cards
  const allHeld=myCards.size>0?DB.filter(c=>myCards.has(c.id)):DB;
  let bestReward=0,bestCard=null;
  allHeld.forEach(c=>{const{reward:r}=calcTxReward(c,cat,amount);if(r>bestReward){bestReward=r;bestCard=c;}});
  const wasOptimal=!bestCard||bestCard.id===cardId||Math.abs(bestReward-reward)<0.01;

  txLog.unshift({
    id:nextTxId++,date,cardId,cat,amount,merchant,
    rewardEarned:reward,rewardType:card.rewardType,
    wasOptimal,altCardName:(!wasOptimal&&bestCard)?bestCard.name:'',
    altReward:(!wasOptimal)?bestReward:0,capHit
  });

  saveTxState();
  document.getElementById('trk-amount').value='';
  document.getElementById('trk-merchant').value='';
  document.getElementById('trk-suggestion').style.display='none';
  renderTracker();
}

/* ── main render ── */
function renderTracker(){
  buildTrkCardSelect();
  buildPtsPaySelects();
  renderTrkSummaryBar();
  renderTrkCapBars();
  renderPtsAndPays();
  renderTrkMonthlyBreakdown();
  renderTrkHistory();
  updateReportBtn();
}

function renderTrkSummaryBar(){
  const el=document.getElementById('trk-summary-bar');if(!el)return;
  const ym=trkCurrentMonth();
  const monthTx=txLog.filter(t=>t.date.slice(0,7)===ym);
  const totalEarned=monthTx.reduce((s,t)=>s+t.rewardEarned,0);
  const totalSpent=monthTx.reduce((s,t)=>s+t.amount,0);
  const txCount=monthTx.length;
  const suboptimal=monthTx.filter(t=>!t.wasOptimal).length;
  const projAnnual=totalEarned*12;

  el.innerHTML=`
    <div class="trk-stat highlight"><div class="trk-stat-lbl">Earned this month</div><div class="trk-stat-val">₹${totalEarned.toFixed(2)}</div><div class="trk-stat-sub">${trkMonthLabel(ym)}</div></div>
    <div class="trk-stat"><div class="trk-stat-lbl">Projected annual</div><div class="trk-stat-val" style="color:var(--green-text)">₹${Math.round(projAnnual).toLocaleString('en-IN')}</div><div class="trk-stat-sub">at current monthly rate</div></div>
    <div class="trk-stat"><div class="trk-stat-lbl">Total spent</div><div class="trk-stat-val">₹${Math.round(totalSpent).toLocaleString('en-IN')}</div><div class="trk-stat-sub">${txCount} transaction${txCount!==1?'s':''} logged</div></div>
    <div class="trk-stat"><div class="trk-stat-lbl">Suboptimal transactions</div><div class="trk-stat-val ${suboptimal>0?'swarn':''}">${suboptimal}</div><div class="trk-stat-sub">${suboptimal>0?'Could have earned more':'All optimal ✓'}</div></div>`;
}

function renderTrkCapBars(){
  const el=document.getElementById('trk-cap-bars');if(!el)return;
  const ym=trkCurrentMonth();
  // find cards with any cap that have transactions this month
  const activeCards=DB.filter(c=>{
    const hasCap=CATS.some(cat=>c.caps[cat])||c.overallCap;
    const hasTx=txLog.some(t=>t.cardId===c.id&&t.date.slice(0,7)===ym);
    return hasCap&&hasTx;
  });
  if(!activeCards.length){el.innerHTML='';return;}

  el.innerHTML='<div style="font-size:11px;font-weight:600;color:var(--slate);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.625rem">Monthly cap progress</div>'+
  activeCards.map(card=>{
    const bs=BADGE_STYLES[card.id%BADGE_STYLES.length];
    const catChips=CATS.map(cat=>{
      const cap=card.caps[cat];if(!cap)return'';
      const spent=txLog.filter(t=>t.cardId===card.id&&t.cat===cat&&t.date.slice(0,7)===ym).reduce((s,t)=>s+t.amount,0);
      const pct=Math.min(100,Math.round(spent/cap*100));
      const cls=pct>=100?'hit':pct>=80?'warn':'';
      return`<span class="cap-cat-chip ${cls}">${CAT_LABELS[cat]}: ₹${Math.round(spent).toLocaleString('en-IN')}/${cap.toLocaleString('en-IN')} (${pct}%)</span>`;
    }).join('');

    // overall cap if exists
    const overallEarned=txLog.filter(t=>t.cardId===card.id&&t.date.slice(0,7)===ym).reduce((s,t)=>s+t.rewardEarned,0);
    const overallTxt=card.overallCap?`<div style="font-size:11px;color:var(--slate);margin-top:4px">Cashback cap: ₹${overallEarned.toFixed(2)} earned of ₹${card.overallCap} limit</div>`:'';

    const totalSpentThisMo=txLog.filter(t=>t.cardId===card.id&&t.date.slice(0,7)===ym).reduce((s,t)=>s+t.amount,0);
    const maxCap=Math.max(...CATS.map(cat=>card.caps[cat]||0));
    const overallPct=maxCap>0?Math.min(100,Math.round(totalSpentThisMo/maxCap*100)):0;
    const fillCls=overallPct>=100?'cap-fill-hit':overallPct>=80?'cap-fill-warn':'cap-fill-ok';

    return`<div class="cap-card">
      <div class="cap-card-top">
        <div style="display:flex;align-items:center;gap:8px"><div style="width:26px;height:26px;border-radius:5px;background:${bs.bg};color:${bs.fg};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700">${card.bank.slice(0,2).toUpperCase()}</div><span class="cap-card-name">${card.name}</span></div>
        <span class="cap-card-amounts">₹${Math.round(totalSpentThisMo).toLocaleString('en-IN')} spent this month</span>
      </div>
      <div class="cap-cats">${catChips}</div>
      ${overallTxt}
    </div>`;
  }).join('');
}

function renderTrkMonthlyBreakdown(){
  const el=document.getElementById('trk-monthly-breakdown');if(!el)return;
  if(!txLog.length){el.innerHTML='';return;}
  const ym=trkCurrentMonth();
  const monthTx=txLog.filter(t=>t.date.slice(0,7)===ym);
  if(!monthTx.length){el.innerHTML='';return;}

  // group by card
  const cardIds=[...new Set(monthTx.map(t=>t.cardId))];
  const maxCatReward=Math.max(...CATS.map(cat=>monthTx.filter(t=>t.cat===cat).reduce((s,t)=>s+t.rewardEarned,0)));

  el.innerHTML='<div style="font-size:11px;font-weight:600;color:var(--slate);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.625rem">This month by card</div>'+
  cardIds.map(cid=>{
    const card=DB.find(c=>c.id===cid);if(!card)return'';
    const bs=BADGE_STYLES[cid%BADGE_STYLES.length];
    const col=CARD_COLORS[cid%CARD_COLORS.length];
    const cardTx=monthTx.filter(t=>t.cardId===cid);
    const totalEarned=cardTx.reduce((s,t)=>s+t.rewardEarned,0);
    const totalSpent=cardTx.reduce((s,t)=>s+t.amount,0);

    const catRows=CATS.map(cat=>{
      const catTx=cardTx.filter(t=>t.cat===cat);
      if(!catTx.length)return'';
      const catEarned=catTx.reduce((s,t)=>s+t.rewardEarned,0);
      const catSpent=catTx.reduce((s,t)=>s+t.amount,0);
      const bp=maxCatReward>0?Math.round(catEarned/maxCatReward*100):0;
      return`<div class="trk-cat-row">
        <div class="trk-cat-lbl">${CAT_ICONS[cat]} ${CAT_LABELS[cat]}</div>
        <div class="trk-cat-bar-wrap"><div class="trk-cat-bar-fill" style="width:${bp}%;background:${col}"></div></div>
        <div class="trk-cat-val">+₹${catEarned.toFixed(2)}</div>
        <div class="trk-cat-count">${catTx.length}tx</div>
      </div>`;
    }).join('');

    return`<div class="trk-breakdown-card">
      <div class="trk-bd-top">
        <div class="trk-bd-name"><div style="width:28px;height:28px;border-radius:6px;background:${bs.bg};color:${bs.fg};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700">${card.bank.slice(0,2).toUpperCase()}</div>${card.name}</div>
        <div class="trk-bd-earned"><div class="trk-bd-aed">+₹${totalEarned.toFixed(2)}</div><div class="trk-bd-sub">from ₹${Math.round(totalSpent).toLocaleString('en-IN')} spend · ${cardTx.length} tx</div></div>
      </div>
      <div class="trk-cat-rows">${catRows}</div>
    </div>`;
  }).join('');
}

function renderTrkHistory(){
  const histPanel=document.getElementById('trk-history-panel');
  const histTable=document.getElementById('trk-history-table');
  if(!histPanel||!histTable)return;
  if(!txLog.length){histPanel.style.display='none';return;}
  histPanel.style.display='';

  // build month filter
  const months=[...new Set(txLog.map(t=>t.date.slice(0,7)))].sort().reverse();
  const filterEl=document.getElementById('trk-filter-month');
  const curFilter=filterEl.value||months[0];
  filterEl.innerHTML=months.map(m=>`<option value="${m}" ${m===curFilter?'selected':''}>${trkMonthLabel(m)}</option>`).join('');

  const filtered=txLog.filter(t=>t.date.slice(0,7)===curFilter);
  if(!filtered.length){histTable.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--slate);font-size:13px">No transactions this month.</div>';return;}

  histTable.innerHTML=`<table class="tx-table">
    <thead><tr><th>Date</th><th>Card</th><th>Category</th><th>Merchant</th><th>Amount</th><th>Reward</th><th>Optimal?</th><th></th></tr></thead>
    <tbody>${filtered.map(tx=>{
      const card=DB.find(c=>c.id===tx.cardId);
      const cardName=card?card.name:'Deleted card';
      const optHtml=tx.wasOptimal
        ?'<span class="tx-was-opt">✓ Best</span>'
        :`<span class="tx-not-opt">⚠ ${tx.altCardName} +₹${tx.altReward.toFixed(2)}</span>`;
      const capNote=tx.capHit?'<span style="font-size:10px;color:var(--amber-text);display:block">⚠ cap hit</span>':'';
      return`<tr>
        <td>${tx.date}</td>
        <td style="font-size:12px">${cardName}</td>
        <td>${CAT_ICONS[tx.cat]} ${CAT_LABELS[tx.cat]}</td>
        <td style="color:var(--slate)">${tx.merchant||'—'}</td>
        <td>₹${tx.amount.toLocaleString('en-IN')}</td>
        <td><span class="tx-reward">+₹${tx.rewardEarned.toFixed(2)}</span>${capNote}</td>
        <td>${optHtml}</td>
        <td><button class="tx-del" onclick="deleteTx(${tx.id})" title="Delete">✕</button></td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function deleteTx(id){
  txLog=txLog.filter(t=>t.id!==id);
  saveTxState();renderTracker();
}

function clearTxHistory(){
  if(!confirm('Clear all transaction history?'))return;
  txLog=[];nextTxId=1;
  saveTxState();renderTracker();
}

function exportTxCSV(){
  if(!txLog.length){alert('No transactions to export.');return;}
  const hdr='Date,Card,Category,Merchant,Amount (₹),Reward Earned (₹),Optimal,Alt Card,Alt Reward\n';
  const rows=txLog.map(t=>{
    const card=DB.find(c=>c.id===t.cardId);
    return[t.date,card?card.name:'Deleted',CAT_LABELS[t.cat],t.merchant||'',t.amount.toFixed(2),t.rewardEarned.toFixed(2),t.wasOptimal?'Yes':'No',t.altCardName||'',t.altReward?t.altReward.toFixed(2):''].join(',');
  }).join('\n');
  const blob=new Blob([hdr+rows],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`cardiq-transactions-${trkCurrentMonth()}.csv`;a.click();
}

function saveTxState(){
  try{localStorage.setItem('cardiq_tx',JSON.stringify({txLog,nextTxId}));}catch(e){}
}
function loadTxState(){
  try{const s=localStorage.getItem('cardiq_tx');if(s){const p=JSON.parse(s);txLog=p.txLog||[];nextTxId=p.nextTxId||1;}}catch(e){}
}

/* ════════════════════════════════════════
   POINTS BALANCES & PAYMENT REMINDERS (client-side)
════════════════════════════════════════ */
// Point-expiry windows per bank (months)
const POINT_EXPIRY_MONTHS={'HDFC Bank':24,'SBI Card':24,'Axis Bank':36,'ICICI Bank':0,'IDFC First Bank':0,'Kotak Mahindra':24};

function loadPts(){try{return JSON.parse(localStorage.getItem('cardiq_points')||'[]');}catch(e){return[];}}
function savePts(a){localStorage.setItem('cardiq_points',JSON.stringify(a));}
function loadPays(){try{return JSON.parse(localStorage.getItem('cardiq_payments')||'[]');}catch(e){return[];}}
function savePays(a){localStorage.setItem('cardiq_payments',JSON.stringify(a));}

function trackedCardCount(){
  const ids=new Set();
  loadPts().forEach(p=>ids.add(p.cardId));
  loadPays().forEach(p=>ids.add(p.cardId));
  return ids.size;
}

// Pro features — gated; when Pro connected to backend these call the Edge Functions.
async function proGmailSync(){
  if(!gate('gmailSync'))return;
  if(!backendReady()){ toastC('Connect Supabase keys to enable Gmail sync.'); return; }
  if(!CARDIQ_CONFIG.googleClientId){ toastC('Add your Google OAuth client id to CARDIQ_CONFIG to enable Gmail sync.'); return; }
  toastC('Opening Google sign-in for Gmail (read-only, bank emails only)…');
  // Full flow lives in the backend package (gmail-sync function). Here we call it:
  try{
    const { data:{ session } } = await sb.auth.getSession();
    const res = await fetch(CARDIQ_CONFIG.functionsBase+'/gmail-sync', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+(session?.access_token||'') },
      body: JSON.stringify({ sinceDays:30 })
    });
    const out = await res.json();
    if(out.error){ toastC('Gmail sync: '+out.error); return; }
    toastC(`Gmail sync found ${out.count??0} transactions.`);
  }catch(e){ toastC('Gmail sync not reachable yet — deploy the backend function first.'); }
}
async function proReconcile(){
  if(!gate('reconciliation'))return;
  if(!backendReady()){ toastC('Connect Supabase keys to enable reconciliation.'); return; }
  toastC('Checking whether the bank paid what you earned…');
  try{
    const { data:{ session } } = await sb.auth.getSession();
    const res = await fetch(CARDIQ_CONFIG.functionsBase+'/reconcile', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+(session?.access_token||'') },
      body: JSON.stringify({ month: trkCurrentMonth?trkCurrentMonth():'' })
    });
    const out = await res.json();
    if(out.error){ toastC('Reconciliation: '+out.error); return; }
    toastC(out.message||'Reconciliation complete.');
  }catch(e){ toastC('Reconciliation not reachable yet — deploy the backend function first.'); }
}
// Enforce the 5-card free cap. Returns true if the card is new AND we're at the cap on free.
function atFreeCardCap(cardId){
  if(isPro())return false;
  const ids=new Set();
  loadPts().forEach(p=>ids.add(p.cardId));
  loadPays().forEach(p=>ids.add(p.cardId));
  if(ids.has(cardId))return false; // already tracked, editing is fine
  return ids.size>=account.MAX_FREE_TRACKED;
}

function addPointsBalance(){
  if(!gate('manualReminders'))return;
  const cardId=parseInt(document.getElementById('pts-card').value);
  const bal=parseFloat(document.getElementById('pts-balance').value);
  const earned=document.getElementById('pts-earned').value||today();
  const card=DB.find(c=>c.id===cardId);
  if(!card||!bal||bal<=0){alert('Enter a valid points balance.');return;}
  if(atFreeCardCap(cardId)){showUpgradePrompt('unlimitedCards');return;}
  const pts=loadPts().filter(p=>p.cardId!==cardId);
  const pv=card.pointValue||1;
  pts.push({cardId,cardName:card.name,bank:card.bank,balance:bal,value:bal*pv,earnedAt:earned});
  savePts(pts);
  document.getElementById('pts-balance').value='';
  renderPtsAndPays();toastC(`Tracking ${bal.toLocaleString('en-IN')} ${card.name} points`);
}

function addPaymentDue(){
  if(!gate('manualReminders'))return;
  const cardId=parseInt(document.getElementById('pay-card').value);
  const amt=parseFloat(document.getElementById('pay-amount').value);
  const due=document.getElementById('pay-due').value;
  const card=DB.find(c=>c.id===cardId);
  if(!card||!amt||!due){alert('Enter amount and due date.');return;}
  if(atFreeCardCap(cardId)){showUpgradePrompt('unlimitedCards');return;}
  const pays=loadPays().filter(p=>!(p.cardId===cardId&&p.due===due));
  pays.push({cardId,cardName:card.name,amount:amt,due,paid:false});
  savePays(pays);
  document.getElementById('pay-amount').value='';document.getElementById('pay-due').value='';
  renderPtsAndPays();toastC(`Reminder set for ${card.name}`);
}

function markPaid(cardId,due){
  const pays=loadPays().map(p=>(p.cardId===cardId&&p.due===due)?{...p,paid:true}:p);
  savePays(pays);renderPtsAndPays();
}
function removePts(cardId){savePts(loadPts().filter(p=>p.cardId!==cardId));renderPtsAndPays();}

// Gift-card redemption flow — the consumption revenue stream.
// We hold no inventory; we refer to a partner and earn a cut. Triggered by expiry.
function openRedeem(cardId){
  const p=loadPts().find(x=>x.cardId===cardId);if(!p)return;
  const opts=REDEMPTION_PARTNERS.filter(rp=>p.balance>=rp.minPts);
  const body=document.getElementById('auth-modal-body');
  if(!body)return;
  body.innerHTML=`
    <div style="text-align:center;margin-bottom:1rem">
      <div style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--navy);margin-bottom:.25rem">Redeem before they expire</div>
      <div style="font-size:13px;color:var(--slate)">${p.cardName} · ${Math.round(p.balance).toLocaleString('en-IN')} points worth about ₹${Math.round(p.value).toLocaleString('en-IN')}</div>
    </div>
    <div style="font-size:12px;color:var(--slate);margin-bottom:.875rem;line-height:1.6">Convert your points into a gift card you'll actually use. These options generally give the best rupee value versus letting points lapse to zero.</div>
    <div style="display:flex;flex-direction:column;gap:.5rem">
      ${opts.map(rp=>`<button onclick="doRedeem('${rp.name}',${cardId})" style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);cursor:pointer;font-size:13px;color:var(--navy)">
        <span><strong>${rp.name}</strong> gift card</span>
        <span style="color:var(--gold);font-weight:600">Redeem →</span></button>`).join('')}
    </div>
    <div style="margin-top:1rem;font-size:11px;color:var(--slate);text-align:center;line-height:1.5">CardIQ may earn a small referral fee on redemptions. This never affects which cards we recommend. You can also redeem directly in your bank app for free.</div>`;
  document.getElementById('auth-modal').style.display='flex';
}
function doRedeem(partner,cardId){
  const card=DB.find(c=>c.id===cardId);
  try{const log=JSON.parse(localStorage.getItem('cardiq_redeem_intent')||'[]');log.push({cardId,partner,at:new Date().toISOString()});localStorage.setItem('cardiq_redeem_intent',JSON.stringify(log));}catch(e){}
  closeAuthModal();
  toastC(`Opening ${partner} redemption for ${card?card.name:'your card'}… redeem before your points lapse.`);
  // window.open(REDEMPTION_URL[partner], '_blank');  // wire real partner URL in production
}
function removePay(cardId,due){savePays(loadPays().filter(p=>!(p.cardId===cardId&&p.due===due)));renderPtsAndPays();}

function computeAlerts(){
  const alerts=[];const now=new Date();
  loadPts().forEach(p=>{
    const months=POINT_EXPIRY_MONTHS[p.bank]??24;if(months===0)return;
    const exp=new Date(p.earnedAt);exp.setMonth(exp.getMonth()+months);
    const days=Math.floor((exp-now)/86400000);
    if(days<=60&&days>0&&p.value>100){
      alerts.push({type:'points',urgency:days<=7?'critical':days<=30?'warning':'info',
        title:`${Math.round(p.balance).toLocaleString('en-IN')} ${p.cardName} points expiring in ${days} days`,
        body:`Worth ~₹${Math.round(p.value).toLocaleString('en-IN')}. Redeem before ${exp.toLocaleDateString('en-IN')}.`});
    }else if(days<=0&&p.value>100){
      alerts.push({type:'points',urgency:'critical',title:`${p.cardName} points may have expired`,body:`Check your balance — these were due to expire around ${exp.toLocaleDateString('en-IN')}.`});
    }
  });
  loadPays().filter(p=>!p.paid).forEach(p=>{
    const due=new Date(p.due);const days=Math.floor((due-now)/86400000);
    if(days<=5&&days>=0){
      alerts.push({type:'payment',urgency:days<=1?'critical':days<=3?'warning':'info',
        title:`${p.cardName} payment ₹${Math.round(p.amount).toLocaleString('en-IN')} due in ${days} day${days===1?'':'s'}`,
        body:`Due ${due.toLocaleDateString('en-IN')}. Missing it triggers 40%+ interest and hurts your CIBIL score.`});
    }else if(days<0){
      alerts.push({type:'payment',urgency:'critical',title:`${p.cardName} payment OVERDUE`,body:`₹${Math.round(p.amount).toLocaleString('en-IN')} was due ${due.toLocaleDateString('en-IN')}. Pay immediately.`});
    }
  });
  return alerts.sort((a,b)=>({critical:0,warning:1,info:2}[a.urgency]-{critical:0,warning:1,info:2}[b.urgency]));
}

// Total ₹ value of tracked points, and how much is expiring within 90 days.
// This is the acute-pain number that drives the whole product (Voly lesson).
function renderValueAtRisk(){
  const el=document.getElementById('value-at-risk-banner');
  if(!el)return;
  const pts=loadPts();
  if(!pts.length){
    // empty-state: still teach the pain, invite them to add a balance
    el.innerHTML=`<div style="background:var(--navy);border-radius:12px;padding:1rem 1.25rem;color:#fff">
      <div style="font-size:13px;font-weight:600;color:var(--gold);margin-bottom:4px">⏳ ${DEMOGRAPHIC.painHeadline}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.7);line-height:1.6">${DEMOGRAPHIC.painSub} Add a points balance below and CardIQ will track its rupee value and warn you before it lapses.</div>
    </div>`;
    return;
  }
  const now=new Date();
  let totalValue=0,atRisk=0;
  pts.forEach(p=>{
    totalValue+=p.value||0;
    const months=POINT_EXPIRY_MONTHS[p.bank]??24;
    if(months===0)return;
    const exp=new Date(p.earnedAt);exp.setMonth(exp.getMonth()+months);
    const days=Math.floor((exp-now)/86400000);
    if(days<=90)atRisk+=p.value||0;
  });
  const riskPct=totalValue>0?Math.round(atRisk/totalValue*100):0;
  el.innerHTML=`<div style="background:var(--navy);border-radius:12px;padding:1.125rem 1.375rem;color:#fff;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div>
      <div style="font-size:11px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Reward value you're tracking</div>
      <div style="font-family:'DM Serif Display',serif;font-size:28px;color:var(--gold);line-height:1">₹${Math.round(totalValue).toLocaleString('en-IN')}</div>
    </div>
    ${atRisk>0?`<div style="text-align:right">
      <div style="font-size:11px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Expiring within 90 days</div>
      <div style="font-family:'DM Serif Display',serif;font-size:24px;color:${riskPct>=25?'#ff8a8a':'#fff'};line-height:1">₹${Math.round(atRisk).toLocaleString('en-IN')}</div>
      <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:2px">${riskPct}% of your points — redeem soon</div>
    </div>`:`<div style="font-size:12px;color:var(--green);padding:6px 12px;background:rgba(29,184,122,.15);border-radius:8px">✓ Nothing expiring in the next 90 days</div>`}
  </div>`;
}

function renderPtsAndPays(){
  // value-at-risk banner — the acute-pain hook (points that could lapse)
  renderValueAtRisk();
  // alerts strip
  const alerts=computeAlerts();
  const strip=document.getElementById('alerts-strip');
  if(strip){
    if(!alerts.length){strip.innerHTML='';}
    else{
      const colors={critical:['var(--red-bg)','var(--red-text)','rgba(217,59,59,.2)'],warning:['var(--amber-bg)','var(--amber-text)','rgba(232,148,10,.2)'],info:['var(--blue-bg)','var(--blue-text)','rgba(26,111,196,.2)']};
      strip.innerHTML=alerts.map(a=>{const[bg,fg,bd]=colors[a.urgency];const icon=a.type==='points'?'⏳':'💳';
        return`<div style="background:${bg};border:1px solid ${bd};border-radius:10px;padding:.75rem 1rem;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start">
          <span style="font-size:18px">${icon}</span>
          <div><div style="font-size:13px;font-weight:600;color:${fg}">${a.title}</div><div style="font-size:12px;color:${fg};opacity:.85;margin-top:2px">${a.body}</div></div></div>`;
      }).join('');
    }
  }
  // list of tracked items
  const list=document.getElementById('pts-list');if(!list)return;
  const pts=loadPts(),pays=loadPays();
  let html='';
  if(pts.length){
    html+='<div style="font-size:11px;font-weight:600;color:var(--slate);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Tracked points</div>';
    const now=new Date();
    html+=pts.map(p=>{
      const months=POINT_EXPIRY_MONTHS[p.bank]??24;
      let expTxt='never expires';let soon=false;
      if(months>0){const e=new Date(p.earnedAt);e.setMonth(e.getMonth()+months);expTxt='expires '+e.toLocaleDateString('en-IN');const days=Math.floor((e-now)/86400000);soon=days<=90&&days>0;}
      return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border-radius:8px;margin-bottom:5px;font-size:12px">
        <span><strong>${p.cardName}</strong> · ${Math.round(p.balance).toLocaleString('en-IN')} pts (~₹${Math.round(p.value).toLocaleString('en-IN')}) · ${soon?'<span style="color:var(--red-text);font-weight:600">'+expTxt+'</span>':expTxt}</span>
        <span>${soon?`<button onclick="openRedeem(${p.cardId})" style="background:var(--gold);color:var(--navy);border:none;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;cursor:pointer;margin-right:4px">Redeem now</button>`:''}<button onclick="removePts(${p.cardId})" style="background:none;border:none;color:var(--slate);cursor:pointer">✕</button></span></div>`;
    }).join('');
  }
  if(pays.filter(p=>!p.paid).length){
    html+='<div style="font-size:11px;font-weight:600;color:var(--slate);text-transform:uppercase;letter-spacing:.04em;margin:12px 0 6px">Upcoming payments</div>';
    html+=pays.filter(p=>!p.paid).map(p=>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border-radius:8px;margin-bottom:5px;font-size:12px">
        <span><strong>${p.cardName}</strong> · ₹${Math.round(p.amount).toLocaleString('en-IN')} due ${new Date(p.due).toLocaleDateString('en-IN')}</span>
        <span><button onclick="markPaid(${p.cardId},'${p.due}')" style="background:var(--green);color:#fff;border:none;border-radius:6px;padding:2px 10px;font-size:11px;cursor:pointer;margin-right:4px">Paid</button><button onclick="removePay(${p.cardId},'${p.due}')" style="background:none;border:none;color:var(--slate);cursor:pointer">✕</button></span></div>`
    ).join('');
  }
  list.innerHTML=html;
}

function buildPtsPaySelects(){
  ['pts-card','pay-card'].forEach(id=>{
    const sel=document.getElementById(id);
    if(sel&&!sel.options.length)sel.innerHTML=DB.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  });
}

/* ════════════════════════════════════════
   EXPORT / PORTABILITY — your data isn't locked in
════════════════════════════════════════ */
// Full data export as JSON (transactions + profile + wallet + endings)
function exportAllData(){
  if(!gate('dataExport'))return;
  const bundle={
    exportedAt:new Date().toISOString(),
    version:'cardiq-india-1',
    profile:{income:prefs.income,cibil:prefs.cibil,ecosystems:prefs.ecosystems,rewardType:prefs.rewardType,milesValue:prefs.milesValue},
    myCards:[...myCards],
    transactions:txLog,
    cardEndings:JSON.parse(localStorage.getItem('cardiq_endings')||'{}')
  };
  const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`cardiq-export-${today()}.json`;a.click();
  toastC('Full data exported as JSON');
}

// Import a previously exported bundle
function importAllData(input){
  const file=input.files&&input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const b=JSON.parse(e.target.result);
      if(b.transactions){txLog=b.transactions;nextTxId=Math.max(0,...txLog.map(t=>typeof t.id==='number'?t.id:0))+1;saveTxState();}
      if(b.myCards){myCards=new Set(b.myCards);saveState();}
      if(b.cardEndings)localStorage.setItem('cardiq_endings',JSON.stringify(b.cardEndings));
      if(b.profile){Object.assign(prefs,b.profile);saveProfile&&saveProfile();}
      toastC('Data imported successfully');
      renderTracker&&renderTracker();
    }catch(err){alert('Could not import — file may be corrupted.');}
  };
  reader.readAsText(file);
}

/* ════════════════════════════════════════
   DATA FRESHNESS — crowdsourced rate-change reports
════════════════════════════════════════ */
function reportRateChange(cardId){
  const card=DB.find(c=>c.id===cardId);if(!card)return;
  const field=prompt(`What looks wrong about ${card.name}?\n\nExamples: "dining rate is now 3% not 5%", "annual fee changed to ₹1500", "fuel now excluded"`);
  if(!field||!field.trim())return;
  // store locally (queued to send to backend rate_change_reports when online)
  const reports=JSON.parse(localStorage.getItem('cardiq_rate_reports')||'[]');
  reports.push({cardId,cardName:card.name,note:field.trim(),reportedAt:new Date().toISOString(),status:'queued'});
  localStorage.setItem('cardiq_rate_reports',JSON.stringify(reports));
  toastC(`Thanks — your report on ${card.name} was logged. We re-verify flagged cards first.`);
}

/* ════════════════════════════════════════
   REFERRALS
════════════════════════════════════════ */
function getReferralCode(){
  // deterministic local code; backend replaces with the DB code when signed in
  let code=localStorage.getItem('cardiq_ref_code');
  if(!code){
    code='CIQ'+Math.random().toString(36).slice(2,8).toUpperCase();
    localStorage.setItem('cardiq_ref_code',code);
  }
  return code;
}
function copyReferral(){
  if(!gate('referrals'))return;
  const code=getReferralCode();
  const url=`https://cardiq.in/?ref=${code}`;
  navigator.clipboard?.writeText(url).then(
    ()=>toastC('Referral link copied! Both you and your friend get a month of Pro.'),
    ()=>prompt('Copy your referral link:',url)
  );
}

/* ════════════════════════════════════════
   PRIVACY — delete all data (DPDP-friendly)
════════════════════════════════════════ */
function deleteAllData(){
  if(!confirm('This permanently deletes ALL your CardIQ data from this browser — transactions, wallet, profile, and settings. This cannot be undone.\n\nContinue?'))return;
  if(!confirm('Are you absolutely sure? Everything will be erased.'))return;
  ['cardiq_tx','cardiq_db','cardiq_profile','cardiq_endings','cardiq_onboarded','cardiq_rate_reports','cardiq_ref_code','cardiq_audit'].forEach(k=>localStorage.removeItem(k));
  txLog=[];myCards=new Set();prefs.income=null;prefs.cibil=null;prefs.ecosystems=[];
  toastC('All data deleted. Reloading…');
  setTimeout(()=>location.reload(),1200);
}

/* ════════════════════════════════════════
   SMS PARSER ENGINE
════════════════════════════════════════ */

/* ── Merchant → category lookup (India merchants) ── */
const MERCHANT_CAT = {
  // Online shopping
  'AMAZON':'online','AMAZON.IN':'online','FLIPKART':'online','MYNTRA':'online','AJIO':'online',
  'MEESHO':'online','NYKAA':'online','TATACLIQ':'online','TATA CLIQ':'online','SNAPDEAL':'online',
  'FIRSTCRY':'online','LENSKART':'online','CROMA':'online','RELIANCE DIGITAL':'online',
  'VIJAY SALES':'online','PEPPERFRY':'online','URBAN LADDER':'online','DECATHLON':'online',
  'BOAT':'online','MAMAEARTH':'online','PURPLLE':'online','TIRA':'online','SHOPPERS STOP':'online',
  'WESTSIDE':'online','MAX FASHION':'online','H&M':'online','ZARA':'online','UNIQLO':'online',
  // Dining & food delivery
  'SWIGGY':'dining','ZOMATO':'dining','EATSURE':'dining','BOX8':'dining','FAASOS':'dining',
  'DOMINOS':'dining','PIZZA HUT':'dining','MCDONALDS':'dining','KFC':'dining','BURGER KING':'dining',
  'STARBUCKS':'dining','CCD':'dining','CAFE COFFEE DAY':'dining','BARBEQUE NATION':'dining',
  'HALDIRAM':'dining','BEHROUZ':'dining','OVENSTORY':'dining','SUBWAY':'dining','WOW MOMO':'dining',
  'DINEOUT':'dining','EAZYDINER':'dining','THIRD WAVE':'dining','BLUE TOKAI':'dining',
  'PARADISE':'dining','BAWARCHI':'dining','SHAH GHOUSE':'dining','CHUTNEYS':'dining',
  // Groceries & quick commerce
  'BIGBASKET':'groceries','BLINKIT':'groceries','ZEPTO':'groceries','INSTAMART':'groceries',
  'SWIGGY INSTAMART':'groceries','DUNZO':'groceries','JIOMART':'groceries','DMART':'groceries',
  'D-MART':'groceries','MORE':'groceries','RATNADEEP':'groceries','SPAR':'groceries',
  'RELIANCE FRESH':'groceries','SMART BAZAAR':'groceries','STAR BAZAAR':'groceries',
  'HERITAGE':'groceries','Q MART':'groceries','VIJETHA':'groceries',
  // Fuel
  'BPCL':'fuel','BHARAT PETROLEUM':'fuel','HPCL':'fuel','HINDUSTAN PETROLEUM':'fuel',
  'INDIAN OIL':'fuel','IOCL':'fuel','IOC':'fuel','SHELL':'fuel','NAYARA':'fuel','ESSAR':'fuel',
  'RELIANCE PETROL':'fuel','JIO-BP':'fuel','PETROL':'fuel','FUEL':'fuel',
  // Utilities & bills
  'AIRTEL':'utilities','JIO':'utilities','VODAFONE':'utilities','VI':'utilities','BSNL':'utilities',
  'TSSPDCL':'utilities','TSNPDCL':'utilities','APCPDCL':'utilities','ELECTRICITY':'utilities',
  'TATA POWER':'utilities','ADANI ELECTRICITY':'utilities','BESCOM':'utilities',
  'ACT':'utilities','ACT FIBERNET':'utilities','HATHWAY':'utilities','GTPL':'utilities',
  'TATA SKY':'utilities','TATAPLAY':'utilities','DISH TV':'utilities','D2H':'utilities',
  'NETFLIX':'utilities','PRIME VIDEO':'utilities','HOTSTAR':'utilities','DISNEY':'utilities',
  'SONYLIV':'utilities','ZEE5':'utilities','SPOTIFY':'utilities','JIOSAAVN':'utilities',
  'GAS':'utilities','BHARAT GAS':'utilities','INDANE':'utilities','HP GAS':'utilities',
  'WATER BILL':'utilities','MUNICIPAL':'utilities','GHMC':'utilities','METRO WATER':'utilities',
  'PAYTM':'utilities','PHONEPE':'utilities','MOBIKWIK':'utilities','BBPS':'utilities',
  'CULT.FIT':'utilities','CULTFIT':'utilities','CUREFIT':'utilities','GYM':'utilities',
  // Travel
  'INDIGO':'travel','AIR INDIA':'travel','VISTARA':'travel','SPICEJET':'travel','AKASA':'travel',
  'GOAIR':'travel','GO FIRST':'travel','MAKEMYTRIP':'travel','MMT':'travel','GOIBIBO':'travel',
  'CLEARTRIP':'travel','YATRA':'travel','EASEMYTRIP':'travel','IXIGO':'travel','IRCTC':'travel',
  'OYO':'travel','TREEBO':'travel','FABHOTELS':'travel','TAJ':'travel','MARRIOTT':'travel',
  'OLA':'travel','UBER':'travel','RAPIDO':'travel','REDBUS':'travel','ABHIBUS':'travel',
  'BOOKING.COM':'travel','AIRBNB':'travel','AGODA':'travel','HYDERABAD METRO':'travel',
  'AIRPORT':'travel','GMR':'travel','RGIA':'travel',
  // BookMyShow / entertainment (map to online)
  'BOOKMYSHOW':'online','BMS':'online','PVR':'online','INOX':'online','CINEPOLIS':'online',
};

/* ── Bank SMS patterns (regex templates per bank) ── */
const SMS_PATTERNS = [
  // HDFC Bank
  {
    bank:'HDFC Bank',
    patterns:[
      /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:spent|debited).*?(?:on|at)\s+(?:card\s+)?(?:ending\s+)?(?:\d{4}\s+)?(?:at\s+)?([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|,|\s+Avl|\s+Ref|$)/i,
      /(?:HDFC).*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:at|to)\s+([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
    ],
    amountGroup:[1,1], merchantGroup:[2,2],
  },
  // SBI Card
  {
    bank:'SBI Card',
    patterns:[
      /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+spent\s+on\s+(?:your\s+)?SBI\s+Card.*?(?:at\s+)([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
      /(?:SBI).*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:at|on)\s+([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
    ],
    amountGroup:[1,1], merchantGroup:[2,2],
  },
  // ICICI Bank
  {
    bank:'ICICI Bank',
    patterns:[
      /(?:ICICI).*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:spent|used|debited).*?(?:on|at)\s+([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
      /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:spent|debited).*?(?:at|on)\s+([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
    ],
    amountGroup:[1,1], merchantGroup:[2,2],
  },
  // Axis Bank
  {
    bank:'Axis Bank',
    patterns:[
      /(?:Axis).*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:spent|debited).*?(?:at|on)\s+([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
      /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:spent|debited)\s+(?:on|at|using).*?(?:at\s+)?([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
    ],
    amountGroup:[1,1], merchantGroup:[2,2],
  },
  // Kotak
  {
    bank:'Kotak',
    patterns:[
      /(?:Kotak).*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:at|on)\s+([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
      /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:spent|debited).*?(?:at|on)\s+([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
    ],
    amountGroup:[1,1], merchantGroup:[2,2],
  },
  // IDFC First
  {
    bank:'IDFC First',
    patterns:[
      /(?:IDFC).*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:at|on)\s+([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
      /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:spent|debited).*?(?:at|on)\s+([A-Z0-9 &',.\-\/]+?)(?:\s+on|\.|$)/i,
    ],
    amountGroup:[1,1], merchantGroup:[2,2],
  },
  // Generic fallback (RuPay/UPI and any bank)
  {
    bank:'Unknown',
    patterns:[
      /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:spent|debited|paid|used).*?(?:at|on|to)\s+([A-Z0-9 &',.\-\/]+?)(?:\s+on|\s+Ref|\s+Avl|\.|,|$)/i,
      /(?:paid|sent)\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+to\s+([A-Z0-9 &',.\-\/@]+)/i,
    ],
    amountGroup:[1,1], merchantGroup:[2,2],
  },
];

/* ── Date extraction ── */
function extractDate(text){
  // DD/MM/YYYY or DD-MM-YYYY
  let m=text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(m){
    const[,d,mo,y]=m;
    return`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // YYYY-MM-DD
  m=text.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if(m)return m[0];
  // DD Mon YYYY
  m=text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if(m){
    const months={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
    return`${m[3]}-${months[m[2].toLowerCase().slice(0,3)]}-${m[1].padStart(2,'0')}`;
  }
  return today();
}

/* ── Card ending extraction ── */
function extractCardEnding(text){
  const m=text.match(/(?:ending|ends|card\s*no\.?|card\s*#|xxxx\s*)(\d{4})/i);
  return m?m[1]:null;
}

/* ── Match card ending to DB card ── */
function matchCardFromEnding(ending){
  if(!ending)return null;
  // check if user has saved a card-ending mapping in localStorage
  const mappings=JSON.parse(localStorage.getItem('cardiq_endings')||'{}');
  if(mappings[ending])return DB.find(c=>c.id===mappings[ending])||null;
  return null;
}

/* ── Merchant → category lookup ── */
function merchantToCategory(merchant){
  if(!merchant)return{cat:'shopping',confidence:'low'};
  const upper=merchant.toUpperCase().trim();
  // exact match
  if(MERCHANT_CAT[upper])return{cat:MERCHANT_CAT[upper],confidence:'high'};
  // partial match — check if any key is contained in the merchant string
  const keys=Object.keys(MERCHANT_CAT);
  for(const k of keys){
    if(upper.includes(k))return{cat:MERCHANT_CAT[k],confidence:'high'};
  }
  // keyword heuristics
  if(/RESTAURANT|CAFE|COFFEE|GRILL|BURGER|PIZZA|SUSHI|KITCHEN|DINER|BISTRO|BAKERY|SHAWARMA|FALAFEL|KEBAB|NOODLE|CURRY|BAR(?!CLAYS)|LOUNGE(?! ACCESS)/i.test(upper))return{cat:'dining',confidence:'med'};
  if(/SUPERMARKET|GROCERY|MART|HYPER|FRESH|ORGANIC|VEGETABLES|MARKET(?!ING)/i.test(upper))return{cat:'groceries',confidence:'med'};
  if(/PETROL|FUEL|GAS STATION|SERVICE STATION/i.test(upper))return{cat:'fuel',confidence:'med'};
  if(/AIRLINE|AIRWAYS|AIR |AIRPORT|HOTEL|RESORT|TRAVEL|TOURS?|VISA SERVICES|HOLIDAY/i.test(upper))return{cat:'travel',confidence:'med'};
  if(/TELECOM|MOBILE|INTERNET|BROADBAND|TV|STREAMING|GYM|FITNESS|ELECTRICITY|WATER|UTILITY|MUNICIPALITY|GOVERNMENT|GOV\b/i.test(upper))return{cat:'utilities',confidence:'med'};
  return{cat:'shopping',confidence:'low'};
}

/* ── Main parse function ── */
function parseSMSText(raw){
  if(!raw||raw.trim().length<10)return null;
  const text=raw.trim();

  // 1. Extract amount
  const amtMatch=text.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i);
  if(!amtMatch)return{error:'Could not find an ₹amount in this message. Make sure it contains "₹" followed by a number.'};
  const amount=parseFloat(amtMatch[1].replace(/,/g,''));
  if(isNaN(amount)||amount<=0)return{error:'Amount appears to be zero or invalid.'};

  // 2. Try bank-specific patterns
  let merchant=null,bankName='Unknown',confidence='low';
  for(const bp of SMS_PATTERNS){
    for(let pi=0;pi<bp.patterns.length;pi++){
      const match=text.match(bp.patterns[pi]);
      if(match){
        const ag=Array.isArray(bp.amountGroup)?bp.amountGroup[pi]:bp.amountGroup;
        const mg=Array.isArray(bp.merchantGroup)?bp.merchantGroup[pi]:bp.merchantGroup;
        if(match[mg]){
          merchant=match[mg].trim().replace(/\s+/g,' ');
          bankName=bp.bank;
          confidence=bp.bank!=='Unknown'?'high':'med';
          break;
        }
      }
    }
    if(merchant)break;
  }

  // 3. Extract date and card ending
  const date=extractDate(text);
  const cardEnding=extractCardEnding(text);

  // 4. Category from merchant
  const{cat,confidence:catConf}=merchantToCategory(merchant||'');
  const finalConfidence=confidence==='high'&&catConf==='high'?'high':confidence==='high'||catConf==='high'?'med':'low';

  // 5. Match card from DB
  const matchedCard=matchCardFromEnding(cardEnding);

  return{amount,merchant:merchant||'',date,cat,cardEnding,matchedCard,bankName,confidence:finalConfidence,catConfidence:catConf};
}

/* ── Render parse result into UI ── */
let smsParseResult=null;

function parseSMS(){
  const raw=document.getElementById('sms-input')?.value||'';
  const resultEl=document.getElementById('sms-result');
  if(!resultEl)return;
  if(!raw.trim()){resultEl.style.display='none';smsParseResult=null;return;}

  const result=parseSMSText(raw);
  smsParseResult=result;

  if(!result||result.error){
    resultEl.innerHTML=`<div class="sms-err">⚠ ${result?result.error:'Could not parse this message. Try the manual form below.'}</div>`;
    resultEl.style.display='';return;
  }

  const confLabel={'high':'High confidence','med':'Review category','low':'Low confidence — please check'};
  const confCls={'high':'sms-conf-high','med':'sms-conf-med','low':'sms-conf-low'};

  // card options
  const cardOptions=DB.map(c=>`<option value="${c.id}" ${result.matchedCard&&result.matchedCard.id===c.id?'selected':''}>${c.name} (${c.bank})</option>`).join('');

  // category buttons
  const catBtns=Object.entries(CAT_LABELS).map(([val,label])=>
    `<button class="sms-cat-btn ${result.cat===val?'active':''}" onclick="setSMSCat('${val}',this)">${CAT_ICONS[val]} ${label}</button>`
  ).join('');

  resultEl.innerHTML=`
    <div class="sms-parsed">
      <div class="sms-parsed-title">
        ✓ Parsed from ${result.bankName} SMS
        <span class="sms-confidence ${confCls[result.confidence]}">${confLabel[result.confidence]}</span>
      </div>
      <div class="sms-fields">
        <div class="sms-field">
          <div class="sms-field-lbl">Amount</div>
          <div class="sms-field-val" style="color:var(--navy);font-size:16px;font-weight:600">₹${result.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
        <div class="sms-field">
          <div class="sms-field-lbl">Merchant</div>
          <input class="sms-field-val editable" id="sms-merchant-edit" value="${result.merchant||''}" placeholder="Enter merchant name">
        </div>
        <div class="sms-field">
          <div class="sms-field-lbl">Date</div>
          <input type="date" class="sms-field-val editable" id="sms-date-edit" value="${result.date}" style="font-size:12px">
        </div>
      </div>
      <div style="font-size:11px;color:var(--slate);margin-bottom:5px;font-weight:500;text-transform:uppercase;letter-spacing:.04em">Category — tap to change</div>
      <div class="sms-cat-grid" id="sms-cat-grid">${catBtns}</div>
      <div style="font-size:11px;color:var(--slate);margin-bottom:5px;font-weight:500;text-transform:uppercase;letter-spacing:.04em">Card used${result.cardEnding?` (ending ${result.cardEnding})`:''}</div>
      <select id="sms-card-sel" style="font-size:13px;padding:6px 9px;border:1px solid var(--border-strong);border-radius:8px;background:var(--white);color:var(--navy);width:100%;margin-bottom:.875rem">${cardOptions}</select>
      ${result.cardEnding&&!result.matchedCard?`<div style="font-size:11px;color:var(--amber-text);margin-bottom:.75rem">⚠ Card ending ${result.cardEnding} not matched to a saved card. Select the correct card above and CardIQ will remember it.</div>`:''}
      <button class="btn-run" onclick="confirmSMSLog()" style="margin-top:0">Log this transaction →</button>
    </div>`;
  resultEl.style.display='';
}

function setSMSCat(cat,btn){
  if(smsParseResult)smsParseResult.cat=cat;
  document.querySelectorAll('#sms-cat-grid .sms-cat-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function confirmSMSLog(){
  if(!gate('smsLog'))return;
  if(!smsParseResult)return;
  const cardId=parseInt(document.getElementById('sms-card-sel')?.value);
  const cat=smsParseResult.cat;
  const amount=smsParseResult.amount;
  const merchant=document.getElementById('sms-merchant-edit')?.value.trim()||smsParseResult.merchant;
  const date=document.getElementById('sms-date-edit')?.value||smsParseResult.date;

  // remember card ending → card id mapping
  if(smsParseResult.cardEnding&&cardId){
    const mappings=JSON.parse(localStorage.getItem('cardiq_endings')||'{}');
    mappings[smsParseResult.cardEnding]=cardId;
    localStorage.setItem('cardiq_endings',JSON.stringify(mappings));
  }

  // pre-fill manual form and trigger log
  document.getElementById('trk-card').value=cardId;
  document.getElementById('trk-cat').value=cat;
  document.getElementById('trk-amount').value=amount;
  document.getElementById('trk-merchant').value=merchant;
  document.getElementById('trk-date').value=date;

  // log directly
  const card=DB.find(c=>c.id===cardId);
  if(!card)return;
  const{reward,capHit}=calcTxReward(card,cat,amount);
  const allHeld=myCards.size>0?DB.filter(c=>myCards.has(c.id)):DB;
  let bestReward=0,bestCard=null;
  allHeld.forEach(c=>{const{reward:r}=calcTxReward(c,cat,amount);if(r>bestReward){bestReward=r;bestCard=c;}});
  const wasOptimal=!bestCard||bestCard.id===cardId||Math.abs(bestReward-reward)<0.01;

  txLog.unshift({
    id:nextTxId++,date,cardId,cat,amount,merchant,
    rewardEarned:reward,rewardType:card.rewardType,
    wasOptimal,altCardName:(!wasOptimal&&bestCard)?bestCard.name:'',
    altReward:(!wasOptimal)?bestReward:0,capHit,
    source:'sms'
  });
  saveTxState();

  // clear SMS input and result
  document.getElementById('sms-input').value='';
  document.getElementById('sms-result').style.display='none';
  document.getElementById('trk-amount').value='';
  document.getElementById('trk-merchant').value='';
  document.getElementById('trk-suggestion').style.display='none';
  smsParseResult=null;

  renderTracker();

  // brief confirmation flash
  const btn=event.target;
  btn.textContent='✓ Logged!';btn.style.background='var(--green)';
  setTimeout(()=>{btn.textContent='Log this transaction →';btn.style.background='';},1800);
}

/* ════════════════════════════════════════
   MONTHLY REPORT ENGINE
════════════════════════════════════════ */

function rptMonthTxs(ym){ return txLog.filter(t=>t.date.slice(0,7)===ym); }

function rptAllMonths(){
  return[...new Set(txLog.map(t=>t.date.slice(0,7)))].sort().reverse();
}

/* update the report trigger button */
function updateReportBtn(){
  const wrap=document.getElementById('trk-report-btn-wrap');
  const sub=document.getElementById('trk-report-btn-sub');
  const sel=document.getElementById('trk-report-month-sel');
  if(!wrap)return;
  const months=rptAllMonths();
  const curTx=rptMonthTxs(trkCurrentMonth());
  if(txLog.length<3){wrap.style.display='none';return;}
  wrap.style.display='';
  const earned=curTx.reduce((s,t)=>s+t.rewardEarned,0);
  const missed=curTx.filter(t=>!t.wasOptimal).reduce((s,t)=>s+(t.altReward-t.rewardEarned),0);
  if(sub)sub.textContent=`${curTx.length} transactions · ₹${earned.toFixed(2)} earned · ₹${missed.toFixed(2)} left on table`;
  if(sel){
    const pastMonths=months.filter(m=>m!==trkCurrentMonth());
    sel.innerHTML='<option value="">Past months…</option>'+pastMonths.map(m=>`<option value="${m}">${trkMonthLabel(m)}</option>`).join('');
  }
}

/* compute optimal earnings for a transaction set (what was possible with held wallet) */
function rptOptimalEarnings(txs){
  const held=myCards.size>0?DB.filter(c=>myCards.has(c.id)):DB;
  return txs.reduce((s,tx)=>{
    let best=tx.rewardEarned;
    held.forEach(card=>{
      const rate=effRate(card,tx.cat);
      const cap=card.caps[tx.cat];
      const eff=(cap&&cap<tx.amount)?cap:tx.amount;
      const r=eff*rate/100;
      if(r>best)best=r;
    });
    return s+best;
  },0);
}

/* main report builder */
function buildMonthReport(ym){
  const txs=rptMonthTxs(ym);
  if(!txs.length)return`<div class="rpt-surface" style="text-align:center;color:var(--slate);padding:3rem">No transactions logged for ${trkMonthLabel(ym)}.</div>`;

  /* ── core numbers ── */
  const earned=txs.reduce((s,t)=>s+t.rewardEarned,0);
  const spent=txs.reduce((s,t)=>s+t.amount,0);
  const txCount=txs.length;
  const optimalEarned=rptOptimalEarnings(txs);
  const efficiency=optimalEarned>0?Math.round(earned/optimalEarned*100):100;
  const missed=optimalEarned-earned;
  const suboptTxs=txs.filter(t=>!t.wasOptimal&&(t.altReward-t.rewardEarned)>0.5);

  /* ── prev month for delta ── */
  const prevYM=prevMonth(ym);
  const prevTxs=rptMonthTxs(prevYM);
  const prevEarned=prevTxs.reduce((s,t)=>s+t.rewardEarned,0);
  const delta=earned-prevEarned;
  const deltaHtml=prevTxs.length
    ?`<span class="${delta>=0?'rpt-delta-pos':'rpt-delta-neg'}">${delta>=0?'↑':'↓'} ₹${Math.abs(delta).toFixed(2)} vs ${trkMonthLabel(prevYM)}</span>`
    :'<span style="color:var(--slate);font-size:12px">First month tracked</span>';

  /* ── projection ── */
  const projAnnual=earned*12;
  const targetAnnual=(() => {
    const held=myCards.size>0?DB.filter(c=>myCards.has(c.id)):DB;
    if(!held.length)return projAnnual;
    const res=portfolioValue(held,
      Object.fromEntries(CATS.map(cat=>[cat,txs.filter(t=>t.cat===cat).reduce((s,t)=>s+t.amount,0)]))
    );
    return Math.max(res.netAnnual,projAnnual);
  })();

  /* ── earnings by card ── */
  const byCard={};
  txs.forEach(t=>{byCard[t.cardId]=(byCard[t.cardId]||0)+t.rewardEarned;});
  const cardEntries=Object.entries(byCard).sort((a,b)=>b[1]-a[1]);
  const maxCardEarned=cardEntries[0]?cardEntries[0][1]:1;

  /* ── earnings by category ── */
  const byCat={};
  txs.forEach(t=>{byCat[t.cat]=(byCat[t.cat]||0)+t.rewardEarned;});
  const catEntries=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const maxCatEarned=catEntries[0]?catEntries[0][1]:1;

  /* ── spend by category ── */
  const spendByCat={};
  txs.forEach(t=>{spendByCat[t.cat]=(spendByCat[t.cat]||0)+t.amount;});

  /* ── caps hit ── */
  const capsHit=[];
  DB.forEach(card=>{
    CATS.forEach(cat=>{
      const cap=card.caps[cat];if(!cap)return;
      const catSpent=txs.filter(t=>t.cardId===card.id&&t.cat===cat).reduce((s,t)=>s+t.amount,0);
      if(catSpent>0){
        const pct=Math.round(catSpent/cap*100);
        capsHit.push({card,cat,spent:catSpent,cap,pct});
      }
    });
    if(card.overallCap){
      const totalEarned=txs.filter(t=>t.cardId===card.id).reduce((s,t)=>s+t.rewardEarned,0);
      if(totalEarned>0)capsHit.push({card,cat:'overall',spent:totalEarned,cap:card.overallCap,pct:Math.round(totalEarned/card.overallCap*100),isOverall:true});
    }
  });
  capsHit.sort((a,b)=>b.pct-a.pct);

  /* ── top missed transactions ── */
  const topMissed=suboptTxs.sort((a,b)=>(b.altReward-b.rewardEarned)-(a.altReward-a.rewardEarned)).slice(0,6);

  /* ── upsell: best card to add ── */
  const heldIds=myCards.size>0?[...myCards]:DB.map(c=>c.id);
  const notHeld=DB.filter(c=>!heldIds.includes(c.id));
  let bestAddCard=null,bestAddGain=0;
  notHeld.forEach(candidate=>{
    const newHeld=[...heldIds.map(id=>DB.find(c=>c.id===id)).filter(Boolean),candidate];
    const gain=txs.reduce((s,tx)=>{
      let currentBest=0;
      heldIds.forEach(id=>{const c=DB.find(x=>x.id===id);if(c){const rate=effRate(c,tx.cat);const cap=c.caps[tx.cat];const eff=(cap&&cap<tx.amount)?cap:tx.amount;const r=eff*rate/100;if(r>currentBest)currentBest=r;}});
      let newBest=currentBest;
      const rate=effRate(candidate,tx.cat);const cap=candidate.caps[tx.cat];const eff=(cap&&cap<tx.amount)?cap:tx.amount;const r=eff*rate/100;
      if(r>newBest)newBest=r;
      return s+(newBest-currentBest);
    },0)*12-candidate.annualFee;
    if(gain>bestAddGain){bestAddGain=gain;bestAddCard=candidate;}
  });

  /* ── efficiency colour ── */
  const effColor=efficiency>=90?'var(--green-text)':efficiency>=70?'var(--amber-text)':'var(--red-text)';

  /* ── build HTML ── */
  let html='';

  /* Hero stats */
  html+=`<div class="rpt-hero">
    <div class="rpt-hero-card primary">
      <div class="rpt-hero-lbl">Total earned</div>
      <div class="rpt-hero-val">₹${earned.toFixed(2)}</div>
      <div class="rpt-hero-sub">${deltaHtml}</div>
    </div>
    <div class="rpt-hero-card">
      <div class="rpt-hero-lbl">Total spent</div>
      <div class="rpt-hero-val" style="font-size:24px">₹${Math.round(spent).toLocaleString('en-IN')}</div>
      <div class="rpt-hero-sub">${txCount} transactions · eff. ${spent>0?(earned/spent*100).toFixed(2):'0.00'}% return</div>
    </div>
    <div class="rpt-hero-card">
      <div class="rpt-hero-lbl">Left on table</div>
      <div class="rpt-hero-val" style="font-size:24px;color:${missed>5?'var(--red-text)':'var(--green-text)'}">₹${missed.toFixed(2)}</div>
      <div class="rpt-hero-sub">${suboptTxs.length} suboptimal transaction${suboptTxs.length!==1?'s':''}</div>
    </div>
  </div>`;

  /* Efficiency score */
  html+=`<div style="display:grid;grid-template-columns:1fr 2fr;gap:1rem;margin-bottom:1.25rem">
    <div class="rpt-surface" style="text-align:center;padding:1.5rem 1rem">
      <div class="rpt-section-title" style="text-align:center">Wallet efficiency</div>
      <div class="rpt-score-big" style="color:${effColor}">${efficiency}%</div>
      <div class="rpt-score-sub">of maximum possible<br>earnings captured</div>
      <div style="margin-top:.875rem;font-size:11px;color:var(--slate);line-height:1.6">
        ${efficiency>=90?'🏆 Excellent — you are routing spend optimally':efficiency>=70?'👍 Good — a few transactions could be improved':'⚠ Room to improve — check the missed earnings below'}
      </div>
    </div>
    <div class="rpt-surface">
      <div class="rpt-section-title">Annual projection</div>
      <div class="rpt-proj-row"><span class="rpt-proj-lbl">At this month's earning rate</span><span class="rpt-proj-val" style="color:var(--green-text)">+₹${Math.round(projAnnual).toLocaleString('en-IN')}/yr</span></div>
      <div class="rpt-proj-row"><span class="rpt-proj-lbl">Optimizer target (your wallet)</span><span class="rpt-proj-val">+₹${Math.round(targetAnnual).toLocaleString('en-IN')}/yr</span></div>
      <div class="rpt-proj-row"><span class="rpt-proj-lbl">Gap to close</span><span class="rpt-proj-val" style="color:${targetAnnual>projAnnual?'var(--amber-text)':'var(--green-text)'}">₹${Math.round(Math.max(0,targetAnnual-projAnnual)).toLocaleString('en-IN')}/yr</span></div>
      <div class="rpt-proj-row"><span class="rpt-proj-lbl">Earned vs spent ratio</span><span class="rpt-proj-val">${spent>0?(earned/spent*100).toFixed(3):'0.000'}%</span></div>
    </div>
  </div>`;

  /* Earnings by card */
  html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem">
    <div class="rpt-surface">
      <div class="rpt-section-title">Earned by card</div>
      ${cardEntries.map(([cid,val])=>{
        const card=DB.find(c=>c.id==cid);
        const col=CARD_COLORS[parseInt(cid)%CARD_COLORS.length];
        const bp=Math.round(val/maxCardEarned*100);
        const txC=txs.filter(t=>t.cardId==cid).length;
        return`<div class="rpt-bar-row">
          <div class="rpt-bar-lbl" title="${card?card.name:'Deleted'}">${card?card.name.split(' ')[0]:'Deleted'}</div>
          <div class="rpt-bar-track"><div class="rpt-bar-fill" style="width:${bp}%;background:${col}"></div></div>
          <div class="rpt-bar-val">₹${val.toFixed(2)}</div>
        </div><div style="font-size:10px;color:var(--slate);text-align:right;margin:-5px 0 6px">${txC} tx</div>`;
      }).join('')}
    </div>
    <div class="rpt-surface">
      <div class="rpt-section-title">Earned by category</div>
      ${catEntries.map(([cat,val])=>{
        const bp=Math.round(val/maxCatEarned*100);
        const sp=spendByCat[cat]||0;
        return`<div class="rpt-bar-row">
          <div class="rpt-bar-lbl">${CAT_ICONS[cat]} ${CAT_LABELS[cat]}</div>
          <div class="rpt-bar-track"><div class="rpt-bar-fill" style="width:${bp}%;background:var(--navy)"></div></div>
          <div class="rpt-bar-val">₹${val.toFixed(2)}</div>
        </div><div style="font-size:10px;color:var(--slate);text-align:right;margin:-5px 0 6px">from ₹${Math.round(sp).toLocaleString('en-IN')} spend</div>`;
      }).join('')}
    </div>
  </div>`;

  /* Cap utilisation */
  if(capsHit.length){
    html+=`<div class="rpt-surface" style="margin-bottom:1.25rem">
      <div class="rpt-section-title">Cap utilisation</div>
      ${capsHit.map(c=>{
        const col=c.pct>=100?'var(--red)':c.pct>=80?'var(--amber)':'var(--green)';
        const badge=c.pct>=100?'🔴 Hit':c.pct>=80?'🟡 Near cap':'🟢 Headroom';
        const label=c.isOverall?`${c.card.name} — overall cashback cap`:`${c.card.name} — ${CAT_LABELS[c.cat]}`;
        const detail=c.isOverall?`₹${c.spent.toFixed(2)} earned of ₹${c.cap} limit`:`₹${Math.round(c.spent).toLocaleString('en-IN')} spent of ₹${c.cap.toLocaleString('en-IN')} cap`;
        return`<div class="rpt-cap-item">
          <div class="rpt-cap-dot" style="background:${col}"></div>
          <div class="rpt-cap-text"><strong>${label}</strong><br><span style="font-size:11px;color:var(--slate)">${detail}</span></div>
          <div class="rpt-cap-pct">${badge} · ${c.pct}%</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  /* Missed earnings — the core retention loop */
  if(topMissed.length){
    const totalMissedVal=topMissed.reduce((s,t)=>s+(t.altReward-t.rewardEarned),0);
    html+=`<div class="rpt-surface" style="margin-bottom:1.25rem">
      <div class="rpt-section-title">Missed earnings — top ${topMissed.length} transactions</div>
      <div style="background:var(--amber-bg);border:1px solid rgba(232,148,10,.2);border-radius:8px;padding:.625rem .875rem;margin-bottom:.875rem;font-size:12px;color:var(--amber-text)">
        You could have earned <strong>₹${totalMissedVal.toFixed(2)} more</strong> this month by using the optimal card for these transactions.
      </div>
      ${topMissed.map(tx=>{
        const card=DB.find(c=>c.id===tx.cardId);
        const lostAed=(tx.altReward-tx.rewardEarned).toFixed(2);
        return`<div class="rpt-missed-item">
          <div class="rpt-missed-left">
            <div class="merchant">${tx.merchant||CAT_LABELS[tx.cat]} · ₹${tx.amount.toLocaleString('en-IN')}</div>
            <div class="detail">
              Used: <strong>${card?card.name:'Unknown'}</strong> → ₹${tx.rewardEarned.toFixed(2)} (${effRate(card,tx.cat).toFixed(1)}%)<br>
              Better: <strong>${tx.altCardName}</strong> → ₹${tx.altReward.toFixed(2)}<br>
              <span style="font-size:10px;color:var(--slate)">${tx.date} · ${CAT_LABELS[tx.cat]}</span>
            </div>
          </div>
          <div class="rpt-missed-right">
            <div class="missed-aed">−₹${lostAed}</div>
            <div class="missed-lbl">missed</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  } else {
    html+=`<div class="rpt-surface" style="margin-bottom:1.25rem;text-align:center;padding:1.5rem">
      <div style="font-size:32px;margin-bottom:.5rem">🏆</div>
      <div style="font-size:14px;font-weight:600;color:var(--navy);margin-bottom:.375rem">Perfect routing this month</div>
      <div style="font-size:12px;color:var(--slate)">Every transaction used the optimal card from your wallet. No earnings left on the table.</div>
    </div>`;
  }

  /* Upsell — card to add */
  if(bestAddCard&&bestAddGain>50){
    html+=`<div class="rpt-upsell" style="margin-bottom:1.25rem">
      <div class="rpt-upsell-title">💡 Wallet upgrade opportunity</div>
      <div class="rpt-upsell-body">
        Adding <strong>${bestAddCard.name}</strong> (${bestAddCard.bank}) to your wallet would have earned an estimated 
        <strong>₹${Math.round(bestAddGain).toLocaleString('en-IN')} more per year</strong> based on this month's spending pattern.
        Annual fee: ${bestAddCard.annualFee===0?'Free':'₹'+bestAddCard.annualFee.toLocaleString('en-IN')}.
        <br><button class="btn btn-info" style="margin-top:.625rem;font-size:12px" onclick="closeReport();showTab('b')">Run wallet optimizer →</button>
      </div>
    </div>`;
  }

  /* Footer */
  html+=`<div style="text-align:center;padding:1rem 0;font-size:11px;color:rgba(255,255,255,.35)">
    CardIQ · ${trkMonthLabel(ym)} Report · Generated ${new Date().toLocaleDateString('en-GB')} · No data stored externally
  </div>`;

  return html;
}

function prevMonth(ym){
  const[y,m]=ym.split('-').map(Number);
  const d=new Date(y,m-2,1);
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function openMonthReport(ym){
  if(!gate('monthlyReport'))return;
  const overlay=document.getElementById('report-overlay');
  const body=document.getElementById('report-body');
  const title=document.getElementById('rpt-header-title');
  if(!overlay||!body)return;
  title.textContent=`${trkMonthLabel(ym)} · Monthly Rewards Report`;
  body.innerHTML=buildMonthReport(ym);
  overlay.style.display='block';
  overlay.scrollTop=0;
  // reset month selector
  const sel=document.getElementById('trk-report-month-sel');
  if(sel)sel.value='';
}

function closeReport(){
  const overlay=document.getElementById('report-overlay');
  if(overlay)overlay.style.display='none';
}

function printReport(){
  window.print();
}

/* ════════════════════════════════════════
   BOOT
════════════════════════════════════════ */
loadState();
loadTxState();
loadProfile();
loadAccount();          // instant local state so UI isn't blank
updateAccountUI();
// If real backend is configured, restore the actual session (async) and refresh UI.
restoreSession().then(updateAccountUI);
buildSpendGrid();
updateFreshBar();
// set tracker date default to today
const trkDateEl=document.getElementById('trk-date');
if(trkDateEl)trkDateEl.value=today();
maybeShowOnboarding();
if(localStorage.getItem('cardiq_onboarded'))runA();
