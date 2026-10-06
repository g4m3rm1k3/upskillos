import fs from 'fs';
let code = fs.readFileSync('src/components/notebooks/PythonNotebook.jsx', 'utf8');

const newComponent = `    </div>
  );
}

// ── Prose code block ──────────────────────────────────────────────────────
function ProseCodeBlock({ lang, code, C, index }) {
  const html = useMemo(() => {
    try {
      if (Prism.languages[lang]) {
        return Prism.highlight(code, Prism.languages[lang], lang);
      }
      return null;
    } catch {
      return null;
    }
  }, [code, lang]);

  return (
    <div
      style={{
        margin: index === 0 ? "0 0 4px" : "14px 0 4px",
        borderRadius: 7,
        overflow: "hidden",
        border: \`1px solid \${C.border}\`,
      }}
    >
      {lang && (
        <div
          style={{
            padding: "3px 10px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: C.muted,
            background: \`linear-gradient(90deg, \${C.surface2} 0%, \${C.surface} 100%)\`,
            borderBottom: \`1px solid \${C.border}\`,
          }}
        >
          {lang}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: "10px 14px",
          fontSize: 13.5,
          lineHeight: 1.6,
          overflowX: "auto",
          background: C.bg,
          color: C.text,
          fontFamily: "monospace",
        }}
      >
        {html ? (
          <code className={\`language-\${lang}\`} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
}

// ── Memoized Cell Component ──────────────────────────────────────────────`;

code = code.replace(/    <\/div>\r?\n  \);\r?\n}\r?\n\r?\n\/\/ ── Memoized Cell Component ──────────────────────────────────────────────/, newComponent);

const oldMap = `                      return (
                        <div
                          key={i}
                          style={{
                            margin: i === 0 ? "0 0 4px" : "14px 0 4px",
                            borderRadius: 7,
                            overflow: "hidden",
                            border: \`1px solid \${C.border}\`,
                          }}
                        >
                          {lang && (
                            <div
                              style={{
                                padding: "3px 10px",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.07em",
                                textTransform: "uppercase",
                                color: C.muted,
                                background: \`linear-gradient(90deg, \${C.surface2} 0%, \${C.surface} 100%)\`,
                                borderBottom: \`1px solid \${C.border}\`,
                              }}
                            >
                              {lang}
                            </div>
                          )}
                          <pre
                            style={{
                              margin: 0,
                              padding: "10px 14px",
                              fontSize: 13.5,
                              lineHeight: 1.6,
                              overflowX: "auto",
                              background: C.bg,
                              color: C.text,
                              fontFamily: "monospace",
                            }}
                          >
                            <code>{inner}</code>
                          </pre>
                        </div>
                      );`;

const newMap = `                      return <ProseCodeBlock key={i} index={i} lang={lang} code={inner} C={C} />;`;

code = code.replace(oldMap, newMap);

fs.writeFileSync('src/components/notebooks/PythonNotebook.jsx', code);
console.log('done');
