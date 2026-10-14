#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
void swapFaces(int& a, int& b);
int main() {
    int a = 2, b = 6;
    swapFaces(a, b);
    expect(a == 6 && b == 2, 1); // exchange both values
    swapFaces(a, a);
    expect(a == 6, 2); // same object twice
    int c = 4, d = 1;
    swapFaces(c, d);
    expect(c == 1 && d == 4, 3); // different inputs
    std::cout << "PASS: swap_faces\n";
}
