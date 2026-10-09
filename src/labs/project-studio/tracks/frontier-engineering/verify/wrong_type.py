# Lesson 1.3's prediction: what happens when split_words, annotated text: str, is given 5?
from frontier.text import split_words

try:
    split_words(5)
    print("It returns an empty list")
except Exception as error:
    print(type(error).__name__)
