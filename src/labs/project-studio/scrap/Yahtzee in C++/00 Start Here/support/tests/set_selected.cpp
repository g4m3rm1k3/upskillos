#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
bool setSelected(int* selected, int value);
int main() {
    int a = 2, b = 5;
    expect(setSelected(&a, 6), 1); // valid selection accepted
    expect(a == 6 && b == 5, 2); // only selected die changes
    expect(!setSelected(nullptr, 3), 3); // absent selection rejected
    expect(!setSelected(&a, 0) && a == 6, 4); // below range does not mutate
    expect(!setSelected(&a, 7) && a == 6, 5); // above range does not mutate
    expect(setSelected(&b, 1) && b == 1, 6); // lower valid boundary
    std::cout << "PASS: set_selected\n";
}
