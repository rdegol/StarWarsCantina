import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Character from './character.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Character />
  </StrictMode>,
)
