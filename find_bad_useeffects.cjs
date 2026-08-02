const fs = require('fs');
const glob = require('glob'); // Note: we might not have glob, use standard fs

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = require('path').join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(require('path').join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = /useEffect\(\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*(.*?)\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const deps = match[2].trim();
      const body = match[1];
      if (deps !== '[]' && deps !== '') {
        // console.log(`File: ${filePath}`);
        // console.log(`Deps: ${deps}`);
        if (body.includes('set') || body.includes('dispatch')) {
           console.log(`Potential issue in ${filePath} with deps ${deps}`);
        }
      } else if (deps === '') {
        // no deps
        if (body.includes('set') || body.includes('dispatch')) {
           console.log(`No deps issue in ${filePath}`);
        }
      }
    }
  }
});
