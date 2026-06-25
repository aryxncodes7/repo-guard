const http = require('http');

const data = JSON.stringify({
  repo_url: 'https://github.com/aryxncodes7/repo-guard'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/review',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
