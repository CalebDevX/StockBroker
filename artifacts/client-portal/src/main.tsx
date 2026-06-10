import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { TradingModeProvider } from './contexts/TradingModeContext'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TradingModeProvider>
          <App />
        </TradingModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
