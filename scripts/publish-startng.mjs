const body = {
  repo_url: 'https://github.com/adesolabolu/circuit-racer',
  name: 'circuit-racer',
};

console.log('1. Checking game on start.ng...');
const checkRes = await fetch('https://api.start.ng/games/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const checkData = await checkRes.json();
console.log('Check Status:', checkRes.status);
console.log('Check Response:', JSON.stringify(checkData, null, 2));

if (checkRes.status === 200 || checkData.ok) {
  console.log('\n2. Publishing game to start.ng...');
  const pubRes = await fetch('https://api.start.ng/games/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const pubData = await pubRes.json();
  console.log('Publish Status:', pubRes.status);
  console.log('Publish Response:', JSON.stringify(pubData, null, 2));
} else {
  console.error('Check did not pass, aborting publish.');
}
