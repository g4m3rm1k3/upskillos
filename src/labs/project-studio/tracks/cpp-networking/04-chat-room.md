---
title: 4 — Many Clients: a Chat Room
track: Networking
runtime: cpp
reference: optional
console: true
---

Lesson 2's echo server serves **one** client at a time: while `serve_one` waits in `recv` for one client, every other client waits too. A chat room can't work like that. Anyone might speak at any moment, and the server must hear them all.

There are two classic ways to serve many clients:

| | A thread per client | An event loop |
|---|---|---|
| How | `accept`, then start a thread that runs `serve_one`'s loop for that client | one thread asks the system "which of these sockets has something for me?", and serves only those |
| The call | `std::thread` | `poll` (`select` is its older cousin; `epoll`, `kqueue` and IOCP are faster relatives) |
| Easy part | each client's code is a simple blocking loop | no locks: one thread owns all the data |
| Hard part | shared data (the list of clients) needs a mutex; thousands of threads are costly | code is split into "something arrived" handlers; one slow handler delays everyone |

A chat room is all shared data: every line goes to every other client. So this lesson uses an **event loop**, and the `FrameDecoder` from lesson 3 turns out to be exactly what it needs.

## Step 1 — Waiting for many sockets at once

**This step: create the supplied `net/poller.h` and read it.**

`poll` takes an array of `pollfd`s, one per socket, each saying what you're waiting for (`POLLIN`: "something to read"). It **sleeps** until at least one of them is ready, or the timeout passes, then fills in each one's `revents`:

```text
watching: listener  ada  bob
poll(..., 50 ms)    ... ada sends a line ...
revents:    0       POLLIN  0      -> serve ada, and only ada
```

What counts as "something to read":

| Socket | `revents` set means | So you call |
|---|---|---|
| listening | a client is waiting to be accepted | `accept`: it won't block |
| connected | bytes arrived, **or** the client closed | `recv` once: it won't block |

The rule of the event loop is: only call `recv` or `accept` on a socket that `poll` said is ready, and only **once** per readiness. A second `recv` might block, freezing every other client.

Windows calls the same function `WSAPoll`, with a `WSAPOLLFD` struct; `poller.h` hides that with `#ifdef _WIN32`, like `socket.h`.

> **Why `poller.h` and not `poll.h`?** The system header is `<poll.h>`, and `../net` is on the include path. A file of ours called `poll.h` would make `#include <poll.h>` find **itself**, and the build fails with baffling errors. Name your headers so they can't shadow system ones.

```cpp file=net/poller.h provided
// poller.h: wait for any of several sockets to be ready.
//
// POSIX has poll(); Windows has the same thing named WSAPoll().
#pragma once

#include <cstddef>

#include "socket.h"

#ifndef _WIN32
#include <poll.h>
#endif

namespace net {

// One socket to watch: set fd and events (POLLIN: "tell me when
// there is something to read"); poll fills in revents.
#ifdef _WIN32
using PollFd = WSAPOLLFD;
#else
using PollFd = pollfd;
#endif

inline PollFd watch(const Socket& s)
{
    PollFd p{};
    p.fd = s.get();
    p.events = POLLIN;
    return p;
}

// Waits until at least one socket is ready, or timeout_ms passes.
// Returns how many are ready: 0 on a timeout, -1 on an error.
inline int poll(PollFd* fds, std::size_t count, int timeout_ms)
{
#ifdef _WIN32
    return ::WSAPoll(fds, static_cast<ULONG>(count), timeout_ms);
#else
    return ::poll(fds, static_cast<nfds_t>(count), timeout_ms);
#endif
}

} // namespace net
```

```check
file net/poller.h
```

## Step 2 — The chat protocol

**This step: create the supplied `chat/chat_server.h` and read it.**

The comment at the top is the **protocol**: what clients send, and what the server sends back. Write it down before writing code; both ends will be built from it.

The class follows from the event loop:

