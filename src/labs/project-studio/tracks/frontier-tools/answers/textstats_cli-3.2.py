"""The frontier-textstats command: word and letter statistics for a text file."""
import argparse
import logging
import sys

from frontier.text import TextStats, analyse

logger = logging.getLogger(__name__)


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


def parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="frontier-textstats", description="Word and letter statistics for a text file.")
    parser.add_argument("path", help="the text file to read")
    parser.add_argument("--top", type=int, default=10, help="how many of the most common words to list")
    parser.add_argument("--letters", type=int, default=5, help="how many of the most common letters to list")
    parser.add_argument("--verbose", action="store_true", help="say what the command is doing, on stderr")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(levelname)s: %(message)s")
    logger.info("reading %s", args.path)
    try:
        with open(args.path, encoding="utf-8") as f:
            text = f.read()
    except OSError as error:
        print(f"textstats: can't read {args.path}: {error.strerror}", file=sys.stderr)
        sys.exit(1)
    try:
        stats = analyse(text, args.top, args.letters)
    except ValueError as error:
        print(f"textstats: {args.path}: {error}", file=sys.stderr)
        sys.exit(1)
    logger.info("%d words, %d different", stats.words, stats.unique_words)
    if args.top > stats.unique_words:
        logger.warning("asked for the top %d words, but there are only %d different words", args.top, stats.unique_words)
    print(format_report(stats))


if __name__ == "__main__":
    main()
