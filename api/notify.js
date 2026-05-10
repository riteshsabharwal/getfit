const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const PUSHOVER_TOKEN = process.env.PUSHOVER_TOKEN;
const PUSHOVER_USER = process.env.PUSHOVER_USER;
const APP_URL = 'https://getfit.riteshsabharwal.com';

async function push(title, message, priority = 0, sound = 'pushover') {
  const res = await fetch('https://api.pushover.net/1/messages.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: PUSHOVER_TOKEN, user: PUSHOVER_USER, title, message, url: APP_URL, url_title: 'Open GetFit', priority, sound })
  });
  const data = await res.json();
  console.log('Pushover:', JSON.stringify(data));
  return data;
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

async function morningScale() {
  const logs = await getWeightData();
  const today = new Date().toISOString().split('T')[0];
  const loggedToday = logs.length > 0 && logs[0].date.split('T')[0] === today;
  if (loggedToday) return;
  const latest = logs.length > 0 ? logs[0].weight : null;
  const msg = latest ? `Last logged: ${latest}kg. Before water, before anything — step on the scale now and log it.` : `First log of the journey. Step on the scale now.`;
  await push('⚖️ Good morning — scale first', msg, 0, 'magic');
}

async function meditationReminder() {
  await push('🧘 Meditate before the day takes over', '10 minutes now — before the phone, before the chaos. Sit, breathe, set your intention.', 0, 'none');
}

async function lumiaReminder() {
  await push('💊 Lumia 60K — take it today', 'Weekly Vitamin D dose. Take one capsule after your meal today. Your Vitamin D was deficient — don\'t skip.', 1, 'magic');
}

async function middayWater() {
  await push('💧 Midday water check', 'Have you had 1 litre yet? Refill your bottle now.\n\nSaunf detox water — have you been sipping?', 0, 'none');
}

async function lunchReminder() {
  await push('🍱 Lunch time — stick to the plan', 'Roti or rice + protein + sabzi + curd.\n\nNo shortcuts. No ordering out. What you eat now affects tomorrow.', 0, 'none');
}

async function afternoonCheck() {
  const protein = await getProteinToday();
  if (protein >= 100) {
    await push('🚶 Afternoon movement check', `Protein: ${protein}g ✓ On track.\n\nNow get up and walk 10 minutes. Quick walk, then evening snack.`, 0, 'none');
  } else {
    const needed = 130 - protein;
    await push(`🥩 Protein short — ${needed}g still needed`, `Only ${protein}g logged so far.\n\nEasy fix: whey shake (24g), paneer 100g (18g), chicken 100g (25g).\n\nAlso: get up and walk 10 mins.`, 0, 'none');
  }
}

async function eveningSnack() {
  await push('🌰 Evening snack time', 'Makhana, mixed nuts, or sattu drink. Not biscuits, not chips.\n\nThis prevents the late-night hunger that leads to bad choices.', 0, 'none');
}

async function dinnerReminder() {
  await push('🍽️ Dinner window open', 'Eat now — daliya, khichdi, daal roti, or light protein.\n\nClose the kitchen by 8:30 PM. Late eating = weight gain regardless of what you eat.', 0, 'intermission');
}

async function habitsCheck() {
  const logs = await getWeightData();
  const today = new Date().toISOString().split('T')[0];
  const loggedToday = logs.length > 0 && logs[0].date.split('T')[0] === today;
  const logLine = loggedToday ? '✓ Weight logged today.' : '⚠️ No weight log today.';
  await push('📋 Evening habits check', `${logLine}\n\nOpen the app and log your 3 habits:\n😴 Sleep well last night?\n🧘 Meditated today?\n🥗 Ate as per plan?\n\nHow many steps today? Target: 10,000.`, 0, 'intermission');
}

async function sleepReminder() {
  await push('🌙 Screens off — sleep by 10:30', 'Your body recovers and burns fat during deep sleep. Less than 7 hours raises hunger tomorrow.\n\nPhone down. Sleep is part of the plan.', 0, 'none');
}

