import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './style.css';
import './library.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
