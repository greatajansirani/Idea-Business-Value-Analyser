import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
const style = document.createElement('style')
style.textContent = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans','Segoe UI',sans-serif;background:#f5f5f2;color:#111;-webkit-font-smoothing:antialiased}a{text-decoration:none}button,textarea,input,select{font-family:inherit}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}`
document.head.appendChild(style)
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
