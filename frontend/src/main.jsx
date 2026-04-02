import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// ON CHANGE LA LIGNE CI-DESSOUS POUR UTILISER LE BON FICHIER
import App from './CreditSim.jsx' 

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
 )