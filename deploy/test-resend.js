const http = require('http');

const data = JSON.stringify({
  email: 'morzane@foxmail.com'
});

const req = http.request({
  hostname: 'localhost',
  port: 3004,
  path: '/api/auth/resend-verification',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(body));
});

req.on('error', console.error);
req.write(data);
req.end();
