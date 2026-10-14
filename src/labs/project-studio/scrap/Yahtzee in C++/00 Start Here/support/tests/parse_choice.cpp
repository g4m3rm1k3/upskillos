#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
#include <string>
bool parseChoice(const std::string& line, int low, int high, int& value);
int main() {
    int value = 9;
    expect(!parseChoice("1abc", 0, 1, value) && value == 9, 1); // reject trailing text atomically
    expect(!parseChoice("", 0, 1, value) && value == 9, 2); // reject blank
    expect(!parseChoice("2", 0, 1, value), 3); // reject above range
    expect(!parseChoice("-1", 0, 1, value), 4); // reject below range
    expect(parseChoice(" 1 ", 0, 1, value) && value == 1, 5); // whitespace accepted
    expect(parseChoice("0", 0, 1, value) && value == 0, 6); // zero is valid
    expect(parseChoice("6", 2, 6, value) && value == 6, 7); // bounds are parameters
    std::cout << "PASS: parse_choice\n";
}
