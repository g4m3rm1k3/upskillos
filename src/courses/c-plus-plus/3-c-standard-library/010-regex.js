const MATCH_SEARCH_CODE = `#include <iostream>
#include <regex>
#include <string>
using namespace std;

// __OUTPUT__: match 'hello123': yes\\nmatch 'hello 123': no\\nsearch found: user@example.com\\nsearch 'no email': not found

int main() {
    // regex_match: ENTIRE string must match the pattern
    regex wordDigits(R"(\\w+\\d+)");
    cout << "match 'hello123': "
         << (regex_match("hello123", wordDigits) ? "yes" : "no") << "\\n";
    cout << "match 'hello 123': "
         << (regex_match("hello 123", wordDigits) ? "yes" : "no") << "\\n";

    // regex_search: find FIRST match anywhere in the string
    string text = "Contact us at user@example.com for info";
    regex emailRx(R"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");
    smatch m;
    if (regex_search(text, m, emailRx))
        cout << "search found: " << m[0] << "\\n";

    if (!regex_search("no email here", m, emailRx))
        cout << "search 'no email': not found\\n";

    return 0;
}`;

const CAPTURE_CODE = `#include <iostream>
#include <regex>
#include <string>
using namespace std;

// __OUTPUT__: full: Date: 2024-03-15\\nyear=2024 month=03 day=15\\nip: 192.168.1.1  octets: 192 168 1 1\\nnamed: prefix=hello

int main() {
    // Capture groups: (pattern) → m[1], m[2], ...
    string date = "Date: 2024-03-15";
    regex dateRx(R"(Date: (\\d{4})-(\\d{2})-(\\d{2}))");
    smatch m;
    if (regex_search(date, m, dateRx)) {
        cout << "full: " << m[0] << "\\n";
        cout << "year=" << m[1] << " month=" << m[2] << " day=" << m[3] << "\\n";
    }

    // Multiple captures: IP address
    string ip = "Server: 192.168.1.1";
    regex ipRx(R"((\\d+)\\.(\\d+)\\.(\\d+)\\.(\\d+))");
    smatch im;
    if (regex_search(ip, im, ipRx)) {
        cout << "ip: " << im[0] << "  octets: "
             << im[1] << " " << im[2] << " " << im[3] << " " << im[4] << "\\n";
    }

    // Named groups (not in C++ standard — workaround with index)
    regex prefixRx(R"((\\w+)_suffix)");
    smatch pm;
    if (regex_search("hello_suffix", pm, prefixRx))
        cout << "named: prefix=" << pm[1] << "\\n";

    return 0;
}`;

const REPLACE_ALL_CODE = `#include <iostream>
#include <regex>
#include <string>
using namespace std;

// __OUTPUT__: redacted: Call [PHONE] for details\\ncensor: h*** w***\\nall emails: [EMAIL] and [EMAIL]\\nreformat date: 15/03/2024

int main() {
    // regex_replace: replace first or all matches
    string phone = "Call 555-867-5309 for details";
    string redacted = regex_replace(phone,
        regex(R"(\\d{3}-\\d{3}-\\d{4})"), "[PHONE]");
    cout << "redacted: " << redacted << "\\n";

    // Replace with back-reference: keep first char, replace rest with *
    string s = "hello world";
    string censored = regex_replace(s,
        regex(R"((\\w)(\\w+))"), "$1***");
    cout << "censor: " << censored << "\\n";

    // Replace ALL occurrences (regex_replace replaces all by default)
    string emails = "alice@test.com and bob@work.org";
    string noEmails = regex_replace(emails,
        regex(R"([\\w.]+@[\\w.]+)"), "[EMAIL]");
    cout << "all emails: " << noEmails << "\\n";

    // Reformat a date: YYYY-MM-DD → DD/MM/YYYY
    string date = "2024-03-15";
    string reformatted = regex_replace(date,
        regex(R"((\\d{4})-(\\d{2})-(\\d{2}))"), "$3/$2/$1");
    cout << "reformat date: " << reformatted << "\\n";

    return 0;
}`;

