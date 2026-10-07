// Printed text as a terminal shows it: a carriage return (\r) without a new line goes back to
// the start of the line, so a progress bar that redraws itself (tqdm, Keras) shows its latest
// state, not every state one after another.
export function terminalText(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      if (!line.includes("\r")) return line;
      const parts = line.split("\r").filter((part) => part !== "");
      return parts.length ? parts[parts.length - 1] : "";
    })
    .join("\n");
}
