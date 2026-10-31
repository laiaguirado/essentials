import { Link } from 'react-router-dom'
import { useUserData } from './auth/useUserData.js'
import './App.css'

function Habits() {
  const today = new Date().toDateString()
  const defaultHabits = {
    gym: { completed: false, streak: 0, emoji: '💪', name: 'Gym' },
    water: { completed: false, streak: 0, emoji: '💧', name: 'Water (8 glasses)' },
    noSweets: { completed: false, streak: 0, emoji: '🚫🍭', name: 'No Sweets' }
  }
  const [savedHabits, setSavedHabits] = useUserData('dailyHabits', null)
  const habits = savedHabits?.habits
    ? Object.fromEntries(Object.entries(savedHabits.habits).map(([key, habit]) => [
      key,
      { ...habit, completed: savedHabits.date === today && habit.completed },
    ]))
    : defaultHabits

  const toggleHabit = (habitKey) => {
    setSavedHabits(previous => {
      const currentHabits = previous?.habits
        ? Object.fromEntries(Object.entries(previous.habits).map(([key, habit]) => [
          key,
          { ...habit, completed: previous.date === today && habit.completed },
        ]))
        : defaultHabits

      return {
        date: today,
        habits: {
          ...currentHabits,
          [habitKey]: {
            ...currentHabits[habitKey],
            completed: !currentHabits[habitKey].completed,
            streak: !currentHabits[habitKey].completed
              ? currentHabits[habitKey].streak + 1
              : currentHabits[habitKey].streak,
          },
        },
      }
    })
  }

  const completedCount = Object.values(habits).filter(h => h.completed).length
  const totalCount = Object.keys(habits).length
  const allCompleted = completedCount === totalCount

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', backgroundColor: '#f8f9fa' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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
            ← Back to Essentials
          </Link>
        </div>
        <h1>🎯 Daily Habits Tracker</h1>
        
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          fontSize: '24px',
          fontWeight: 'bold',
          color: allCompleted ? '#28a745' : '#333'
        }}>
          {allCompleted ? '🎉 AMAZING! All habits completed!' : `Progress: ${completedCount}/${totalCount}`}
        </div>

        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          {Object.entries(habits).map(([key, habit]) => (
            <div
              key={key}
              onClick={() => toggleHabit(key)}
              style={{
                backgroundColor: habit.completed ? '#d4edda' : '#fff',
                border: `3px solid ${habit.completed ? '#28a745' : '#ddd'}`,
                borderRadius: '15px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: habit.completed ? 'scale(1.02)' : 'scale(1)',
                boxShadow: habit.completed ? '0 4px 15px rgba(40, 167, 69, 0.3)' : '0 2px 5px rgba(0,0,0,0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = habit.completed 
                  ? '0 6px 20px rgba(40, 167, 69, 0.4)' 
                  : '0 4px 10px rgba(0,0,0,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = habit.completed ? 'scale(1.02)' : 'scale(1)'
                e.currentTarget.style.boxShadow = habit.completed 
                  ? '0 4px 15px rgba(40, 167, 69, 0.3)' 
                  : '0 2px 5px rgba(0,0,0,0.1)'
              }}
            >
              {habit.completed && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  fontSize: '24px',
                  animation: 'bounce 0.5s ease'
                }}>
                  ✅
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '48px' }}>
                  {habit.completed ? habit.emoji : '⭕'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    textDecoration: habit.completed ? 'line-through' : 'none',
                    color: habit.completed ? '#666' : '#333'
                  }}>
                    {habit.name}
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#666',
                    marginTop: '4px'
                  }}>
                    🔥 Streak: {habit.streak} days
                  </div>
                </div>
                <div style={{
                  fontSize: '24px',
                  color: habit.completed ? '#28a745' : '#ddd'
                }}>
                  {habit.completed ? '✓' : '○'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '1.5rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>📊 Today's Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
            {Object.entries(habits).map(([key, habit]) => (
              <div key={key} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>
                  {habit.completed ? habit.emoji : '⭕'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {habit.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default Habits
