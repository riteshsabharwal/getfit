module.exports = async function handler(req, res) {
  console.log('PUSHOVER_TOKEN:', process.env.PUSHOVER_TOKEN);
  console.log('PUSHOVER_USER:', process.env.PUSHOVER_USER);

  const result = await fetch('https://api.pushover.net/1/messages.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: process.env.PUSHOVER_TOKEN,
      user: process.env.PUSHOVER_USER,
      title: 'GetFit Test',
      message: 'If you see this, Pushover is working!'
    })
  });

  const data = await result.json();
  console.log('Pushover response:', JSON.stringify(data));
  res.status(200).json(data);
}
