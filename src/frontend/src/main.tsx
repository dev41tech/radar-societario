import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
