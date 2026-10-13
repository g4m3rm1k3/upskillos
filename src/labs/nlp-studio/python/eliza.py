"""Bot 1: a chatbot made of rules, in the style of ELIZA (Joseph Weizenbaum, 1966).

It understands nothing. It finds the first pattern that matches what you typed, turns your
words around ("my" becomes "your"), and drops them into a canned reply.
"""
import re

REFLECTIONS = {
    "i": "you", "me": "you", "my": "your", "mine": "yours", "myself": "yourself",
    "am": "are", "i'm": "you are", "i've": "you have", "i'll": "you will",
    "you": "I", "your": "my", "yours": "mine", "yourself": "myself",
    "are": "am", "you're": "I am",
}

RULES = [
    (r"i need (.*)", ["Why do you need {0}?", "Would it really help you to get {0}?"]),
    (r"i feel (.*)", ["Why do you feel {0}?", "Do you often feel {0}?"]),
    (r"i(?: am|'m) (.*)", ["How long have you been {0}?", "Why do you think you are {0}?"]),
    (r"because (.*)", ["Is that the real reason?", "What else could explain {0}?"]),
    (r"(?:hello|hi|hey)\b.*", ["Hello. What is on your mind?"]),
    (r".*\b(mother|father|family)\b.*", ["Tell me more about your {0}."]),
    (r"(.*)\?", ["Why do you ask that?", "What do you think?"]),
    (r"(.*)", ["Please tell me more.", "I see. Go on.", "How does that make you feel?"]),
]


def reflect(fragment):
    """Swap first and second person, word by word: "my job" becomes "your job"."""
    words = fragment.lower().split()
    return " ".join(REFLECTIONS.get(word, word) for word in words)


def respond(message, turn=0):
    """The reply to one message: the first rule whose pattern matches all of it."""
    text = message.lower().strip().rstrip(".!")
    for pattern, replies in RULES:
        match = re.fullmatch(pattern, text)
        if match:
            reply = replies[turn % len(replies)]
            parts = [reflect(group) for group in match.groups() if group is not None]
            return reply.format(*parts)
    return "Please go on."
