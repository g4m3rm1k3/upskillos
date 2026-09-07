// cpp-patterns — Lesson 13: std::fstream and Binary I/O
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 13 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-13-std-fstream-and-binary-i-o',
  slug: 'std-fstream-and-binary-i-o',
  chapter: 5,
  order: 1,
  title: 'std::fstream and Binary I/O',
  subtitle: 'I/O',
  tags: ['text-mode', 'binary-mode', 'stream-position-indicator', 'resource-acquisition-is-initialization-raii', 'type-aliasing-via-cast'],

  hook: {
    question: 'What is "std::fstream and Binary I/O", and why does it matter?',
    realWorldContext: 'You will build a series of small, isolated programs that write and read raw memory directly to and from a file on disk, sidestepping C++\'s standard text-formatting streams. You will learn how to bypass string conversion to save structured data as exact byte copies, how to navigate to specific offsets within a file without reading the entire contents, and how the Resource Acquisition Is Initialization (RAII) pattern guarantees file handles are safely released even when errors interrupt the program. All code in this lesson is throwaway and will be discarded once the concepts are proven.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Unformatted Binary Output and Input, Stream Positioning (Seeking), File Handles and RAII.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Text Mode:** the default behavior of C++ file streams where newline characters are automatically translated between the program\'s internal representation (\\n) and the operating system\'s expected line endings (like \\r\\n on Windows) during read and write operations. It exists to make plain text files portable across platforms, but it silently corrupts non-text data by altering bytes that happen to match newline ASCII values.\n- **Binary Mode:** a file stream mode that disables all automatic character translation. It exists so that exactly the bytes requested for writing are written to the disk, and exactly the bytes on disk are read into memory, which is strictly required when saving raw memory structures, images, or custom data formats.\n- **Stream Position Indicator:** an internal cursor maintained by the operating system for an open file, tracking the exact byte offset where the next read or write will occur. It exists so that sequential operations naturally advance through the file, and so that random access can be achieved by moving the cursor before an operation.\n- **Resource Acquisition Is Initialization (RAII):** a C++ design pattern where a resource (like an open file handle) is tied directly to the lifespan of a local object. It exists to guarantee that resources are cleanly released when the object goes out of scope, whether by normal return or because an exception was thrown, preventing resource leaks without requiring manual cleanup code.\n- **Type Aliasing (via Cast):** the act of telling the compiler to treat a pointer to one type of data as if it were a pointer to a different type. In binary I/O, it exists specifically to view structured types (like an int or a struct) as a flat array of raw char bytes so they can be written to disk byte-by-byte.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::ofstream:** An output file stream class that writes data from the program to a file on disk.\n- **std::ifstream:** An input file stream class that reads data from a file on disk into the program.\n- **std::ios::binary:** A stream open mode flag.\n- **std::ostream::write:** An unformatted output function.\n- **std::istream::read:** An unformatted input function.\n- **reinterpret_cast:** A C++ cast operator that performs low-level reinterpretation of bit patterns.\n- **std::istream::tellg:** A function that reports the stream\'s current position indicator.\n- **sizeof:** A compile-time operator that computes the size of a type or object in bytes.\n- **std::runtime_error:** A standard exception class for errors that can only be detected at runtime.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'To process a structured binary file, we open a `std::ifstream` with `std::ios::binary` which immediately locks the file and relies on RAII to ensure it will close later. We use `seekg` to jump the internal cursor directly to the relevant byte offset. We then use `read` combined with `reinterpret_cast<char*>` to pull the exact raw memory footprint off the disk into a typed C++ variable, safely bypassing text formatting and ensuring no resources are leaked when the function finishes.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you remove `std::ios::binary` when writing the integer `10`, and your system writes newline translations, the raw bytes written might silently mutate from `0A 00 00 00` to `0D 0A 00 00 00` on Windows, corrupting the integer so that reading it back produces complete garbage data. If you omit RAII practices and rely on manual `close()` calls, any unhandled error will permanently lock the file.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Write an array of 5 floating-point numbers to a file using `write`.\n- Use `seekp` (seek put) to jump the write cursor to the 3rd float\'s position and overwrite it with a new value without modifying the rest of the file.\n- Read the file back to verify the specific modification worked.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [x] Raw memory can be dumped to disk without text translation.\n- [x] The read cursor can be mathematically repositioned for O(1) random access.\n- [x] File resources are guaranteed to release on error via RAII.\n- `git commit -m "Prove binary I/O and RAII file handling mechanics"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 13: std::fstream and Binary I/O',
        caption: 'std::fstream and Binary I/O',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Unformatted Binary Output and Input',
              prose: [
                'When we use the standard `<<` and `>>` operators with file streams, C++ formats the data as human-readable text. If we output the integer `12345`, C++ writes the five ASCII characters `\'1\'`, `\'2\'`, `\'3\'`, `\'4\'`, `\'5\'` (5 bytes). Furthermore, in text mode, the operating system silently translates newline characters, mutating the data stream. When saving exact memory structures — like an image format, an audio file, or a densely packed database record — we cannot afford translation or string conversion. We must dump the exact literal bytes from RAM directly to the hard drive, and read them back identically.',
                '## First, In Isolation',
                '```cpp\n#include <fstream>\n#include <iostream>\n\nvoid write_raw_int() {\n    int value_to_write = 12345;\n    std::ofstream out_file("data.bin", std::ios::binary);\n    out_file.write(reinterpret_cast<char*>(&value_to_write), sizeof(value_to_write));\n    out_file.close();\n\n    int read_value = 0;\n    std::ifstream in_file("data.bin", std::ios::binary);\n    in_file.read(reinterpret_cast<char*>(&read_value), sizeof(read_value));\n    \n    std::cout << "Read value: " << read_value << "\\n";\n}\n\nint main() {\n    write_raw_int();\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `int` — the standard 32-bit integer type.\n- `original` — the local variable storing our integer value.\n- `= 8675309;` — the assignment operator and the numeric literal value being assigned.\n- `std::ofstream` — the standard output file stream class. It manages the operating system file handle and provides the interface for pushing data to disk.\n- `out` — the local variable name for our output stream instance.\n- `("raw.bin", ...)` — the constructor arguments. `"raw.bin"` is the target file name.\n- `std::ios::binary` — a stream open mode flag. It explicitly disables the default text mode behavior, ensuring that if our raw data happens to contain a byte that matches the ASCII newline character, the operating system will not silently mutate it into a `\\r\\n` sequence.\n- `out.write(...)` — an unformatted output method. Unlike the `<<` operator which converts numbers to text strings, `write` takes a raw memory address and a byte count, and blindly copies those exact bits to the file.\n- `reinterpret_cast<char*>` — a low-level C++ cast operator that tells the compiler to treat a pointer of one type as a pointer to another completely unrelated type. Here, it is the mechanism that allows us to view structured data as a flat array of bytes.\n- `(&original)` — the memory address of our integer variable. We must pass a pointer, not the value itself, because `write` needs to know where in memory the bytes live.\n- `sizeof(original)` — a compile-time operator that calculates the exact number of bytes the type `int` occupies (typically 4 bytes). We pass this to `write` so it knows exactly how many bytes to pull from memory starting at the provided pointer.',
                '**CS lens.** This is the concept of **Serialization**. Serialization is the process of translating complex, structured data in active memory into a flat, sequential format that can be stored or transmitted, and later reconstructed identically. Also recognized in: network packet construction, saving game states, marshaling data between processes, GPU texture uploads.',
                '**SE lens.** The design principle here is **Type Punning vs. Safety**. C++\'s type system strongly resists letting you treat an `int` as if it were a `char`. By forcing you to use `reinterpret_cast`, the language makes the violation explicit and searchable. The alternative — allowing any pointer to be silently passed to a byte-writing function — would lead to catastrophic silent errors where developers accidentally pass values instead of pointers, or pointers to the wrong structures. The tradeoff is verbosity: binary I/O in C++ requires explicitly stating "I know this is an integer, but I am intentionally bypassing the type system to read its raw bytes."'
              ],
              typeIt: true,
              solution: 'int original = 8675309;\nstd::ofstream out("raw.bin", std::ios::binary);\nout.write(reinterpret_cast<char*>(&original), sizeof(original));',
              expectedOutput: '(No terminal output, but a 4-byte file named \'raw.bin\' is created on disk)',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Stream Positioning (Seeking)',
              prose: [
                'When a file is opened, the operating system maintains a hidden cursor that tracks exactly where the next read or write will occur. By default, every operation advances this cursor sequentially. If a file contains one million integers and we only want to read the 500,000th one, reading the first 499,999 integers just to advance the cursor is an unacceptable waste of time and memory. We need to tell the operating system to move the cursor directly to a specific byte offset.',
                '## First, In Isolation',
                '```cpp\n#include <fstream>\n#include <iostream>\n\nvoid demonstrate_seek() {\n    // Write three integers\n    std::ofstream out("array.bin", std::ios::binary);\n    int data[3] = {10, 20, 30};\n    out.write(reinterpret_cast<char*>(data), sizeof(data));\n    out.close();\n\n    std::ifstream in("array.bin", std::ios::binary);\n    \n    // Seek to the end and get the file size\n    in.seekg(0, std::ios::end);\n    std::streampos size = in.tellg();\n    std::cout << "File size: " << size << " bytes\\n";\n    \n    // Jump past the first two integers (2 * sizeof(int) bytes) from the beginning\n    in.seekg(2 * sizeof(int), std::ios::beg);\n    \n    int read_value = 0;\n    in.read(reinterpret_cast<char*>(&read_value), sizeof(read_value));\n    \n    std::cout << "Jumped to read value: " << read_value << "\\n";\n}\n\nint main() {\n    demonstrate_seek();\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `std::ifstream` — the standard input file stream class. It provides the interface for pulling data from a file on disk into memory.\n- `in` — the local variable name for the input stream.\n- `("array.bin", std::ios::binary)` — constructor arguments opening the file named `array.bin` in binary mode to prevent text translation.\n- `in.seekg(...)` — the stream method that repositions the read cursor ("seek get"). It directly commands the operating system to change the file descriptor\'s byte offset.\n- `0` — the offset value for the seek operation. Here, zero bytes away from the chosen anchor point.\n- `std::ios::end` — a standard constant indicating the absolute end of the file. Passed as the second argument to `seekg`, it acts as the anchor point.\n- `std::streampos` — the specific return type of stream positioning functions, capable of holding file sizes much larger than a standard integer.\n- `file_size` — the variable storing the returned size in bytes.\n- `in.tellg()` — "tell get". A method that returns the read cursor\'s current byte offset from the start of the file. Because we just moved the cursor to the exact end, querying the cursor\'s location effectively reveals the total size of the file.\n- `in.seekg(0, std::ios::beg)` — a subsequent call to reposition the cursor. Moving it `0` bytes from the beginning (`std::ios::beg`) acts as a reset, ensuring any upcoming `in.read()` calls start cleanly at the first byte.',
                '**CS lens.** This is the concept of **Random Access**. Random access means the time it takes to reach an element is constant, regardless of its position in the dataset. Also recognized in: RAM (Random Access Memory) addressing, database index lookups, seeking in a video player, jumping to a specific sector on a hard drive.',
                '**SE lens.** The design principle here is **O(1) Time Complexity via Pointer Arithmetic**. The alternative — reading every byte sequentially until the target is found, or reading the entire file into a buffer to measure its length — is an O(N) operation, which degrades fatally as the file size grows. By commanding the operating system to modify its internal offset cursor mathematically, the software can jump anywhere instantly. The cost is inflexibility: if records had variable lengths (like arbitrary strings), mathematical seeking would be impossible, and we would be forced to parse the file sequentially or build a separate lookup index.'
              ],
              typeIt: true,
              solution: 'std::ifstream in("array.bin", std::ios::binary);\nin.seekg(0, std::ios::end);\nstd::streampos file_size = in.tellg();\nin.seekg(0, std::ios::beg);',
              expectedOutput: '(No terminal output, but the program safely measures the file and resets the cursor)',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'File Handles and RAII',
              prose: [
                'When a program opens a file, the operating system allocates a file handle — a limited, system-wide resource that locks the file to prevent conflicts. If the program fails to release that handle, the file remains locked, preventing other programs from accessing it and eventually exhausting the system\'s handle pool. If we manually call `file.close()` at the end of our function, everything seems fine — until an exception is thrown halfway through. If an exception interrupts the execution path, the code jumps directly to the nearest `catch` block, skipping our manual `close()` call entirely, and permanently leaking the file handle.',
                '## First, In Isolation',
                '```cpp\n#include <fstream>\n#include <iostream>\n#include <stdexcept>\n\nvoid dangerous_operation() {\n    std::ofstream out("safe.txt");\n    std::cout << "File opened.\\n";\n    \n    // An error occurs before we can ever call out.close()\n    throw std::runtime_error("Simulated catastrophic failure");\n    \n    out.close(); // This line is permanently unreachable\n}\n\nint main() {\n    try {\n        dangerous_operation();\n    } catch (const std::exception& e) {\n        std::cout << "Caught exception: " << e.what() << "\\n";\n    }\n    \n    // Prove the file is closed by successfully opening it again\n    std::ofstream check("safe.txt");\n    if (check.is_open()) {\n        std::cout << "File was successfully released and reopened!\\n";\n    }\n    \n    return 0;\n}\n```',
                '## How the Code Works',
                '- `void` — the return type indicating `process_file` returns no value.\n- `process_file()` — the function declaration.\n- `std::ifstream` — the standard input file stream class.\n- `in` — our local file stream object. When this line runs, the object is constructed on the stack, and its constructor immediately asks the operating system for a file handle. This is the "Acquisition Is Initialization" part of RAII.\n- `("data.bin", std::ios::binary)` — constructor arguments opening the file named `data.bin` in binary mode to prevent text translation.\n- `if` — the standard conditional statement.\n- `(!in)` — the logical NOT operator applied to the stream object. The stream class overloads this operator to evaluate to true if the file failed to open (e.g., the file does not exist).\n- `throw` — the C++ keyword that immediately halts current execution and raises an exception up the call stack, looking for a matching `catch` block.\n- `std::runtime_error(...)` — a standard exception class representing an error that can only be detected while the program is running.\n- **Hidden behavior:** When `process_file` ends — either by returning normally or by throwing an exception — the local object `in` goes out of scope. When a C++ object goes out of scope, the compiler automatically invokes its destructor. The destructor for `std::ifstream` contains the hardcoded instruction to release the operating system file handle. This guarantees the resource is freed no matter how the function exits.\nExecution trace for the exception path:\n- `std::ifstream in("data.bin", std::ios::binary)` — the object is created on the stack and acquires the file handle.\n- `throw std::runtime_error(...)` — the normal control flow is violently interrupted.\n- *Stack Unwinding* — before jumping to the `catch` block, C++ destroys all local objects in the aborted scope. The `in` object\'s destructor fires, executing an automatic `close()` and safely releasing the file handle.',
                '**CS lens.** This is the concept of **Deterministic Finalization**. Unlike garbage-collected languages where cleanup happens at some unknown future time when memory is low, C++ guarantees that destructors run at the exact, mathematically predictable moment an object goes out of scope. Also recognized in: database transaction rollbacks on failure, releasing mutex locks, closing network sockets.',
                '**SE lens.** The design principle here is **Resource Acquisition Is Initialization (RAII)**. The alternative — relying on the programmer to manually write `close()` or `release()` on every possible exit path, including error states — is a proven mathematical impossibility in large systems; humans will inevitably forget one. By tying the resource\'s lifespan strictly to the automatic scoping rules of the language, the compiler enforces the cleanup automatically. The tradeoff is that classes managing resources must be carefully designed with proper destructors, but the benefit is complete immunity to resource leaks even during catastrophic failures.'
              ],
              typeIt: true,
              solution: 'void process_file() {\n    std::ifstream in("data.bin", std::ios::binary);\n    if (!in) {\n        throw std::runtime_error("File not found");\n    }\n    // No in.close() is written here.\n}',
              expectedOutput: '(No output, program exits cleanly having safely managed the file resource)',
              code: '',
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: { prose: [], callouts: [], visualizations: [] },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If the simulated output doesn\'t match what you expected, re-read the reference code line by line — the walkthrough above explains exactly what each line does.',
      'Compile errors in real C++ are informative — read the first error the compiler reports, not the last; later errors are often just fallout from the first one.',
    ],
    futureLinks: [
      'Next lesson: std::filesystem.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Type Aliasing (via Cast)"?',
      options: [
        'the act of telling the compiler to treat a pointer to one type of data as if it were a pointer to a different type. In binary I/O, it exists specifically to view structured types (like an int or a struct) as a flat array of raw char bytes so they can be written to disk byte-by-byte.',
        'a C++ design pattern where a resource (like an open file handle) is tied directly to the lifespan of a local object. It exists to guarantee that resources are cleanly released when the object goes out of scope, whether by normal return or because an exception was thrown, preventing resource leaks without requiring manual cleanup code.',
        'an internal cursor maintained by the operating system for an open file, tracking the exact byte offset where the next read or write will occur. It exists so that sequential operations naturally advance through the file, and so that random access can be achieved by moving the cursor before an operation.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Stream Position Indicator"?',
      options: [
        'an internal cursor maintained by the operating system for an open file, tracking the exact byte offset where the next read or write will occur. It exists so that sequential operations naturally advance through the file, and so that random access can be achieved by moving the cursor before an operation.',
        'the act of telling the compiler to treat a pointer to one type of data as if it were a pointer to a different type. In binary I/O, it exists specifically to view structured types (like an int or a struct) as a flat array of raw char bytes so they can be written to disk byte-by-byte.',
        'a C++ design pattern where a resource (like an open file handle) is tied directly to the lifespan of a local object. It exists to guarantee that resources are cleanly released when the object goes out of scope, whether by normal return or because an exception was thrown, preventing resource leaks without requiring manual cleanup code.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Binary Mode"?',
      options: [
        'a file stream mode that disables all automatic character translation. It exists so that exactly the bytes requested for writing are written to the disk, and exactly the bytes on disk are read into memory, which is strictly required when saving raw memory structures, images, or custom data formats.',
        'the act of telling the compiler to treat a pointer to one type of data as if it were a pointer to a different type. In binary I/O, it exists specifically to view structured types (like an int or a struct) as a flat array of raw char bytes so they can be written to disk byte-by-byte.',
        'the default behavior of C++ file streams where newline characters are automatically translated between the program\'s internal representation (\\n) and the operating system\'s expected line endings (like \\r\\n on Windows) during read and write operations. It exists to make plain text files portable across platforms, but it silently corrupts non-text data by altering bytes that happen to match newline ASCII values.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Text Mode"?',
      options: [
        'the default behavior of C++ file streams where newline characters are automatically translated between the program\'s internal representation (\\n) and the operating system\'s expected line endings (like \\r\\n on Windows) during read and write operations. It exists to make plain text files portable across platforms, but it silently corrupts non-text data by altering bytes that happen to match newline ASCII values.',
        'a file stream mode that disables all automatic character translation. It exists so that exactly the bytes requested for writing are written to the disk, and exactly the bytes on disk are read into memory, which is strictly required when saving raw memory structures, images, or custom data formats.',
        'the act of telling the compiler to treat a pointer to one type of data as if it were a pointer to a different type. In binary I/O, it exists specifically to view structured types (like an int or a struct) as a flat array of raw char bytes so they can be written to disk byte-by-byte.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Text Mode** — the default behavior of C++ file streams where newline characters are automatically translated between the program\'s internal representation (\\n) and the operating system\'s expected line endings (like \\r\\n on Windows) during read and write operations. It exists to make plain text files portable across platforms, but it silently corrupts non-text data by altering bytes that happen to match newline ASCII values.',
    '**Binary Mode** — a file stream mode that disables all automatic character translation. It exists so that exactly the bytes requested for writing are written to the disk, and exactly the bytes on disk are read into memory, which is strictly required when saving raw memory structures, images, or custom data formats.',
    '**Stream Position Indicator** — an internal cursor maintained by the operating system for an open file, tracking the exact byte offset where the next read or write will occur. It exists so that sequential operations naturally advance through the file, and so that random access can be achieved by moving the cursor before an operation.',
    '**Resource Acquisition Is Initialization (RAII)** — a C++ design pattern where a resource (like an open file handle) is tied directly to the lifespan of a local object. It exists to guarantee that resources are cleanly released when the object goes out of scope, whether by normal return or because an exception was thrown, preventing resource leaks without requiring manual cleanup code.',
    '**Type Aliasing (via Cast)** — the act of telling the compiler to treat a pointer to one type of data as if it were a pointer to a different type. In binary I/O, it exists specifically to view structured types (like an int or a struct) as a flat array of raw char bytes so they can be written to disk byte-by-byte.',
  ],

  checkpoints: ['read-intuition'],
}
