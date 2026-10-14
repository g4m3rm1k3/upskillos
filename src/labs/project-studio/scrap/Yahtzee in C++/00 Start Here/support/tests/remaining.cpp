#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
int remaining(int score, int target);
int main() {
    expect(remaining(8, 12) == 4, 1); // below target
    expect(remaining(12, 12) == 0, 2); // exact target
    expect(remaining(15, 12) == -3, 3); // over target
    expect(remaining(2, 9) == 7, 4); // target is an input
    std::cout << "PASS: remaining\n";
}