const ITER_CODE = `#include <iostream>
#include <regex>
#include <string>
#include <vector>
using namespace std;

// __OUTPUT__: emails: alice@test.com bob@work.org\\nwords: hello world foo\\ntokens: one two three\\ncount: 3

int main() {
    // sregex_iterator: find ALL matches in a string
    string text = "alice@test.com and bob@work.org";
    regex emailRx(R"([\\w.]+@[\\w.]+)");
    cout << "emails: ";
    for (sregex_iterator it(text.begin(), text.end(), emailRx), end;
         it != end; ++it)
        cout << (*it)[0] << " ";
    cout << "\\n";

    // Collect all matches into a vector
    string sentence = "hello world foo";
    regex wordRx(R"(\\w+)");
    vector<string> words;
    for (sregex_iterator it(sentence.begin(), sentence.end(), wordRx), end;
         it != end; ++it)
        words.push_back((*it)[0]);
    cout << "words: ";
    for (const auto& w : words) cout << w << " ";
    cout << "\\n";

    // sregex_token_iterator: split on delimiter
    string csv = "one,two,three";
    regex comma(R"(,)");
    cout << "tokens: ";
    for (sregex_token_iterator it(csv.begin(), csv.end(), comma, -1), end;
         it != end; ++it)
        cout << *it << " ";
    cout << "\\n";

    cout << "count: " << words.size() << "\\n";

    return 0;
}`;

