import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserData } from './auth/useUserData.js'

const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
const dayFormatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const localKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function Calendar() {
  const [reminders, setReminders] = useUserData('dailyReminders', [])
  const [tasks, setTasks] = useUserData('dailyTasks', [])
  const activeTasks = tasks.filter(task => !task.completed)
  const today = localKey(new Date())
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [reminderText, setReminderText] = useState('')
  const [taskText, setTaskText] = useState('')
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const dayCount = new Date(year, month + 1, 0).getDate()
  const cells = useMemo(() => [...Array(firstDay).fill(null), ...Array.from({ length: dayCount }, (_, index) => index + 1)], [firstDay, dayCount])
  const remindersByDate = reminders.reduce((result, reminder) => { if (reminder.date) result[reminder.date] = [...(result[reminder.date] || []), reminder]; return result }, {})
  const selectedReminders = remindersByDate[selectedDate] || []
  const selectedTasks = activeTasks.filter(task => task.date === selectedDate || (!task.date && selectedDate === today))
  const changeMonth = amount => { const next = new Date(year, month + amount, 1); setCursor(next); setSelectedDate(localKey(next)) }
  const addReminder = event => { event.preventDefault(); const text = reminderText.trim(); if (!text) return; setReminders(current => [...current, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, task: text, date: selectedDate, category: 'Calendario', completed: false }]); setReminderText('') }
  const addTask = event => { event.preventDefault(); const text = taskText.trim(); if (!text) return; setTasks(current => [...current, { id: Date.now(), text, date: selectedDate, completed: false }]); setTaskText('') }
  const toggleReminder = id => setReminders(current => current.map(item => item.id === id ? { ...item, completed: !item.completed } : item))
  const completeTask = id => setTasks(current => current.map(item => item.id === id ? { ...item, completed: true } : item))

  return <section className="calendar-page"><header className="dashboard-header inner-page-header"><div><p className="eyebrow">Workspace</p><h1>Calendario</h1><p className="header-subtitle">Consulta tus tareas y recordatorios por día.</p></div><Link className="primary-action" to="/">Volver a Mi día</Link></header><div className="calendar-layout"><article className="dashboard-card calendar-large-card"><div className="calendar-large-heading"><button className="calendar-nav-button" type="button" onClick={() => changeMonth(-1)} aria-label="Mes anterior">←</button><div><span className="card-kicker">Calendario mensual</span><h2>{monthFormatter.format(cursor)}</h2></div><button className="calendar-nav-button" type="button" onClick={() => changeMonth(1)} aria-label="Mes siguiente">→</button></div><div className="calendar-large-weekdays">{['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-large-grid">{cells.map((day, index) => { const date = day ? localKey(new Date(year, month, day)) : `empty-${index}`; const remindersForDay = day ? remindersByDate[date] || [] : []; const hasTasks = day && date === today && activeTasks.length > 0; return day ? <button type="button" className={`calendar-large-day${date === today ? ' is-today' : ''}${date === selectedDate ? ' is-selected' : ''}`} onClick={() => setSelectedDate(date)} key={date}><span>{day}</span>{(remindersForDay.length || hasTasks) > 0 && <small><i className="calendar-dot reminder-dot" />{hasTasks && <i className="calendar-dot task-dot" />}</small>}</button> : <span className="calendar-large-empty" key={date} /> })}</div><button className="calendar-today-button" type="button" onClick={() => { const now = new Date(); setCursor(now); setSelectedDate(localKey(now)) }}>Ir a hoy</button></article><aside className="dashboard-card calendar-details"><span className="card-kicker">Detalle del día</span><h2>{dayFormatter.format(new Date(`${selectedDate}T12:00:00`))}</h2><div className="calendar-detail-section"><h3><span className="detail-icon pink">◷</span>Recordatorios <small>{selectedReminders.length}</small></h3>{selectedReminders.length ? <ul>{selectedReminders.map(item => <li className={`calendar-detail-item${item.completed ? ' is-completed' : ''}`} key={item.id}><label><input type="checkbox" checked={Boolean(item.completed)} onChange={() => toggleReminder(item.id)} aria-label={`${item.completed ? 'Reactivar' : 'Completar'} ${item.task || item.text}`} /><span>{item.task || item.text}</span></label><em>{item.completed ? 'Completado' : item.category}</em></li>)}</ul> : <p>No hay recordatorios para este día.</p>}<form className="calendar-reminder-form" onSubmit={addReminder}><input value={reminderText} onChange={event => setReminderText(event.target.value)} placeholder="Añadir recordatorio..." aria-label="Nuevo recordatorio" /><button type="submit">+</button></form><Link className="calendar-section-link" to="/reminders">Gestionar recordatorios →</Link></div><div className="calendar-detail-section"><h3><span className="detail-icon lilac">✓</span>Tareas pendientes <small>{selectedTasks.length}</small></h3>{selectedTasks.length ? <ul>{selectedTasks.map(item => <li className="calendar-detail-item" key={item.id}><label><input type="checkbox" checked={false} onChange={() => completeTask(item.id)} aria-label={`Completar ${item.text}`} /><span>{item.text}</span></label><em>Pendiente</em></li>)}</ul> : <p>No hay tareas pendientes para este día.</p>}<form className="calendar-reminder-form" onSubmit={addTask}><input value={taskText} onChange={event => setTaskText(event.target.value)} placeholder="Añadir tarea..." aria-label="Nueva tarea" /><button type="submit">+</button></form><Link className="calendar-section-link" to="/tasks">Gestionar tareas →</Link></div></aside></div></section>
}

export default Calendar
