// GetFit Notification Engine
// Vercel Serverless Function — runs on cron schedule
// Sends smart, personalised health reminder emails to getfitritesh@gmail.com

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RESEND_KEY = process.env.RESEND_KEY;
const TO_EMAIL = 'riteshsabharwal@icloud.com';
const FROM_EMAIL = 'GetFit <getfit@riteshsabharwal.com>';
const APP_URL = 'https://getfit.riteshsabharwal.com';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sendEmail(subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: TO_EMAIL, subject, html })
  });
  return res.ok;
}

function emailHTML(title, body, emoji = '💪') {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
  <div style="font-size:1.8rem;font-weight:700;color:#c8f565;margin-bottom:4px">GetFit</div>
  <div style="font-size:0.72rem;color:#555;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:32px">Ritesh Sabharwal · Personal Health</div>
  <div style="font-size:2.2rem;margin-bottom:16px">${emoji}</div>
  <div style="font-size:1.25rem;font-weight:600;color:#f0f0f0;margin-bottom:16px;line-height:1.35">${title}</div>
  <div style="font-size:0.92rem;color:#aaa;line-height:1.8">${body}</div>
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #1a1a1a;font-size:0.72rem;color:#444">
    GetFit &middot; <a href="${APP_URL}" style="color:#c8f565;text-decoration:none">Open App</a>
  </div>
</div></body></html>`;
}

async function getWeightData() {
  const { data } = await sb.from('weight_logs').select('*').order('date', { ascending: false }).limit(14);
  return data || [];
}

async function getProteinToday() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await sb.from('protein_logs').select('*').eq('date', today).limit(1);
  return data && data.length > 0 ? (data[0].total_grams || 0) : 0;
}

function habitRow(label, habitKey, today) {
  const y = `${APP_URL}/api/habit?date=${today}&habit=${habitKey}&value=yes`;
  const n = `${APP_URL}/api/habit?date=${today}&habit=${habitKey}&value=no`;
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #1e1e1e">
    <span style="color:#f0f0f0;font-size:0.88rem">${label}</span>
    <span>
      <a href="${y}" style="background:#c8f565;color:#0a0a0a;padding:5px 14px;border-radius:6px;text-decoration:none;font-weight:700;font-size:0.78rem;margin-right:6px">✓ Yes</a>
      <a href="${n}" style="background:#1a1a1a;color:#777;padding:5px 14px;border-radius:6px;text-decoration:none;font-weight:600;font-size:0.78rem;border:1px solid #2a2a2a">✗ No</a>
    </span>
  </div>`;
}

// ── 1. EVENING CHECK-IN (8:30 PM daily) ──
async function eveningCheckIn() {
  const logs = await getWeightData();
  const protein = await getProteinToday();
  const today = new Date().toISOString().split('T')[0];
  const loggedToday = logs.length > 0 && logs[0].date.split('T')[0] === today;

  const proteinMsg = protein >= 130
    ? `Protein: <strong style="color:#c8f565">${protein}g ✓</strong> — goal hit.`
    : `Protein: <strong style="color:#f5c565">${protein}g</strong> — ${130 - protein}g short. Paneer, whey shake, or daal before you sleep.`;

  const logMsg = loggedToday ? `Weight logged today ✓` : `⚠️ No weight log today — do it first thing tomorrow morning.`;

  const habits = `<div style="background:#111;border:1px solid #222;border-radius:10px;padding:4px 16px;margin:20px 0">
    ${habitRow('😴 Did you sleep well last night?', 'sleep', today)}
    ${habitRow('🧘 Did you meditate this morning?', 'meditate', today)}
    ${habitRow('🥗 Did you eat as per your meal plan?', 'meal', today)}
  </div>
  <div style="font-size:0.78rem;color:#555;margin-bottom:16px">One tap per question — logs instantly to your app and builds your habit streak.</div>`;

  const noJunk = `<div style="background:#111;border:1px solid #222;border-radius:10px;padding:12px 16px;margin:16px 0;display:flex;align-items:center;justify-content:space-between">
    <span style="color:#f0f0f0;font-size:0.88rem">🛍️ Committing to no junk tonight?</span>
    <a href="${APP_URL}/api/habit?date=${today}&habit=meal&value=yes" style="background:#c8f565;color:#0a0a0a;padding:5px 14px;border-radius:6px;text-decoration:none;font-weight:700;font-size:0.78rem">✓ I'm good</a>
  </div>`;

  await sendEmail(
    "Evening check-in — 3 quick questions",
    emailHTML(
      "It's 8:30 PM. How was today?",
      `${logMsg}<br><br>${proteinMsg}<br><br>${habits}${noJunk}If you're hungry right now: handful of nuts, water, or chamomile tea. <strong style="color:#f0f0f0">Not Swiggy.</strong><br><br>Early dinner, early sleep. Tomorrow's weigh-in is watching.`,
      '🌙'
    )
  );
}

