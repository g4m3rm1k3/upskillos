#ifndef FAKEINPUT_H
#define FAKEINPUT_H

#include <iostream>
#include <sstream>
#include <string>

// While a FakeInput exists, std::cin reads from the text you give it
// instead of from the keyboard. When it goes out of scope, the keyboard
// is put back.
class FakeInput {
private:
    std::istringstream stream;
    std::streambuf* original;

public:
    explicit FakeInput(const std::string& text)
        : stream(text), original(std::cin.rdbuf(stream.rdbuf())) {}

    ~FakeInput() {
        std::cin.rdbuf(original);
    }

    FakeInput(const FakeInput&) = delete;
    FakeInput& operator=(const FakeInput&) = delete;
};

#endif
