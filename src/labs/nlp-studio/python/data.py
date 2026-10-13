"""Data for Part 3, written for this lab: short messages labelled spam or ham (not spam), and
the intents of Bot 2, a help desk for a bike shop. engine/data.js holds the same data for the
page; a test checks that the two match.
"""

MESSAGES = [
    ("WIN a free phone now, click the link to claim your prize", "spam"),
    ("Are we still meeting for lunch tomorrow?", "ham"),
    ("Congratulations! You have won a cash prize, call now", "spam"),
    ("Can you pick up milk on the way home", "ham"),
    ("URGENT: your account is locked, verify your password at this link", "spam"),
    ("Running ten minutes late, sorry", "ham"),
    ("Claim your free gift card today, limited offer", "spam"),
    ("Thanks for the notes from the meeting", "ham"),
    ("You are selected for a cash reward, reply YES to claim", "spam"),
    ("What time does the film start tonight?", "ham"),
    ("Cheap loans approved in minutes, no credit check, click now", "spam"),
    ("Happy birthday! Hope you have a great day", "ham"),
    ("Your parcel is waiting, pay the delivery fee at this link", "spam"),
    ("I left my keys at your place, can I come by later?", "ham"),
    ("Exclusive deal: win a holiday, text WIN to claim", "spam"),
    ("The train is delayed, see you at the station", "ham"),
    ("Final notice: claim your prize before midnight", "spam"),
    ("Did you finish the report for Monday?", "ham"),
    ("Earn cash from home, free sign up, click the link", "spam"),
    ("Dinner is at seven, bring the salad please", "ham"),
    ("You have been chosen to win a free phone, call now", "spam"),
    ("Can we move the call to tomorrow morning?", "ham"),
    ("Act now: free prize waiting, verify your details at the link", "spam"),
    ("Good luck with the exam today", "ham"),
    ("Your account will be closed, click here to verify now", "spam"),
    ("Let me know when you get home safe", "ham"),
    ("Win cash every week, reply to claim your free entry", "spam"),
    ("Is the meeting still in room four?", "ham"),
    ("Limited offer: free holiday for the first ten callers", "spam"),
    ("I will call you after work", "ham"),
    ("Claim your reward now, your free gift is waiting", "spam"),
    ("Can you send me the photos from the weekend?", "ham"),
    ("Congratulations, you won! Click the link to collect your cash", "spam"),
    ("See you at the match on Saturday", "ham"),
    ("Free entry to win a car, text now", "spam"),
    ("Don't forget mum's dinner on Sunday", "ham"),
    ("Your password expires today, verify at this link now", "spam"),
    ("Shall we take the bikes to the park later?", "ham"),
    ("You are a winner! Call now to claim your free prize", "spam"),
    ("The plumber is coming at nine tomorrow", "ham"),
]

INTENTS = {
    "greeting": {
        "examples": ["hello", "hi there", "good morning", "hey", "hello is anyone there"],
        "reply": "Hello! Welcome to the bike shop help desk. How can I help?",
    },
    "hours": {
        "examples": ["when are you open", "what are your opening hours", "are you open on sunday", "what time do you close", "opening times please"],
        "reply": "We're open 9am to 6pm, Monday to Saturday, and 10am to 4pm on Sunday.",
    },
    "repair": {
        "examples": ["my bike needs fixing", "can you repair a flat tyre", "how much is a service", "my brakes are squeaking", "do you fix gears"],
        "reply": "Bring the bike in any time we're open. A basic service is £40 and most repairs take a day.",
    },
    "order": {
        "examples": ["where is my order", "has my order shipped", "track my delivery", "my parcel has not arrived", "order status please"],
        "reply": "You can track your order with the link in your confirmation email. Tell me the order number if it's late.",
    },
    "thanks": {
        "examples": ["thank you", "thanks a lot", "cheers", "that helps thanks", "great thank you"],
        "reply": "You're welcome!",
    },
    "goodbye": {
        "examples": ["bye", "goodbye", "see you later", "that is all bye", "have a nice day"],
        "reply": "Goodbye, and happy riding!",
    },
}
