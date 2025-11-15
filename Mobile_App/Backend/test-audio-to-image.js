#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';
const audioFile = 'test-audio.wav';
const audioFilePath = path.join(__dirname, audioFile);

console.log('\n=== Testing Audio to Image Conversion API ===\n');

// Check if audio file exists
if (!fs.existsSync(audioFilePath)) {
  console.log('❌ Audio file not found:', audioFilePath);
  process.exit(1);
}

console.log('✅ Audio file found:', audioFilePath);
console.log('📊 File size:', fs.statSync(audioFilePath).size, 'bytes\n');

// Create form data
const form = new FormData();
form.append('audioFile', fs.createReadStream(audioFilePath));
form.append('userId', 'test-user-' + Date.now());
form.append('compress', 'true');
form.append('deleteSource', 'false');

console.log('📤 Sending request to:', BASE_URL + '/convert/audio-to-image');
console.log('📋 Form data fields:');
console.log('   - audioFile:', audioFile);
console.log('   - userId:', form.getHeaders()['content-type']);
console.log('   - compress: true');
console.log('   - deleteSource: false\n');

// Send request
fetch(BASE_URL + '/convert/audio-to-image', {
  method: 'POST',
  body: form,
  headers: form.getHeaders(),
  timeout: 30000
})
  .then(res => {
    console.log('📡 Response status:', res.status, res.statusText);
    return res.json().then(data => ({ status: res.status, data }));
  })
  .then(({ status, data }) => {
    console.log('\n✅ Response received:\n');
    console.log(JSON.stringify(data, null, 2));
    
    if (status === 200 && data.success) {
      console.log('\n✅ Conversion successful!');
      console.log('🎵 Images generated:', data.imageCount);
      console.log('📁 Output path:', data.outputPath);
      console.log('🖼️  Image files:', data.images);
    } else {
      console.log('\n❌ Conversion failed');
    }
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
