"""Part 1 of NLP Studio: text as data. Plain Python, no libraries except re.

Every function here is one a lesson asks you to write yourself first; this file is the
reference answer the lessons quote line by line.
"""
import re


def utf8_bytes(text):
    """The bytes UTF-8 stores for the text, as a list of numbers from 0 to 255."""
    return list(text.encode("utf-8"))


def count(items):
    """How many times each item appears: {item: number of times}."""
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts


def split_words(text):
    """Split on whitespace by hand: the same answer as Python's built-in split with no arguments."""
    words = []
    current = ""
    for ch in text:
        if ch.isspace():
            if current:
                words.append(current)
                current = ""
        else:
            current += ch
    if current:
        words.append(current)
    return words


def char_kind(ch):
    """Which of three kinds a character is: part of a word, a space, or punctuation."""
    if ch.isalnum() or ch == "_":
        return "word"
    if ch.isspace():
        return "space"
    return "punct"


def tokenize(text):
    """Words stay together, every punctuation mark is a token of its own, spaces are dropped."""
    tokens = []
    current = ""
    for ch in text:
        kind = char_kind(ch)
        if kind == "word":
            current += ch
            continue
        if current:
            tokens.append(current)
            current = ""
        if kind == "punct":
            tokens.append(ch)
    if current:
        tokens.append(current)
    return tokens


TOKEN_PATTERN = r"\w+|[^\w\s]"


def tokenize_regex(text):
    """The same tokenizer as one regular expression."""
    return re.findall(TOKEN_PATTERN, text)


def word_counts(text):
    """Count the words of a text: tokenized, lower-cased, punctuation left out."""
    words = [t.lower() for t in tokenize(text) if char_kind(t[0]) == "word"]
    return count(words)


def rank_table(counts):
    """(rank, word, count) rows, most frequent first; ties in alphabetical order."""
    ordered = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return [(rank, word, n) for rank, (word, n) in enumerate(ordered, start=1)]


def split_sentences_naive(text):
    """End a sentence at every . ! or ? (it breaks on "Mr." and "3.50")."""
    sentences = []
    start = 0
    for i, ch in enumerate(text):
        if ch in ".!?":
            sentence = text[start:i + 1].strip()
            if sentence:
                sentences.append(sentence)
            start = i + 1
    rest = text[start:].strip()
    if rest:
        sentences.append(rest)
    return sentences


ABBREVIATIONS = {"mr", "mrs", "ms", "dr", "st", "vs", "etc", "e.g", "i.e"}


def last_word(text, i):
    """The characters just before position i, back to the previous space."""
    j = i
    while j > 0 and not text[j - 1].isspace():
        j -= 1
    return text[j:i]


def split_sentences(text):
    """End a sentence at . ! or ? only when a space or the end follows, and not after an abbreviation."""
    sentences = []
    start = 0
    for i, ch in enumerate(text):
        if ch not in ".!?":
            continue
        at_end = i + 1 == len(text)
        if not at_end and not text[i + 1].isspace():
            continue
        if ch == "." and last_word(text, i).lower() in ABBREVIATIONS:
            continue
        sentence = text[start:i + 1].strip()
        if sentence:
            sentences.append(sentence)
        start = i + 1
    rest = text[start:].strip()
    if rest:
        sentences.append(rest)
    return sentences
