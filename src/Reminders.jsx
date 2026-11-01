import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserData } from './auth/useUserData.js'
import './App.css'

const CREATE_CATEGORY = '__create_new_category__'

function getToday() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatReminderDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function Reminders() {
  const [reminders, setReminders] = useUserData('dailyReminders', [])
  const [task, setTask] = useState('')
  const [date, setDate] = useState(getToday)
  const [category, setCategory] = useState('')
  const [categorySelection, setCategorySelection] = useState('')
  const [formError, setFormError] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [completionFilter, setCompletionFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [editingReminder, setEditingReminder] = useState(null)
  const categories = [...new Map(
    reminders
      .map(reminder => typeof reminder.category === 'string' ? reminder.category.trim() : '')
      .filter(Boolean)
      .map(value => [value.toLocaleLowerCase('es'), value]),
  ).values()].sort((first, second) => first.localeCompare(second, 'es'))
  const activeCategorySelection = categorySelection || (categories.length === 0 ? CREATE_CATEGORY : '')

  const addReminder = (event) => {
    event.preventDefault()
    const trimmedTask = task.trim()
    const trimmedCategory = activeCategorySelection === CREATE_CATEGORY
      ? category.trim()
      : activeCategorySelection
    if (!trimmedTask || !trimmedCategory || !date) {
      setFormError('Escribe una tarea, una fecha y una categoría.')
      return
    }

    setReminders(current => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        task: trimmedTask,
        date,
        category: trimmedCategory,
        completed: false,
      },
    ])
    setFormError('')
    setTask('')
    setCategory('')
    setCategorySelection('')
  }

  const startEditingReminder = (reminder) => {
    setEditingReminder({
      id: reminder.id,
      task: reminder.task,
      date: reminder.date,
      category: reminder.category,
      newCategory: '',
    })
  }

  const updateReminderDraft = (field, value) => {
    setEditingReminder(current => ({ ...current, [field]: value }))
  }

  const saveReminderEdit = (event) => {
    event.preventDefault()
    if (!editingReminder) return

    const updatedTask = editingReminder.task.trim()
    const updatedCategory = editingReminder.category === CREATE_CATEGORY
      ? editingReminder.newCategory.trim()
      : editingReminder.category
    if (!updatedTask || !updatedCategory || !editingReminder.date) return

    setReminders(current => current.map(reminder => (
      reminder.id === editingReminder.id
        ? { ...reminder, task: updatedTask, date: editingReminder.date, category: updatedCategory }
        : reminder
    )))
    setEditingReminder(null)
  }

  const toggleReminder = (id) => {
    setReminders(current => current.map(reminder => (
      reminder.id === id ? { ...reminder, completed: !reminder.completed } : reminder
    )))
  }

  const deleteReminder = (id) => {
    setReminders(current => current.filter(reminder => reminder.id !== id))
    if (editingReminder?.id === id) setEditingReminder(null)
  }

  const sortedReminders = [...reminders].sort((first, second) => {
    if (sortBy === 'category') {
      return first.category.localeCompare(second.category, 'es') ||
        second.date.localeCompare(first.date) ||
        Number(first.completed) - Number(second.completed) ||
        first.task.localeCompare(second.task, 'es')
    }

    return second.date.localeCompare(first.date) ||
      Number(first.completed) - Number(second.completed) ||
      first.task.localeCompare(second.task, 'es')
  })
  const visibleReminders = sortedReminders.filter(reminder => (
    (completionFilter === 'all' ||
      (completionFilter === 'completed' ? reminder.completed : !reminder.completed)) &&
    (categoryFilter === 'all' || reminder.category === categoryFilter)
  ))

  return (
    <main className="reminders-page">
      <div className="reminders-container">
        <Link className="reminders-back-link" to="/">← Volver a Essentials</Link>
        <h1>📅 Recordatorios</h1>
        <p className="reminders-intro">Organiza lo que tienes que hacer por fecha y categoría.</p>

        <form className="reminder-form" onSubmit={addReminder}>
          <label>
            Qué tienes que hacer
            <input
              type="text"
              value={task}
              onChange={event => setTask(event.target.value)}
              placeholder="Ej. Comprar comida"
              maxLength={200}
              required
            />
          </label>
          <div className="reminder-form-row">
            <label>
              Fecha
              <input
                type="date"
                value={date}
                onChange={event => setDate(event.target.value)}
                required
              />
            </label>
            <label>
              Categoría
              {activeCategorySelection === CREATE_CATEGORY && (
                <div className="reminder-category-controls">
                  <input
                    type="text"
                    value={category}
                    onChange={event => setCategory(event.target.value)}
                    placeholder="Nombre de la nueva categoría"
                    maxLength={60}
                    required
                  />
                  {categories.length > 0 && (
                    <button
                      type="button"
                      className="reminder-category-switch"
                      onClick={() => {
                        setCategorySelection('')
                        setCategory('')
                      }}
                    >
                      Elegir una categoría existente
                    </button>
                  )}
                </div>
              )}
              {activeCategorySelection !== CREATE_CATEGORY && (
                <select
                  value={activeCategorySelection}
                  onChange={event => {
                    setCategorySelection(event.target.value)
                    setCategory('')
                  }}
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map(existingCategory => (
                    <option key={existingCategory} value={existingCategory}>{existingCategory}</option>
                  ))}
                  <option value={CREATE_CATEGORY}>Crear una categoría nueva...</option>
                </select>
              )}
            </label>
          </div>
          {formError && <p className="reminder-form-error" role="alert">{formError}</p>}
          <div className="reminder-form-actions">
            <button type="submit">Añadir recordatorio</button>
          </div>
        </form>

        <section className="reminders-list" aria-labelledby="reminders-list-title">
          <div className="reminders-list-header">
            <h2 id="reminders-list-title">Mis recordatorios</h2>
            <div className="reminders-list-controls">
              <label>
                Categoría
                <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
                  <option value="all">Todas</option>
                  {categories.map(existingCategory => (
                    <option key={existingCategory} value={existingCategory}>{existingCategory}</option>
                  ))}
                </select>
              </label>
              <label>
                Estado
                <select value={completionFilter} onChange={event => setCompletionFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  <option value="pending">Pendientes</option>
                  <option value="completed">Completados</option>
                </select>
              </label>
              <label>
                Ordenar por
                <select value={sortBy} onChange={event => setSortBy(event.target.value)}>
                  <option value="date">Fecha</option>
                  <option value="category">Categoría</option>
                </select>
              </label>
            </div>
          </div>
          {visibleReminders.length === 0 ? (
            <p className="reminders-empty">
              {reminders.length === 0
                ? 'Todavía no tienes recordatorios.'
                : 'No hay recordatorios que coincidan con los filtros seleccionados.'}
            </p>
          ) : (
            <ul>
              {visibleReminders.map(reminder => (
                <li
                  className={`reminder-card${reminder.completed ? ' is-completed' : ''}${editingReminder?.id === reminder.id ? ' is-editing' : ''}`}
                  key={reminder.id}
                >
                  {editingReminder?.id === reminder.id ? (
                    <form className="reminder-inline-edit" onSubmit={saveReminderEdit}>
                      <label>
                        Tarea
                        <input
                          type="text"
                          value={editingReminder.task}
                          onChange={event => updateReminderDraft('task', event.target.value)}
                          maxLength={200}
                          required
                          autoFocus
                        />
                      </label>
                      <div className="reminder-inline-edit-row">
                        <label>
                          Fecha
                          <input
                            type="date"
                            value={editingReminder.date}
                            onChange={event => updateReminderDraft('date', event.target.value)}
                            required
                          />
                        </label>
                        <label>
                          Categoría
                          {editingReminder.category === CREATE_CATEGORY ? (
                            <div className="reminder-inline-category">
                              <input
                                type="text"
                                value={editingReminder.newCategory}
                                onChange={event => updateReminderDraft('newCategory', event.target.value)}
                                placeholder="Nueva categoría"
                                maxLength={60}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => updateReminderDraft('category', reminder.category)}
                              >
                                Elegir existente
                              </button>
                            </div>
                          ) : (
                            <select
                              value={editingReminder.category}
                              onChange={event => updateReminderDraft('category', event.target.value)}
                            >
                              {categories.map(existingCategory => (
                                <option key={existingCategory} value={existingCategory}>{existingCategory}</option>
                              ))}
                              <option value={CREATE_CATEGORY}>Crear nueva...</option>
                            </select>
                          )}
                        </label>
                      </div>
                      <div className="reminder-card-actions">
                        <button className="reminder-edit" type="submit">Guardar</button>
                        <button
                          className="reminder-delete"
                          type="button"
                          onClick={() => setEditingReminder(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <label className="reminder-task">
                        <input
                          type="checkbox"
                          checked={reminder.completed}
                          onChange={() => toggleReminder(reminder.id)}
                        />
                        <span>{reminder.task}</span>
                      </label>
                      <div className="reminder-details">
                        <time dateTime={reminder.date}>{formatReminderDate(reminder.date)}</time>
                        <span className="reminder-category">{reminder.category}</span>
                      </div>
                      <div className="reminder-card-actions">
                        <button
                          className="reminder-edit"
                          type="button"
                          onClick={() => startEditingReminder(reminder)}
                          aria-label={`Editar recordatorio: ${reminder.task}`}
                        >
                          ✏️
                        </button>
                        <button
                          className="reminder-delete"
                          type="button"
                          onClick={() => deleteReminder(reminder.id)}
                          aria-label={`Eliminar recordatorio: ${reminder.task}`}
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

export default Reminders
