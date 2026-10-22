import fs from 'node:fs';
const answer = name => fs.readFileSync(new URL(`./winforms-start/answers/${name}`, import.meta.url), 'utf8');
const program = code => ({ 'Practice/Program.cs': code });
const draft = 'public class RequestDraft { public string Name { get; set; } = ""; public int Quantity { get; set; } = 1; }';
export const START_WALKTHROUGH = {
  'winforms-start/01-01-first-csharp#Make a console project': { before: ['dotnet new console --framework net10.0 --output Scratch'] },
  'winforms-start/01-01-first-csharp#Your turn: describe another request': {
    before: ['dotnet new console --framework net10.0 --output Practice'],
    files: program('string name = "Inspection tray";\nint quantity = 6;\nConsole.WriteLine($"{name}: {quantity}");'),
    wrong: [{ name: 'wrong quantity', before: ['dotnet new console --framework net10.0 --output Practice'], files: program('Console.WriteLine("Inspection tray: 7");'), fails: [0] }],
  },
  'winforms-start/01-02-decisions-and-methods#Your turn: check both sides of a boundary': {
    files: program('string QuantityError(int quantity) { if (quantity < 1 || quantity > 100) { return "Use a quantity from 1 to 100."; } return ""; }\nstring low = QuantityError(-1); Console.WriteLine(low == "" ? "accepted" : low);\nstring first = QuantityError(1); Console.WriteLine(first == "" ? "accepted" : first);\nstring last = QuantityError(100); Console.WriteLine(last == "" ? "accepted" : last);\nstring high = QuantityError(101); Console.WriteLine(high == "" ? "accepted" : high);'),
    wrong: [{ name: 'exclusive endpoint', files: program('Console.WriteLine("Use a quantity from 1 to 100.\\naccepted\\nrejected\\nUse a quantity from 1 to 100.");'), fails: [0] }],
  },
  'winforms-start/01-03-objects-and-properties#Your turn: make a third request': {
    files: { ...program('RequestDraft first = new RequestDraft(); first.Name = "Clamping plate"; first.Quantity = 2;\nRequestDraft second = new RequestDraft(); second.Name = "Gauge holder"; second.Quantity = 8;\nConsole.WriteLine($"{first.Name}: {first.Quantity}"); Console.WriteLine($"{second.Name}: {second.Quantity}");'), 'Practice/RequestDraft.cs': draft },
    wrong: [{ name: 'alias instead of separate object', files: { ...program('RequestDraft first = new RequestDraft(); first.Name = "Clamping plate"; first.Quantity = 2; RequestDraft second = first; second.Name = "Gauge holder"; second.Quantity = 8; Console.WriteLine($"{first.Name}: {first.Quantity}"); Console.WriteLine($"{second.Name}: {second.Quantity}");'), 'Practice/RequestDraft.cs': draft }, fails: [0] }],
  },
  'winforms-start/01-04-shared-rules#Your turn: protect the name-length boundary': {
    files: { 'Checks/Program.cs': answer('name-boundaries.cs.txt') },
    wrong: [
      { name: 'break the quantity endpoint', files: { 'Checks/Program.cs': answer('name-boundaries.cs.txt') }, editFiles: { 'Core/RequestRules.cs': [['quantity > 100', 'quantity >= 100']] }, fails: [0] },
      { name: 'omit forty assertion', fails: [1] },
      { name: 'omit forty-one assertion', fails: [2] },
    ],
  },
};
