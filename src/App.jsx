import { useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Tasks from './Tasks.jsx'
import Habits from './Habits.jsx'
import Expenses from './Expenses.jsx'

function Home() {
  const [count, setCount] = useState(0)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [randomNumber, setRandomNumber] = useState(null)
  const [coinResult, setCoinResult] = useState('')
  const [flipCount, setFlipCount] = useState(0)

  const colors = ['#ffffff', '#f0f0f0', '#ffebee', '#e8f5e8', '#e3f2fd', '#fff3e0', '#f3e5f5', '#fce4ec', '#ffeb3b', '#c8e6c9', '#ffccbc', '#d1c4e9']
  
  const changeBackgroundColor = () => {
    const currentIndex = colors.indexOf(bgColor)
    const nextIndex = (currentIndex + 1) % colors.length
    setBgColor(colors[nextIndex])
    // Change the entire body background color
    document.body.style.backgroundColor = colors[nextIndex]
    // Also change the text color for better contrast
    const textColor = currentIndex % 2 === 0 ? '#333' : '#fff'
    document.documentElement.style.setProperty('--text-color', textColor)
    document.body.style.color = textColor
  }

  const generateRandomNumber = () => {
    const num = Math.floor(Math.random() * 100) + 1
    setRandomNumber(num)
    // Clear coin result when generating random number
    setCoinResult('')
    setFlipCount(0)
  }

  const flipCoin = () => {
    const result = Math.random() < 0.5 ? 'Cara' : 'Cruz'
    setCoinResult(result)
    setFlipCount(prev => prev + 1)
    //Clear random number when flipping coin
    setRandomNumber(null)
  }

  return (
    <div style={{ backgroundColor: bgColor, minHeight: '100vh', transition: 'background-color 0.3s ease' }}>
      <h1>Essentials</h1>
      <div className="funcionalities-container">
        <Link to="/tasks" style={{ textDecoration: 'none' }}>
          <button 
            style={{ 
              padding: '8px 16px', 
              cursor: 'pointer', 
              backgroundColor: '#4285f4', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              marginRight: '10px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#357ae8'
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 4px 8px rgba(66,133,244,0.3)'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#4285f4'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = 'none'
            }}
          >
            📝 Daily Tasks
          </button>
        </Link>
        <Link to="/habits" style={{ textDecoration: 'none' }}>
          <button 
            style={{ 
              padding: '8px 16px', 
              cursor: 'pointer', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              marginRight: '10px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#218838'
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 4px 8px rgba(40,167,69,0.3)'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#28a745'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = 'none'
            }}
          >
          🎯 Habits
          </button>
        </Link>
        <Link to="/expenses" style={{ textDecoration: 'none' }}>
          <button 
            style={{ 
              padding: '8px 16px', 
              cursor: 'pointer', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              marginRight: '10px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#138496'
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 4px 8px rgba(23,162,184,0.3)'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#17a2b8'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = 'none'
            }}
          >
          💰 Control de Gastos
          </button>
        </Link>
        </div>
        <div className="basic-container">
        <button 
          onClick={() => setCount((count) => count + 1)}
          style={{ 
            padding: '8px 16px', 
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#0056b3'
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 4px 8px rgba(0,123,255,0.3)'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#007bff'
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = 'none'
          }}
        >
          count is {count}
        </button>
        <button
          onClick={changeBackgroundColor}
          style={{ 
            marginLeft: '10px', 
            padding: '8px 16px', 
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#545b62'
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 4px 8px rgba(108,117,125,0.3)'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#6c757d'
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = 'none'
          }}
        >
          Cambiar color de fondo
        </button>
        <button 
          onClick={generateRandomNumber}
          style={{ 
            marginLeft: '10px', 
            padding: '8px 16px', 
            cursor: 'pointer', 
            backgroundColor: '#ff9800', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#f57c00'
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 4px 8px rgba(255,152,0,0.3)'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#ff9800'
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = 'none'
          }}
        >
          🎲 Número Aleatorio
        </button>
        <button 
          onClick={flipCoin}
          style={{ 
            marginLeft: '10px', 
            padding: '8px 16px', 
            cursor: 'pointer', 
            backgroundColor: '#ffc107', 
            color: '#333', 
            border: 'none', 
            borderRadius: '5px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#ffb300'
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 4px 8px rgba(255,193,7,0.3)'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#ffc107'
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = 'none'
          }}
        >
          🪙 Lanzar Moneda
        </button>
      </div>
      
      {randomNumber && (
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '18px', fontWeight: 'bold' }}>
          Número generado: {randomNumber}
        </div>
      )}
      
      {coinResult && (
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '18px', fontWeight: 'bold' }}>
          🪙 Resultado: {coinResult}
        </div>
      )}
      
      {flipCount > 0 && (
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '16px', color: '#666' }}>
          🪙 Lanzamientos: {flipCount}
        </div>
      )}
      
      <div className="sections-container">
        <div className="basics-section">
          <h2>🌐 Basics</h2>
          <div className="basics-buttons">
            <button 
              onClick={() => window.open('https://www.google.com', '_blank')}
              className="google-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              🔍 Google
            </button>
            <button 
              onClick={() => window.open('https://mail.google.com', '_blank')}
              className="gmail-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              📧 Gmail
            </button>
            <button 
              onClick={() => window.open('https://translate.google.com', '_blank')}
              className="translator-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              🌍 Traductor
            </button>
            <button 
              onClick={() => window.open('https://drive.google.com', '_blank')}
              className="drive-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              📁 Drive
            </button>
            <button 
              onClick={() => window.open('https://photos.google.com', '_blank')}
              className="photos-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              📸 Fotos
            </button>
          </div>
        </div>
        
        <div className="media-section">
          <h2>📺 Media</h2>
          <div className="media-buttons">
            <button 
              onClick={() => window.open('https://www.youtube.com', '_blank')}
              className="youtube-btn"
              style={{ 
                padding: '10px 20px', 
                cursor: 'pointer', 
                margin: '5px',
                transition: 'all 0.3s ease',
                backgroundColor: '#ff0000',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#cc0000'
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 4px 8px rgba(255,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ff0000'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}
            >
              📹 YouTube
            </button>
            <button 
              onClick={() => window.open('https://www.netflix.com', '_blank')}
              className="netflix-btn"
              style={{ 
                padding: '10px 20px', 
                cursor: 'pointer', 
                margin: '5px',
                transition: 'all 0.3s ease',
                backgroundColor: '#000000',
                color: '#ff0000',
                border: 'none',
                borderRadius: '5px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#333333'
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#000000'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}
            >
              🎬 Netflix
            </button>
            <button 
              onClick={() => window.open('https://www.twitch.tv', '_blank')}
              className="twitch-btn"
              style={{ 
                padding: '10px 20px', 
                cursor: 'pointer', 
                margin: '5px',
                transition: 'all 0.3s ease',
                backgroundColor: '#9146ff',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#772ce8'
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 4px 8px rgba(145,70,255,0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#9146ff'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}
            >
              🎮 Twitch
            </button>
          </div>
        </div>
        <div className="programming-section">
          <h2>💻 Programming</h2>
          <div className="programming-buttons">
            <button 
              onClick={() => window.open('https://github.com', '_blank')}
              className="github-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              🐙 GitHub
            </button>
            <button 
              onClick={() => window.open('https://figma.com', '_blank')}
              className="figma-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              🎨 Figma
            </button>
          </div>
        </div>
        <div className="rrss-section">
          <h2>📱 RRSS</h2>
          <div className="rrss-buttons">
            <button 
              onClick={() => window.open('https://www.instagram.com', '_blank')}
              className="instagram-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              📷 Instagram
            </button>
            <button 
              onClick={() => window.open('https://www.tiktok.com', '_blank')}
              className="tiktok-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              🎵 TikTok
            </button>
          </div>
        </div>
        <div className="travels-section">
          <h2>✈️ Travels</h2>
          <div className="travels-buttons">
            <button 
              onClick={() => window.open('https://www.booking.com', '_blank')}
              className="booking-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              🏨 Booking
            </button>
            <button 
              onClick={() => window.open('https://www.vueling.com', '_blank')}
              className="vueling-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              ✈️ Vueling
            </button>
            <button 
              onClick={() => window.open('https://www.ryanair.com', '_blank')}
              className="ryanair-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              🛫 Ryanair
            </button>
            <button 
              onClick={() => window.open('https://www.skyscanner.com', '_blank')}
              className="skyscanner-btn"
              style={{ padding: '10px 20px', cursor: 'pointer', margin: '5px' }}
            >
              🔍 Skyscanner
            </button>
          </div>
        </div>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/habits" element={<Habits />} />
      <Route path="/expenses" element={<Expenses />} />
    </Routes>
  )
}

export default App