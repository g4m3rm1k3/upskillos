"""Write engine/parity.json and engine/parity2.json: what the Python answers for each sample.

engine/parity.test.js checks that the JavaScript engine gives the same answers.
Run from the repository root:  python src/labs/nlp-studio/tools/make_parity.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))
import text_basics as tb  # noqa: E402
import parsing as ps  # noqa: E402
import eliza  # noqa: E402

SAMPLES = [
    "",
    "Hello, world!",
    "Hello,  world!  ",
    "Mr. Smith paid $3.50. Was it worth it? Yes!",
    "Don't stop: e.g. this, i.e. that, etc. Then the U.S. economy grew.",
    "café naïve résumé",
    "snake_case and camelCase and 42nd street",
    "Tabs\tand\nnew lines\n\nand   spaces.",
    "emoji 🙂 are one character in Python",
    "Dr. Who met St. John. They talked... a lot!!",
    "the cat sat on the mat. The cat ate. the end",
]

out = []
for text in SAMPLES:
    counts = tb.word_counts(text)
    out.append({
        "text": text,
        "utf8_bytes": tb.utf8_bytes(text),
        "chars": len(text),
        "char_counts": tb.count(text),
        "split_words": tb.split_words(text),
        "matches_str_split": tb.split_words(text) == text.split(),
        "tokenize": tb.tokenize(text),
        "tokenize_regex": tb.tokenize_regex(text),
        "word_counts": counts,
        "rank_table": [list(row) for row in tb.rank_table(counts)],
        "split_sentences_naive": tb.split_sentences_naive(text),
        "split_sentences": tb.split_sentences(text),
    })

path = os.path.join(HERE, "..", "engine", "parity.json")
with open(path, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(out, handle, ensure_ascii=False, indent=1)
    handle.write("\n")
print(f"wrote {len(out)} samples to {os.path.normpath(path)}")


# Part 2: parsing and Bot 1.
SENTENCES = [
    "i slept",
    "she saw alice",
    "the dog chased a cat",
    "i saw the man with the telescope",
    "i saw the man in the park with the telescope",
    "she walked in the park on the hill",
    "alice saw bob with a dog in the park on the hill",
    "the dog saw",
    "saw the dog",
    "the dog with",
]
MESSAGES = [
    "I need a holiday.", "i feel tired of my job", "I'm worried about you", "I am happy!",
    "Because my boss said so", "Hello there", "My mother calls me every day", "Why are you here?",
    "my dog bit me", "", "You are a machine.",
]

calls = {"n": 0}
original = ps.parse_symbol


def counted(symbol, words, i):
    calls["n"] += 1
    return original(symbol, words, i)


ps.parse_symbol = counted  # parse_sequence looks parse_symbol up by name, so recursive calls are counted too

part2 = {"sentences": [], "messages": [], "catalan": [ps.catalan(n) for n in range(10)], "heads": []}
for sentence in SENTENCES:
    words = sentence.split()
    calls["n"] = 0
    trees = ps.parse(sentence)
    n_calls = calls["n"]
    table = ps.cky(words)
    part2["sentences"].append({
        "sentence": sentence,
        "trees": json.loads(json.dumps(trees)),
        "brackets": [ps.bracket(t) for t in trees],
        "leaves": [ps.leaves(t) for t in trees],
        "dependencies": [ps.dependencies(t) for t in trees],
        "calls": n_calls,
        "chart": {f"{i},{j}": cell for (i, j), cell in table.items()},
        "count_trees": ps.count_trees(words),
    })
for heads in [[2, 0, 4, 2], [0, 1, 2], [0, 0], [2, 1], [2, 0, 5, 2, 3], [3, 0, 2, 1], []]:
    part2["heads"].append({"heads": heads, "is_tree": ps.is_tree(heads), "crossing_arcs": ps.crossing_arcs(heads)})
for k, message in enumerate(MESSAGES):
    part2["messages"].append({"message": message, "turn": k, "reply": eliza.respond(message, k),
                              "reflect": eliza.reflect(message)})

path2 = os.path.join(HERE, "..", "engine", "parity2.json")
with open(path2, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(part2, handle, ensure_ascii=False, indent=1)
    handle.write("\n")
print(f"wrote {len(SENTENCES)} sentences and {len(MESSAGES)} messages to {os.path.normpath(path2)}")


# Part 3: counting, Naive Bayes, Bot 2.
import counting as ct  # noqa: E402
import bayes  # noqa: E402
import data  # noqa: E402


def finite(x):
    """JSON has no infinity: write -inf as a string."""
    return "-inf" if x == float("-inf") else x


DOCS = ["the cat sat on the mat", "the dog sat on the log", "a cat and a dog", "cats chase mice", "the mat is red"]
CORPUS = " ".join(text for text, _ in data.MESSAGES)
corpus_words = ct.words(CORPUS)
bigrams = ct.bigram_model(corpus_words)
V = len(set(corpus_words))
doc_words = [ct.words(d) for d in DOCS]
vocab = ct.build_vocab(doc_words)
weights = ct.idf(doc_words)
nb = bayes.train_nb([(ct.words(t), l) for t, l in data.MESSAGES[:30]])
intent_model = bayes.train_intents(data.INTENTS)
TESTS = ["win a free prize now", "are we meeting tomorrow", "click the link", "see you later", "zzz qqq"]
ASKS = ["hello", "is the shop open on saturday", "my chain broke", "where is my parcel", "thanks so much", "bye then", "do you sell pizza", "what is the meaning of life"]

part3 = {
    "messages": [list(m) for m in data.MESSAGES],
    "intents": data.INTENTS,
    "words": {d: ct.words(d) for d in DOCS + ["Mr. Smith's 2 cats!"]},
    "vocab": vocab,
    "vectors": [ct.vectorize(d, vocab) for d in doc_words],
    "cosines": [[ct.cosine(ct.vectorize(a, vocab), ct.vectorize(b, vocab)) for b in doc_words] for a in doc_words],
    "ngrams": [list(g) for g in ct.ngrams(doc_words[0], 3)],
    "bigrams": bigrams,
    "probs": [[w1, w2, k, ct.next_word_prob(bigrams, w1, w2, k, V)] for w1, w2 in [("the", "link"), ("claim", "your"), ("free", "prize"), ("the", "zebra"), ("zebra", "the")] for k in (0, 1)],
    "sentence_log_probs": [[s, k, finite(ct.sentence_log_prob(bigrams, ct.words(s), k, V))] for s in ["click the link now", "claim your free prize", "the zebra won"] for k in (0, 1)],
    "greedy": {w: ct.greedy_continue(bigrams, w, 8) for w in ["claim", "the", "you", "zebra"]},
    "df": ct.document_frequency(doc_words),
    "idf": weights,
    "tfidf": [ct.tfidf_vector(d, vocab, weights) for d in doc_words],
    "search": {q: [list(p) for p in ct.search(ct.words(q), doc_words)] for q in ["cat on a mat", "dog", "red", "nothing here"]},
    "nb": nb,
    "nb_scores": {t: {l: bayes.log_score(nb, ct.words(t), l) for l in sorted(nb["docs"])} for t in TESTS},
    "nb_classify": {t: list(bayes.classify(nb, ct.words(t))) for t in TESTS},
    "evaluate": {str(n): bayes.evaluate(data.MESSAGES[:n], data.MESSAGES[-10:], "spam") for n in range(2, 31, 2)},
    "intent_k1": {m: bayes.intent_reply(bayes.train_intents(data.INTENTS, 1.0), data.INTENTS, m) for m in ASKS},
    "replies": {m: bayes.intent_reply(intent_model, data.INTENTS, m) for m in ASKS},
}
path3 = os.path.join(HERE, "..", "engine", "parity3.json")
with open(path3, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(part3, handle, ensure_ascii=False, indent=1)
    handle.write("\n")
print(f"wrote Part 3 to {os.path.normpath(path3)}")


# Part 4: word vectors.
import vectors as vx  # noqa: E402
from corpus import SENTENCES as BIKE  # noqa: E402

rng = vx.Rng(1)
bike_words = [ct.words(s) for s in BIKE]
co_vocab, co_counts = vx.cooccurrence(bike_words)
co_ppmi = vx.ppmi(co_counts)
w_vocab, w_vecs, w_losses = vx.train_bike_vectors(BIKE)
mean, directions = vx.top_directions(w_vecs)
WATCH = ["chain", "tyre", "brake", "snapped", "open", "monday", "order", "parcel", "hello", "thanks"]
part4 = {
    "sentences": BIKE,
    "rng": [rng.random() for _ in range(5)] + [vx.Rng(7).below(116) for _ in range(1)],
    "cooc_vocab": co_vocab,
    "cooc_rows": {w: co_counts[co_vocab.index(w)] for w in WATCH},
    "ppmi_rows": {w: co_ppmi[co_vocab.index(w)] for w in WATCH},
    "ppmi_nearest": {w: [list(p) for p in vx.nearest(co_vocab, co_ppmi, w, 4)] for w in WATCH},
    "pair_gradient": [list(map(list, vx.pair_gradient([0.5, -1.0, 2.0], [1.0, 0.25, -0.5], label))) for label in (1, 0)],
    "vocab": w_vocab,
    "vectors": w_vecs,
    "losses": w_losses,
    "nearest": {w: [list(p) for p in vx.nearest(w_vocab, w_vecs, w, 4)] for w in WATCH},
    "map": {"mean": mean, "directions": directions, "points": vx.project(w_vecs, mean, directions)},
    "analogies": [[a, b, c, list(vx.analogy(w_vocab, w_vecs, a, b, c))] for a, b, c in [("chain", "chains", "tyre"), ("morning", "open", "evening"), ("order", "parcel", "repair")]],
    "replies": {q: vx.semantic_reply(data.INTENTS, w_vocab, w_vecs, q) for q in ["my chain snapped", "my tyre is flat", "my wheel is bent", "do you sell pizza", "is the shop open on saturday", "the delivery is late", "hello", "what is the meaning of life"]},
    "content_words": {q: vx.content_words(q) for q in ["do you sell pizza", "is the shop open on saturday"]},
}
path4 = os.path.join(HERE, "..", "engine", "parity4.json")
with open(path4, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(part4, handle, ensure_ascii=False)
    handle.write("\n")
print(f"wrote Part 4 to {os.path.normpath(path4)}")


# Part 5: language models, BPE, attention and the tiny GPT.
import lm  # noqa: E402
import tinygpt as tg  # noqa: E402

bike_text = ". ".join(BIKE) + "."
word_counts = tb.count(ct.words(" ".join(BIKE)))
merges = lm.train_bpe(word_counts, 40)
small = {"dim": 8, "context": 8, "hidden": 16, "lr": 0.01, "seed": 3}
g_vocab, g_model, g_losses = tg.train(bike_text, 15, **small)
n_vocab, n_model, n_losses = tg.train(bike_text, 15, use_attention=False, **small)
part5 = {
    "perplexity": [lm.perplexity(lp) for lp in ([-0.5, -1.0, -2.0], [-2.302585092994046] * 4, [-0.01])],
    "softmax": [lm.softmax([2.0, 1.0, 0.1], t) for t in (0.1, 0.5, 1.0, 2.0, 10.0)],
    "sample": [lm.sample([0.2, 0.5, 0.3], r) for r in (0.0, 0.19, 0.2, 0.69, 0.7, 0.99)],
    "generate_bigram": {str(t): lm.generate_bigram(bigrams, "claim", 10, t, vx.Rng(9)) for t in (0.2, 1.0, 3.0)},
    "merges": [list(p) for p in merges],
    "encode": {w: lm.bpe_encode(w, merges) for w in ["chain", "chains", "repaired", "zebra", "the"]},
    "cross_entropy_grad": lm.cross_entropy_grad([1.0, 2.0, 0.5], 1),
    "attention": lm.attention([[1, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, -1]], [[1, 2], [3, 4], [5, 6]]),
    "gpt": {"vocab": g_vocab, "model": g_model, "losses": g_losses,
            "sample": tg.generate(g_vocab, g_model, "my chain", 20, 0.8, vx.Rng(5))},
    "no_attention": {"model": n_model, "losses": n_losses},
    "average_loss": [tg.average_loss(g_vocab, g_model, bike_text[-200:]), tg.average_loss(g_vocab, n_model, bike_text[-200:], False)],
}
path5 = os.path.join(HERE, "..", "engine", "parity5.json")
with open(path5, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(part5, handle, ensure_ascii=False)
    handle.write("\n")
print(f"wrote Part 5 to {os.path.normpath(path5)}")


# Part 6: chat.
import chat  # noqa: E402

c_train, c_held = chat.make_dialogues()
c_tokens, c_roles = chat.to_tokens(c_train[:20], vx.Rng(3))
c_small = {"dim": 8, "context": 16, "hidden": 16, "lr": 0.005, "seed": 2}
c_vocab, c_model, c_losses = chat.train_chat(c_train[:40], 12, **c_small)
part6 = {
    "train": [list(p) for p in c_train], "held": [list(p) for p in c_held],
    "chat_tokens": {t: chat.chat_tokens(t) for t in ["You're welcome.", "Order 512 ships!", "is the shop open on Sunday?", ""]},
    "detokenize": [chat.detokenize(chat.chat_tokens(t)) for t in ["you're welcome.", "order 512 ships tomorrow.", "hello! how can i help?"]],
    "format": chat.format_dialogue([("user", "where is order 512"), ("bot", "order 512 ships tomorrow.")]),
    "tokens": c_tokens, "roles": c_roles,
    "mask": chat.loss_mask(c_roles, 3, 10),
    "vocab_full": chat.make_vocab(c_train),
    "top_k": [chat.top_k([0.1, 0.4, 0.2, 0.3], k) for k in (1, 2, 3, 4)],
    "chat_train": {"vocab": c_vocab, "model": c_model, "losses": c_losses,
                   "replies": {m: chat.reply(c_vocab, c_model, [], m) for m in ["hello", "my wheel is bent", "zzz qqq"]},
                   "sampled": chat.reply(c_vocab, c_model, ["«", "hi", "¶", "»", "hello", "¶"], "where is order 512", 0.8, 3, vx.Rng(4))},
}
path6 = os.path.join(HERE, "..", "engine", "parity6.json")
with open(path6, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(part6, handle, ensure_ascii=False)
    handle.write("\n")
print(f"wrote Part 6 to {os.path.normpath(path6)}")


# Part 7: pretrained-model ideas, and LoRA fine-tuning.
import pretrained as pt  # noqa: E402

base_vocab, base_model, _ = chat.train_chat(c_train[:40], 6, **c_small)
lora7 = chat.init_lora(base_model, ["wq", "w1"], 2)
lora_losses = chat.finetune_chat(base_vocab, base_model, chat.sunday_update(), 5, lora=lora7, lr=0.01)
full7 = {n: [row[:] for row in base_model[n]] for n in tg.PARAMS}
full_losses = chat.finetune_chat(base_vocab, full7, chat.sunday_update(), 5, lr=0.01)
vec3 = [[0.6, 0.8, 0.0], [1.0, 0.0, 0.0], [0.0, 0.6, 0.8], [0.0, 1.0, 0.0]]
part7 = {
    "table": {str(b): c for b, c in pt.bytes_to_unicode().items()},
    "byte_symbols": {t: pt.byte_symbols(t) for t in ["my chain", "café 🙂", "Hello, world!", "\n\t"]},
    "mean_pool": pt.mean_pool([[1, 2], [3, 4], [100, 100]], [1, 1, 0]),
    "normalize": [pt.normalize([3, 4]), pt.normalize([0, 0])],
    "chat_template": [pt.chat_template([{"role": "system", "content": "S"}, {"role": "user", "content": "hi"}]),
                      pt.chat_template([{"role": "user", "content": "x"}], False)],
    "top_facts": [list(p) for p in pt.top_facts([0.6, 0.8, 0.0], vec3, 3)],
    "grounded": pt.grounded_messages(pt.FACTS[:2], "are you open on saturday?"),
    "lora_matmul": pt.lora_matmul([[1, 2]], [[1, 0], [0, 1]], [[1], [1]], [[0.5, -0.5]], 2.0),
    "sunday_update": [list(p) for p in chat.sunday_update()],
    "lora": {"init": init_l if (init_l := chat.init_lora(base_model, ["wq"], 2)) else None, "size": chat.lora_size(lora7),
             "after": lora7, "losses": lora_losses, "merged_wq": chat.merge_lora(base_model, lora7)["wq"]},
    "full": {"losses": full_losses, "w1": full7["w1"]},
}
path7 = os.path.join(HERE, "..", "engine", "parity7.json")
with open(path7, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(part7, handle, ensure_ascii=False)
    handle.write("\n")
print(f"wrote Part 7 to {os.path.normpath(path7)}")


# Part 8: the help desk, and the .safetensors file written from Python.
import helpdesk as hd  # noqa: E402
import tempfile  # noqa: E402

faq_text = "Q: Where does my code run?\nq:  Is it real Python?  \nA: In the page.\nIt is Pyodide.\n\nA: an answer with no question\nQ:\nQ: Is it free?\r\nA: Yes.\nQ: a question with no answer"
tests_text = "is it real => 1\nwhat => none\nbroken line\nnot a number => x\n => 2\nuses => twice => 2"
results8 = [[0.9, 0, 0], [0.55, 1, 1], [0.5, 2, 1], [0.45, 0, -1], [0.3, 1, -1], [0.35, 2, 2], [0.2, 0, 0]]
thresholds8 = [i * 5 / 100 for i in range(19)]
model8 = tg.init_model(3, 2, 2, 2, 5)
vocab8 = ["a", "\n", "é"]
with tempfile.TemporaryDirectory() as folder:
    file8 = os.path.join(folder, "tiny.safetensors")
    tg.save_safetensors(file8, vocab8, model8)
    with open(file8, "rb") as handle:
        bytes8 = handle.read().hex()
    vocab_back, model_back = tg.load_safetensors(file8)
part8 = {
    "faq_text": faq_text, "faq": hd.parse_faq(faq_text), "examples": [list(p) for p in hd.examples(hd.parse_faq(faq_text))],
    "tests_text": tests_text, "tests": [list(t) for t in hd.parse_tests(tests_text)],
    "best_entry": [list(hd.best_entry([0.6, 0.8, 0.0], [[1, 0, 0], [0.6, 0.8, 0], [0.6, 0.8, 0]], [2, 0, 1])), list(hd.best_entry([1, 0], [], []))],
    "results": results8, "outcomes": [hd.outcomes(results8, t) for t in thresholds8],
    "choose": [list(hd.choose_threshold(results8, thresholds8)), list(hd.choose_threshold(results8, thresholds8, 1))],
    "model": model8, "vocab": vocab8, "header": tg.safetensors_header(vocab8, model8), "file_hex": bytes8,
    "loaded_back": {"vocab": vocab_back, "model": model_back},
}
path8 = os.path.join(HERE, "..", "engine", "parity8.json")
with open(path8, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(part8, handle, ensure_ascii=False)
    handle.write("\n")
print(f"wrote Part 8 to {os.path.normpath(path8)}")
