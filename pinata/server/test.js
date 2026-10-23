const assert = require('assert');
process.env.NODE_ENV = 'test';
process.env.ALLOW_DEV_SIMULATION = 'true';

const app = require('./server');

const PORT = 5099;
const server = app.listen(PORT, async () => {
  try {
    console.log(`[Test] Pinata service test server running on port ${PORT}...`);

    // 1. Test health check
    const healthRes = await fetch(`http://localhost:${PORT}/api/ipfs/health`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'healthy');
    assert.strictEqual(healthData.service, 'PDSW Pinata IPFS Service');
    console.log('✔ Health check endpoint passed.');

    // 2. Test authentication verification endpoint
    const authRes = await fetch(`http://localhost:${PORT}/api/ipfs/test-auth`);
    const authData = await authRes.json();
    if (authRes.status === 200) {
      assert.strictEqual(authData.authenticated, true);
      console.log('✔ Pinata live authentication passed.');
    } else {
      assert.strictEqual(authRes.status, 401);
      assert.strictEqual(authData.authenticated, false);
      console.log('✔ Pinata unconfigured/safe authentication check passed (No secrets exposed).');
    }

    // 3. Test valid PDF upload and SHA-256 generation
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const sampleContent = 'PDSW Government Beneficiary Application Document Content';
    const body = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="document_id"\r\n\r\n` +
      `DOC-TEST-001\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="ration_card_proof.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n` +
      `${sampleContent}\r\n` +
      `--${boundary}--\r\n`;

    const uploadRes = await fetch(`http://localhost:${PORT}/api/ipfs/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body
    });

    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadRes.status, 200);
    assert.strictEqual(uploadData.success, true);
    assert.ok(uploadData.cid || uploadData.ipfs_cid);
    assert.ok(uploadData.fileHash || uploadData.file_hash);
    assert.strictEqual(uploadData.fileName, 'ration_card_proof.pdf');
    assert.strictEqual(uploadData.file_name, 'ration_card_proof.pdf');
    assert.strictEqual(uploadData.mimeType, 'application/pdf');
    console.log(`✔ File upload & SHA-256 generation passed. CID: ${uploadData.cid}, Hash: ${uploadData.fileHash}`);

    // 4. Test forbidden executable rejection (.exe)
    const exeBody = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="malicious.exe"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n` +
      `MZ90\r\n` +
      `--${boundary}--\r\n`;

    const exeRes = await fetch(`http://localhost:${PORT}/api/ipfs/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: exeBody
    });

    assert.strictEqual(exeRes.status, 400);
    const exeData = await exeRes.json();
    assert.strictEqual(exeData.success, false);
    console.log('✔ Forbidden executable rejection (.exe) passed.');

    // 5. Test unsupported MIME type rejection
    const txtBody = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="notes.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `some plain text\r\n` +
      `--${boundary}--\r\n`;

    const txtRes = await fetch(`http://localhost:${PORT}/api/ipfs/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: txtBody
    });

    assert.strictEqual(txtRes.status, 400);
    const txtData = await txtRes.json();
    assert.strictEqual(txtData.success, false);
    console.log('✔ Unsupported MIME type rejection (.txt) passed.');

    console.log('\nAll Pinata IPFS Service integration tests passed successfully!');
    server.close(() => {
      process.exit(0);
    });
  } catch (err) {
    console.error('Test failed:', err);
    server.close(() => {
      process.exit(1);
    });
  }
});
