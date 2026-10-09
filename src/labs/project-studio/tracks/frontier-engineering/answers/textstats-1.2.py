# textstats.py - word stats for a text file
# usage: python textstats.py file.txt
import sys

PUNCTUATION = ".,;:!?\"()'"
TOP_WORDS = 10
TOP_LETTERS = 5


def count_lines(text):
    """How many lines have something on them."""
    return sum(1 for line in text.split("\n") if line.strip())


def split_words(text):
    """The words in text: lower case, without punctuation at either end."""
    words = []
    for word in text.split():
        word = word.strip(PUNCTUATION).lower()
        if word:
            words.append(word)
    return words


def letters(text):
    """Every letter in text, lower case, in order."""
    return [c for c in text.lower() if c.isalpha()]


def tally(items):
    """How many times each item appears, in order of first appearance."""
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts


def top(counts, n):
    """The n most common items, as (item, count) pairs, most common first."""
    return sorted(counts.items(), key=lambda pair: pair[1], reverse=True)[:n]


def print_top(title, counts, n):
    print(title)
    for item, count in top(counts, n):
        print("  " + item + " " + str(count))


def print_report(path):
    try:
        f = open(path)
        text = f.read()
        f.close()
    except:
        print("couldn't read " + path)
        sys.exit()
    words = split_words(text)
    counts = tally(words)
    average = sum(len(word) for word in words) / len(words)
    print("lines: " + str(count_lines(text)))
    print("words: " + str(len(words)))
    print("unique words: " + str(len(counts)))
    print("longest word: " + max(counts, key=len))
    print("average word length: " + str(round(average, 2)))
    print()
    print_top("top words:", counts, TOP_WORDS)
    print()
    print_top("top letters:", tally(letters(text)), TOP_LETTERS)


def main():
    if len(sys.argv) < 2:
        print("usage: python textstats.py file.txt")
    else:
        print_report(sys.argv[1])


if __name__ == "__main__":
    main()
