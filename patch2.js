import fs from 'fs';
let code = fs.readFileSync('src/components/notebooks/PythonNotebook.jsx', 'utf8');

const regex = /return \(\s*<div\s*key=\{i\}\s*style=\{\{\s*margin: i === 0 \? "0 0 4px" : "14px 0 4px",\s*borderRadius: 7,\s*overflow: "hidden",\s*border: `1px solid \$\{C\.border\}`,\s*\}\}\s*>\s*\{lang && \(\s*<div\s*style=\{\{\s*padding: "3px 10px",\s*fontSize: 10,\s*fontWeight: 700,\s*letterSpacing: "0\.07em",\s*textTransform: "uppercase",\s*color: C\.muted,\s*background: `linear-gradient\(90deg, \$\{C\.surface2\} 0%, \$\{C\.surface\} 100%\)`,\s*borderBottom: `1px solid \$\{C\.border\}`,\s*\}\}\s*>\s*\{lang\}\s*<\/div>\s*\)\}\s*<pre\s*style=\{\{\s*margin: 0,\s*padding: "10px 14px",\s*fontSize: 13\.5,\s*lineHeight: 1\.6,\s*overflowX: "auto",\s*background: C\.bg,\s*color: C\.text,\s*fontFamily: "monospace",\s*\}\}\s*>\s*<code>\{inner\}<\/code>\s*<\/pre>\s*<\/div>\s*\);/g;

code = code.replace(regex, `return <ProseCodeBlock key={i} index={i} lang={lang} code={inner} C={C} />;`);

fs.writeFileSync('src/components/notebooks/PythonNotebook.jsx', code);
console.log('done2');
