"""Facts about the machine and the packages a run used."""
import platform

import numpy


def environment():
    return {
        "python": platform.python_version(),
        "system": f"{platform.system()} {platform.release()}",
        "numpy": numpy.__version__,
    }


def report():
    return "\n".join(f"{key}: {value}" for key, value in environment().items())


def main():
    print(report())