- `Client` keeps everything the server knows about one connection: its `Socket`, its own `FrameDecoder` (each client's bytes arrive in their own pieces), its `name`, and an `alive` flag.
- `clients_` is a `std::vector<Client>`. `Client` holds a `Socket`, so it's **move-only** too, and that's fine: `vector` moves its elements when it grows.
- `stopping_` is a `std::atomic<bool>`: `stop()` is called from another thread (the test's) while `run()` reads it. A plain `bool` read and written by two threads at once is a **data race**, which is undefined behaviour. `std::atomic` makes it safe.

`run` can't sleep in `poll` forever, or it would never notice `stop()`. It waits at most 50 ms at a time, then checks `stopping_`. (A production server would wake itself instead, by writing to a socket it also polls, but the timeout is simple and correct.)

```cpp file=chat/chat_server.h provided
// chat_server.h: a chat room. One thread serves every client.
//
// The protocol: every message is a frame (frame.h).
//   1. A client's first frame is its name. The server answers
//      "welcome NAME", and tells everyone else "* NAME joined".
//   2. Every later frame is a line of chat. Everyone else gets
//      "NAME: TEXT". The sender doesn't get its own line back.
//   3. When a client leaves, everyone else gets "* NAME left".
#pragma once

#include <atomic>
#include <cstdint>
#include <string>
#include <vector>

#include "frame.h"
#include "socket.h"

class ChatServer {
public:
    // Listens on 127.0.0.1, on a port the system picks.
    ChatServer();

    std::uint16_t port() const;

    // The event loop: serves every client until stop() is called.
    void run();

    // Asks run() to return. Safe to call from any thread.
    void stop();

private:
    struct Client {
        net::Socket socket;
        net::FrameDecoder decoder;
        std::string name;    // empty until its first frame arrives
        bool alive = true;
    };

    void accept_new();
    void read_from(Client& client);
    void handle(Client& client, const std::string& frame);
    void remove_dead();
    void send_to(Client& client, const std::string& text);
    void broadcast(const std::string& text, const Client& except);

    net::Socket listener_;
    std::vector<Client> clients_;
    std::atomic<bool> stopping_{false};
};
```

```check
file chat/chat_server.h
```

## Step 3 — The project's build file

**This step: create the supplied `chat/CMakeLists.txt`.**

New here: the server is a `.cpp` file, and `file(GLOB LIB_SOURCES CONFIGURE_DEPENDS *.cpp)` collects every `.cpp` file in `chat/` into the test program, so you never need to edit this file when you add one. The program that you'll try by hand will live in `chat/apps/`, out of that glob's way.

```cmake file=chat/CMakeLists.txt provided
cmake_minimum_required(VERSION 3.20)
project(chat LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Warnings for every program below.
if(MSVC)
    add_compile_options(/W4)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# This folder, the shared net/ folder and the test framework.
include_directories(. ../net ../testing)

# Every program links Winsock on Windows, and the thread library
# (std::thread) everywhere.
find_package(Threads REQUIRED)
link_libraries(Threads::Threads)
if(WIN32)
    link_libraries(ws2_32)
endif()

# The chat library: every .cpp file in this folder.
file(GLOB LIB_SOURCES CONFIGURE_DEPENDS *.cpp)

# Every tests/*_test.cpp file becomes part of the test program.
file(GLOB TEST_SOURCES CONFIGURE_DEPENDS tests/*_test.cpp)
add_executable(chat_tests ../testing/test_main.cpp ${TEST_SOURCES} ${LIB_SOURCES})
```

```check
file chat/CMakeLists.txt
```

## Step 4 — Test helpers for any server

**This step: create the supplied `net/test_client.h` and read it.**

Two helpers, which the rest of the track reuses:

- **`RunningServer<Server>`** creates a server and runs its `run()` on a thread; its destructor calls `stop()` and joins. It's a **template**, so it works for any server with `port()`, `run()` and `stop()`: this lesson's `ChatServer`, and the next two lessons' servers, which have the same shape on purpose.
- **`TestClient`** connects, sets a 5-second receive timeout, and talks in frames: `say` sends one, and `hear` returns the next one, or `"<nothing>"` if the connection closed or nothing came. A test that expected a message and got `"<nothing>"` fails with a readable message instead of hanging.

The member order in `RunningServer` is load-bearing: members are constructed in the order they're **declared**, so `server_` exists before `thread_` starts running `server_.run()`. Swap the two declarations and the thread could use a server that doesn't exist yet.

```cpp file=net/test_client.h provided
// test_client.h: helpers for testing a server in one process.
#pragma once

#include <cstdint>
#include <string>
#include <thread>

#include "frame.h"
#include "socket.h"
#include "tcp.h"

namespace net {

// Runs a server's event loop on another thread, and stops it and
// waits for it in the destructor. Works with any Server that has
// port(), run() and stop(): ChatServer now, more servers later.
template <typename Server>
class RunningServer {
public:
    RunningServer() : thread_([this] { server_.run(); }) {}
    ~RunningServer()
    {
        server_.stop();
        thread_.join();
    }
    RunningServer(const RunningServer&) = delete;
    RunningServer& operator=(const RunningServer&) = delete;

    std::uint16_t port() const { return server_.port(); }

private:
    Server server_;       // declared first, so built before the thread
    std::thread thread_;
};

// A client that talks in frames. Every wait gives up after 5 seconds,
// so a server that never answers fails the test instead of hanging.
class TestClient {
public:
    explicit TestClient(std::uint16_t port)
        : socket_(connect_loopback(port))
    {
        set_receive_timeout(socket_, 5000);
    }

    void say(const std::string& text) { send_frame(socket_, text); }

    // The next frame from the server, or "<nothing>" if the server
    // closed the connection or said nothing for 5 seconds.
    std::string hear()
    {
        std::string frame;
        return recv_frame(socket_, frame) ? frame : "<nothing>";
    }

    void leave() { socket_.close(); }

private:
    Socket socket_;
};

} // namespace net
```

```check
file net/test_client.h
```

## Step 5 — The specification

**This step: create the supplied `chat/tests/chat_test.cpp` and read it.**

Testing a server with several clients has a trap: **timing**. If the test connects ada and bob and has ada speak at once, does bob hear her? It depends on whether the server had accepted bob yet. A test like that passes on your machine and fails on a slow one.

These tests avoid it by never acting before the server has **confirmed** the previous step. Every client waits for `welcome NAME` before the test goes on, and every message the test expects is one the protocol guarantees will come. Look at `a_line_goes_to_everyone_else`: to check that ada does **not** hear her own line, it doesn't wait to see if something arrives (how long would you wait?). It has bob reply, and checks that bob's reply is the **next** thing ada hears.

```cpp file=chat/tests/chat_test.cpp provided
// Provided by the lesson: what ChatServer must do.
#include "studio_test.hpp"

#include <string>
#include <vector>

#include "chat_server.h"
#include "test_client.h"

using Running = net::RunningServer<ChatServer>;
using net::TestClient;

namespace {

// Says the name, and returns the server's answer.
std::string join(TestClient& client, const std::string& name)
{
    client.say(name);
    return client.hear();
}

} // namespace

TEST(a_new_client_is_welcomed)
{
    net::Startup startup;
    Running server;
    TestClient ada(server.port());
    CHECK_EQ(join(ada, "ada"), std::string("welcome ada"));
}

TEST(everyone_else_hears_who_joined)
{
    net::Startup startup;
    Running server;
    TestClient ada(server.port());
    join(ada, "ada");
    TestClient bob(server.port());
    CHECK_EQ(join(bob, "bob"), std::string("welcome bob"));
    CHECK_EQ(ada.hear(), std::string("* bob joined"));
}

TEST(a_line_goes_to_everyone_else)
{
    net::Startup startup;
    Running server;
    TestClient ada(server.port());
    join(ada, "ada");
    TestClient bob(server.port());
    join(bob, "bob");
    ada.hear();   // * bob joined

    ada.say("hi bob");
    CHECK_EQ(bob.hear(), std::string("ada: hi bob"));
    bob.say("hi ada");
    // If the server had sent ada her own line, she'd hear it first.
    CHECK_EQ(ada.hear(), std::string("bob: hi ada"));
}

TEST(five_clients_at_once)
{
    net::Startup startup;
    Running server;
    std::vector<TestClient> clients;
    for (int i = 0; i < 5; ++i) {
        clients.emplace_back(server.port());
        std::string name = "user" + std::to_string(i);
        CHECK_EQ(join(clients.back(), name), "welcome " + name);
        for (int j = 0; j < i; ++j)   // the earlier ones hear about it
            CHECK_EQ(clients[j].hear(), "* " + name + " joined");
    }
    clients[2].say("hello, all");
    for (int i = 0; i < 5; ++i) {
        if (i != 2)
            CHECK_EQ(clients[i].hear(), std::string("user2: hello, all"));
    }
}

TEST(everyone_else_hears_who_left)
{
    net::Startup startup;
    Running server;
    TestClient ada(server.port());
    join(ada, "ada");
    TestClient bob(server.port());
    join(bob, "bob");
    ada.hear();   // * bob joined

    bob.leave();
    CHECK_EQ(ada.hear(), std::string("* bob left"));
}

TEST(the_room_carries_on_after_someone_leaves)
{
    net::Startup startup;
    Running server;
    TestClient ada(server.port());
    join(ada, "ada");
    {
        TestClient bob(server.port());
        join(bob, "bob");
        ada.hear();   // * bob joined
    }   // bob's socket closes here
    CHECK_EQ(ada.hear(), std::string("* bob left"));
    TestClient cy(server.port());
    CHECK_EQ(join(cy, "cy"), std::string("welcome cy"));
    CHECK_EQ(ada.hear(), std::string("* cy joined"));
}

TEST(a_client_sending_garbage_is_disconnected)
{
    net::Startup startup;
    Running server;
    TestClient ada(server.port());
    join(ada, "ada");

    net::Socket rogue = net::connect_loopback(server.port());
    net::set_receive_timeout(rogue, 5000);
    net::send_all(rogue, "\xff\xff\xff\xff");   // a 4 GB frame? No.
    char byte;
    CHECK_EQ(net::recv_some(rogue, &byte, 1), 0L);   // closed on us
    ada.say("still here");                           // and ada is fine
    TestClient bob(server.port());
    CHECK_EQ(join(bob, "bob"), std::string("welcome bob"));
}
```

```check
file chat/tests/chat_test.cpp
```

## Step 6 — The event loop

**This step: create `chat/chat_server.cpp`. Configure, build and run the tests.**

The heart of it is `run`:

```cpp
while (!stopping_) {
    std::vector<net::PollFd> fds;
    fds.push_back(net::watch(listener_));
    for (const Client& c : clients_)
        fds.push_back(net::watch(c.socket));

    if (net::poll(fds.data(), fds.size(), 50) <= 0)
        continue;   // nothing happened in 50 ms

    for (std::size_t i = 0; i < fds.size() - 1; ++i) {
        if (fds[i + 1].revents != 0)
            read_from(clients_[i]);
    }
    remove_dead();
    if (fds[0].revents != 0)
        accept_new();
}
```

`fds[i + 1]` belongs to `clients_[i]`, because the listener is `fds[0]`. Read the clients **before** accepting: `accept_new` adds to `clients_`, and the new client has no entry in `fds`.

The other members, in order of difficulty:

- **`accept_new`**: `accept_client`, and push a new `Client` with that socket (`std::move` it in).
- **`send_to(client, text)`**: `send_frame`, and if that fails, mark the client not alive.
- **`broadcast(text, except)`**: `send_to` every client that has a name and isn't `except` (compare addresses: `&c != &except`).
- **`read_from(client)`**: **one** `recv_some`. `0` or less: not alive. Otherwise `feed` the decoder, and `handle` every complete frame. If the decoder is broken, not alive.
- **`handle(client, frame)`**: no name yet? This frame is the name: store it, `welcome` the client, and announce `* NAME joined` to everyone else. Otherwise broadcast `NAME: TEXT`.
- **`remove_dead`**: for each client that isn't alive, remove it from `clients_` and, if it had a name, announce `* NAME left`. Careful: that broadcast can find **another** dead client. One simple way to be correct: after removing one, start the loop again from the beginning.

Don't remove clients **while** looping over them: erasing from a vector moves the later elements, and the loop's index (or a reference you're holding) then points at the wrong client. That's why `read_from` only marks clients, and `remove_dead` runs once the loop is done.

```text
cmake -S chat -B chat/build -G "MinGW Makefiles"     (Windows)
cmake -S chat -B chat/build                          (macOS, Linux)
```

```text
cmake --build chat/build
./chat/build/chat_tests
```

```cpp file=chat/chat_server.cpp
#include "chat_server.h"

#include <cstddef>
#include <string_view>
#include <utility>

#include "poller.h"
#include "tcp.h"

ChatServer::ChatServer() : listener_(net::listen_loopback()) {}

std::uint16_t ChatServer::port() const
{
    return net::local_port(listener_);
}

void ChatServer::stop()
{
    stopping_ = true;
}

void ChatServer::run()
{
    while (!stopping_) {
        // Watch the listener, then every client, in that order.
        std::vector<net::PollFd> fds;
        fds.push_back(net::watch(listener_));
        for (const Client& c : clients_)
            fds.push_back(net::watch(c.socket));

        // Wake up at least every 50 ms to notice stop().
        if (net::poll(fds.data(), fds.size(), 50) <= 0)
            continue;

        // fds[i + 1] belongs to clients_[i]. Read before accepting:
        // accept_new adds to clients_.
        for (std::size_t i = 0; i < fds.size() - 1; ++i) {
            if (fds[i + 1].revents != 0)
                read_from(clients_[i]);
        }
        remove_dead();
        if (fds[0].revents != 0)
            accept_new();
    }
}

void ChatServer::accept_new()
{
    Client client;
    client.socket = net::accept_client(listener_);
    clients_.push_back(std::move(client));
}

void ChatServer::read_from(Client& client)
{
    if (!client.alive)
        return;   // a failed send already marked it
    char buffer[4096];
    long got = net::recv_some(client.socket, buffer, sizeof buffer);
    if (got <= 0) {
        client.alive = false;   // closed, or failed
        return;
    }
    client.decoder.feed({buffer, static_cast<std::size_t>(got)});
    while (auto frame = client.decoder.next())
        handle(client, *frame);
    if (client.decoder.broken())
        client.alive = false;
}

void ChatServer::handle(Client& client, const std::string& frame)
{
    if (client.name.empty()) {
        client.name = frame;
        send_to(client, "welcome " + frame);
        broadcast("* " + frame + " joined", client);
    } else {
        broadcast(client.name + ": " + frame, client);
    }
}

void ChatServer::remove_dead()
{
    for (std::size_t i = 0; i < clients_.size();) {
        if (clients_[i].alive) {
            ++i;
            continue;
        }
        Client gone = std::move(clients_[i]);
        clients_.erase(clients_.begin() + static_cast<long>(i));
        if (!gone.name.empty())
            broadcast("* " + gone.name + " left", gone);
        i = 0;   // that broadcast may have found another dead client
    }
}

void ChatServer::send_to(Client& client, const std::string& text)
{
    if (client.alive && !net::send_frame(client.socket, text))
        client.alive = false;
}

void ChatServer::broadcast(const std::string& text, const Client& except)
{
    for (Client& c : clients_) {
        if (&c != &except && !c.name.empty())
            send_to(c, text);
    }
}
```

```check
file chat/build/CMakeCache.txt label="chat/build has been configured" -- Run the configure command for your system, from the track folder.
run "cmake --build chat/build"
tests "./chat/build/chat_tests" require="a_new_client_is_welcomed a_line_goes_to_everyone_else five_clients_at_once everyone_else_hears_who_left a_client_sending_garbage_is_disconnected" timeout=90 -- broadcast skips the client it was given; a client whose recv returns 0 or less has left.
```

## Step 7 — Chat in three terminals

**This step: create the supplied `chat/apps/chat.cpp`, add a `chat` program to `chat/CMakeLists.txt`, build it, and chat with yourself.**

```cmake
add_executable(chat apps/chat.cpp ${LIB_SOURCES})
```

`chat serve` runs a server; `chat join PORT NAME` is a client. A client waits for **two** things, the keyboard and the server, and `std::getline` can't be part of a `poll` (on Windows, `WSAPoll` only takes sockets). So the client uses the other model from the table: a second thread, which prints whatever the server sends while the main thread reads the keyboard.

When you finish typing, the client calls `shutdown(..., SHUT_WR)` (`SD_SEND` on Windows): "I won't send any more", while still receiving. The server sees the end of the stream, says goodbye to everyone, and closes, which ends the listening thread.

```text
./chat/build/chat serve                 (terminal 1)
chat server on 127.0.0.1:50731

./chat/build/chat join 50731 ada        (terminal 2)
./chat/build/chat join 50731 bob        (terminal 3)
```

Type in either client. Unlike the echo server, everyone is served at once.

```cpp file=chat/apps/chat.cpp provided
// chat: the chat room as a program.
//
//   chat serve            starts a server and prints its port
//   chat join PORT NAME   joins the room on 127.0.0.1:PORT
#include <cstdint>
#include <iostream>
#include <stdexcept>
#include <string>
#include <thread>

#include "chat_server.h"
#include "frame.h"
#include "tcp.h"

namespace {

void serve()
{
    ChatServer server;
    std::cout << "chat server on 127.0.0.1:" << server.port() << std::endl;
    server.run();   // until Ctrl+C
}

void join(std::uint16_t port, const std::string& name)
{
    net::Socket server = net::connect_loopback(port);
    net::send_frame(server, name);

    // Two things to wait for at once, the keyboard and the server, so
    // two threads: this one reads the keyboard, the listener prints
    // whatever the server sends.
    std::thread listener([&] {
        std::string line;
        while (net::recv_frame(server, line))
            std::cout << line << std::endl;
        std::cout << "(disconnected)" << std::endl;
    });

    std::string line;
    while (std::getline(std::cin, line))
        net::send_frame(server, line);

    // Out of input: say we're done sending. The server sees the
    // connection end, and closes its side, which ends the listener.
#ifdef _WIN32
    ::shutdown(server.get(), SD_SEND);
#else
    ::shutdown(server.get(), SHUT_WR);
#endif
    listener.join();
}

} // namespace

int main(int argc, char* argv[])
{
    try {
        net::Startup startup;
        std::string command = argc > 1 ? argv[1] : "";
        if (command == "serve" && argc == 2) {
            serve();
            return 0;
        }
        if (command == "join" && argc == 4) {
            join(static_cast<std::uint16_t>(std::stoi(argv[2])), argv[3]);
            return 0;
        }
        std::cerr << "usage: chat serve\n"
                     "       chat join PORT NAME\n";
        return 2;
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
        return 1;
    }
}
```

```check
contains chat/CMakeLists.txt "add_executable(chat apps/chat.cpp ${LIB_SOURCES})" -- Add add_executable(chat apps/chat.cpp ${LIB_SOURCES}) to the end of chat/CMakeLists.txt.
run "cmake --build chat/build"
run "./chat/build/chat" exit=2 stderr="usage: chat serve"
```

## Step 8 — Challenge: who is here?

**This step: create the supplied `chat/tests/who_test.cpp` and read it.**

The challenge: a new command. A client that sends the frame `/who` gets back, **privately**, `online: ` followed by the names of everyone in the room, in the order they joined, separated by `, `. It isn't broadcast as a chat line, and clients that haven't said their name yet aren't listed.

The tests say the rest. The test program won't pass until you've done the next step.

```cpp file=chat/tests/who_test.cpp provided
// Provided by the lesson: the /who command.
#include "studio_test.hpp"

#include <string>

#include "chat_server.h"
#include "test_client.h"

using Running = net::RunningServer<ChatServer>;
using net::TestClient;

namespace {

// Says the name, and returns the server's answer.
std::string join(TestClient& client, const std::string& name)
{
    client.say(name);
    return client.hear();
}

} // namespace

TEST(who_lists_everyone_in_join_order)
{
    net::Startup startup;
    Running server;
    TestClient ada(server.port());
    join(ada, "ada");
    TestClient bob(server.port());
    join(bob, "bob");
    ada.hear();   // * bob joined

    bob.say("/who");
    CHECK_EQ(bob.hear(), std::string("online: ada, bob"));
}

TEST(who_is_answered_privately)
{
    net::Startup startup;
    Running server;
    TestClient ada(server.port());
    join(ada, "ada");
    TestClient bob(server.port());
    join(bob, "bob");
    ada.hear();   // * bob joined

    ada.say("/who");
    CHECK_EQ(ada.hear(), std::string("online: ada, bob"));
    bob.say("ok");
    // If /who had been broadcast, bob would hear "ada: /who" first.
    CHECK_EQ(ada.hear(), std::string("bob: ok"));
}

TEST(who_forgets_people_who_left)
{
    net::Startup startup;
    Running server;
    TestClient ada(server.port());
    join(ada, "ada");
    {
        TestClient bob(server.port());
        join(bob, "bob");
        ada.hear();   // * bob joined
    }
    ada.hear();       // * bob left
    ada.say("/who");
    CHECK_EQ(ada.hear(), std::string("online: ada"));
}

TEST(a_client_without_a_name_is_not_listed)
{
    net::Startup startup;
    Running server;
    TestClient ada(server.port());
    join(ada, "ada");
    TestClient shy(server.port());   // connected, never says a name
    TestClient bob(server.port());
    join(bob, "bob");
    ada.hear();       // * bob joined
    ada.say("/who");
    CHECK_EQ(ada.hear(), std::string("online: ada, bob"));
}
```

```check
file chat/tests/who_test.cpp
```

## Step 9 — Challenge: /who

**This step: make `ChatServer` answer `/who`. Build and run the tests.**

No code this time: the place to start is `handle`. When you're done, try it in the terminals too.

```text
cmake --build chat/build
./chat/build/chat_tests
```

```hints
nudge: In `handle`, follow what happens to a frame from a client that already has a name. Where does it go, and who receives it?
concept: `/who` has to be recognised before that frame reaches `broadcast`, and answered with `send_to`, which writes to one client only. The names come from `clients_`, which is already in join order, because new clients are added with `push_back` and removed with `erase`.
shape: In the branch for a client that has a name: if the frame is `/who`, build the list by looping over `clients_`, skipping any client whose name is still empty and putting `", "` between names. Send `"online: " + names` to this client, and `return` before the broadcast. Joining shows the same list being built.
```

```cpp file=chat/chat_server.cpp
#include "chat_server.h"

#include <cstddef>
#include <string_view>
#include <utility>

#include "poller.h"
#include "tcp.h"

ChatServer::ChatServer() : listener_(net::listen_loopback()) {}

std::uint16_t ChatServer::port() const
{
    return net::local_port(listener_);
}

void ChatServer::stop()
{
    stopping_ = true;
}

void ChatServer::run()
{
    while (!stopping_) {
        // Watch the listener, then every client, in that order.
        std::vector<net::PollFd> fds;
        fds.push_back(net::watch(listener_));
        for (const Client& c : clients_)
            fds.push_back(net::watch(c.socket));

        // Wake up at least every 50 ms to notice stop().
        if (net::poll(fds.data(), fds.size(), 50) <= 0)
            continue;

        // fds[i + 1] belongs to clients_[i]. Read before accepting:
        // accept_new adds to clients_.
        for (std::size_t i = 0; i < fds.size() - 1; ++i) {
            if (fds[i + 1].revents != 0)
                read_from(clients_[i]);
        }
        remove_dead();
        if (fds[0].revents != 0)
            accept_new();
    }
}

void ChatServer::accept_new()
{
    Client client;
    client.socket = net::accept_client(listener_);
    clients_.push_back(std::move(client));
}

void ChatServer::read_from(Client& client)
{
    if (!client.alive)
        return;   // a failed send already marked it
    char buffer[4096];
    long got = net::recv_some(client.socket, buffer, sizeof buffer);
    if (got <= 0) {
        client.alive = false;   // closed, or failed
        return;
    }
    client.decoder.feed({buffer, static_cast<std::size_t>(got)});
    while (auto frame = client.decoder.next())
        handle(client, *frame);
    if (client.decoder.broken())
        client.alive = false;
}

void ChatServer::handle(Client& client, const std::string& frame)
{
    if (client.name.empty()) {
        client.name = frame;
        send_to(client, "welcome " + frame);
        broadcast("* " + frame + " joined", client);
    } else if (frame == "/who") {
        std::string names;
        for (const Client& c : clients_) {
            if (!c.name.empty())
                names += (names.empty() ? "" : ", ") + c.name;
        }
        send_to(client, "online: " + names);
    } else {
        broadcast(client.name + ": " + frame, client);
    }
}

void ChatServer::remove_dead()
{
    for (std::size_t i = 0; i < clients_.size();) {
        if (clients_[i].alive) {
            ++i;
            continue;
        }
        Client gone = std::move(clients_[i]);
        clients_.erase(clients_.begin() + static_cast<long>(i));
        if (!gone.name.empty())
            broadcast("* " + gone.name + " left", gone);
        i = 0;   // that broadcast may have found another dead client
    }
}

void ChatServer::send_to(Client& client, const std::string& text)
{
    if (client.alive && !net::send_frame(client.socket, text))
        client.alive = false;
}

void ChatServer::broadcast(const std::string& text, const Client& except)
{
    for (Client& c : clients_) {
        if (&c != &except && !c.name.empty())
            send_to(c, text);
    }
}
```

```check
run "cmake --build chat/build"
tests "./chat/build/chat_tests" require="who_lists_everyone_in_join_order who_is_answered_privately who_forgets_people_who_left a_client_without_a_name_is_not_listed" timeout=90 -- In handle, check for "/who" before broadcasting, and answer with send_to. Skip clients whose name is still empty.
```
