import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import RemoteController from './components/RemoteController'
import './styles/base.css'

const isRemote = window.location.hash === '#remote'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isRemote ? <RemoteController /> : <App />}
  </React.StrictMode>
)
