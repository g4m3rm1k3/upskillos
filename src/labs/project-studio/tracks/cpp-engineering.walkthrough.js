// What a learner does at each step of the cpp-engineering track, for its walkthrough test (walkCppTrack.js).
// Generated with the lessons; see tracks/cpp-foundations.walkthrough.js for the format.
import { configure } from '../walkCppTrack.js';

export const WALKTHROUGH = {
  "01-git#Step 1 \u2014 A repository, and who you are": {
    "run": [
      "git init -b main",
      "git config user.name \"Ada Lovelace\"",
      "git config user.email \"ada@example.com\"",
    ],
    "wrong": [
      {
        "name": "made a repository in a subfolder",
        "run": [
          "git init -b main interp",
        ],
        "fails": [
          0,
        ],
      },
      {
        "name": "did not set a name for this repository",
        "run": [
          "git init -b main",
        ],
        "fails": [
          1,
        ],
      },
    ],
  },
  "01-git#Step 2 \u2014 Ignore what the build makes, then commit": {
    "run": [
      "git add .gitignore",
      "git commit -m \"Ignore build folders\"",
    ],
    "wrong": [
      {
        "name": "wrote it but did not commit",
        "typeFile": true,
        "fails": [
          2,
        ],
      },
      {
        "name": "staged it but did not commit",
        "typeFile": true,
        "run": [
          "git add .gitignore",
        ],
        "fails": [
          2,
        ],
      },
      {
        "name": "ignored only build",
        "files": {
          ".gitignore": "build/\n",
        },
        "run": [
          "git add .gitignore",
          "git commit -m \"Ignore build\"",
        ],
        "fails": [
          1,
        ],
      },
    ],
  },
  "01-git#Step 3 \u2014 The test framework": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "01-git#Step 4 \u2014 The test runner": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "01-git#Step 5 \u2014 The project's build file": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "01-git#Step 6 \u2014 What a tokenizer does": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "01-git#Step 7 \u2014 The specification": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "01-git#Step 8 \u2014 Write the tokenizer": {
    "run": [
      configure("."),
    ],
    "wrong": [
      {
        "name": "accepts 3. as a number",
        "files": {
          "src/tokenizer.cpp": "#include \"interp/tokenizer.h\"\n\n#include <cctype>\n\nnamespace interp {\n\nnamespace {\n\nbool is_space(char c)\n{\n    return std::isspace(static_cast<unsigned char>(c)) != 0;\n}\n\nbool is_digit(char c)\n{\n    return std::isdigit(static_cast<unsigned char>(c)) != 0;\n}\n\nbool starts_name(char c)\n{\n    return std::isalpha(static_cast<unsigned char>(c)) != 0 || c == '_';\n}\n\nbool continues_name(char c)\n{\n    return starts_name(c) || is_digit(c);\n}\n\nTokenKind symbol_kind(char c)\n{\n    switch (c) {\n    case '+': return TokenKind::plus;\n    case '-': return TokenKind::minus;\n    case '*': return TokenKind::star;\n    case '/': return TokenKind::slash;\n    case '(': return TokenKind::left_paren;\n    case ')': return TokenKind::right_paren;\n    case '=': return TokenKind::equals;\n    }\n    throw SyntaxError(std::string(\"unexpected character '\") + c + \"'\");\n}\n\n} // namespace\n\nstd::vector<Token> tokenize(std::string_view line)\n{\n    std::vector<Token> tokens;\n    std::size_t i = 0;\n    while (i < line.size()) {\n        const char c = line[i];\n        const std::size_t start = i;\n        if (is_space(c)) {\n            ++i;\n        } else if (is_digit(c)) {\n            while (i < line.size() && is_digit(line[i]))\n                ++i;\n            if (i < line.size() && line[i] == '.') {\n                ++i;\n                while (i < line.size() && is_digit(line[i]))\n                    ++i;\n            }\n            std::string text(line.substr(start, i - start));\n            const double value = std::stod(text);\n            tokens.push_back({TokenKind::number, std::move(text), value});\n        } else if (starts_name(c)) {\n            while (i < line.size() && continues_name(line[i]))\n                ++i;\n            tokens.push_back({TokenKind::identifier,\n                              std::string(line.substr(start, i - start))});\n        } else {\n            tokens.push_back({symbol_kind(c), std::string(1, c)});\n            ++i;\n        }\n    }\n    tokens.push_back({TokenKind::end, \"\"});\n    return tokens;\n}\n\n} // namespace interp\n",
        },
        "run": [
          configure("."),
        ],
        "fails": [
          2,
        ],
      },
      {
        "name": "names cannot contain digits",
        "files": {
          "src/tokenizer.cpp": "#include \"interp/tokenizer.h\"\n\n#include <cctype>\n\nnamespace interp {\n\nnamespace {\n\nbool is_space(char c)\n{\n    return std::isspace(static_cast<unsigned char>(c)) != 0;\n}\n\nbool is_digit(char c)\n{\n    return std::isdigit(static_cast<unsigned char>(c)) != 0;\n}\n\nbool starts_name(char c)\n{\n    return std::isalpha(static_cast<unsigned char>(c)) != 0 || c == '_';\n}\n\nbool continues_name(char c)\n{\n    return starts_name(c) || is_digit(c);\n}\n\nTokenKind symbol_kind(char c)\n{\n    switch (c) {\n    case '+': return TokenKind::plus;\n    case '-': return TokenKind::minus;\n    case '*': return TokenKind::star;\n    case '/': return TokenKind::slash;\n    case '(': return TokenKind::left_paren;\n    case ')': return TokenKind::right_paren;\n    case '=': return TokenKind::equals;\n    }\n    throw SyntaxError(std::string(\"unexpected character '\") + c + \"'\");\n}\n\n} // namespace\n\nstd::vector<Token> tokenize(std::string_view line)\n{\n    std::vector<Token> tokens;\n    std::size_t i = 0;\n    while (i < line.size()) {\n        const char c = line[i];\n        const std::size_t start = i;\n        if (is_space(c)) {\n            ++i;\n        } else if (is_digit(c)) {\n            while (i < line.size() && is_digit(line[i]))\n                ++i;\n            if (i < line.size() && line[i] == '.') {\n                ++i;\n                if (i == line.size() || !is_digit(line[i]))\n                    throw SyntaxError(\"a number needs digits after '.'\");\n                while (i < line.size() && is_digit(line[i]))\n                    ++i;\n            }\n            std::string text(line.substr(start, i - start));\n            const double value = std::stod(text);\n            tokens.push_back({TokenKind::number, std::move(text), value});\n        } else if (starts_name(c)) {\n            while (i < line.size() && starts_name(line[i]))\n                ++i;\n            tokens.push_back({TokenKind::identifier,\n                              std::string(line.substr(start, i - start))});\n        } else {\n            tokens.push_back({symbol_kind(c), std::string(1, c)});\n            ++i;\n        }\n    }\n    tokens.push_back({TokenKind::end, \"\"});\n    return tokens;\n}\n\n} // namespace interp\n",
        },
        "run": [
          configure("."),
        ],
        "fails": [
          2,
        ],
      },
    ],
  },
  "01-git#Step 9 \u2014 Commit the tokenizer": {
    "run": [
      "git add -A",
      "git commit -m \"Add a tokenizer, with its tests\"",
    ],
    "wrong": [
      {
        "name": "committed only the tokenizer",
        "run": [
          "git add src/tokenizer.cpp",
          "git commit -m \"Add a tokenizer\"",
        ],
        "fails": [
          1,
          3,
        ],
      },
      {
        "name": "staged but did not commit",
        "run": [
          "git add -A",
        ],
        "fails": [
          0,
          1,
          3,
          4,
        ],
      },
    ],
  },
  "02-cmake#Step 1 \u2014 A colleague's parser: the interface": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "02-cmake#Step 2 \u2014 A colleague's parser: the code": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "02-cmake#Step 3 \u2014 The parser's tests": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "02-cmake#Step 4 \u2014 The app": {
    "wrong": [
      {
        "name": "did not write it",
        "fails": [
          0,
          1,
        ],
      },
    ],
  },
  "02-cmake#Step 5 \u2014 Targets: a library, an app, the tests": {
    "wrong": [
      {
        "name": "include folder is PRIVATE",
        "files": {
          "CMakeLists.txt": "cmake_minimum_required(VERSION 3.20)\nproject(interp LANGUAGES CXX)\n\nset(CMAKE_CXX_STANDARD 20)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\n\n# Settings every target in this project uses. An INTERFACE library\n# has no code: linking to it just passes its settings on.\nadd_library(interp_options INTERFACE)\nif(MSVC)\n    target_compile_options(interp_options INTERFACE /W4)\nelse()\n    target_compile_options(interp_options INTERFACE -Wall -Wextra -Wpedantic)\nendif()\n\n# The interpreter: a library, shared by the app and the tests.\nadd_library(interp_core\n    src/tokenizer.cpp\n    src/parser.cpp)\ntarget_include_directories(interp_core PRIVATE include)\ntarget_link_libraries(interp_core PRIVATE interp_options)\n\n# The program people run.\nadd_executable(calc app/main.cpp)\ntarget_link_libraries(calc PRIVATE interp_core interp_options)\n\n# The tests: ctest runs every add_test.\nenable_testing()\nfile(GLOB TEST_SOURCES CONFIGURE_DEPENDS tests/*_test.cpp)\nadd_executable(interp_tests testing/test_main.cpp ${TEST_SOURCES})\ntarget_include_directories(interp_tests PRIVATE testing)\ntarget_link_libraries(interp_tests PRIVATE interp_core interp_options)\nadd_test(NAME unit_tests COMMAND interp_tests)\n\n# calc itself: a line that works exits with 0; one that doesn't\n# must fail (WILL_FAIL turns \"exited with 1\" into a pass).\nadd_test(NAME calc_accepts_a_line COMMAND calc \"1 + 2 * 3\")\nadd_test(NAME calc_rejects_bad_syntax COMMAND calc \"1 +\")\nset_tests_properties(calc_rejects_bad_syntax PROPERTIES WILL_FAIL TRUE)",
        },
        "run": [
          configure("."),
        ],
        "fails": [
          1,
          3,
        ],
      },
      {
        "name": "kept the old file",
        "fails": [
          0,
          2,
        ],
      },
    ],
  },
  "02-cmake#Step 6 \u2014 Your own parser tests": {
    "wrong": [
      {
        "name": "only one test",
        "files": {
          "tests/parser_more_test.cpp": "#include \"studio_test.hpp\"\n\n#include \"interp/parser.h\"\n\nTEST(one) { CHECK_EQ(interp::to_string(*interp::parse(\"((1))\")), \"1\"); }\n",
        },
        "fails": [
          0,
        ],
      },
    ],
  },
  "02-cmake#Step 7 \u2014 Commit the new structure": {
    "run": [
      "git add -A",
      "git commit -m \"Split into a library, an app and tests; add the parser\"",
    ],
    "wrong": [
      {
        "name": "forgot to commit",
        "fails": [
          1,
          2,
          3,
        ],
      },
    ],
  },
  "03-tests-and-branches#Step 1 \u2014 A branch, and two test-framework ideas": {
    "run": [
      "git switch -c feature/variables",
    ],
    "wrong": [
      {
        "name": "stayed on main",
        "typeFile": true,
        "fails": [
          0,
        ],
      },
    ],
  },
  "03-tests-and-branches#Step 2 \u2014 The specification, as fixtures and tables": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "03-tests-and-branches#Step 3 \u2014 Declare the interpreter": {
    "wrong": [
      {
        "name": "a plain std::map<std::string, double>",
        "files": {
          "include/interp/interpreter.h": "#pragma once\n\n#include \"interp/parser.h\"\n\n#include <functional>\n#include <map>\n#include <optional>\n#include <stdexcept>\n#include <string>\n#include <string_view>\n\nnamespace interp {\n\n// Thrown when a line parses but can't be evaluated.\nclass EvalError : public std::runtime_error {\npublic:\n    using std::runtime_error::runtime_error;\n};\n\n// Runs lines of the calculator language, remembering variables\n// from one line to the next.\nclass Interpreter {\npublic:\n    // Runs one line and returns its value. Throws SyntaxError or\n    // EvalError, and then nothing has changed.\n    double execute(std::string_view line);\n\n    // The variable's value, or nothing if it was never assigned.\n    std::optional<double> variable(std::string_view name) const;\n\nprivate:\n    double evaluate(const Expr& expr);\n\n    // std::less<> lets find() take a std::string_view.\n    std::map<std::string, double> variables_;\n};\n\n} // namespace interp\n",
        },
        "fails": [
          2,
        ],
      },
    ],
  },
  "03-tests-and-branches#Step 4 \u2014 Evaluate the tree": {
    "wrong": [
      {
        "name": "did not write it",
        "fails": [
          0,
          1,
        ],
      },
    ],
  },
  "03-tests-and-branches#Step 5 \u2014 Build it, test it, commit it on the branch": {
    "run": [
      "git add -A",
      "git commit -m \"Add an interpreter with variables\"",
    ],
    "wrong": [
      {
        "name": "assigns before checking for division by zero",
        "typeFile": true,
        "files": {
          "src/interpreter.cpp": "#include \"interp/interpreter.h\"\n\nnamespace interp {\n\ndouble Interpreter::execute(std::string_view line)\n{\n    const std::unique_ptr<Expr> tree = parse(line);\n    return evaluate(*tree);\n}\n\nstd::optional<double> Interpreter::variable(std::string_view name) const\n{\n    const auto found = variables_.find(name);\n    if (found == variables_.end())\n        return std::nullopt;\n    return found->second;\n}\n\ndouble Interpreter::evaluate(const Expr& expr)\n{\n    switch (expr.kind) {\n    case Expr::Kind::number: return expr.value;\n    case Expr::Kind::variable: {\n        const std::optional<double> value = variable(expr.name);\n        if (!value)\n            throw EvalError(\"unknown variable '\" + expr.name + \"'\");\n        return *value;\n    }\n    case Expr::Kind::negate: return -evaluate(*expr.left);\n    case Expr::Kind::binary: {\n        const double left = evaluate(*expr.left);\n        const double right = evaluate(*expr.right);\n        switch (expr.op) {\n        case '+': return left + right;\n        case '-': return left - right;\n        case '*': return left * right;\n        case '/':\n            if (right == 0)\n                throw EvalError(\"division by zero\");\n            return left / right;\n        }\n        throw EvalError(std::string(\"unknown operator '\") + expr.op + \"'\");\n    }\n    case Expr::Kind::assign: {\n        variables_[expr.name] = 0;\n        variables_[expr.name] = evaluate(*expr.left);\n        return variables_[expr.name];\n    }\n    }\n    throw EvalError(\"unknown expression\");\n}\n\n} // namespace interp\n",
        },
        "run": [
          configure("."),
        ],
        "fails": [
          2,
        ],
      },
      {
        "name": "did not commit",
        "typeFile": true,
        "run": [
          configure("."),
        ],
        "fails": [
          3,
        ],
      },
    ],
  },
  "03-tests-and-branches#Step 6 \u2014 The reviewer's tests": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "03-tests-and-branches#Step 7 \u2014 Fix the parser": {
    "run": [
      "git add -A",
      "git commit -m \"Fix: operators of equal rank associate left\"",
    ],
    "wrong": [
      {
        "name": "fixed only expression()",
        "files": {
          "src/parser.cpp": "#include \"interp/parser.h\"\n#include \"interp/tokenizer.h\"\n#include <sstream>\n#include <utility>\n#include <vector>\n\nnamespace interp {\nnamespace {\n\ntypedef std::unique_ptr<Expr> ExprPtr;\n\nExprPtr make_number(double value) {\n  auto e = std::make_unique<Expr>();\n  e->kind = Expr::Kind::number; e->value = value;\n  return e;\n}\n\nExprPtr make_variable(std::string name) {\n  auto e = std::make_unique<Expr>();\n  e->kind = Expr::Kind::variable; e->name = std::move(name);\n  return e;\n}\n\nExprPtr make_negate(ExprPtr operand) {\n  auto e = std::make_unique<Expr>();\n  e->kind = Expr::Kind::negate; e->left = std::move(operand);\n  return e;\n}\n\nExprPtr make_binary(char op, ExprPtr left, ExprPtr right) {\n  auto e = std::make_unique<Expr>();\n  e->kind = Expr::Kind::binary; e->op = op;\n  e->left = std::move(left); e->right = std::move(right);\n  return e;\n}\n\nExprPtr make_assign(std::string name, ExprPtr value) {\n  auto e = std::make_unique<Expr>();\n  e->kind = Expr::Kind::assign; e->name = std::move(name);\n  e->left = std::move(value);\n  return e;\n}\n\n// A recursive-descent parser: one function per grammar rule.\n//\n//   statement  = name \"=\" statement | expression\n//   expression = term { (\"+\" | \"-\") term }\n//   term       = factor { (\"*\" | \"/\") factor }\n//   factor     = \"-\" factor | primary\n//   primary    = number | name | \"(\" expression \")\"\nclass Parser\n{\n  public:\n  explicit Parser(std::vector<Token> tokens) : tokens_(tokens) {}\n\n  ExprPtr parse_line() {\n    ExprPtr result = statement();\n    if (peek().kind != TokenKind::end) throw SyntaxError(\"unexpected '\" + peek().text + \"'\");\n    return result;\n  }\n\n  private:\n  Token const &peek() const { return tokens_[pos_]; }\n  Token const &advance() { return tokens_[pos_++]; }\n\n  bool accept(TokenKind kind) {\n    if (peek().kind != kind) return false;\n    ++pos_;\n    return true;\n  }\n\n  ExprPtr statement() {\n    // The end token is always there, so pos_ + 1 is in range.\n    if (peek().kind == TokenKind::identifier && tokens_[pos_ + 1].kind == TokenKind::equals) {\n      std::string name = advance().text;\n      advance();  // the \"=\"\n      return make_assign(std::move(name), statement());\n    }\n    return expression();\n  }\n\n  ExprPtr expression() {\n    ExprPtr left = term();\n    while (peek().kind == TokenKind::plus || peek().kind == TokenKind::minus) {\n      char op = advance().text[0];\n      left = make_binary(op, std::move(left), term());\n    }\n    return left;\n  }\n\n  ExprPtr term() {\n    ExprPtr left = factor();\n    if (peek().kind == TokenKind::star || peek().kind == TokenKind::slash) {\n      char op = advance().text[0];\n      return make_binary(op, std::move(left), term());\n    }\n    return left;\n  }\n\n  ExprPtr factor() {\n    if (accept(TokenKind::minus)) return make_negate(factor());\n    return primary();\n  }\n\n  ExprPtr primary() {\n    Token const &token = peek();\n    if (accept(TokenKind::number)) return make_number(token.value);\n    if (accept(TokenKind::identifier)) return make_variable(token.text);\n    if (accept(TokenKind::left_paren)) {\n      ExprPtr inside = expression();\n      if (!accept(TokenKind::right_paren)) throw SyntaxError(\"expected ')'\");\n      return inside;\n    }\n    if (token.kind == TokenKind::end) throw SyntaxError(\"unexpected end of line\");\n    throw SyntaxError(\"unexpected '\" + token.text + \"'\");\n  }\n\n  std::vector<Token> tokens_;\n  std::size_t pos_ = 0;\n};\n\n}  // namespace\n\nstd::unique_ptr<Expr> parse(std::string_view line) {\n  Parser parser(tokenize(line));\n  return parser.parse_line();\n}\n\nstd::string to_string(const Expr &expr) {\n  std::ostringstream out;\n  switch (expr.kind) {\n    case Expr::Kind::number: out << expr.value; break;\n    case Expr::Kind::variable: out << expr.name; break;\n    case Expr::Kind::negate: out << \"(-\" << to_string(*expr.left) << ')'; break;\n    case Expr::Kind::binary: out << '(' << to_string(*expr.left) << ' ' << expr.op << ' ' << to_string(*expr.right) << ')'; break;\n    case Expr::Kind::assign: out << '(' << expr.name << \" = \" << to_string(*expr.left) << ')'; break;\n  }\n  return out.str();\n}\n\n}  // namespace interp\n",
        },
        "run": [
          configure("."),
        ],
        "fails": [
          1,
        ],
      },
    ],
  },
  "03-tests-and-branches#Step 8 \u2014 calc computes": {
    "run": [
      "git add -A",
      "git commit -m \"calc evaluates lines and keeps variables\"",
    ],
    "wrong": [
      {
        "name": "prints = before evaluating",
        "files": {
          "app/main.cpp": "// calc: a calculator with variables.\n//\n//   calc \"x = 6\" \"x * 7\"   runs each argument as a line\n//   calc                   reads lines until the input ends\n#include \"interp/interpreter.h\"\n#include \"interp/tokenizer.h\"\n\n#include <iostream>\n#include <string>\n\nnamespace {\n\n// Runs one line, printing \"= value\" or \"error: why\". Returns\n// whether it worked.\nbool run_line(interp::Interpreter& interpreter, const std::string& line)\n{\n    try {\n        std::cout << \"= \" << interpreter.execute(line) << '\\n';\n        return true;\n    } catch (const interp::SyntaxError& e) {\n        std::cout << \"error: \" << e.what() << '\\n';\n    } catch (const interp::EvalError& e) {\n        std::cout << \"error: \" << e.what() << '\\n';\n    }\n    return false;\n}\n\nbool is_blank(const std::string& line)\n{\n    return line.find_first_not_of(\" \\t\\r\") == std::string::npos;\n}\n\n} // namespace\n\nint main(int argc, char* argv[])\n{\n    interp::Interpreter interpreter;\n    bool all_worked = true;\n    if (argc > 1) {\n        for (int i = 1; i < argc; ++i)\n            all_worked = run_line(interpreter, argv[i]) && all_worked;\n    } else {\n        std::string line;\n        while (std::getline(std::cin, line)) {\n            if (!is_blank(line))\n                all_worked = run_line(interpreter, line) && all_worked;\n        }\n    }\n    return all_worked ? 0 : 1;\n}\n",
        },
        "run": [
          configure("."),
        ],
        "fails": [
          2,
        ],
      },
    ],
  },
  "03-tests-and-branches#Step 9 \u2014 Merge into main": {
    "run": [
      "git switch main",
      "git merge --no-ff feature/variables -m \"Merge feature/variables\"",
      "git branch -d feature/variables",
    ],
    "wrong": [
      {
        "name": "switched to main but did not merge",
        "run": [
          "git switch main",
        ],
        "fails": [
          1,
          2,
          3,
        ],
      },
      {
        "name": "fast-forwarded, kept the branch",
        "run": [
          "git switch main",
          "git merge feature/variables",
        ],
        "fails": [
          2,
          3,
        ],
      },
    ],
  },
  "04-style-and-analysis#Step 1 \u2014 A style file": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          1,
          2,
        ],
      },
    ],
  },
  "04-style-and-analysis#Step 2 \u2014 format and check-format targets": {
    "run": [
      "cmake --build build",
      "cmake --build build --target format",
    ],
    "wrong": [
      {
        "name": "added the targets but never ran format",
        "typeFile": true,
        "run": [
          configure("."),
        ],
        "fails": [
          2,
        ],
      },
    ],
  },
  "04-style-and-analysis#Step 3 \u2014 Commit the formatting on its own": {
    "run": [
      "git add -A",
      "git commit -m \"Format every file with clang-format\"",
    ],
    "wrong": [
      {
        "name": "did not commit",
        "fails": [
          0,
          1,
          2,
        ],
      },
    ],
  },
  "04-style-and-analysis#Step 4 \u2014 clang-tidy finds problems": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          2,
          3,
        ],
      },
    ],
  },
  "04-style-and-analysis#Step 5 \u2014 Fix the findings": {
    "run": [
      "git add -A",
      "git commit -m \"Fix clang-tidy findings: move the tokens, use using\"",
    ],
    "wrong": [
      {
        "name": "fixed the typedef but still copies the tokens",
        "files": {
          "src/parser.cpp": "#include \"interp/parser.h\"\n\n#include \"interp/tokenizer.h\"\n\n#include <sstream>\n#include <utility>\n#include <vector>\n\nnamespace interp {\n\nnamespace {\n\nusing ExprPtr = std::unique_ptr<Expr>;\n\nExprPtr make_number(double value)\n{\n    auto e = std::make_unique<Expr>();\n    e->kind = Expr::Kind::number;\n    e->value = value;\n    return e;\n}\n\nExprPtr make_variable(std::string name)\n{\n    auto e = std::make_unique<Expr>();\n    e->kind = Expr::Kind::variable;\n    e->name = std::move(name);\n    return e;\n}\n\nExprPtr make_negate(ExprPtr operand)\n{\n    auto e = std::make_unique<Expr>();\n    e->kind = Expr::Kind::negate;\n    e->left = std::move(operand);\n    return e;\n}\n\nExprPtr make_binary(char op, ExprPtr left, ExprPtr right)\n{\n    auto e = std::make_unique<Expr>();\n    e->kind = Expr::Kind::binary;\n    e->op = op;\n    e->left = std::move(left);\n    e->right = std::move(right);\n    return e;\n}\n\nExprPtr make_assign(std::string name, ExprPtr value)\n{\n    auto e = std::make_unique<Expr>();\n    e->kind = Expr::Kind::assign;\n    e->name = std::move(name);\n    e->left = std::move(value);\n    return e;\n}\n\n// A recursive-descent parser: one function per grammar rule.\n//\n//   statement  = name \"=\" statement | expression\n//   expression = term { (\"+\" | \"-\") term }\n//   term       = factor { (\"*\" | \"/\") factor }\n//   factor     = \"-\" factor | primary\n//   primary    = number | name | \"(\" expression \")\"\nclass Parser {\npublic:\n    explicit Parser(std::vector<Token> tokens) : tokens_(tokens) {}\n\n    ExprPtr parse_line()\n    {\n        ExprPtr result = statement();\n        if (peek().kind != TokenKind::end)\n            throw SyntaxError(\"unexpected '\" + peek().text + \"'\");\n        return result;\n    }\n\nprivate:\n    const Token& peek() const { return tokens_[pos_]; }\n    const Token& advance() { return tokens_[pos_++]; }\n\n    bool accept(TokenKind kind)\n    {\n        if (peek().kind != kind)\n            return false;\n        ++pos_;\n        return true;\n    }\n\n    ExprPtr statement()\n    {\n        // The end token is always there, so pos_ + 1 is in range.\n        if (peek().kind == TokenKind::identifier &&\n            tokens_[pos_ + 1].kind == TokenKind::equals) {\n            std::string name = advance().text;\n            advance(); // the \"=\"\n            return make_assign(std::move(name), statement());\n        }\n        return expression();\n    }\n\n    ExprPtr expression()\n    {\n        ExprPtr left = term();\n        while (peek().kind == TokenKind::plus ||\n               peek().kind == TokenKind::minus) {\n            const char op = advance().text[0];\n            left = make_binary(op, std::move(left), term());\n        }\n        return left;\n    }\n\n    ExprPtr term()\n    {\n        ExprPtr left = factor();\n        while (peek().kind == TokenKind::star ||\n               peek().kind == TokenKind::slash) {\n            const char op = advance().text[0];\n            left = make_binary(op, std::move(left), factor());\n        }\n        return left;\n    }\n\n    ExprPtr factor()\n    {\n        if (accept(TokenKind::minus))\n            return make_negate(factor());\n        return primary();\n    }\n\n    ExprPtr primary()\n    {\n        const Token& token = peek();\n        if (accept(TokenKind::number))\n            return make_number(token.value);\n        if (accept(TokenKind::identifier))\n            return make_variable(token.text);\n        if (accept(TokenKind::left_paren)) {\n            ExprPtr inside = expression();\n            if (!accept(TokenKind::right_paren))\n                throw SyntaxError(\"expected ')'\");\n            return inside;\n        }\n        if (token.kind == TokenKind::end)\n            throw SyntaxError(\"unexpected end of line\");\n        throw SyntaxError(\"unexpected '\" + token.text + \"'\");\n    }\n\n    std::vector<Token> tokens_;\n    std::size_t pos_ = 0;\n};\n\n} // namespace\n\nstd::unique_ptr<Expr> parse(std::string_view line)\n{\n    Parser parser(tokenize(line));\n    return parser.parse_line();\n}\n\nstd::string to_string(const Expr& expr)\n{\n    std::ostringstream out;\n    switch (expr.kind) {\n    case Expr::Kind::number: out << expr.value; break;\n    case Expr::Kind::variable: out << expr.name; break;\n    case Expr::Kind::negate: out << \"(-\" << to_string(*expr.left) << ')'; break;\n    case Expr::Kind::binary:\n        out << '(' << to_string(*expr.left) << ' ' << expr.op << ' '\n            << to_string(*expr.right) << ')';\n        break;\n    case Expr::Kind::assign:\n        out << '(' << expr.name << \" = \" << to_string(*expr.left) << ')';\n        break;\n    }\n    return out.str();\n}\n\n} // namespace interp\n",
        },
        "run": [
          configure("."),
        ],
        "fails": [
          0,
          4,
        ],
      },
    ],
  },
  "05-sanitizers#Step 1 \u2014 A SANITIZE option": {
    "wrong": [
      {
        "name": "forgot the link options",
        "files": {
          "CMakeLists.txt": "cmake_minimum_required(VERSION 3.20)\nproject(interp LANGUAGES CXX)\n\nset(CMAKE_CXX_STANDARD 20)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\n# Write build/compile_commands.json, for clang-tidy and editors.\nset(CMAKE_EXPORT_COMPILE_COMMANDS ON)\n\n# Settings every target in this project uses. An INTERFACE library\n# has no code: linking to it just passes its settings on.\nadd_library(interp_options INTERFACE)\nif(MSVC)\n    target_compile_options(interp_options INTERFACE /W4)\nelse()\n    target_compile_options(interp_options INTERFACE -Wall -Wextra -Wpedantic)\nendif()\n\noption(SANITIZE \"Build with ASan and UBSan\" OFF)\nif(SANITIZE)\n    target_compile_options(interp_options INTERFACE\n        -fsanitize=address,undefined -fno-omit-frame-pointer -g)\nendif()\n\n# The interpreter: a library, shared by the app and the tests.\nadd_library(interp_core\n    src/tokenizer.cpp\n    src/parser.cpp\n    src/interpreter.cpp)\ntarget_include_directories(interp_core PUBLIC include)\ntarget_link_libraries(interp_core PRIVATE interp_options)\n\n# The program people run.\nadd_executable(calc app/main.cpp)\ntarget_link_libraries(calc PRIVATE interp_core interp_options)\n\n# The tests: ctest runs every add_test.\nenable_testing()\nfile(GLOB TEST_SOURCES CONFIGURE_DEPENDS tests/*_test.cpp)\nadd_executable(interp_tests testing/test_main.cpp ${TEST_SOURCES})\ntarget_include_directories(interp_tests PRIVATE testing)\ntarget_link_libraries(interp_tests PRIVATE interp_core interp_options)\nadd_test(NAME unit_tests COMMAND interp_tests)\n\n# calc itself: a line that works exits with 0; one that doesn't\n# must fail (WILL_FAIL turns \"exited with 1\" into a pass).\nadd_test(NAME calc_accepts_a_line COMMAND calc \"1 + 2 * 3\")\nadd_test(NAME calc_rejects_bad_syntax COMMAND calc \"1 +\")\nset_tests_properties(calc_rejects_bad_syntax PROPERTIES WILL_FAIL TRUE)\n\n# Formatting: \"format\" rewrites the files, \"check-format\" only checks.\nfind_program(CLANG_FORMAT clang-format)\nif(CLANG_FORMAT)\n    file(GLOB_RECURSE FORMAT_SOURCES CONFIGURE_DEPENDS\n        include/*.h src/*.cpp app/*.cpp tests/*.cpp)\n    add_custom_target(format\n        COMMAND ${CLANG_FORMAT} -i ${FORMAT_SOURCES}\n        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})\n    add_custom_target(check-format\n        COMMAND ${CLANG_FORMAT} --dry-run --Werror ${FORMAT_SOURCES}\n        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})\nendif()",
        },
        "fails": [
          2,
        ],
      },
    ],
  },
  "05-sanitizers#Step 2 \u2014 A feature request: case-insensitive names": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "05-sanitizers#Step 3 \u2014 The colleague's change": {
    "wrong": [
      {
        "name": "did not create it",
        "fails": [
          0,
        ],
      },
    ],
  },
  "05-sanitizers#Step 5 \u2014 Fix it, and make the test run say so": {
    "run": [
      "git add -A",
      "git commit -m \"Case-insensitive names, without a dangling string_view\"",
    ],
    "wrong": [
      {
        "name": "kept the colleague's version",
        "run": [
          configure("."),
          "git add -A",
          "git commit -m \"Case-insensitive names\"",
        ],
        "fails": [
          0,
          3,
          5,
        ],
      },
    ],
  },
  "06-ci#Step 1 \u2014 A workflow: build and test on three systems": {
    "wrong": [
      {
        "name": "forgot the configuration for Windows",
        "files": {
          ".github/workflows/ci.yml": "# Continuous integration: GitHub runs this on every push and pull\n# request, and marks the commit with a green tick or a red cross.\nname: CI\n\non:\n  push:\n    branches: [main]\n  pull_request:\n\njobs:\n  build-and-test:\n    strategy:\n      fail-fast: false\n      matrix:\n        os: [ubuntu-latest, windows-latest, macos-latest]\n    runs-on: ${{ matrix.os }}\n    steps:\n      - uses: actions/checkout@v4\n      - name: Configure\n        run: cmake -S . -B build -DCMAKE_BUILD_TYPE=Release\n      - name: Build\n        run: cmake --build build\n      - name: Test\n        run: ctest --test-dir build --output-on-failure\n",
        },
        "fails": [
          4,
          5,
        ],
      },
      {
        "name": "only Ubuntu",
        "files": {
          ".github/workflows/ci.yml": "# Continuous integration: GitHub runs this on every push and pull\n# request, and marks the commit with a green tick or a red cross.\nname: CI\n\non:\n  push:\n    branches: [main]\n  pull_request:\n\njobs:\n  build-and-test:\n    strategy:\n      fail-fast: false\n      matrix:\n        os: [ubuntu-latest]\n    runs-on: ${{ matrix.os }}\n    steps:\n      - uses: actions/checkout@v4\n      - name: Configure\n        run: cmake -S . -B build -DCMAKE_BUILD_TYPE=Release\n      - name: Build\n        run: cmake --build build --config Release\n      - name: Test\n        run: ctest --test-dir build --build-config Release --output-on-failure\n",
        },
        "fails": [
          1,
        ],
      },
    ],
  },
  "06-ci#Step 2 \u2014 Sanitizers and style in CI": {
    "wrong": [
      {
        "name": "kept one job",
        "fails": [
          0,
          1,
          2,
          3,
        ],
      },
    ],
  },
  "06-ci#Step 3 \u2014 A README, and a commit": {
    "run": [
      "git add -A",
      "git commit -m \"Add CI on three systems, and a README\"",
    ],
    "wrong": [
      {
        "name": "committed the README but not the workflow",
        "typeFile": true,
        "run": [
          "git add README.md",
          "git commit -m \"Add a README\"",
        ],
        "fails": [
          1,
          3,
        ],
      },
    ],
  },
  "07-release#Step 1 \u2014 A version, in one place": {
    "wrong": [
      {
        "name": "used ${PROJECT_VERSION}",
        "files": {
          "cmake/version.h.in": "// Generated by CMake from cmake/version.h.in: edit that file, not this.\n#pragma once\n\nnamespace interp {\n\ninline constexpr const char* version = \"PROJECT_VERSION\";\n\n} // namespace interp\n",
        },
        "fails": [
          0,
        ],
      },
    ],
  },
  "07-release#Step 2 \u2014 Generate the header": {
    "wrong": [
      {
        "name": "no VERSION in project()",
        "files": {
          "CMakeLists.txt": "cmake_minimum_required(VERSION 3.20)\nproject(interp LANGUAGES CXX)\n\nset(CMAKE_CXX_STANDARD 20)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\n# Write build/compile_commands.json, for clang-tidy and editors.\nset(CMAKE_EXPORT_COMPILE_COMMANDS ON)\n\n# Settings every target in this project uses. An INTERFACE library\n# has no code: linking to it just passes its settings on.\nadd_library(interp_options INTERFACE)\nif(MSVC)\n    target_compile_options(interp_options INTERFACE /W4)\nelse()\n    target_compile_options(interp_options INTERFACE -Wall -Wextra -Wpedantic)\nendif()\n\noption(SANITIZE \"Build with ASan and UBSan\" OFF)\nif(SANITIZE)\n    target_compile_options(interp_options INTERFACE\n        -fsanitize=address,undefined -fno-omit-frame-pointer -g)\n    target_link_options(interp_options INTERFACE\n        -fsanitize=address,undefined)\nendif()\n\n# version.h, generated from the project's VERSION.\nconfigure_file(cmake/version.h.in generated/interp/version.h)\n\n# The interpreter: a library, shared by the app and the tests.\nadd_library(interp_core\n    src/tokenizer.cpp\n    src/parser.cpp\n    src/interpreter.cpp)\ntarget_include_directories(interp_core PUBLIC\n    include\n    ${CMAKE_CURRENT_BINARY_DIR}/generated)\ntarget_link_libraries(interp_core PRIVATE interp_options)\n\n# The program people run.\nadd_executable(calc app/main.cpp)\ntarget_link_libraries(calc PRIVATE interp_core interp_options)\n\n# The tests: ctest runs every add_test.\nenable_testing()\nfile(GLOB TEST_SOURCES CONFIGURE_DEPENDS tests/*_test.cpp)\nadd_executable(interp_tests testing/test_main.cpp ${TEST_SOURCES})\ntarget_include_directories(interp_tests PRIVATE testing)\ntarget_link_libraries(interp_tests PRIVATE interp_core interp_options)\nadd_test(NAME unit_tests COMMAND interp_tests)\n\n# calc itself: a line that works exits with 0; one that doesn't\n# must fail (WILL_FAIL turns \"exited with 1\" into a pass).\nadd_test(NAME calc_accepts_a_line COMMAND calc \"1 + 2 * 3\")\nadd_test(NAME calc_rejects_bad_syntax COMMAND calc \"1 +\")\nset_tests_properties(calc_rejects_bad_syntax PROPERTIES WILL_FAIL TRUE)\nadd_test(NAME calc_version COMMAND calc --version)\nset_tests_properties(calc_version PROPERTIES\n    PASS_REGULAR_EXPRESSION \"calc ${PROJECT_VERSION}\")\n\n# Formatting: \"format\" rewrites the files, \"check-format\" only checks.\nfind_program(CLANG_FORMAT clang-format)\nif(CLANG_FORMAT)\n    file(GLOB_RECURSE FORMAT_SOURCES CONFIGURE_DEPENDS\n        include/*.h src/*.cpp app/*.cpp tests/*.cpp)\n    add_custom_target(format\n        COMMAND ${CLANG_FORMAT} -i ${FORMAT_SOURCES}\n        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})\n    add_custom_target(check-format\n        COMMAND ${CLANG_FORMAT} --dry-run --Werror ${FORMAT_SOURCES}\n        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})\nendif()",
        },
        "run": [
          configure("."),
        ],
        "fails": [
          0,
          3,
        ],
      },
    ],
  },
  "07-release#Step 3 \u2014 calc --version": {
    "wrong": [
      {
        "name": "compared char* with ==",
        "files": {
          "app/main.cpp": "// calc: a calculator with variables.\n//\n//   calc \"x = 6\" \"x * 7\"   runs each argument as a line\n//   calc                   reads lines until the input ends\n//   calc --version         prints the version\n#include \"interp/interpreter.h\"\n#include \"interp/tokenizer.h\"\n#include \"interp/version.h\"\n\n#include <iostream>\n#include <string>\n#include <string_view>\n\nnamespace {\n\n// Runs one line, printing \"= value\" or \"error: why\". Returns\n// whether it worked.\nbool run_line(interp::Interpreter& interpreter, const std::string& line)\n{\n    try {\n        const double value = interpreter.execute(line);\n        std::cout << \"= \" << value << '\\n';\n        return true;\n    } catch (const interp::SyntaxError& e) {\n        std::cout << \"error: \" << e.what() << '\\n';\n    } catch (const interp::EvalError& e) {\n        std::cout << \"error: \" << e.what() << '\\n';\n    }\n    return false;\n}\n\nbool is_blank(const std::string& line)\n{\n    return line.find_first_not_of(\" \\t\\r\") == std::string::npos;\n}\n\n} // namespace\n\nint main(int argc, char* argv[])\n{\n    if (argc == 2 && argv[1] == std::string_view(\"--version\").data()) {\n        std::cout << \"calc \" << interp::version << '\\n';\n        return 0;\n    }\n\n    interp::Interpreter interpreter;\n    bool all_worked = true;\n    if (argc > 1) {\n        for (int i = 1; i < argc; ++i)\n            all_worked = run_line(interpreter, argv[i]) && all_worked;\n    } else {\n        std::string line;\n        while (std::getline(std::cin, line)) {\n            if (!is_blank(line))\n                all_worked = run_line(interpreter, line) && all_worked;\n        }\n    }\n    return all_worked ? 0 : 1;\n}\n",
        },
        "run": [
          configure("."),
        ],
        "fails": [
          1,
          2,
        ],
      },
    ],
  },
  "07-release#Step 4 \u2014 Install rules": {
    "run": [
      "cmake --install build --prefix build/stage",
    ],
    "wrong": [
      {
        "name": "installed into the wrong folder",
        "files": {
          "CMakeLists.txt": "cmake_minimum_required(VERSION 3.20)\nproject(interp VERSION 1.0.0 LANGUAGES CXX)\n\nset(CMAKE_CXX_STANDARD 20)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\n# Write build/compile_commands.json, for clang-tidy and editors.\nset(CMAKE_EXPORT_COMPILE_COMMANDS ON)\n\n# Settings every target in this project uses. An INTERFACE library\n# has no code: linking to it just passes its settings on.\nadd_library(interp_options INTERFACE)\nif(MSVC)\n    target_compile_options(interp_options INTERFACE /W4)\nelse()\n    target_compile_options(interp_options INTERFACE -Wall -Wextra -Wpedantic)\nendif()\n\noption(SANITIZE \"Build with ASan and UBSan\" OFF)\nif(SANITIZE)\n    target_compile_options(interp_options INTERFACE\n        -fsanitize=address,undefined -fno-omit-frame-pointer -g)\n    target_link_options(interp_options INTERFACE\n        -fsanitize=address,undefined)\nendif()\n\n# version.h, generated from the project's VERSION.\nconfigure_file(cmake/version.h.in generated/interp/version.h)\n\n# The interpreter: a library, shared by the app and the tests.\nadd_library(interp_core\n    src/tokenizer.cpp\n    src/parser.cpp\n    src/interpreter.cpp)\ntarget_include_directories(interp_core PUBLIC\n    include\n    ${CMAKE_CURRENT_BINARY_DIR}/generated)\ntarget_link_libraries(interp_core PRIVATE interp_options)\n\n# The program people run.\nadd_executable(calc app/main.cpp)\ntarget_link_libraries(calc PRIVATE interp_core interp_options)\n\n# The tests: ctest runs every add_test.\nenable_testing()\nfile(GLOB TEST_SOURCES CONFIGURE_DEPENDS tests/*_test.cpp)\nadd_executable(interp_tests testing/test_main.cpp ${TEST_SOURCES})\ntarget_include_directories(interp_tests PRIVATE testing)\ntarget_link_libraries(interp_tests PRIVATE interp_core interp_options)\nadd_test(NAME unit_tests COMMAND interp_tests)\n\n# calc itself: a line that works exits with 0; one that doesn't\n# must fail (WILL_FAIL turns \"exited with 1\" into a pass).\nadd_test(NAME calc_accepts_a_line COMMAND calc \"1 + 2 * 3\")\nadd_test(NAME calc_rejects_bad_syntax COMMAND calc \"1 +\")\nset_tests_properties(calc_rejects_bad_syntax PROPERTIES WILL_FAIL TRUE)\nadd_test(NAME calc_version COMMAND calc --version)\nset_tests_properties(calc_version PROPERTIES\n    PASS_REGULAR_EXPRESSION \"calc ${PROJECT_VERSION}\")\n\n# Formatting: \"format\" rewrites the files, \"check-format\" only checks.\nfind_program(CLANG_FORMAT clang-format)\nif(CLANG_FORMAT)\n    file(GLOB_RECURSE FORMAT_SOURCES CONFIGURE_DEPENDS\n        include/*.h src/*.cpp app/*.cpp tests/*.cpp)\n    add_custom_target(format\n        COMMAND ${CLANG_FORMAT} -i ${FORMAT_SOURCES}\n        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})\n    add_custom_target(check-format\n        COMMAND ${CLANG_FORMAT} --dry-run --Werror ${FORMAT_SOURCES}\n        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})\nendif()\n\n# Installing: what goes where under the install prefix.\ninstall(TARGETS calc RUNTIME DESTINATION .)\ninstall(FILES README.md DESTINATION share/doc/interp)",
        },
        "run": [
          configure("."),
          "cmake --build build",
        ],
        "fails": [
          0,
          3,
        ],
      },
    ],
  },
  "07-release#Step 5 \u2014 Packages with CPack": {
    "wrong": [
      {
        "name": "did not add CPack",
        "fails": [
          0,
          2,
        ],
      },
    ],
  },
  "07-release#Step 6 \u2014 Tag the release": {
    "run": [
      "git add -A",
      "git commit -m \"Release 1.0.0: --version, install rules, packages\"",
      "git tag -a v1.0.0 -m \"interp 1.0.0\"",
    ],
    "wrong": [
      {
        "name": "tagged before committing",
        "run": [
          "git tag -a v1.0.0 -m \"interp 1.0.0\"",
        ],
        "fails": [
          0,
          2,
        ],
      },
      {
        "name": "tag without the v",
        "run": [
          "git add -A",
          "git commit -m \"Release 1.0.0\"",
          "git tag -a 1.0.0 -m \"interp 1.0.0\"",
        ],
        "fails": [
          1,
        ],
      },
    ],
  },
  "07-release#Step 8 — Your change: a remainder operator": {
    "editFiles": {
      "tests/tokenizer_test.cpp": [
          [
            "CHECK_THROWS(interp::tokenize(\"x % 2\"), interp::SyntaxError);",
            "CHECK_THROWS(interp::tokenize(\"x @ 2\"), interp::SyntaxError);"
          ]
        ],
        "include/interp/tokenizer.h": [
        [
          "    slash,       // /\n",
          "    slash,       // /\n    percent,     // %\n"
        ]
      ],
      "src/tokenizer.cpp": [
        [
          "    case '/': return TokenKind::slash;\n",
          "    case '/': return TokenKind::slash;\n    case '%': return TokenKind::percent;\n"
        ]
      ],
      "src/parser.cpp": [
        [
          "//   term       = factor { (\"*\" | \"/\") factor }",
          "//   term       = factor { (\"*\" | \"/\" | \"%\") factor }"
        ],
        [
          "               peek().kind == TokenKind::slash) {",
          "               peek().kind == TokenKind::slash ||\n               peek().kind == TokenKind::percent) {"
        ]
      ],
      "src/interpreter.cpp": [
        [
          "#include <cctype>\n",
          "#include <cctype>\n#include <cmath>\n"
        ],
        [
          "            return left / right;\n",
          "            return left / right;\n        case '%':\n            if (right == 0)\n                throw EvalError(\"division by zero\");\n            return std::fmod(left, right);\n"
        ]
      ]
    },
    "files": {
      "tests/remainder_test.cpp": "// My tests for the % operator, written before the operator.\n#include \"studio_extras.hpp\"\n#include \"studio_test.hpp\"\n\n#include \"interp/interpreter.h\"\n\nstruct Remainder {\n    interp::Interpreter calc;\n};\n\nTEST_F(Remainder, of_whole_numbers)\n{\n    CHECK_EQ(calc.execute(\"7 % 3\"), 1.0);\n}\n\nTEST_F(Remainder, keeps_the_fraction)\n{\n    CHECK_EQ(calc.execute(\"7.5 % 2\"), 1.5);\n}\n\nTEST_F(Remainder, has_the_rank_of_times)\n{\n    CHECK_EQ(calc.execute(\"1 + 7 % 3 * 2\"), 3.0);\n}\n\nTEST_F(Remainder, by_zero_is_an_error)\n{\n    CHECK_THROWS(calc.execute(\"5 % 0\"), interp::EvalError);\n}\n"
    },
    "run": [
      "git switch -c feature/remainder",
      "git add -A",
      "git commit -m \"Add the % operator, tests first\"",
      "git switch main",
      "git merge feature/remainder"
    ],
    "wrong": [
      {
        "name": "remainder of whole numbers only",
        "editFiles": {
          "tests/tokenizer_test.cpp": [
          [
            "CHECK_THROWS(interp::tokenize(\"x % 2\"), interp::SyntaxError);",
            "CHECK_THROWS(interp::tokenize(\"x @ 2\"), interp::SyntaxError);"
          ]
        ],
        "include/interp/tokenizer.h": [
            [
              "    slash,       // /\n",
              "    slash,       // /\n    percent,     // %\n"
            ]
          ],
          "src/tokenizer.cpp": [
            [
              "    case '/': return TokenKind::slash;\n",
              "    case '/': return TokenKind::slash;\n    case '%': return TokenKind::percent;\n"
            ]
          ],
          "src/parser.cpp": [
            [
              "//   term       = factor { (\"*\" | \"/\") factor }",
              "//   term       = factor { (\"*\" | \"/\" | \"%\") factor }"
            ],
            [
              "               peek().kind == TokenKind::slash) {",
              "               peek().kind == TokenKind::slash ||\n               peek().kind == TokenKind::percent) {"
            ]
          ],
          "src/interpreter.cpp": [
            [
              "            return left / right;\n",
              "            return left / right;\n        case '%':\n            if (right == 0)\n                throw EvalError(\"division by zero\");\n            return static_cast<double>(static_cast<long long>(left) % static_cast<long long>(right));\n"
            ]
          ]
        },
        "files": {
          "tests/remainder_test.cpp": "// My tests for the % operator, written before the operator.\n#include \"studio_extras.hpp\"\n#include \"studio_test.hpp\"\n\n#include \"interp/interpreter.h\"\n\nstruct Remainder {\n    interp::Interpreter calc;\n};\n\nTEST_F(Remainder, of_whole_numbers)\n{\n    CHECK_EQ(calc.execute(\"7 % 3\"), 1.0);\n}\n\nTEST_F(Remainder, keeps_the_fraction)\n{\n    CHECK_EQ(calc.execute(\"7.5 % 2\"), 1.5);\n}\n\nTEST_F(Remainder, has_the_rank_of_times)\n{\n    CHECK_EQ(calc.execute(\"1 + 7 % 3 * 2\"), 3.0);\n}\n\nTEST_F(Remainder, by_zero_is_an_error)\n{\n    CHECK_THROWS(calc.execute(\"5 % 0\"), interp::EvalError);\n}\n"
        },
        "fails": [
          5
        ]
      },
      {
        "name": "% with the rank of +",
        "editFiles": {
          "tests/tokenizer_test.cpp": [
          [
            "CHECK_THROWS(interp::tokenize(\"x % 2\"), interp::SyntaxError);",
            "CHECK_THROWS(interp::tokenize(\"x @ 2\"), interp::SyntaxError);"
          ]
        ],
        "include/interp/tokenizer.h": [
            [
              "    slash,       // /\n",
              "    slash,       // /\n    percent,     // %\n"
            ]
          ],
          "src/tokenizer.cpp": [
            [
              "    case '/': return TokenKind::slash;\n",
              "    case '/': return TokenKind::slash;\n    case '%': return TokenKind::percent;\n"
            ]
          ],
          "src/parser.cpp": [
            [
              "               peek().kind == TokenKind::minus) {",
              "               peek().kind == TokenKind::minus ||\n               peek().kind == TokenKind::percent) {"
            ]
          ],
          "src/interpreter.cpp": [
            [
              "#include <cctype>\n",
              "#include <cctype>\n#include <cmath>\n"
            ],
            [
              "            return left / right;\n",
              "            return left / right;\n        case '%':\n            if (right == 0)\n                throw EvalError(\"division by zero\");\n            return std::fmod(left, right);\n"
            ]
          ]
        },
        "files": {
          "tests/remainder_test.cpp": "// My tests for the % operator, written before the operator.\n#include \"studio_extras.hpp\"\n#include \"studio_test.hpp\"\n\n#include \"interp/interpreter.h\"\n\nstruct Remainder {\n    interp::Interpreter calc;\n};\n\nTEST_F(Remainder, of_whole_numbers)\n{\n    CHECK_EQ(calc.execute(\"7 % 3\"), 1.0);\n}\n\nTEST_F(Remainder, keeps_the_fraction)\n{\n    CHECK_EQ(calc.execute(\"7.5 % 2\"), 1.5);\n}\n\nTEST_F(Remainder, has_the_rank_of_times)\n{\n    CHECK_EQ(calc.execute(\"1 + 7 % 3 * 2\"), 3.0);\n}\n\nTEST_F(Remainder, by_zero_is_an_error)\n{\n    CHECK_THROWS(calc.execute(\"5 % 0\"), interp::EvalError);\n}\n"
        },
        "fails": [
          5
        ]
      }
    ]
  },
  "07-release#Step 9 — Release 1.1.0": {
    "editFiles": {
      "CMakeLists.txt": [
        [
          "project(interp VERSION 1.0.0 LANGUAGES CXX)",
          "project(interp VERSION 1.1.0 LANGUAGES CXX)"
        ]
      ]
    },
    "files": {
      "CHANGELOG.md": "# Changelog\n\n## 1.1.0\n\n### Added\n\n- `%` gives the remainder of a division: `7 % 3` is 1, and `7.5 % 2` is 1.5.\n\n## 1.0.0\n\nThe first release: arithmetic, variables, `calc --version`, and packages.\n"
    },
    "run": [
      "git add -A",
      "git commit -m \"Release 1.1.0: the % operator\"",
      "git tag -a v1.1.0 -m \"interp 1.1.0\""
    ],
    "wrong": [
      {
        "name": "called it a patch release",
        "editFiles": {
          "CMakeLists.txt": [
            [
              "project(interp VERSION 1.0.0 LANGUAGES CXX)",
              "project(interp VERSION 1.0.1 LANGUAGES CXX)"
            ]
          ]
        },
        "files": {
          "CHANGELOG.md": "# Changelog\n\n## 1.1.0\n\n### Added\n\n- `%` gives the remainder of a division: `7 % 3` is 1, and `7.5 % 2` is 1.5.\n\n## 1.0.0\n\nThe first release: arithmetic, variables, `calc --version`, and packages.\n"
        },
        "fails": [
          0,
          4
        ]
      }
    ]
  },
};
