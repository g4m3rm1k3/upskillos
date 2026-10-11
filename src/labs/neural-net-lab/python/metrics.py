def confusion(probs, labels, threshold=0.5):
    """Count the four kinds of answer: true and false positives, true and false negatives."""
    tp = fp = tn = fn = 0
    for p, label in zip(probs, labels):
        guess = 1 if p >= threshold else 0
        if guess == 1 and label == 1:
            tp += 1
        elif guess == 1 and label == 0:
            fp += 1
        elif guess == 0 and label == 0:
            tn += 1
        else:
            fn += 1
    return tp, fp, tn, fn


def scores(tp, fp, tn, fn):
    """Accuracy, precision and recall from the four counts."""
    accuracy = (tp + tn) / (tp + fp + tn + fn)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    return accuracy, precision, recall
