#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
int pairPoints(int first, int second);
int main() {
    expect(pairPoints(3, 3) == 6, 1); // matching pair
    expect(pairPoints(2, 5) == 0, 2); // unequal pair
    expect(pairPoints(6, 6) == 12, 3); // double six
    expect(pairPoints(1, 1) == 2, 4); // double one
    expect(pairPoints(5, 2) == 0, 5); // argument order
    std::cout << "PASS: pair_points\n";
}
