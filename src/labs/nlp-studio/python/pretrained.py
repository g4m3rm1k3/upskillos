"""Part 7 of NLP Studio: the ideas inside real pre-trained models, written out small. GPT-2's
byte-level symbols, mean pooling for sentence embeddings, the ChatML chat template, finding the
facts for a question and building a grounded prompt, and LoRA as one function. The models
themselves (the GPT-2 tokenizer, MiniLM, SmolLM2) run in the page with transformers.js.
"""
import math


def bytes_to_unicode():
    """GPT-2's table from each of the 256 byte values to a printable character. Bytes that are
    already printable keep their own character; the rest (space, control codes, ...) get one
    from 256 upwards. That is why a space shows up as Ġ (256 + 32) in GPT-2's tokens."""
    bs = list(range(ord("!"), ord("~") + 1)) + list(range(ord("¡"), ord("¬") + 1)) + list(range(ord("®"), ord("ÿ") + 1))
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b)
            cs.append(256 + n)
            n += 1
    return {b: chr(c) for b, c in zip(bs, cs)}


def byte_symbols(text):
    """The text as GPT-2 sees it before any merge: its UTF-8 bytes, each as one printable symbol."""
    table = bytes_to_unicode()
    return "".join(table[b] for b in text.encode("utf-8"))


def mean_pool(token_vectors, mask):
    """One vector for a sentence: the average of its tokens' vectors, counting only real tokens (mask 1)."""
    total = sum(mask)
    return [sum(v[d] * m for v, m in zip(token_vectors, mask)) / total for d in range(len(token_vectors[0]))]


def normalize(v):
    """Divide by the length, so the dot product of two normalized vectors is their cosine."""
    size = math.sqrt(sum(x * x for x in v))
    return [x / size for x in v] if size else v


def chat_template(messages, add_generation_prompt=True):
    """ChatML, the format SmolLM2 was trained on: each message between <|im_start|>role and
    <|im_end|>, then <|im_start|>assistant to say "the assistant speaks now"."""
    text = "".join("<|im_start|>" + m["role"] + "\n" + m["content"] + "<|im_end|>\n" for m in messages)
    if add_generation_prompt:
        text += "<|im_start|>assistant\n"
    return text


FACTS = [
    "Monday to Friday the shop is open from nine to six.",
    "On Saturday the shop is open from nine to five.",
    "On Sunday the shop is open from ten to four.",
    "A basic service costs 40 pounds and takes one day.",
    "We repair chains, brakes, gears, wheels and punctures.",
    "Orders ship the next working day; the tracking link is in the confirmation email.",
    "We sell bikes, helmets, lights and locks. We do not sell food.",
]


def top_facts(question_vector, fact_vectors, k=2):
    """The k facts most similar to the question (normalized vectors: the dot product is the cosine),
    as (score, index), best first; ties go to the earlier fact."""
    scores = [(sum(a * b for a, b in zip(question_vector, f)), i) for i, f in enumerate(fact_vectors)]
    return sorted(scores, key=lambda pair: (-pair[0], pair[1]))[:k]


def grounded_messages(facts, question):
    """The chat for a grounded answer: the facts in a system message, then the question."""
    rules = "You are the help desk of a bike shop. Answer in one short sentence using only these facts. If they do not answer the question, say you don't know."
    return [{"role": "system", "content": rules + "\n" + "\n".join("- " + f for f in facts)},
            {"role": "user", "content": question}]


def lora_matmul(x, w, a, b, scale=1.0):
    """x W + scale (x A) B: a frozen weight W plus a low-rank change, without ever building A B."""
    xw = [[sum(row[r] * w[r][j] for r in range(len(w))) for j in range(len(w[0]))] for row in x]
    xa = [[sum(row[r] * a[r][j] for r in range(len(a))) for j in range(len(a[0]))] for row in x]
    xab = [[sum(row[r] * b[r][j] for r in range(len(b))) for j in range(len(b[0]))] for row in xa]
    return [[p + scale * q for p, q in zip(r1, r2)] for r1, r2 in zip(xw, xab)]
