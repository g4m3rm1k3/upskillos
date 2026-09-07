// cpp-patterns — Lesson 14: std::filesystem
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 14 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-14-std-filesystem',
  slug: 'std-filesystem',
  chapter: 5,
  order: 2,
  title: 'std::filesystem',
  subtitle: 'I/O',
  tags: ['file-system', 'path', 'directory-iteration', 'file-permissions'],

  hook: {
    question: 'What is "std::filesystem", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: Safely Constructing Paths, Modifying the File System, Directory Iteration, File Status and Permissions.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **File System:** the operating system\'s mechanism for storing, organizing, and retrieving data on a disk. It abstracts the raw hardware blocks into a hierarchy of directories and files.\n- **Path:** a string-like object that identifies the location of a file or directory within the file system hierarchy. Different operating systems use different separator characters (like / or \\), making raw strings dangerous for representing paths.\n- **Directory Iteration:** the process of programmatically walking through the contents of a directory, often descending into subdirectories recursively, to discover or process files without knowing their names in advance.\n- **File Permissions:** metadata attached to a file that dictates which users or processes are allowed to read, write, or execute the file, critical for security and access control.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::filesystem::path:** A class representing a path on a file system.\n- **std::filesystem::path::preferred_separator:** A static constant character representing the host operating system\'s preferred directory separator (/ on POSIX, \\ on Windows).\n- **std::filesystem::exists:** A free function that checks if a path actually exists on disk.\n- **std::filesystem::create_directories:** A free function that creates a directory and any missing parent directories in its path.\n- **std::filesystem::remove_all:** A free function that deletes a file or a directory and all of its contents recursively.\n- **std::filesystem::recursive_directory_iterator:** An iterator class that traverses a directory and recursively descends into all its subdirectories.\n- **std::filesystem::status:** A free function that retrieves information about a file, including its type and permissions.\n- **std::filesystem::perms:** A bitmask type representing file permissions (read, write, execute for owner, group, others).\n- **std::cout:** The standard character output stream.\n- **std::ofstream:** An output file stream class.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Connect the pieces In this lesson, we traced a single conceptual path: `"workspace/logs/latest.log"`. We started by safely constructing that path string into an object so we wouldn\'t break on Windows or POSIX. Then, we instructed the OS to physically build that directory chain on the hard drive using `create_directories`. Next, we simulated not knowing the path, using `recursive_directory_iterator` to traverse the tree structure from the root until we dynamically re-discovered the file. Finally, we pulled the file\'s metadata from the OS to inspect its bitmask permissions, confirming we had read and write access, before wiping the whole tree out. What breaks without this Without `std::filesystem`, interacting with directories requires `#ifdef _WIN32` preprocessor blocks to call Windows API functions like `CreateDirectoryA` or `FindFirstFile`, and `#else` blocks to call POSIX functions like `mkdir` or `opendir`. If you forget to include a platform, or concatenate a backslash manually on a Linux build, your program will crash or write to garbage locations. Exercises 1. Modify `scan_directory` to keep a running total of the file sizes it finds. You will need to look up `fs::file_size()`. 2. Change the setup function to write out three different `.log` files in different nested folders, and modify `scan_directory` to only print the path if `entry.path().extension() == ".log"`. 3. Experiment with `fs::copy_file()` to copy `latest.log` to `backup.log` before the cleanup phase happens. Definition of done - You can construct paths using `operator/` safely. - You can create and delete nested directories. - You can iterate through a directory recursively. - You can check basic file permissions using bitwise operations. - Code is committed: `git commit -m "Add robust filesystem management patterns for cross-platform I/O"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 14: std::filesystem',
        caption: 'std::filesystem',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Safely Constructing Paths',
              prose: [
                'File paths look different depending on the operating system. Windows traditionally uses backslashes (`C:\\app\\data\\file.txt`), while Linux and macOS use forward slashes (`/var/app/data/file.txt`). If you build paths by concatenating raw strings with hardcoded slashes (`dir + "/" + filename`), your code will break or behave inconsistently on different platforms. We need a way to construct paths that automatically uses the correct semantics for the operating system it compiles on.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <filesystem>\n\nint main() {\n    std::filesystem::path root = "app_data";\n    std::filesystem::path full_path = root / "config" / "settings.ini";\n    \n    std::cout << "Path: " << full_path << "\\n";\n    std::cout << "Separator: " << (char)std::filesystem::path::preferred_separator << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <filesystem>` — includes the standard library header that provides all file system operations and classes.\n- `namespace fs = std::filesystem;` — creates a namespace alias. `std::filesystem` is long to type, so it is idiomatic C++ to alias it to `fs` to keep code readable.\n- `void display_path_info() {` — declares our function.\n- `fs::path base_dir = "workspace";` — constructs an `fs::path` object from a string literal. The compiler implicitly converts the `const char*` into a path object.\n- `fs::path target_file = base_dir / "logs" / "latest.log";` — uses the overloaded `operator/` provided by `fs::path`. This operator appends "logs" to `base_dir`, inserting the correct `preferred_separator` automatically if one isn\'t already there, and then does the same for "latest.log". It returns a new `fs::path` object.\n- `std::cout << "Target file is: " << target_file << "\\n";` — prints the path. The standard library overloads `operator<<` for `fs::path`, which automatically wraps the output in quotes on many implementations to clearly demarcate the string boundaries.\n- `target_file.filename()` — calls the `filename()` method on the path object. This parses the path and returns just the last component (the file or directory name), stripped of all parent directories.\n- `target_file.extension()` — calls the `extension()` method on the path object. This returns the suffix of the filename, starting from the last dot (inclusive), returning `".log"`.',
                '**CS lens.** The `/` operator overloading here is an implementation of the Builder or Composite pattern for strings, specifically representing a tree traversal path. By abstracting the path as an object rather than a raw string, the type system prevents accidental mis-concatenation (like double slashes `//` or missing slashes) and allows the underlying platform to handle character encoding (UTF-8 vs UTF-16) transparently.',
                '**SE lens.** Hardcoding file separators (like `\\\\` or `/`) is a classic source of technical debt when migrating code between platforms. By using `fs::path` and `operator/`, we eliminate this class of cross-platform bug entirely. The tradeoff is a slight overhead compared to raw string concatenation, but for file I/O operations, the disk access time vastly dwarfs the cost of path object construction, making the safety well worth it.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <filesystem>\n\nnamespace fs = std::filesystem;\n\nvoid display_path_info() {\n    fs::path base_dir = "workspace";\n    fs::path target_file = base_dir / "logs" / "latest.log";\n    \n    std::cout << "Target file is: " << target_file << "\\n";\n    std::cout << "Filename only: " << target_file.filename() << "\\n";\n    std::cout << "Extension: " << target_file.extension() << "\\n";\n}\n\nint main() {\n    display_path_info();\n    return 0;\n}',
              expectedOutput: 'Target file is: "workspace/logs/latest.log"\nFilename only: "latest.log"\nExtension: ".log"',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Modifying the File System',
              prose: [
                'You have a path to a file you want to write to, like `workspace/logs/latest.log`. If the `workspace/logs` directories do not already exist on disk, attempting to open a file stream (`std::ofstream`) to that path will silently fail. We need a way to check if directories exist, create them if they don\'t, and clean them up later.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <filesystem>\n\nnamespace fs = std::filesystem;\n\nint main() {\n    fs::path temp_dir = "throwaway_test_dir/subdir";\n    \n    bool created = fs::create_directories(temp_dir);\n    std::cout << "Created: " << (created ? "yes" : "no") << "\\n";\n    std::cout << "Exists: " << (fs::exists(temp_dir) ? "yes" : "no") << "\\n";\n    \n    std::uintmax_t removed = fs::remove_all("throwaway_test_dir");\n    std::cout << "Removed items: " << removed << "\\n";\n    std::cout << "Exists now: " << (fs::exists(temp_dir) ? "yes" : "no") << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `if (!fs::exists(log_dir))` — calls `fs::exists`, passing the `log_dir` path. This queries the operating system\'s file tables to see if an entry exists at that path. The logical NOT `!` means we enter the block if the directory is missing.\n- `fs::create_directories(log_dir);` — calls the free function to create the directory. Crucially, unlike the older `mkdir` system calls, `create_directories` will traverse the path and create `workspace` first, then `workspace/logs`, ensuring the whole chain exists. It returns a boolean indicating if it created anything, which we ignore here.\n- `std::ofstream file(log_file);` — opens a standard output file stream to our target file. Because we just guaranteed `log_dir` exists, this is guaranteed to succeed in creating the file (permissions notwithstanding).\n- `file << "Application started.\\n";` — writes a dummy string to the file to give it content.\n- `file.close();` — flushes and closes the file stream.\n- `if (fs::exists(log_file))` — uses `fs::exists` again, this time on a file rather than a directory. `exists` works on any file system entity.\n- `fs::remove_all(base_dir);` — calls `remove_all` on the root `workspace` path. This descends into `workspace`, deletes `logs/latest.log`, then deletes the `logs` folder, and finally deletes `workspace`. It returns the number of entities deleted.',
                '**CS lens.** The `create_directories` and `remove_all` functions represent recursive operations over a tree data structure (the file system hierarchy). Because the file system is managed by the OS kernel, these functions act as wrappers around a sequence of system calls (like `mkdir` and `rmdir` on POSIX), abstracting away the low-level tree traversal and error-handling loops required to build or dismantle a deep directory structure.',
                '**SE lens.** Checking for existence before creation (`!fs::exists`) is defensive programming. However, file systems are highly concurrent: another process could delete or create the directory in the microsecond between `fs::exists` and `fs::create_directories` (a Time-Of-Check to Time-Of-Use, or TOCTOU, race condition). For strict security or mission-critical software, you often just attempt the operation and handle the resulting error code rather than checking first. For typical application logic, checking first produces cleaner logs and is standard practice.'
              ],
              typeIt: true,
              solution: '#include <fstream>\n\nvoid setup_and_teardown() {\n    fs::path base_dir = "workspace";\n    fs::path log_dir = base_dir / "logs";\n    fs::path log_file = log_dir / "latest.log";\n\n    if (!fs::exists(log_dir)) {\n        fs::create_directories(log_dir);\n        std::cout << "Created directory structure for logs.\\n";\n    }\n\n    std::ofstream file(log_file);\n    file << "Application started.\\n";\n    file.close();\n\n    if (fs::exists(log_file)) {\n        std::cout << "Log file was successfully created.\\n";\n    }\n\n    fs::remove_all(base_dir);\n    std::cout << "Cleaned up workspace.\\n";\n}',
              expectedOutput: 'Target file is: "workspace/logs/latest.log"\nFilename only: "latest.log"\nExtension: ".log"\nCreated directory structure for logs.\nLog file was successfully created.\nCleaned up workspace.',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Directory Iteration',
              prose: [
                'If you need to find all `.log` files in a folder, or calculate the total size of a directory, you cannot hardcode the filenames because you don\'t know them. You need a way to programmatically ask the operating system for a list of everything inside a directory, including files hidden inside subdirectories.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <filesystem>\n#include <fstream>\n\nnamespace fs = std::filesystem;\n\nint main() {\n    fs::create_directories("throwaway_iter/a/b");\n    std::ofstream("throwaway_iter/file1.txt");\n    std::ofstream("throwaway_iter/a/b/file2.txt");\n\n    for (const auto& entry : fs::recursive_directory_iterator("throwaway_iter")) {\n        std::cout << entry.path() << "\\n";\n    }\n\n    fs::remove_all("throwaway_iter");\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `for (const auto& entry : fs::recursive_directory_iterator(base_dir))` — instantiates an anonymous `recursive_directory_iterator` object pointing at `base_dir`. The range-based for loop utilizes the iterator\'s `begin()` and `end()` semantics to step through every entry.\n- `const auto& entry` — declares a const reference to the loop variable. The type deduced here is `std::filesystem::directory_entry`, which acts as a cache holding both the path and pre-fetched metadata (like file type) about the entity it points to.\n- `entry.is_regular_file()` — calls a method on the `directory_entry` object. It returns `true` if the entry is a standard file (not a directory, not a symlink, not a socket).\n- `entry.path().filename()` — calls `.path()` on the entry to retrieve the underlying `fs::path` object, then chains `.filename()` to extract just the name.\n- `entry.is_directory()` — calls a method on the `directory_entry` object. It returns `true` if the entry represents a folder.',
                '**CS lens.** A file system is a Tree graph where directories are internal nodes and files are leaf nodes. `recursive_directory_iterator` implements Depth-First Search (DFS) traversal over this tree. Standard library iterators abstract away the complex stack-management usually required to implement DFS manually, letting you treat a hierarchical tree traversal exactly like you are looping over a flat array. Also recognized in: parsing Abstract Syntax Trees (ASTs), DOM node traversal in web browsers, and garbage collection reachability tracing.',
                '**SE lens.** Iterating over a file system is inherently unpredictable. A folder might contain a million files, or the user might lack permission to read a subdirectory, which would cause the iterator to throw an exception by default when it tries to enter it. Robust software must account for this by passing a `std::error_code` argument to the iterator constructor, or explicitly catching `fs::filesystem_error`, to prevent a permissions error deep in a subdirectory from crashing the entire program.'
              ],
              typeIt: true,
              solution: 'void scan_directory() {\n    fs::path base_dir = "workspace";\n    \n    std::cout << "Scanning directory: " << base_dir << "\\n";\n    for (const auto& entry : fs::recursive_directory_iterator(base_dir)) {\n        if (entry.is_regular_file()) {\n            std::cout << "File found: " << entry.path().filename() << "\\n";\n        } else if (entry.is_directory()) {\n            std::cout << "Directory found: " << entry.path().filename() << "\\n";\n        }\n    }\n}',
              expectedOutput: 'Scanning directory: "workspace"\nDirectory found: "logs"\nFile found: "latest.log"',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'File Status and Permissions',
              prose: [
                'Just because a file exists doesn\'t mean your program is allowed to write to it. Operating systems enforce permissions. If a file is marked read-only by an administrator, attempting to open it for writing will fail. We need to be able to query the OS for a file\'s permission mask before attempting operations that might be rejected.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <filesystem>\n#include <fstream>\n\nnamespace fs = std::filesystem;\n\nint main() {\n    fs::path temp = "throwaway_perms.txt";\n    std::ofstream(temp) << "test";\n    \n    fs::file_status stat = fs::status(temp);\n    fs::perms p = stat.permissions();\n    \n    bool can_write = (p & fs::perms::owner_write) != fs::perms::none;\n    std::cout << "Owner can write: " << (can_write ? "yes" : "no") << "\\n";\n    \n    fs::remove(temp);\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `fs::file_status status = fs::status(log_file);` — calls `fs::status()`, which performs a system call (like `stat` on POSIX) to fetch the metadata for `log_file`. It returns an `fs::file_status` object containing the file type and permissions.\n- `fs::perms permissions = status.permissions();` — calls `.permissions()` on the status object to extract the permission mask. `fs::perms` is a strongly-typed `enum class` designed for bitwise operations.\n- `(permissions & fs::perms::owner_read)` — uses the bitwise AND operator `&`. Because permissions are stored as a bitmask (where each bit represents a specific right, like read, write, or execute), bitwise AND isolates exactly the `owner_read` bit. If the bit is set to `1` in `permissions`, the result is non-zero.\n- `!= fs::perms::none` — compares the result of the bitwise AND against `fs::perms::none` (which is 0). If the isolated bit wasn\'t zero, it means the owner has read permission.',
                '**CS lens.** Permission bitmasks are a classic application of bitwise packing in systems programming. An entire suite of boolean flags (owner read/write/execute, group read/write/execute, other read/write/execute) is packed into a single 16-bit or 32-bit integer. This minimizes memory overhead and allows checking multiple permissions simultaneously in a single CPU instruction using bitwise math. Also recognized in: network packet headers (TCP flags like SYN/ACK), graphics processing (color channel masking), and CPU status registers.',
                '**SE lens.** While querying permissions is useful for logging and UI feedback (e.g., greying out a "Save" button), it suffers from the same Time-Of-Check to Time-Of-Use (TOCTOU) race condition as `exists()`. The permissions could change instantly after you check them. The only truly safe way to know if you can write to a file is to attempt the write operation and properly catch and handle the exception or error code it returns if it fails.'
              ],
              typeIt: true,
              solution: 'void check_permissions() {\n    fs::path log_file = "workspace/logs/latest.log";\n    \n    if (!fs::exists(log_file)) return;\n\n    fs::file_status status = fs::status(log_file);\n    fs::perms permissions = status.permissions();\n\n    std::cout << "Checking permissions for " << log_file.filename() << ":\\n";\n\n    if ((permissions & fs::perms::owner_read) != fs::perms::none) {\n        std::cout << "- Owner can read\\n";\n    }\n    if ((permissions & fs::perms::owner_write) != fs::perms::none) {\n        std::cout << "- Owner can write\\n";\n    }\n}',
              expectedOutput: 'Scanning directory: "workspace"\nDirectory found: "logs"\nFile found: "latest.log"\nChecking permissions for "latest.log":\n- Owner can read\n- Owner can write',
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
      'Next lesson: Cache-Friendly Data Layouts.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "File System"?',
      options: [
        'the process of programmatically walking through the contents of a directory, often descending into subdirectories recursively, to discover or process files without knowing their names in advance.',
        'a string-like object that identifies the location of a file or directory within the file system hierarchy. Different operating systems use different separator characters (like / or \\), making raw strings dangerous for representing paths.',
        'the operating system\'s mechanism for storing, organizing, and retrieving data on a disk. It abstracts the raw hardware blocks into a hierarchy of directories and files.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Path"?',
      options: [
        'metadata attached to a file that dictates which users or processes are allowed to read, write, or execute the file, critical for security and access control.',
        'the process of programmatically walking through the contents of a directory, often descending into subdirectories recursively, to discover or process files without knowing their names in advance.',
        'a string-like object that identifies the location of a file or directory within the file system hierarchy. Different operating systems use different separator characters (like / or \\), making raw strings dangerous for representing paths.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "File Permissions"?',
      options: [
        'metadata attached to a file that dictates which users or processes are allowed to read, write, or execute the file, critical for security and access control.',
        'a string-like object that identifies the location of a file or directory within the file system hierarchy. Different operating systems use different separator characters (like / or \\), making raw strings dangerous for representing paths.',
        'the operating system\'s mechanism for storing, organizing, and retrieving data on a disk. It abstracts the raw hardware blocks into a hierarchy of directories and files.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Directory Iteration"?',
      options: [
        'a string-like object that identifies the location of a file or directory within the file system hierarchy. Different operating systems use different separator characters (like / or \\), making raw strings dangerous for representing paths.',
        'the operating system\'s mechanism for storing, organizing, and retrieving data on a disk. It abstracts the raw hardware blocks into a hierarchy of directories and files.',
        'the process of programmatically walking through the contents of a directory, often descending into subdirectories recursively, to discover or process files without knowing their names in advance.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**File System** — the operating system\'s mechanism for storing, organizing, and retrieving data on a disk. It abstracts the raw hardware blocks into a hierarchy of directories and files.',
    '**Path** — a string-like object that identifies the location of a file or directory within the file system hierarchy. Different operating systems use different separator characters (like / or \\), making raw strings dangerous for representing paths.',
    '**Directory Iteration** — the process of programmatically walking through the contents of a directory, often descending into subdirectories recursively, to discover or process files without knowing their names in advance.',
    '**File Permissions** — metadata attached to a file that dictates which users or processes are allowed to read, write, or execute the file, critical for security and access control.',
  ],

  checkpoints: ['read-intuition'],
}