// ── 2. FRIDAY WARNING (6 PM Friday) ──
async function fridayWarning() {
  const logs = await getWeightData();
  if (logs.length === 0) {
    await sendEmail('Weekend ahead — stay the course', emailHTML('Weekend starts now.', 'No weight data yet — but the rules still apply.<br><br>Grilled over fried, water over alcohol, early dinner over late-night ordering. Monday morning weigh-in is watching.', '⚠️'));
    return;
  }
  const weights = logs.slice(0, 7).map(l => parseFloat(l.weight));
  const latest = weights[0];
  const weekStart = weights[weights.length - 1];
  const weekChange = (latest - weekStart).toFixed(1);
  const totalLost = (105.4 - latest).toFixed(1);
  const isGoodWeek = parseFloat(weekChange) <= 0;

  let title, body;
  if (isGoodWeek) {
    title = `Good week — down ${Math.abs(weekChange)} kg. Don't blow it now.`;
    body = `Current: <strong style="color:#c8f565">${latest} kg</strong> — total lost: <strong style="color:#c8f565">${totalLost} kg</strong> from 105.4 kg.<br><br>Solid week. The weekend is where it usually falls apart — not this time.<br><br><strong style="color:#f0f0f0">This weekend:</strong><br>— Grilled, tandoori, or daal when eating out<br>— Max 1 drink if you must — not a session<br>— Dinner before 8 PM<br>— No late-night ordering<br><br>Monday weigh-in. Be ready for it.`;
  } else {
    title = `Weight up ${weekChange} kg this week — take the weekend seriously.`;
    body = `Current: <strong style="color:#f5c565">${latest} kg</strong> — up <strong style="color:#f56565">+${weekChange} kg</strong> this week.<br><br>The week didn't go perfectly. The weekend can't make it worse.<br><br><strong style="color:#f0f0f0">Non-negotiables this weekend:</strong><br>— No alcohol<br>— No Swiggy / Zomato<br>— Walk 30 mins both days<br>— Dinner by 7:30 PM<br><br>You lost 9 kg before. You know what works. Do it.`;
  }
  await sendEmail('Weekend Warning — GetFit', emailHTML(title, body, '⚠️'));
}

// ── 3. MONDAY RESET (8 AM Monday) ──
async function mondayReset() {
  const logs = await getWeightData();
  const latest = logs.length > 0 ? parseFloat(logs[0].weight) : null;
  const totalLost = latest ? (105.4 - latest).toFixed(1) : null;
  const weightLine = latest
    ? `Last logged: <strong style="color:#c8f565">${latest} kg</strong> — total lost: <strong style="color:#c8f565">${totalLost} kg</strong>.`
    : `Get on the scale this morning and log your weight.`;

  await sendEmail('Monday — new week, clean slate', emailHTML(
    'The weekend is done. Move on.',
    `${weightLine}<br><br>Whatever happened — good or bad — it's done. Today is a clean start.<br><br><strong style="color:#f0f0f0">Today's priorities:</strong><br>— Log your morning weight<br>— Hit 130g protein<br>— 45 mins of movement<br>— Dinner before 8 PM<br><br>One consistent week moves the needle. Let's have that week.`,
    '🌅'
  ));
}

