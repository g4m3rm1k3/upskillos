#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
int countFace(const int* first, const int* last, int wanted);
int main() {
    const int dice[] = {6, 2, 6, 6, 1};
    expect(countFace(dice, dice + 5, 6) == 3, 1); // whole hand
    expect(countFace(dice + 1, dice + 4, 6) == 2, 2); // middle subrange
    expect(countFace(dice, dice, 6) == 0, 3); // empty range
    expect(countFace(dice, dice + 5, 4) == 0, 4); // missing face
    expect(countFace(dice, dice + 1, 6) == 1, 5); // one element
    std::cout << "PASS: count_range\n";
}
