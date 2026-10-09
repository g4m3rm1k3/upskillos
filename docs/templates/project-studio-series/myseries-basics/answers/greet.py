import sys


def greet(name):
    return f"Hello, {name}!"


def shout(name):
    return greet(name).upper()


if __name__ == "__main__":
    print(greet(sys.argv[1]))
