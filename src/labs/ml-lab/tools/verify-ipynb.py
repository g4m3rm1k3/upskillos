"""Validates a notebook exported by the ML Lab against the official nbformat schema.
Usage: ML_WRITE_IPYNB=/tmp/sample.ipynb npx vitest run src/labs/ml-lab/notebook -t "writes a sample export"
       python verify-ipynb.py /tmp/sample.ipynb      (needs `pip install nbformat`)"""
import sys
import nbformat

nb = nbformat.read(sys.argv[1], as_version=4)
nbformat.validate(nb)
kinds = [o.output_type for c in nb.cells if c.cell_type == 'code' for o in c.outputs]
print(f"valid nbformat {nb.nbformat}.{nb.nbformat_minor}; outputs: {kinds}")
