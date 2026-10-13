# textstats.py - word stats for a text file
# usage: python textstats.py file.txt
import sys

from frontier.text import TextStats, analyse

TOP_WORDS = 10
TOP_LETTERS = 5


def format_report(stats: TextStats) -> str:
    lines = [
        "lines: " + str(stats.lines),
        "words: " + str(stats.words),
        "unique words: " + str(stats.unique_words),
        "longest word: " + stats.longest_word,
        "average word length: " + str(round(stats.average_word_length, 2)),
        "",
        "top words:",
    ]
    for word, count in stats.top_words:
        lines.append("  " + word + " " + str(count))
    lines.append("")
    lines.append("top letters:")
    for letter, count in stats.top_letters:
        lines.append("  " + letter + " " + str(count))
    return "\n".join(lines)


def print_report(path):
    try:
        with open(path) as f:
            text = f.read()
    except:
        print("couldn't read " + path)
        sys.exit()
    print(format_report(analyse(text, TOP_WORDS, TOP_LETTERS)))


def main():
    if len(sys.argv) < 2:
        print("usage: python textstats.py file.txt")
    else:
        print_report(sys.argv[1])


if __name__ == "__main__":
    main()
