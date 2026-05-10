module.exports = async function handler(req, res) {
  const { type } = req.query;

  const token = process.env.PUSHOVER_TOKEN;
  const user = process.env.PUSHOVER_USER;

  const messages = {
    evening: { title: '🌙 Evening Check-in', message: "It's 8:30 PM. No junk tonight. Log your weight tomorrow morning. How was today's protein?" },
    friday: { title: '⚠️ Weekend Warning', message: 'Weekend starts now. Grilled over fried. Water over alcohol. Dinner before 8 PM. Monday weigh-in is watching.' },
    monday: { title: '🌅 Monday Reset', message: 'Weekend is done. Clean slate. Log your weight, hit 130g protein, 45 mins movement today.' },
    trend: { title: '🚨 Trend Alert', message: 'Weight has been going up. Reset tonight — light dinner, no alcohol, sleep by 11 PM.' },
    protein: { title: '🥩 Protein Check', message: 'Afternoon check — have you hit 130g protein today? Whey shake, paneer, or chicken before dinner.' },
    inactivity: { title: '👀 Missing You', message: "You haven't logged your weight in 3+ days. Get on the scale tomorrow morning." }
  };

  const msg = messages[type];
  if (!msg) return res.status(400).json({ error: 'Unknown type' });

  const result = await fetch('https://api.pushover.net/1/messages.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      user,
      title: msg.title,
      message: msg.message,
      url: 'https://getfit.riteshsabharwal.com',
      url_title: 'Open GetFit'
    })
  });

  const data = await result.json();
  res.status(200).json(data);
}
