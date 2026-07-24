const fs = require('fs');

let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

code = code.replace(/<UploadCloud/g, '<Upload');
code = code.replace(/<AlertTriangle/g, '<AlertCircle');
code = code.replace('export default HomeDashboard;', '');

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
console.log('Fixed imports and exports');
