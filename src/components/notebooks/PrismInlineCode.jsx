import React from "react";
import Prism from "../../utils/prism.js";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css";
import "../viz/react/prism-inline-override.css";
import "../viz/react/prism-inline-override-2.css";
import "../viz/react/prism-inline-lightblue.css";
// import "../viz/react/prism-inline-darkmode.css";

export default function PrismInlineCode({ children, className = "language-js" }) {
  const code = String(children).trim();
  const html = Prism.highlight(code, Prism.languages.javascript, "javascript");
  return (
    <code
      className={className}
      style={{ fontFamily: "monospace", color: "#0284c7", padding: 0, borderRadius: 0, fontSize: 14, display: "inline", background: "none" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
