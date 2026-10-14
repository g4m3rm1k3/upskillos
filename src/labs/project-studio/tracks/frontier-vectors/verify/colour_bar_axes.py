# Lesson 4.5's prediction: how many Axes a figure holds after an image and its colour bar.
import numpy as np
from matplotlib.figure import Figure

fig = Figure()
ax = fig.add_subplot()
fig.colorbar(ax.imshow(np.eye(2)))
print(len(fig.axes))
