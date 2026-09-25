import { Route, Routes } from 'react-router-dom'
import { Home } from './components/Home'
import { AnamneseForm } from './components/AnamneseForm'
import { NotFound } from './components/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/anamnese/:id" element={<AnamneseForm />} />
      <Route path="/anamnese/:id/:recordId" element={<AnamneseForm />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
