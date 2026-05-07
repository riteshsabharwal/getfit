const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  const { date, habit, value } = req.query;

  console.log('habit.js called:', { date, habit, value });
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'present' : 'MISSING');
  console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'present' : 'MISSING');

  if (!date || !habit || !value) {
    return res.status(400).send(errorPage('Missing parameters.'));
  }

  const validHabits = ['sleep', 'meditate', 'meal'];
  if (!validHabits.includes(habit)) {
    return res.status(400).send(errorPage('Unknown habit.'));
  }

  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const boolValue = value === 'yes';
    const update = { date };
    update[habit] = boolValue;

    console.log('Attempting upsert:', update);

    const { data, error } = await sb.from('habit_logs').upsert(update, { onConflict: 'date' });

    console.log('Upsert result - data:', JSON.stringify(data), 'error:', JSON.stringify(error));

    if (error) {
      console.error('Supabase error:', error.message, error.details, error.hint);
      return res.status(500).send(errorPage('Could not save: ' + error.message));
    }

    const habitLabel = { sleep: 'Sleep well', meditate: 'Morning meditation', meal: 'Ate as per meal plan' };
    const emoji = boolValue ? '✅' : '❌';
    const msg = boolValue
      ? `<strong style="color:#c8f565">${habitLabel[habit]}</strong> — logged as done. Keep it up.`
      : `<strong style="color:#f5c565">${habitLabel[habit]}</strong> — logged honestly. Tomorrow is a new day.`;

    res.status(200).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GetFit — Logged</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="text-align:center;padding:2rem;max-width:360px">
    <div style="font-size:3rem;margin-bottom:1rem">${emoji}</div>
    <div style="font-size:1.1rem;color:#f0f0f0;line-height:1.6;margin-bottom:2rem">${msg}</div>
    <a href="https://getfit.riteshsabharwal.com" style="background:#c8f565;color:#0a0a0a;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9rem">Open GetFit App</a>
  </div>
</body></html>`);

  } catch (err) {
    console.error('Caught exception:', err.message, err.stack);
    return res.status(500).send(errorPage('Exception: ' + err.message));
  }
}

function errorPage(msg) {
  return `<!DOCTYPE html><html><body style="background:#0a0a0a;color:#f0f0f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><p>${msg}</p></body></html>`;
}
