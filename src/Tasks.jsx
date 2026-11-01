import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserData } from './auth/useUserData.js'
import './App.css'

function Tasks() {
  const [tasks, setTasks] = useUserData('dailyTasks', [])
  const [newTask, setNewTask] = useState('')
  const [showCompleted, setShowCompleted] = useState(true)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingText, setEditingText] = useState('')

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, { id: Date.now(), text: newTask.trim(), completed: false }])
      setNewTask('')
    }
  }

  const startEditingTask = (task) => {
    setEditingTaskId(task.id)
    setEditingText(task.text)
  }

  const saveTaskEdit = (id) => {
    const text = editingText.trim()
    if (!text) return

    setTasks(tasks.map(task => task.id === id ? { ...task, text } : task))
    setEditingTaskId(null)
    setEditingText('')
  }

  const cancelTaskEdit = () => {
    setEditingTaskId(null)
    setEditingText('')
  }

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  const clearCompletedTasks = () => {
    if (window.confirm('¿Seguro que quieres borrar todas las tareas completadas?')) {
      setTasks(tasks.filter(task => !task.completed))
    }
  }

  const clearAllTasks = () => {
    if (window.confirm('¿Seguro que quieres borrar TODAS las tareas? Esta acción no se puede deshacer.')) {
      setTasks([])
    }
  }

  const activeTasks = tasks.filter(task => !task.completed)
  const completedTasks = tasks.filter(task => task.completed)

  return (
    <div className="tasks-page" style={{ minHeight: '100vh', padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <div className="tasks-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'left', marginBottom: '15px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}
          >
            ← Volver a Essentials
          </Link>
        </div>
        <h1>Tareas diarias</h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
              placeholder="Añade una tarea nueva..."
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
            <button
              onClick={addTask}
              style={{
                padding: '12px 24px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Añadir
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1rem', fontSize: '18px', fontWeight: 'bold' }}>
          Pendientes: {activeTasks.length} | Completadas: {completedTasks.length}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Tareas pendientes</h3>
          {activeTasks.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No tienes tareas pendientes. ¡Buen trabajo!</p>
          ) : (
            activeTasks.map(task => (
              <div
                key={task.id}
                onClick={event => event.stopPropagation()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderBottom: '1px solid #eee',
                  gap: '8px'
                }}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                {editingTaskId === task.id ? (
                  <input
                    type="text"
                    value={editingText}
                    onChange={event => setEditingText(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') saveTaskEdit(task.id)
                      if (event.key === 'Escape') cancelTaskEdit()
                    }}
                    aria-label="Editar tarea"
                    autoFocus
                    style={{ flex: 1, minWidth: 0, padding: '8px', fontSize: '16px' }}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      textDecoration: task.completed ? 'line-through' : 'none',
                      color: task.completed ? '#999' : '#333',
                      fontSize: '16px'
                    }}
                  >
                    {task.text}
                  </span>
                )}
                {editingTaskId === task.id ? (
                  <>
                    <button onClick={() => saveTaskEdit(task.id)} disabled={!editingText.trim()}>
                      Guardar
                    </button>
                    <button onClick={cancelTaskEdit}>Cancelar</button>
                  </>
                ) : (
                  <button
                    className="task-icon-button"
                    onClick={() => startEditingTask(task)}
                    aria-label={`Editar tarea: ${task.text}`}
                    title="Editar tarea"
                  >
                    ✏️
                  </button>
                )}
                <button
                  className="task-icon-button task-icon-delete"
                  onClick={() => deleteTask(task.id)}
                  aria-label={`Eliminar tarea: ${task.text}`}
                  title="Eliminar tarea"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        {completedTasks.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer',
                marginBottom: showCompleted ? '1rem' : '0'
              }}
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <h3 style={{ margin: 0, color: '#28a745' }}>
                ✅ Tareas completadas ({completedTasks.length})
              </h3>
              <span style={{ fontSize: '18px', color: '#666' }}>
                {showCompleted ? '▼' : '▶'}
              </span>
            </div>
            
            {showCompleted && (
              <div>
                {completedTasks.map(task => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 10px',
                      borderBottom: '1px solid #eee',
                      gap: '8px',
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    {editingTaskId === task.id ? (
                      <input
                        type="text"
                        value={editingText}
                        onChange={event => setEditingText(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') saveTaskEdit(task.id)
                          if (event.key === 'Escape') cancelTaskEdit()
                        }}
                        aria-label="Editar tarea"
                        autoFocus
                        style={{ flex: 1, minWidth: 0, padding: '8px', fontSize: '16px' }}
                      />
                    ) : (
                      <span
                        style={{
                          flex: 1,
                          textDecoration: 'line-through',
                          color: '#28a745',
                          fontSize: '16px'
                        }}
                      >
                        {task.text}
                      </span>
                    )}
                    {editingTaskId === task.id ? (
                      <>
                        <button onClick={() => saveTaskEdit(task.id)} disabled={!editingText.trim()}>
                          Guardar
                        </button>
                        <button onClick={cancelTaskEdit}>Cancelar</button>
                      </>
                    ) : (
                      <button
                        className="task-icon-button"
                        onClick={event => {
                          event.stopPropagation()
                          startEditingTask(task)
                        }}
                        aria-label={`Editar tarea: ${task.text}`}
                        title="Editar tarea"
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      className="task-icon-button task-icon-delete"
                      onClick={event => {
                        event.stopPropagation()
                        deleteTask(task.id)
                      }}
                      aria-label={`Eliminar tarea: ${task.text}`}
                      title="Eliminar tarea"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={clearCompletedTasks}
              disabled={completedTasks.length === 0}
              style={{
                padding: '12px 24px',
                backgroundColor: completedTasks.length === 0 ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: completedTasks.length === 0 ? 'not-allowed' : 'pointer',
                marginRight: '10px'
              }}
            >
              Borrar completadas ({completedTasks.length})
            </button>
            <button
              onClick={clearAllTasks}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Borrar todas las tareas
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tasks
