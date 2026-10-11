# Replace this ordinary Python with your own small program, or load a .py file.
# No PyCade annotations or machine-learning variable names are required.
def predict_nearest(training, labels, query):
    distances = [(value - query) ** 2 for value in training]
    nearest_index = min(range(len(distances)), key=lambda i: distances[i])
    return labels[nearest_index], distances, nearest_index

training = [1.0, 2.0, 8.0, 9.0]
labels = [0, 0, 1, 1]
query = 7.0
result = predict_nearest(training, labels, query)
prediction, distances, index = result
