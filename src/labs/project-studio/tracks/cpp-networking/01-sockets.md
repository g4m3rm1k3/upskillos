---
title: 1 — Sockets, Addresses and Byte Order
track: Networking
trackOrder: 12
runtime: cpp
reference: optional
console: true
---

Every program that talks over a network, from a web browser to a multiplayer game, does it through **sockets**: a handle the operating system gives you, that you can send bytes into and receive bytes from. In this track you'll write both ends of real connections in C++, and build up to a chat room, a web server your browser can visit, and a game server.

| Lesson | You build | You learn |
|---|---|---|
| 1 | a portable socket layer | addresses, ports, TCP and UDP, byte order |
| 2 | an echo server and client | connect, listen, accept; partial reads |
| 3 | a message format | framing, byte packing, distrust |
| 4 | a chat room | many clients at once, with `poll` |
| 5 | an HTTP server | a real protocol; a browser as client |
| 6 | a tic-tac-toe server | a server that owns the game |

Choose a **new empty folder** for this track, and run every command from it. It will hold `testing/` (the test framework), `net/` (the socket layer every project shares, which grows lesson by lesson), and one folder per project.

### Addresses and ports

To reach a program on another machine, you need two numbers:

| | What it names | Example |
|---|---|---|
| **IP address** | a machine (strictly, a network interface) | `93.184.215.14` |
| **port** | one program on that machine: 0 to 65535 | `443` for HTTPS |

Together they make an **endpoint**, written `127.0.0.1:8080`. A connection is a pair of endpoints, one at each end.

`127.0.0.1` is special: the **loopback** address, which always means "this machine". Bytes sent to it never touch a network card. Every program in this track uses it, so:

- everything works offline, and no test depends on the internet;
- nothing outside your computer can connect to your servers;
- on Windows, the **firewall** doesn't ask for permission. It asks when a program listens on an address other machines can reach (such as `0.0.0.0`, "every interface"). If you ever see that prompt for these lessons, a server is listening on the wrong address.

### TCP and UDP

The two protocols you'll use sit on top of IP:

| | TCP | UDP |
|---|---|---|
| Model | a connection: a two-way **stream of bytes** | separate **datagrams** (packets) |
| Delivery | every byte, in order, or an error | no promises: a datagram can be lost, arrive twice, or arrive out of order |
| Boundaries | none: two sends can arrive as one read | one send is one receive, but a buffer smaller than the datagram silently cuts off the rest |
| Used for | the web, email, file transfer, most games' lobbies | voice, video, fast game updates, DNS |

