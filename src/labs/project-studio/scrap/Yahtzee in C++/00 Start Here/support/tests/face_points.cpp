#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
int facePoints(int face, int wanted);
int main() {
    expect(facePoints(6, 6) == 6, 1); // six scores six points
    expect(facePoints(3, 6) == 0, 2); // nonmatching face scores zero
    expect(facePoints(2, 2) == 2, 3); // not hardcoded to six
    expect(facePoints(1, 1) == 1, 4); // lower boundary
    std::cout << "PASS: face_points\n";
}
