import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import FloatingApp from './FloatingApp';
import TestApp from './TestApp';
import './styles/globals.css';
import './styles/markdown.css';

// 临时使用 TestApp 来排查问题
// 如果 TestApp 能显示，说明问题在 App 组件中
const USE_TEST_APP = false;
const isFloatingRoute = window.location.hash.startsWith('#/floating/');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {USE_TEST_APP ? <TestApp /> : isFloatingRoute ? <FloatingApp /> : <App />}
  </React.StrictMode>
);