// ── 4. TREND ALERT (daily, only fires if up 3+ days) ──
async function trendAlert() {
  const logs = await getWeightData();
  if (logs.length < 4) return;
  const recent = logs.slice(0, 4).map(l => parseFloat(l.weight));
  const allUp = recent[0] > recent[1] && recent[1] > recent[2] && recent[2] > recent[3];
  if (!allUp) return;
  const gained = (recent[0] - recent[3]).toFixed(1);
  await sendEmail(`Weight up ${gained} kg in 3 days — intervene now`, emailHTML(
    "You're trending the wrong way.",
    `Weight has gone up 3 days in a row.<br><br>Current: <strong style="color:#f56565">${recent[0]} kg</strong> (+${gained} kg in 3 days)<br><br>Usually caused by: eating late, alcohol, skipped workouts, or stress eating. You know which one.<br><br><strong style="color:#f0f0f0">Reset tonight:</strong><br>— Dinner before 7:30 PM — daliya or khichdi<br>— No alcohol, no ordering online<br>— Isabgol before dinner<br>— Sleep by 11 PM<br><br>You've done this before. You know exactly what to do.`,
    '🚨'
  ));
}

// ── 5. PROTEIN NUDGE (4 PM daily, only if below 100g) ──
async function proteinNudge() {
  const protein = await getProteinToday();
  if (protein >= 100) return;
  const needed = 130 - protein;
  await sendEmail(`Protein check — ${needed}g still needed today`, emailHTML(
    'Afternoon protein check.',
    `Logged so far: <strong style="color:#f5c565">${protein}g</strong> — need ${needed}g more to hit 130g target.<br><br><strong style="color:#f0f0f0">Easy wins right now:</strong><br>— Whey shake in water: 24g<br>— 100g grilled chicken: 25g<br>— Paneer 100g: 18g<br>— 2 boiled eggs: 12g<br><br>Get it in before dinner. Protein protects muscle while losing fat. Don't skip it.`,
    '🥩'
  ));
}

// ── 6. INACTIVITY ALERT (daily, only if no log for 3+ days) ──
async function inactivityAlert() {
  const logs = await getWeightData();
  if (logs.length === 0) return;
  const lastLog = new Date(logs[0].date);
  const daysSince = Math.floor((new Date() - lastLog) / (1000 * 60 * 60 * 24));
  if (daysSince < 3) return;
  await sendEmail(`${daysSince} days without logging — get back on the scale`, emailHTML(
    `You've been off the radar for ${daysSince} days.`,
    `Last log: <strong style="color:#f5c565">${logs[0].weight} kg</strong> on ${new Date(logs[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}.<br><br>Not logging doesn't mean the scale isn't moving — it means you don't know which direction.<br><br><strong style="color:#f0f0f0">Tomorrow morning:</strong> Scale the moment you wake up. Log it. Whatever the number — face it and move forward.<br><br><a href="${APP_URL}" style="color:#c8f565">Open the app →</a>`,
    '👀'
  ));
}

// ── MAIN HANDLER ──
module.exports = async function handler(req, res) {
  const { type } = req.query;
  try {
    switch (type) {
      case 'evening':    await eveningCheckIn(); break;
      case 'friday':     await fridayWarning(); break;
      case 'monday':     await mondayReset(); break;
      case 'trend':      await trendAlert(); break;
      case 'protein':    await proteinNudge(); break;
      case 'inactivity': await inactivityAlert(); break;
      default: return res.status(400).json({ error: 'Unknown type' });
    }
    res.status(200).json({ ok: true, type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
