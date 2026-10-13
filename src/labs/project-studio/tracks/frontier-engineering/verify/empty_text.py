# Lesson 1.5's prediction: what happens when analyse is given a text with no words?
from frontier.text import analyse

try:
    analyse("")
    print("It returns a TextStats full of zeros")
except Exception as error:
    print(type(error).__name__)
