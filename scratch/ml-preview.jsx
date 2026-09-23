import React from 'react'
import { createRoot } from 'react-dom/client'
import MLLab from '../src/labs/ml-lab/index.jsx'
// Global theme tokens (brand/slate colors) that the lab's CSS variables reference.
import '../src/styles/index.css'
createRoot(document.getElementById('root')).render(<MLLab />)
