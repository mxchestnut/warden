import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppWithRouter from './AppWithRouter.tsx'
import { MatrixProvider } from './hooks/useMatrixClient.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Strict Mode disabled in dev to avoid double API calls hitting rate limit
  // <React.StrictMode>
    <BrowserRouter>
      <MatrixProvider>
        <AppWithRouter />
      </MatrixProvider>
    </BrowserRouter>
  // </React.StrictMode>,
)
