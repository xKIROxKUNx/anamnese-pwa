import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { requestPersistentStorage } from './lib/storage'
import './styles/global.css'

// Solicita persistência de armazenamento ao navegador (StorageManager.persist)
requestPersistentStorage().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
