import fs from 'fs';

const versionFile = './version.json';
const data = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
data.build += 1;
fs.writeFileSync(versionFile, JSON.stringify(data, null, 2));

console.log(`📦 Build-Version erhöht auf: ${data.build}`);