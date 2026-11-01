import { useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Tasks from './Tasks.jsx'
import Reminders from './Reminders.jsx'
import Expenses from './Expenses.jsx'

function Home() {
  const [count, setCount] = useState(0)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [randomNumber, setRandomNumber] = useState(null)
  const [coinResult, setCoinResult] = useState('')
  const [flipCount, setFlipCount] = useState(0)
  const [diceResult, setDiceResult] = useState(null)
  const [isRandomNumberOpen, setIsRandomNumberOpen] = useState(false)
  const [isCoinOpen, setIsCoinOpen] = useState(false)
  const [isDiceOpen, setIsDiceOpen] = useState(false)
  const [randomOptions, setRandomOptions] = useState('')
  const [selectedOption, setSelectedOption] = useState('')
  const [selectionError, setSelectionError] = useState('')
  const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false)

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
  }

  const flipCoin = () => {
    const result = Math.random() < 0.5 ? 'Cara' : 'Cruz'
    setCoinResult(result)
    setFlipCount(previousCount => previousCount + 1)
  }

  const rollDice = () => {
    const firstDie = Math.floor(Math.random() * 6) + 1
    const secondDie = Math.floor(Math.random() * 6) + 1
    setDiceResult([firstDie, secondDie])
  }

  const selectRandomOption = () => {
    const options = randomOptions
      .split(/[\n,]/)
      .map(option => option.trim())
      .filter(Boolean)

    if (options.length === 0) {
      setSelectedOption('')
      setSelectionError('Añade opciones separadas por comas o en líneas distintas.')
      return
    }

    setSelectionError('')
    setSelectedOption(options[Math.floor(Math.random() * options.length)])
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
            📝 Tareas diarias
          </button>
        </Link>
        <Link to="/reminders" style={{ textDecoration: 'none' }}>
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
          📅 Recordatorio
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
          💰 Control de las finanzas
          </button>
        </Link>
        </div>
        <div className="basic-container">
        <h2>Quick tools</h2>
        <div className="quick-tools-row quick-tools-primary-row">
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
        </div>
        <div className="quick-tools-row quick-tools-secondary-row">
        <div className="quick-tool">
          <button
            type="button"
            className="random-picker-toggle"
            aria-expanded={isRandomNumberOpen}
            aria-controls="random-number-tool"
            onClick={() => setIsRandomNumberOpen(open => !open)}
          >
            {isRandomNumberOpen ? 'Ocultar número aleatorio' : 'Mostrar número aleatorio'}
          </button>
          {isRandomNumberOpen && (
            <div className="quick-tool-content" id="random-number-tool">
              <button
                type="button"
                onClick={generateRandomNumber}
                className="random-number-button"
              >
                🎲 Generar número
                <span className="random-number-range">(número del 1 al 100)</span>
              </button>
              {randomNumber && <p className="quick-tool-result" role="status">Número generado: {randomNumber}</p>}
            </div>
          )}
        </div>
        <div className="quick-tool">
          <button
            type="button"
            className="random-picker-toggle"
            aria-expanded={isCoinOpen}
            aria-controls="coin-tool"
            onClick={() => setIsCoinOpen(open => !open)}
          >
            {isCoinOpen ? 'Ocultar lanzamiento de moneda' : 'Mostrar lanzamiento de moneda'}
          </button>
          {isCoinOpen && (
            <div className="quick-tool-content" id="coin-tool">
              <button
                type="button"
                onClick={flipCoin}
                className="coin-flip-button"
              >
                🪙 Lanzar moneda
              </button>
              {coinResult && (
                <p className="quick-tool-result" role="status">
                  Resultado: 🪙 {coinResult}
                </p>
              )}
              {flipCount > 0 && <p className="coin-flip-count">Lanzamientos: {flipCount}</p>}
            </div>
          )}
        </div>
        <div className="quick-tool">
          <button
            type="button"
            className="random-picker-toggle"
            aria-expanded={isDiceOpen}
            aria-controls="dice-tool"
            onClick={() => setIsDiceOpen(open => !open)}
          >
            {isDiceOpen ? 'Ocultar lanzamiento de dados' : 'Mostrar lanzamiento de dados'}
          </button>
          {isDiceOpen && (
            <div className="quick-tool-content" id="dice-tool">
              <button
                type="button"
                onClick={rollDice}
                className="dice-roll-button"
              >
                🎲 Lanzar dados
              </button>
              {diceResult && (
                <div className="dice-result" role="status" aria-label={`Dados: ${diceResult[0]} y ${diceResult[1]}`}>
                  <div className="dice-icons" aria-hidden="true">
                    {diceResult.map((die, index) => (
                      <span key={index}>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][die - 1]}</span>
                    ))}
                  </div>
                  <p className="quick-tool-result">
                    Resultado: {diceResult[0]} + {diceResult[1]} = {diceResult[0] + diceResult[1]}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="random-picker-section">
          <button
            type="button"
            className="random-picker-toggle"
            aria-expanded={isRandomPickerOpen}
            aria-controls="random-picker"
            onClick={() => setIsRandomPickerOpen(open => !open)}
          >
            {isRandomPickerOpen ? 'Ocultar selector aleatorio' : 'Mostrar selector aleatorio'}
          </button>
          {isRandomPickerOpen && (
            <div className="random-picker" id="random-picker">
              <label htmlFor="random-options">Selector aleatorio</label>
              <textarea
                id="random-options"
                value={randomOptions}
                onChange={event => {
                  setRandomOptions(event.target.value)
                  setSelectedOption('')
                  setSelectionError('')
                }}
                placeholder="Escribe opciones separadas por comas o en líneas distintas"
                rows={3}
              />
              <button type="button" onClick={selectRandomOption}>🎯 Elegir al azar</button>
              {selectionError && <p className="random-picker-error" role="alert">{selectionError}</p>}
              {selectedOption && <p className="random-picker-result" role="status">Resultado: {selectedOption}</p>}
            </div>
          )}
        </div>
        </div>
      </div>
      
      <h2 className="links-title">Links</h2>
      <div className="sections-container">
        <div className="basics-section">
          <h2>🌐 Basics Google</h2>
          <div className="basics-buttons">
            <button 
              onClick={() => window.open('https://www.google.com', '_blank')}
              className="google-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🔍 Google
            </button>
            <button 
              onClick={() => window.open('https://mail.google.com', '_blank')}
              className="gmail-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              📧 Gmail
            </button>
            <button 
              onClick={() => window.open('https://translate.google.com', '_blank')}
              className="translator-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🌍 Traductor
            </button>
            <button 
              onClick={() => window.open('https://drive.google.com', '_blank')}
              className="drive-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              📁 Drive
            </button>
            <button 
              onClick={() => window.open('https://photos.google.com', '_blank')}
              className="photos-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
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
                transition: 'all 0.3s ease',
                backgroundColor: '#ff0000',
                color: 'white',
                border: 'none',
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
                transition: 'all 0.3s ease',
                backgroundColor: '#000000',
                color: '#ff0000',
                border: 'none',
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
              onClick={() => window.open('https://www.primevideo.com', '_blank')}
              className="amazon-video-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🎬 Amazon Video
            </button>
            <button
              onClick={() => window.open('https://www.disneyplus.com', '_blank')}
              className="disney-plus-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              ✨ Disney+
            </button>
            <button
              onClick={() => window.open('https://www.max.com', '_blank')}
              className="hbo-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🎬 HBO
            </button>
          </div>
        </div>
        <div className="music-section">
          <h2>🎵 Music</h2>
          <div className="music-buttons">
            <button
              onClick={() => window.open('https://music.youtube.com', '_blank')}
              className="youtube-music-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🎵 YouTube Music
            </button>
            <button
              onClick={() => window.open('https://open.spotify.com', '_blank')}
              className="spotify-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🟢 Spotify
            </button>
            <button
              onClick={() => window.open('https://music.amazon.com', '_blank')}
              className="amazon-music-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🎵 Amazon Music
            </button>
          </div>
        </div>
        <div className="rrss-section">
          <h2>📱 RRSS</h2>
          <div className="rrss-buttons">
            <button 
              onClick={() => window.open('https://www.instagram.com', '_blank')}
              className="instagram-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              📷 Instagram
            </button>
            <button 
              onClick={() => window.open('https://www.tiktok.com', '_blank')}
              className="tiktok-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🎵 TikTok
            </button>
            <button
              onClick={() => window.open('https://www.twitch.tv', '_blank')}
              className="twitch-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
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
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🐙 GitHub
            </button>
            <button
              onClick={() => window.open('https://figma.com', '_blank')}
              className="figma-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🎨 Figma
            </button>
            <button
              onClick={() => window.open('https://www.notion.so', '_blank')}
              className="notion-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              📝 Notion
            </button>
          </div>
        </div>
        <div className="travels-section">
          <h2>✈️ Travels</h2>
          <div className="travels-buttons">
            <button 
              onClick={() => window.open('https://www.booking.com', '_blank')}
              className="booking-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🏨 Booking
            </button>
            <button 
              onClick={() => window.open('https://www.vueling.com', '_blank')}
              className="vueling-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              ✈️ Vueling
            </button>
            <button 
              onClick={() => window.open('https://www.ryanair.com', '_blank')}
              className="ryanair-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🛫 Ryanair
            </button>
            <button 
              onClick={() => window.open('https://www.skyscanner.com', '_blank')}
              className="skyscanner-btn"
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              🔍 Skyscanner
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/reminders" element={<Reminders />} />
      <Route path="/expenses" element={<Expenses />} />
    </Routes>
  )
}

export default App