import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DrawProvider } from './contexts/DrawContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DrawProvider>
          <App />
          <ToastContainer position="bottom-right" autoClose={3000} />
        </DrawProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
