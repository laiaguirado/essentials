import { useState, useEffect } from 'react'
import './App.css'

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [showCompleted, setShowCompleted] = useState(true) // Set to true by default

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('dailyTasks')
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks)
        setTasks(parsedTasks)
      } catch (error) {
        console.error('Error loading tasks:', error)
        // If there's an error, start with empty tasks
        setTasks([])
      }
    } else {
      // Start with empty tasks if no saved tasks exist
      setTasks([])
    }
  }, [])

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('dailyTasks', JSON.stringify(tasks))
    }
  }, [tasks])

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }])
      setNewTask('')
    }
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
    if (window.confirm('Are you sure you want to clear all completed tasks?')) {
      setTasks(tasks.filter(task => !task.completed))
    }
  }

  const clearAllTasks = () => {
    if (window.confirm('Are you sure you want to clear ALL tasks? This action cannot be undone.')) {
      setTasks([])
      localStorage.removeItem('dailyTasks')
    }
  }

  const activeTasks = tasks.filter(task => !task.completed)
  const completedTasks = tasks.filter(task => task.completed)

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'left', marginBottom: '15px' }}>
          <a
            href="/"
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
            ← Back to Essentials
          </a>
        </div>
        <h1>Daily Tasks</h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
              placeholder="Add a new task..."
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
              Add
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1rem', fontSize: '18px', fontWeight: 'bold' }}>
          Active Tasks: {activeTasks.length} | Completed: {completedTasks.length}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Active Tasks</h3>
          {activeTasks.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No active tasks. Great job!</p>
          ) : (
            activeTasks.map(task => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  borderBottom: '1px solid #eee',
                  gap: '12px'
                }}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
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
                <button
                  onClick={() => deleteTask(task.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Delete
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
                ✅ Completed Today ({completedTasks.length})
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
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                      gap: '12px',
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
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
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Delete
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
              Clear Completed ({completedTasks.length})
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
              Clear All Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tasks