TCP does a lot of work for you (resending what's lost, putting bytes back in order), and costs a little latency for it. A program using UDP does that work itself, if it needs it: a game, for example, numbers each update and ignores any that arrive older than the last one it applied, which handles duplicates and reordering in one rule. Lessons 2 to 6 use TCP. This lesson ends with one UDP datagram.

## Step 1 — Bytes on the wire

**This step: create `basics/byteorder.cpp`, which prints a number's bytes as they sit in memory and as they're sent, then build and run it.**

A network carries **bytes**. To send the number `0x12345678` you have to choose an order for its four bytes, and the two ends must agree. Computers don't: an x86 or ARM processor stores the **least** significant byte first (*little-endian*), while some others store the **most** significant byte first (*big-endian*).

The internet's rule is **big-endian**, called **network byte order**. So you convert on the way out and on the way back in:

```cpp
// Network byte order is big-endian: the most significant byte first.
void put_u32(std::uint32_t value, unsigned char* out)
{
    out[0] = static_cast<unsigned char>(value >> 24);
    out[1] = static_cast<unsigned char>(value >> 16);
    out[2] = static_cast<unsigned char>(value >> 8);
    out[3] = static_cast<unsigned char>(value);
}
```

- `value >> 24` shifts the top byte down to the bottom, and the cast keeps only the bottom 8 bits. Shifts work on the **value**, not on memory, so this code gives the same bytes on every machine. You never need to know which kind of machine you're on.
- `get_u32` does the reverse: shift each byte back up and combine them with `|`. Convert each byte to `std::uint32_t` *before* shifting it.
- `std::memcpy(memory, &value, 4)` copies the number's bytes exactly as they're stored, so you can see your machine's own order.

The socket headers also have ready-made converters: `htonl` ("host to network, long": 32 bits), `htons` (16 bits, used for ports) and `ntohl`/`ntohs` back. You'll meet `htons` in the next step.

```text
g++ -std=c++20 -Wall -Wextra -Werror basics/byteorder.cpp -o basics/byteorder
./basics/byteorder
```

**Predict:** what will the "in memory" line show on your computer?

```cpp file=basics/byteorder.cpp
// byteorder.cpp: how a number's bytes are laid out, in memory and on
// the wire.
#include <cstdint>
#include <cstdio>
#include <cstring>

void print_bytes(const char* label, const unsigned char* bytes)
{
    std::printf("%-15s", label);
    for (int i = 0; i < 4; ++i)
        std::printf(" %02x", bytes[i]);
    std::printf("\n");
}

// Network byte order is big-endian: the most significant byte first.
void put_u32(std::uint32_t value, unsigned char* out)
{
    out[0] = static_cast<unsigned char>(value >> 24);
    out[1] = static_cast<unsigned char>(value >> 16);
    out[2] = static_cast<unsigned char>(value >> 8);
    out[3] = static_cast<unsigned char>(value);
}

std::uint32_t get_u32(const unsigned char* in)
{
    return (std::uint32_t{in[0]} << 24) | (std::uint32_t{in[1]} << 16) |
           (std::uint32_t{in[2]} << 8) | std::uint32_t{in[3]};
}

int main()
{
    std::uint32_t value = 0x12345678;

    unsigned char memory[4];
    std::memcpy(memory, &value, 4);   // the bytes exactly as stored
    print_bytes("in memory:", memory);
    std::printf("this machine is %s-endian\n",
                memory[0] == 0x78 ? "little" : "big");

    unsigned char wire[4];
    put_u32(value, wire);
    print_bytes("network order:", wire);
    std::printf("read back: 0x%08x\n", static_cast<unsigned>(get_u32(wire)));
}
```

### What happened

```text
in memory:      78 56 34 12
this machine is little-endian
network order:  12 34 56 78
read back: 0x12345678
```

Almost every computer you'll use is little-endian, so the number sits in memory "backwards". If a program sent those memory bytes straight onto the network, a big-endian receiver would read `0x78563412`. Converting explicitly, with shifts or `htonl`, makes the format a property of the **protocol** instead of the machine.

> To see the bytes in the debugger, stop after the `memcpy` and ask for four bytes in hex: `x/4xb &value` in gdb, or `memory read -s1 -fx -c4 &value` in lldb.

```check
run "g++ -std=c++20 -Wall -Wextra -Werror basics/byteorder.cpp -o basics/byteorder"
run "./basics/byteorder" stdout="network order:  12 34 56 78" -- put_u32 must write the most significant byte (value >> 24) first.
run "./basics/byteorder" stdout="read back: 0x12345678" -- get_u32 must undo put_u32: the first byte is the most significant.
```

## Step 2 — A portable socket layer

**This step: create the supplied `net/socket.h` and read it.**

Windows and macOS/Linux both have sockets, with nearly the same functions, because Windows' **Winsock** copied the **BSD sockets** API. *Nearly* is the problem:

| | Windows (Winsock) | macOS, Linux (BSD sockets) |
|---|---|---|
| Headers | `<winsock2.h>`, `<ws2tcpip.h>` | `<sys/socket.h>`, `<netinet/in.h>`, ... |
| Before first use | `WSAStartup` | nothing |
| A socket is | `SOCKET`, an unsigned integer | `int`, a file descriptor |
| Invalid socket | `INVALID_SOCKET` | `-1` |
| Close it | `closesocket(s)` | `close(s)` |
| Last error | `WSAGetLastError()` | `errno` |
| Library | link `ws2_32` | part of the C library |

`socket.h` puts every one of those differences behind `#ifdef _WIN32`, in this one file, so the rest of the track's code is the same on every system. Read it top to bottom:

- **`Startup`** calls `WSAStartup` and `WSACleanup` on Windows. On the others it tells the system to ignore `SIGPIPE`: without that, sending to a connection the other side has closed **kills your program** instead of returning an error.
- **`Socket`** owns one socket and closes it in its destructor: **RAII**, as in the memory track. Its copy constructor and copy assignment are `= delete`d, and it has **move** operations that leave the source empty. It's built exactly like `std::unique_ptr`. The next two steps show why it must be.
- **`loopback(port)`** builds a `sockaddr_in`, the C structure that holds an IPv4 endpoint. Note `htons(port)` and `htonl(INADDR_LOOPBACK)`: every field of an address is stored in **network byte order**.
- **`bind_loopback`**, **`local_port`**, **`to_string`**, **`set_receive_timeout`**, **`send_some`** and **`recv_some`** are thin wrappers that hide the remaining type differences (Winsock's `send` takes an `int` length, for example).

The C socket functions are called as `::socket`, `::bind` and so on: the leading `::` means "the global one", not something in `net`.

```cpp file=net/socket.h provided
// socket.h: a small portable layer over the operating system's sockets.
//
// Windows has Winsock; macOS and Linux have BSD sockets. They are
// almost the same API, with a handful of differences, and every one
// of those differences is handled in this file and nowhere else.
#pragma once

#ifdef _WIN32
#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0A00   // Windows 10: WSAPoll, inet_ntop
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <winsock2.h>
#include <ws2tcpip.h>
#else
#include <arpa/inet.h>
#include <cerrno>
#include <csignal>
#include <cstring>
#include <netinet/in.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>
#endif

#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <utility>

namespace net {

// What the operating system calls a socket: SOCKET (an unsigned
// integer) on Windows, a plain int file descriptor elsewhere.
#ifdef _WIN32
using Handle = SOCKET;
inline constexpr Handle invalid_handle = INVALID_SOCKET;
#else
using Handle = int;
inline constexpr Handle invalid_handle = -1;
#endif

// The error code of the last failed socket call.
inline int last_error()
{
#ifdef _WIN32
    return WSAGetLastError();
#else
    return errno;
#endif
}

// Throws std::runtime_error naming the call that failed.
[[noreturn]] inline void fail(const std::string& what)
{
    throw std::runtime_error(what + " failed (error " +
                             std::to_string(last_error()) + ")");
}

// Create one Startup in main (or a test) before using sockets.
// Windows: WSAStartup loads Winsock, and WSACleanup unloads it.
// Elsewhere: ignore SIGPIPE, so writing to a socket the other side
// has closed returns an error instead of killing the program.
class Startup {
public:
    Startup()
    {
#ifdef _WIN32
        WSADATA data;
        if (WSAStartup(MAKEWORD(2, 2), &data) != 0)
            throw std::runtime_error("WSAStartup failed");
#else
        std::signal(SIGPIPE, SIG_IGN);
#endif
    }
    ~Startup()
    {
#ifdef _WIN32
        WSACleanup();
#endif
    }
    Startup(const Startup&) = delete;
    Startup& operator=(const Startup&) = delete;
};

// Owns one socket and closes it exactly once. Move-only, like
// std::unique_ptr: a copy would mean two owners and two closes.
class Socket {
public:
    Socket() = default;
    explicit Socket(Handle h) : h_(h) {}
    ~Socket() { close(); }

    Socket(const Socket&) = delete;
    Socket& operator=(const Socket&) = delete;

    Socket(Socket&& other) noexcept
        : h_(std::exchange(other.h_, invalid_handle))
    {
    }
    Socket& operator=(Socket&& other) noexcept
    {
        if (this != &other) {
            close();
            h_ = std::exchange(other.h_, invalid_handle);
        }
        return *this;
    }

    Handle get() const { return h_; }
    bool valid() const { return h_ != invalid_handle; }

    void close()
    {
        if (h_ != invalid_handle) {
#ifdef _WIN32
            ::closesocket(h_);
#else
            ::close(h_);
#endif
            h_ = invalid_handle;
        }
    }

private:
    Handle h_ = invalid_handle;
};

// A new socket: SOCK_STREAM for TCP, SOCK_DGRAM for UDP.
inline Socket open_socket(int type)
{
    Socket s(::socket(AF_INET, type, 0));
    if (!s.valid())
        fail("socket");
    return s;
}

// The address 127.0.0.1:port. Every field is in network byte order.
inline sockaddr_in loopback(std::uint16_t port)
{
    sockaddr_in a{};
    a.sin_family = AF_INET;
    a.sin_port = htons(port);
    a.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    return a;
}

// Binds to 127.0.0.1:port. Port 0 asks the system for any free port.
inline void bind_loopback(const Socket& s, std::uint16_t port)
{
    sockaddr_in a = loopback(port);
    if (::bind(s.get(), reinterpret_cast<sockaddr*>(&a), sizeof a) != 0)
        fail("bind");
}

// The address a socket is bound to (find out which port 0 chose).
inline sockaddr_in local_address(const Socket& s)
{
    sockaddr_in a{};
    socklen_t len = sizeof a;
    if (::getsockname(s.get(), reinterpret_cast<sockaddr*>(&a), &len) != 0)
        fail("getsockname");
    return a;
}

inline std::uint16_t local_port(const Socket& s)
{
    return ntohs(local_address(s).sin_port);
}

// "127.0.0.1:5000"
inline std::string to_string(const sockaddr_in& a)
{
    char ip[INET_ADDRSTRLEN] = {};
    ::inet_ntop(AF_INET, &a.sin_addr, ip, sizeof ip);
    return std::string(ip) + ":" + std::to_string(ntohs(a.sin_port));
}

// Makes a blocking receive give up after ms milliseconds, so a test
// whose other side never answers fails instead of hanging.
inline void set_receive_timeout(const Socket& s, int ms)
{
#ifdef _WIN32
    DWORD t = static_cast<DWORD>(ms);
#else
    timeval t{};
    t.tv_sec = ms / 1000;
    t.tv_usec = (ms % 1000) * 1000;
#endif
    ::setsockopt(s.get(), SOL_SOCKET, SO_RCVTIMEO,
                 reinterpret_cast<const char*>(&t), sizeof t);
}

// send and recv, with the same types everywhere. Each returns the
// number of bytes moved, which can be fewer than asked for; recv
// returns 0 when the other side has closed; both return -1 on error.
inline long send_some(const Socket& s, const char* data, std::size_t n)
{
    return static_cast<long>(
        ::send(s.get(), data, static_cast<int>(n), 0));
}

inline long recv_some(const Socket& s, char* out, std::size_t n)
{
    return static_cast<long>(
        ::recv(s.get(), out, static_cast<int>(n), 0));
}

} // namespace net
```

```check
file net/socket.h
```

## Step 3 — A wrapper that can be copied

**This step: create the supplied `basics/copy_bug.cpp` and read it. Don't fix it yet.**

`CopyableSocket` looks reasonable: it holds a socket handle, and closes it in its destructor, so it never leaks. But it doesn't delete its copy operations, so the compiler writes them, and a copy simply copies the handle.

`describe` takes a `CopyableSocket` **by value**.

**Predict:** in what order do things happen when `main` runs? How many times is the socket closed, and does `bind` succeed? Write your answer down. The next step builds it.

```cpp file=basics/copy_bug.cpp provided
// copy_bug.cpp: a socket wrapper that can be copied. What could go wrong?
#include <iostream>

#include "socket.h"

// Closes its socket in the destructor, like net::Socket, but it has
// the compiler-generated copy constructor.
struct CopyableSocket {
    net::Handle handle;

    explicit CopyableSocket(net::Handle h) : handle(h) {}
    ~CopyableSocket()
    {
#ifdef _WIN32
        int result = ::closesocket(handle);
#else
        int result = ::close(handle);
#endif
        std::cout << "close: " << (result == 0 ? "ok" : "failed") << '\n';
    }
};

void describe(CopyableSocket s)
{
    std::cout << "describing socket " << s.handle << '\n';
}

int main()
{
    net::Startup startup;
    CopyableSocket s(::socket(AF_INET, SOCK_DGRAM, 0));
    describe(s);

    sockaddr_in address = net::loopback(0);
    int result = ::bind(s.handle, reinterpret_cast<sockaddr*>(&address),
                        sizeof address);
    std::cout << "bind: " << (result == 0 ? "ok" : "failed") << '\n';
}
```

```check
file basics/copy_bug.cpp
```

## Step 4 — The project's build file

**This step: create the supplied `basics/CMakeLists.txt`. Configure, build, and run `copy_bug`.**

Two things are new compared with earlier tracks' build files:

- `include_directories(../net)` lets every program here write `#include "socket.h"`.
- `link_libraries(ws2_32)` inside `if(WIN32)`: on Windows, the socket functions live in the **Winsock library**, and a program that uses them must be linked with it, or the build fails with "undefined reference to `__imp_WSAStartup`". macOS and Linux need nothing extra.

```text
cmake -S basics -B basics/build -G "MinGW Makefiles"     (Windows)
cmake -S basics -B basics/build                          (macOS, Linux)
```

```text
cmake --build basics/build
./basics/build/copy_bug
```

```cmake file=basics/CMakeLists.txt provided
cmake_minimum_required(VERSION 3.20)
project(basics LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Warnings for every program below.
if(MSVC)
    add_compile_options(/W4)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# The shared net/ folder.
include_directories(../net)

# On Windows, the socket functions live in the Winsock library,
# ws2_32. macOS and Linux have them in the C library already.
if(WIN32)
    link_libraries(ws2_32)
endif()

add_executable(copy_bug copy_bug.cpp)
```

### What happened

```text
describing socket 3
close: ok
bind: failed
close: failed
```

1. `describe(s)` **copies** `s` into its parameter. Now two objects hold the same handle.
2. When `describe` returns, the copy is destroyed, and its destructor closes the socket. `close: ok`.
3. `main`'s `s` still holds the number, but the socket is gone, so `bind` fails.
4. At the end of `main`, `s` is destroyed and closes the handle **again**: `close: failed`.

Here the second close fails harmlessly. In a real server it's far worse: the system **reuses** handle numbers, so between the two closes a new connection can be given the same number, and the second close silently shuts **someone else's** connection. It's the same bug as a double `delete`, with a socket instead of memory.

```check
file basics/build/CMakeCache.txt label="basics/build has been configured" -- Run the configure command for your system, from the track folder.
run "cmake --build basics/build"
run "./basics/build/copy_bug" stdout="bind: failed" label="the copy closed the socket too early"
```

## Step 5 — Fix it with a move-only Socket

**This step: rewrite `basics/copy_bug.cpp` to use `net::Socket`, and make `describe` borrow the socket instead of copying it. Build and run it.**

```cpp
void describe(const net::Socket& s)
{
    std::cout << "describing socket " << s.get() << '\n';
}
```

Make the socket with `net::Socket s = net::open_socket(SOCK_DGRAM);`, and use `s.get()` wherever the handle is needed. Delete `CopyableSocket`.

**Experiment:** before writing the `&`, try passing `net::Socket` by value. The compiler refuses:

```text
error: use of deleted function
'net::Socket::Socket(const net::Socket&)'
```

That error is the point. A type that owns a resource either copies it properly (a new socket? there's no such thing) or can't be copied at all. `net::Socket` can't, so the double close can't even be written. When you really do want to hand a socket over, **move** it: `std::move(s)` transfers the handle and leaves `s` empty, so exactly one object closes it.

```text
cmake --build basics/build
./basics/build/copy_bug
```

```cpp file=basics/copy_bug.cpp
// copy_bug.cpp, fixed: net::Socket can't be copied, only lent or moved.
#include <iostream>

#include "socket.h"

void describe(const net::Socket& s)
{
    std::cout << "describing socket " << s.get() << '\n';
}

int main()
{
    net::Startup startup;
    net::Socket s = net::open_socket(SOCK_DGRAM);
    describe(s);

    sockaddr_in address = net::loopback(0);
    int result = ::bind(s.get(), reinterpret_cast<sockaddr*>(&address),
                        sizeof address);
    std::cout << "bind: " << (result == 0 ? "ok" : "failed") << '\n';
}
```

```check
run "cmake --build basics/build" -- A net::Socket can only be passed by reference (const net::Socket&) or moved, never copied.
run "./basics/build/copy_bug" stdout="bind: ok" without="failed" label="the socket is closed once, at the end"
```

## Step 6 — Hello over UDP

**This step: create `basics/udp_hello.cpp`, which sends one UDP datagram to itself. Add it to `basics/CMakeLists.txt`, then build and run it.**

```cmake
add_executable(udp_hello udp_hello.cpp)
```

The program plays both ends:

1. **The receiver**: a UDP socket, **bound** to `127.0.0.1` and port **0**. Binding gives a socket its address. Port 0 means "any free port, you choose": the system picks one, and `net::local_address` asks which. Asking for a fixed port, like 5000, fails if another program already has it.
2. **The sender**: an unbound UDP socket. `::sendto` sends one datagram to the receiver's address. The system gives the sender a port of its own as it sends.
3. **Receive** with `::recvfrom`, which also says who sent it. Set a receive timeout first: if nothing ever arrives, `recvfrom` fails after 5 seconds instead of waiting forever.

```cpp
long sent = ::sendto(sender.get(), message.data(),
                     static_cast<int>(message.size()), 0,
                     reinterpret_cast<sockaddr*>(&to), sizeof to);
```

The socket functions are C functions that accept every kind of address (IPv4, IPv6, ...) as a pointer to the generic `sockaddr`, plus its size. So you pass your `sockaddr_in` with a `reinterpret_cast`. It's one of the few places where that cast is normal.

```text
cmake --build basics/build
./basics/build/udp_hello
```

```cpp file=basics/udp_hello.cpp
// udp_hello.cpp: send one datagram to ourselves over the loopback.
#include <iostream>
#include <string>

#include "socket.h"

int main()
{
    net::Startup startup;

    // The receiver: bound to 127.0.0.1 and a port the system picks.
    net::Socket receiver = net::open_socket(SOCK_DGRAM);
    net::bind_loopback(receiver, 0);
    sockaddr_in to = net::local_address(receiver);
    std::cout << "receiver is at " << net::to_string(to) << '\n';

    // The sender: not bound. The system gives it a port on first use.
    net::Socket sender = net::open_socket(SOCK_DGRAM);
    std::string message = "hello, socket";
    long sent = ::sendto(sender.get(), message.data(),
                         static_cast<int>(message.size()), 0,
                         reinterpret_cast<sockaddr*>(&to), sizeof to);
    std::cout << "sent " << sent << " bytes\n";

    // Wait at most 5 seconds for it.
    net::set_receive_timeout(receiver, 5000);
    char buffer[512];
    sockaddr_in from{};
    socklen_t from_len = sizeof from;
    long got = ::recvfrom(receiver.get(), buffer, sizeof buffer, 0,
                          reinterpret_cast<sockaddr*>(&from), &from_len);
    if (got < 0) {
        std::cout << "nothing arrived (error " << net::last_error() << ")\n";
        return 1;
    }
    std::cout << "received \"" << std::string(buffer, got) << "\" from "
              << net::to_string(from) << '\n';
}
```

### What happened

```text
receiver is at 127.0.0.1:41733
sent 13 bytes
received "hello, socket" from 127.0.0.1:52790
```

Your port numbers will differ on every run: that's port 0 at work, on both sockets. The datagram arrived as one message of 13 bytes, all of it, because the receive buffer was bigger than the datagram. On a real network it might not have arrived at all, or arrived twice, or behind a later one, and nothing would tell you: UDP leaves that to the program.

From the next lesson on, everything uses TCP, and its first surprise is that messages do **not** arrive whole.

```check
contains basics/CMakeLists.txt "add_executable(udp_hello udp_hello.cpp)" -- Add add_executable(udp_hello udp_hello.cpp) to the end of basics/CMakeLists.txt.
run "cmake --build basics/build"
run "./basics/build/udp_hello" stdout="received \"hello, socket\" from 127.0.0.1:" -- Bind the receiver to port 0 first, then send to the address local_address gives you.
```

## Step 7 — The test framework

**This step: create the supplied `testing/studio_test.hpp`.**

From the next lesson on, every project is tested: servers run inside test programs, with real clients connecting to them. So this track needs the test framework in its new folder.

It's the same small framework as in *C++ Foundations*: `TEST(name)`, `CHECK`, `CHECK_EQ`, `CHECK_NEAR` and `CHECK_THROWS`, with GoogleTest-style output. Each track's project folder has its own copy.

```cpp file=testing/studio_test.hpp provided
// studio_test.hpp — a deliberately tiny unit-test framework.
//
// It is small enough to read in one sitting (do!), and it prints results in the
// same format as GoogleTest, which you will switch to in a later track.
//
//   TEST(adds_two_numbers) {
//       CHECK_EQ(add(2, 3), 5);
//   }
//
// Macros: CHECK(cond), CHECK_EQ(a, b), CHECK_NE(a, b), CHECK_NEAR(a, b, tolerance),
//         CHECK_THROWS(expression, ExceptionType)
#pragma once

#include <cmath>
#include <exception>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace studio_test {

struct TestCase {
    const char* name;
    void (*body)();
};

// A function-local static is created the first time it is used, which makes it
// safe to register tests from static objects in any translation unit.
inline std::vector<TestCase>& registry()
{
    static std::vector<TestCase> tests;
    return tests;
}

struct Registrar {
    Registrar(const char* name, void (*body)()) { registry().push_back({name, body}); }
};

// Thrown by a failing CHECK; caught by run_all().
struct Failure {
    std::string message;
};

template <typename T>
std::string show(const T& value)
{
    std::ostringstream out;
    out << value;
    return out.str();
}

inline std::string location(const char* file, int line)
{
    return std::string(file) + ":" + std::to_string(line) + ": ";
}

inline int run_all()
{
    auto& tests = registry();
    int failed = 0;
    std::cout << "[==========] Running " << tests.size() << " tests\n";
    for (const auto& test : tests) {
        // std::endl flushes: if this test crashes the program, the output
        // still shows which test was running.
        std::cout << "[ RUN      ] " << test.name << std::endl;
        try {
            test.body();
            std::cout << "[       OK ] " << test.name << '\n';
        } catch (const Failure& f) {
            ++failed;
            std::cout << f.message << '\n' << "[  FAILED  ] " << test.name << '\n';
        } catch (const std::exception& e) {
            ++failed;
            std::cout << "unexpected exception: " << e.what() << '\n' << "[  FAILED  ] " << test.name << '\n';
        } catch (...) {
            ++failed;
            std::cout << "unexpected non-standard exception\n" << "[  FAILED  ] " << test.name << '\n';
        }
    }
    std::cout << "[==========] " << tests.size() << " tests ran, " << (tests.size() - failed) << " passed, " << failed
              << " failed\n";
    return failed == 0 ? 0 : 1;
}

} // namespace studio_test

#define STUDIO_TEST_CONCAT2(a, b) a##b
#define STUDIO_TEST_CONCAT(a, b) STUDIO_TEST_CONCAT2(a, b)

#define TEST(name)                                                                                                   \
    static void STUDIO_TEST_CONCAT(name, _body)();                                                                   \
    static const studio_test::Registrar STUDIO_TEST_CONCAT(name, _registrar)(#name, &STUDIO_TEST_CONCAT(name, _body)); \
    static void STUDIO_TEST_CONCAT(name, _body)()

#define CHECK(cond)                                                                                     \
    do {                                                                                                \
        if (!(cond))                                                                                    \
            throw studio_test::Failure{studio_test::location(__FILE__, __LINE__) + "CHECK(" #cond ") failed"}; \
    } while (false)

#define STUDIO_TEST_BINARY(a, b, op, name)                                                                     \
    do {                                                                                                     \
        const auto& studio_left = (a);                                                                       \
        const auto& studio_right = (b);                                                                      \
        if (!(studio_left op studio_right))                                                                  \
            throw studio_test::Failure{studio_test::location(__FILE__, __LINE__) + name "(" #a ", " #b ") failed\n" \
                                       "    left:  " + studio_test::show(studio_left) + "\n"                \
                                       "    right: " + studio_test::show(studio_right)};                    \
    } while (false)

#define CHECK_EQ(a, b) STUDIO_TEST_BINARY(a, b, ==, "CHECK_EQ")
#define CHECK_NE(a, b) STUDIO_TEST_BINARY(a, b, !=, "CHECK_NE")

#define CHECK_NEAR(a, b, tolerance)                                                                              \
    do {                                                                                                       \
        const double studio_left = (a);                                                                        \
        const double studio_right = (b);                                                                       \
        if (!(std::fabs(studio_left - studio_right) <= (tolerance)))                                           \
            throw studio_test::Failure{studio_test::location(__FILE__, __LINE__) + "CHECK_NEAR(" #a ", " #b ") failed\n" \
                                       "    left:  " + studio_test::show(studio_left) + "\n"                  \
                                       "    right: " + studio_test::show(studio_right)};                      \
    } while (false)

#define CHECK_THROWS(expression, ExceptionType)                                                                 \
    do {                                                                                                      \
        bool studio_threw = false;                                                                            \
        try {                                                                                                 \
            (void)(expression);                                                                               \
        } catch (const ExceptionType&) {                                                                      \
            studio_threw = true;                                                                              \
        }                                                                                                     \
        if (!studio_threw)                                                                                    \
            throw studio_test::Failure{studio_test::location(__FILE__, __LINE__) + "CHECK_THROWS(" #expression \
                                       ", " #ExceptionType ") failed: nothing was thrown"};                   \
    } while (false)
```

```check
file testing/studio_test.hpp
```

## Step 8 — The test runner

**This step: create the supplied `testing/test_main.cpp`.**

The test program's `main`: it runs every registered test and exits with `0` only if all of them passed.

```cpp file=testing/test_main.cpp provided
// The test program's entry point. Every TEST(...) in the other test files has
// already registered itself by the time main() runs.
#include "studio_test.hpp"

int main()
{
    return studio_test::run_all();
}
```

```check
file testing/test_main.cpp
```
