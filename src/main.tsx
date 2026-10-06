import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { requestPersistentStorage } from './lib/storage'
import { cleanUpdateParam } from './lib/updater'
import './styles/global.css'

// Depois de uma atualização o endereço traz ?v=<build>: tira o parâmetro da barra.
cleanUpdateParam()

// Solicita persistência de armazenamento ao navegador (StorageManager.persist)
requestPersistentStorage().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
