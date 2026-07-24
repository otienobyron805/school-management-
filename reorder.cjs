const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

const clockInRegex = /[ \t]*\{\/\* ATTENDANCE CLOCK IN \/ OUT SECTION \*\/\}[\s\S]*?\}\)/;
const match = code.match(clockInRegex);

if (match) {
  const clockInCode = match[0];
  code = code.replace(clockInCode, '');
  
  const insertTarget = '        </div>\n\n      </div>\n\n      {/* 🖼️ INTERACTIVE PROFILE PICTURE UPLOADER MODAL */}';
  code = code.replace(insertTarget, '        </div>\n\n' + clockInCode + '\n\n      </div>\n\n      {/* 🖼️ INTERACTIVE PROFILE PICTURE UPLOADER MODAL */}');
  
  fs.writeFileSync('src/components/HomeDashboard.tsx', code);
  console.log('Reordered successfully!');
} else {
  console.log('Regex did not match.');
}