const lesson = {
  id: "cpp-2-010",
  slug: "regex",
  chapter: "cpp-2",
  order: 10,
  title: "Regular Expressions",
  subtitle:
    "Pattern matching, capture groups, replace, and iteration with std::regex",
  tags: [
    "c++",
    "cpp",
    "regex",
    "regex_match",
    "regex_search",
    "regex_replace",
    "smatch",
    "sregex_iterator",
  ],
  aliases: [
    "c++ regex",
    "c++ regular expression",
    "c++ regex_match",
    "c++ regex_search",
    "c++ regex_replace",
    "c++ smatch",
  ],

  hook: `Parsing structured text — dates, emails, phone numbers, log entries — with \`find\` and \`substr\` becomes unmaintainable fast. Regular expressions express the pattern once and the engine handles the search, extraction, and replacement. C++11 added \`<regex>\` to the standard library: compile the pattern once, use it many times.`,

  mentalModel: [
    '**`regex_match` checks the whole string; `regex_search` finds a match anywhere.** `regex_match("hello123", rx)` returns true only if the entire string matches. `regex_search("prefix hello123 suffix", m, rx)` returns true if the pattern appears anywhere. For validation use `match`; for extraction use `search`.',
    "**Capture groups `(...)` extract substrings.** `smatch m; regex_search(s, m, rx)` — `m[0]` is the full match, `m[1]` is the first group, `m[2]` is the second, etc. Use groups to extract structured data: `(year)-(month)-(day)` gives you three captures.",
    "**`sregex_iterator` iterates all matches in a string.** Construct with `(begin, end, regex)`, iterate until the end sentinel. Use it to collect all occurrences of a pattern — email addresses, URLs, numbers. `sregex_token_iterator` with `-1` splits on the pattern instead.",
  ],

  intuition: {
    prose: [
      '**Raw string literals `R"(...)"` avoid double-escaping.** Regex patterns use `\\d` for digits, but in a regular string you\'d write `"\\\\d"`. With raw strings: `R"(\\d+)"` — no escaping needed. Always use raw strings for regex patterns.',
    ],
    visualizations: [
      {
        id: "CppLab",
        mathBridge:
          '**match vs search — run it then explore:**\n\n- `regex_match` requires the WHOLE string to match — add prefix/suffix and it fails.\n- `regex_search` finds the pattern anywhere — \'Contact at user@example.com\' still finds the email.\n- Change pattern to `R"(\\d+)"` — does `regex_match("42abc", rx)` succeed? (no — not all chars are digits)\n- `regex_search("hello", m, regex(R"(\\d+)"))` — `m` is empty, returns false.',
        props: {
          mainFile: "main.cpp",
          initialFiles: { "/home/user/main.cpp": MATCH_SEARCH_CODE },
        },
      },
      {
        id: "CppLab",
        mathBridge:
          "**Capture groups — run it then explore:**\n\n- `m.size()` — how many groups are in the match? (total captures + 1 for m[0])\n- `m[0]` is always the full match — `m[1]` is the first parenthesized group.\n- Try nested groups: `((\\d{4})-(\\d{2}))` — `m[1]` is the outer group, `m[2]` and `m[3]` are inner.\n- What if a group doesn't participate in the match (e.g., optional group `(x)?`)? `m[1].matched` is false.",
        props: {
          mainFile: "main.cpp",
          initialFiles: { "/home/user/main.cpp": CAPTURE_CODE },
        },
      },
    ],
  },

  rigor: {
    prose: [
      "**Compile the regex once, use it many times.** `std::regex` construction is expensive — it compiles the pattern into a state machine. If you call `regex_search(s, smatch{}, regex(pattern))` in a loop, you're recompiling the pattern on every iteration. Declare the regex outside the loop.",
      "**`std::regex` is slow by modern regex standards.** C++ regex uses the standard library which is generally 5-20× slower than PCRE2 or RE2. For production parsing of large inputs, consider linking PCRE2 or Boost.Regex. For most use cases (config parsing, validation, small text), `std::regex` is fine.",
    ],
    visualizations: [
      {
        id: "CppLab",
        mathBridge:
          '**regex_replace — run it then explore:**\n\n- `$0` in the replacement refers to the entire match — use to surround matches: `regex_replace(s, rx, "[" + "$0" + "]")`\n- `$1`, `$2` back-references in the replacement string.\n- Add `regex_constants::format_first_only` flag to replace only the first match.\n- Replace all whitespace with underscores: `regex_replace(s, regex(R"(\\s+)"), "_")`',
        props: {
          mainFile: "main.cpp",
          initialFiles: { "/home/user/main.cpp": REPLACE_ALL_CODE },
        },
      },
      {
        id: "CppLab",
        mathBridge:
          "**sregex_iterator — run it then explore:**\n\n- Collect all numbers from 'score: 95, max: 100' using `R\"(\\d+)\"`.\n- `sregex_token_iterator` with `-1` splits; with `0` yields matches. Try both on a CSV string.\n- Count matches: `distance(sregex_iterator(s.begin(),s.end(),rx), sregex_iterator{})` — O(n).\n- Collect capture group 1 from each match: `(*it)[1].str()`",
        props: {
          mainFile: "main.cpp",
          initialFiles: { "/home/user/main.cpp": ITER_CODE },
        },
      },
    ],
    callouts: [
      {
        type: "warning",
        title: "Compile regex outside loops",
        body: '`std::regex` compilation is expensive. Declaring `regex rx(pattern)` inside a loop recompiles on every iteration. Declare it once outside and reuse it. For static patterns, use a static local: `static regex rx("pattern");`',
      },
      {
        type: "tip",
        title: "Use raw string literals for regex patterns",
        body: 'In a regular string, `\\d` must be written as `"\\\\d"`. In a raw string `R"(\\d)"`, no escaping needed. Regex patterns are significantly more readable with raw strings — compare `R"(\\d{4}-\\d{2}-\\d{2})"` vs `"\\\\d{4}-\\\\d{2}-\\\\d{2}"`.',
      },
    ],
  },

  examples: [
    {
      title: "Email validator",
      body: `#include <regex>
#include <string>

bool isValidEmail(const std::string& s) {
    // Simplified email pattern — production use needs more edge cases
    static std::regex emailRx(
        R"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"
    );
    return std::regex_match(s, emailRx);
}

// isValidEmail("user@example.com")  → true
// isValidEmail("user@example")      → false (no TLD)
// isValidEmail("@example.com")      → false (no local part)`,
    },
    {
      title: "Extract all key=value pairs from a config string",
      body: `#include <regex>
#include <string>
#include <map>

std::map<std::string, std::string> parseConfig(const std::string& text) {
    static std::regex kv(R"((\\w+)\\s*=\\s*([^\\n;]+))");
    std::map<std::string, std::string> result;
    for (std::sregex_iterator it(text.begin(), text.end(), kv), end;
         it != end; ++it) {
        result[(*it)[1].str()] = (*it)[2].str();
    }
    return result;
}

// parseConfig("host = localhost\\nport = 8080")
// → { "host": "localhost", "port": "8080" }`,
    },
  ],

  challenges: [
    {
      difficulty: "easy",
      problem:
        'Write a `extractNumbers(string s)` that returns a `vector<int>` of all integers found in the string. Use `sregex_iterator` with pattern `R"(\\d+)"`. Test with `"score: 95, max: 100, min: 42"` — should return `{95, 100, 42}`.',
      hint: '`static regex numRx(R"(\\d+)");`. Loop `sregex_iterator`, push `stoi((*it)[0].str())`.',
      walkthrough: [
        'static regex numRx(R"(\\d+)");',
        "vector<int> result;",
        "for (sregex_iterator it(s.begin(), s.end(), numRx), end; it != end; ++it)",
        "  result.push_back(stoi((*it)[0].str()));",
        "return result;",
      ],
    },
    {
      difficulty: "medium",
      problem:
        "Write a log parser: given lines like `[2024-03-15 14:23:01] ERROR user.service: connection timeout`, extract timestamp, level, service, and message using capture groups. Return a struct `LogEntry{string timestamp, level, service, message}`. Test with 5 sample lines.",
      hint: `Pattern: \`\\[(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})\\] (\\w+) ([\\w.]+): (.+)\`. Groups 1-4 are timestamp, level, service, message.`,
      walkthrough: [
        '`regex logRx(R"(\\[(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})\\] (\\w+) ([\\w.]+): (.+))");`',
        "smatch m; if (regex_search(line, m, logRx))",
        "return {m[1], m[2], m[3], m[4]};",
        "Test with ERROR, INFO, WARN lines",
      ],
    },
  ],

  assessment: {
    questions: [
      {
        id: "cpp2-010-q1",
        type: "choice",
        text: "What is the difference between `regex_match` and `regex_search`?",
        options: [
          "regex_match is faster; regex_search is more accurate",
          "regex_match requires the entire string to match; regex_search finds the pattern anywhere in the string",
          "regex_match uses POSIX syntax; regex_search uses Perl syntax",
          "regex_search returns all matches; regex_match returns only the first",
        ],
        answer: 1,
        explanation:
          "`regex_match` anchors the pattern to the full string — it returns true only if the pattern matches the entire input. `regex_search` finds the first occurrence anywhere in the string. Use `match` for validation, `search` for extraction.",
      },
      {
        id: "cpp2-010-q2",
        type: "choice",
        text: "What does `m[0]` contain after a successful `regex_search`?",
        options: [
          "The first capture group",
          "The entire matched substring (the full match, not just group 1)",
          "The position of the match in the string",
          "The number of capture groups",
        ],
        answer: 1,
        explanation:
          "`m[0]` (or `m[0].str()`) is always the entire matched substring. `m[1]`, `m[2]`, etc. are the capture groups in order. This convention is standard across regex implementations.",
      },
      {
        id: "cpp2-010-q3",
        type: "choice",
        text: "Why should you declare `std::regex` outside of a loop?",
        options: [
          "regex is not copyable so it can't be in a loop variable",
          "std::regex compilation is expensive — constructing it inside a loop recompiles the pattern on every iteration",
          "regex objects aren't thread-safe inside loops",
          "The compiler will error on regex inside loops",
        ],
        answer: 1,
        explanation:
          "Constructing a `std::regex` compiles the pattern into a state machine — a non-trivial operation. Creating it inside a loop multiplies this cost by the loop count. Declare it once outside the loop (or as `static` inside a function for a one-time initialization).",
      },
      {
        id: "cpp2-010-q4",
        type: "choice",
        text: "What does `sregex_token_iterator(s.begin(), s.end(), rx, -1)` do?",
        options: [
          "Iterates over all matches of rx in s",
          "Splits s on matches of rx — yields the text BETWEEN matches",
          "Finds the last match of rx in s",
          "Counts the number of matches",
        ],
        answer: 1,
        explanation:
          "With flag `-1`, `sregex_token_iterator` yields the text *between* pattern matches — effectively splitting the string on the pattern. With flag `0` (default), it yields the matches themselves. With an integer N, it yields capture group N from each match.",
      },
    ],
  },
};

export default lesson;
