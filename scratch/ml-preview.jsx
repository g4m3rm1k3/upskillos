import React from 'react'
import { createRoot } from 'react-dom/client'
import MLLab from '../src/labs/ml-lab/index.jsx'
import { ThemeProvider } from '../src/context/ThemeContext.jsx'
// Global theme tokens (brand/slate colors) that the lab's CSS variables reference.
import '../src/styles/index.css'
// The provider keeps the prose colors in step with the page's light or dark mode, as in the app.
createRoot(document.getElementById('root')).render(<ThemeProvider><MLLab /></ThemeProvider>)