async function fridayWarning() {
  const logs = await getWeightData();
  if (logs.length === 0) {
    await push('⚠️ Weekend Warning', 'No data yet — but the rules apply.\n\nGrilled over fried. Water over alcohol. Dinner before 8 PM.', 1, 'siren');
    return;
  }
  const weights = logs.slice(0, 7).map(l => parseFloat(l.weight));
  const latest = weights[0];
  const weekChange = (latest - weights[weights.length - 1]).toFixed(1);
  const totalLost = (105.4 - latest).toFixed(1);
  if (parseFloat(weekChange) <= 0) {
    await push(`⚠️ Good week — down ${Math.abs(weekChange)}kg. Don't blow it.`, `Current: ${latest}kg | Total lost: ${totalLost}kg\n\nWeekend rules:\n— Grilled or tandoori when eating out\n— Max 1 drink, not a session\n— Dinner before 8 PM\n— No late-night ordering`, 1, 'siren');
  } else {
    await push(`⚠️ Weight up ${weekChange}kg this week.`, `Current: ${latest}kg\n\nNon-negotiables:\n— No alcohol\n— No Swiggy/Zomato\n— Walk both days\n— Dinner by 7:30 PM`, 1, 'siren');
  }
}

async function mondayReset() {
  const logs = await getWeightData();
  const latest = logs.length > 0 ? parseFloat(logs[0].weight) : null;
  const totalLost = latest ? (105.4 - latest).toFixed(1) : null;
  const weightLine = latest ? `Last logged: ${latest}kg — total lost: ${totalLost}kg.` : `Get on the scale this morning.`;
  await push('🌅 Monday — clean slate', `${weightLine}\n\nToday:\n— Log morning weight\n— Hit protein target\n— 45 mins movement\n— Dinner before 8 PM`, 0, 'magic');
}

async function trendAlert() {
  const logs = await getWeightData();
  if (logs.length < 4) return;
  const recent = logs.slice(0, 4).map(l => parseFloat(l.weight));
  if (!(recent[0] > recent[1] && recent[1] > recent[2] && recent[2] > recent[3])) return;
  const gained = (recent[0] - recent[3]).toFixed(1);
  await push(`🚨 Weight up ${gained}kg in 3 days`, `Current: ${recent[0]}kg\n\nReset tonight:\n— Light dinner before 7:30 PM\n— No alcohol, no ordering\n— Sleep by 10:30 PM`, 1, 'siren');
}

async function inactivityAlert() {
  const logs = await getWeightData();
  if (logs.length === 0) return;
  const daysSince = Math.floor((new Date() - new Date(logs[0].date)) / (1000 * 60 * 60 * 24));
  if (daysSince < 3) return;
  await push(`👀 ${daysSince} days without logging`, `Last log: ${logs[0].weight}kg.\n\nTomorrow morning: scale the moment you wake up. Log it. Whatever the number — face it and move forward.`, 1, 'siren');
}

module.exports = async function handler(req, res) {
  const { type } = req.query;
  console.log('notify type:', type);
  try {
    switch (type) {
      case 'morning_scale':  await morningScale(); break;
      case 'meditation':     await meditationReminder(); break;
      case 'lumia':          await lumiaReminder(); break;
      case 'midday_water':   await middayWater(); break;
      case 'lunch':          await lunchReminder(); break;
      case 'afternoon':      await afternoonCheck(); break;
      case 'evening_snack':  await eveningSnack(); break;
      case 'dinner':         await dinnerReminder(); break;
      case 'habits':         await habitsCheck(); break;
      case 'sleep':          await sleepReminder(); break;
      case 'friday':         await fridayWarning(); break;
      case 'monday':         await mondayReset(); break;
      case 'trend':          await trendAlert(); break;
      case 'inactivity':     await inactivityAlert(); break;
      case 'evening':        await habitsCheck(); break;
      case 'protein':        await afternoonCheck(); break;
      default: return res.status(400).json({ error: 'Unknown type: ' + type });
    }
    res.status(200).json({ ok: true, type });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
