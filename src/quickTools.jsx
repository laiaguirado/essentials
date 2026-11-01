import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const toolCards = [
  { key: 'counter', icon: '+', tone: 'pink', title: 'Contador', description: 'Lleva una cuenta rápida para cualquier cosa.', action: 'Sumar uno' },
  { key: 'background', icon: '◐', tone: 'lilac', title: 'Color de fondo', description: 'Cambia entre dos fondos suaves de Essentials.', action: 'Cambiar color' },
  { key: 'number', icon: '⚄', tone: 'blue', title: 'Número aleatorio', description: 'Genera un número entre 1 y 100 al instante.', action: 'Generar número' },
  { key: 'coin', icon: '◒', tone: 'yellow', title: 'Lanzar moneda', description: 'Cara o cruz para tomar una decisión rápida.', action: 'Lanzar moneda' },
  { key: 'dice', icon: '⚄', tone: 'green', title: 'Lanzar dados', description: 'Tira dos dados y consulta la suma.', action: 'Lanzar dados' },
]

function QuickTools() {
  const [searchParams] = useSearchParams()
  const [count, setCount] = useState(0)
  const [number, setNumber] = useState(null)
  const [coin, setCoin] = useState('')
  const [coinFlips, setCoinFlips] = useState(0)
  const [dice, setDice] = useState(null)
  const [options, setOptions] = useState('')
  const [selected, setSelected] = useState('')
  const [softBackground, setSoftBackground] = useState(false)
  const optionInputRef = useRef(null)

  const resultFor = key => {
    if (key === 'counter') return count
    if (key === 'number') return number
    if (key === 'coin') return coin ? `Lanzamiento #${coinFlips}: ${coin}` : null
    if (key === 'dice' && dice) return `${dice[0]} + ${dice[1]} = ${dice[0] + dice[1]}`
    if (key === 'background') return softBackground ? 'Rosado suave' : 'Rosa claro'
    return null
  }

  const runTool = useCallback((key) => {
    if (key === 'counter') setCount(value => value + 1)
    if (key === 'background') setSoftBackground(value => !value)
    if (key === 'number') setNumber(Math.floor(Math.random() * 100) + 1)
    if (key === 'coin') {
      setCoin(Math.random() < .5 ? 'Cara' : 'Cruz')
      setCoinFlips(value => value + 1)
    }
    if (key === 'dice') setDice([1, 2].map(() => Math.floor(Math.random() * 6) + 1))
  }, [])

  useEffect(() => {
    const initialTool = searchParams.get('tool')
    if (['counter', 'background', 'number', 'coin', 'dice'].includes(initialTool)) runTool(initialTool)
    if (initialTool === 'selector') optionInputRef.current?.focus()
  }, [runTool, searchParams])

  const selectOption = () => {
    const list = options.split(/[,\n]/).map(item => item.trim()).filter(Boolean)
    setSelected(list.length ? list[Math.floor(Math.random() * list.length)] : '')
  }

  return <section className={`dashboard-card quick-tools-full${softBackground ? ' is-soft' : ''}`} id="quick-tools">
    <div className="section-heading"><div><h2>Quick tools</h2><p className="section-description">Pequeñas ayudas para resolver decisiones y tareas del día a día.</p></div><span className="section-caption">6 herramientas rápidas</span></div>
    <div className="tool-grid">{toolCards.map(tool => <div className={`tool-box tool-${tool.tone}`} key={tool.key}><span className="tool-emoji">{tool.icon}</span><div><strong>{tool.title}</strong><p>{tool.description}</p></div><button type="button" onClick={() => runTool(tool.key)}>{tool.action}</button>{resultFor(tool.key) !== null && <output className="tool-result">{resultFor(tool.key)}</output>}</div>)}
      <div className="tool-box tool-pink option-tool"><span className="tool-emoji">✦</span><div><strong>Selector aleatorio</strong><p>Escribe varias opciones y deja que Essentials elija.</p></div><textarea ref={optionInputRef} value={options} onChange={event => { setOptions(event.target.value); setSelected('') }} placeholder="Una opción, otra opción..." rows="2" /><button type="button" onClick={selectOption}>Elegir al azar</button>{selected && <output className="tool-result">{selected}</output>}</div>
    </div>
  </section>
}

export default QuickTools
