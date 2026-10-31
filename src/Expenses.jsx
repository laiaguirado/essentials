import { useState, useEffect, useRef } from 'react'

function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('general')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showCategoryDistribution, setShowCategoryDistribution] = useState(false)
  const [showCategorySummary, setShowCategorySummary] = useState(false)
  const [showMonthlyBudget, setShowMonthlyBudget] = useState(false)
  const [showExpenseHistory, setShowExpenseHistory] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [editingValues, setEditingValues] = useState(null)
  const [categoryBudgets, setCategoryBudgets] = useState({})
  const [budgetMonth, setBudgetMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const initialBudgetMonth = useRef(budgetMonth)
  const [editingBudgetCategory, setEditingBudgetCategory] = useState(null)
  const [budgetDraft, setBudgetDraft] = useState('')
  const [areBudgetsLoaded, setAreBudgetsLoaded] = useState(false)

  const categories = [
    { id: 'general', name: 'General', color: '#6c757d', brightColor: '#868e96', icon: '📦' },
    { id: 'restaurantes', name: 'Restaurantes', color: '#ff6384', brightColor: '#ff85a1', icon: '🍽️' },
    { id: 'supermercado', name: 'Supermercado', color: '#28a745', brightColor: '#52c76f', icon: '🛒' },
    { id: 'suscripciones', name: 'Suscripciones', color: '#845ec2', brightColor: '#a27de0', icon: '📺' },
    { id: 'transporte', name: 'Transporte', color: '#36a2eb', brightColor: '#5bb8f5', icon: '🚗' },
    { id: 'entretenimiento', name: 'Entretenimiento', color: '#ff9f40', brightColor: '#ffb366', icon: '🎮' },
    { id: 'compras', name: 'Compras', color: '#4bc0c0', brightColor: '#6dd4d4', icon: '🛍️' },
    { id: 'salud', name: 'Salud', color: '#9966ff', brightColor: '#b385ff', icon: '💊' },
    { id: 'hogar', name: 'Hogar', color: '#ffcd56', brightColor: '#ffdb7a', icon: '🏠' }
  ]

  useEffect(() => {
    const savedExpenses = localStorage.getItem('expenses')
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses).map(expense =>
        expense.category === 'comida' ? { ...expense, category: 'restaurantes' } : expense
      ))
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('expenses', JSON.stringify(expenses))
    }
  }, [expenses, isLoading])

  useEffect(() => {
    const savedBudgets = localStorage.getItem('expenseBudgets')
    if (savedBudgets) {
      const parsedBudgets = JSON.parse(savedBudgets)
      const hasMonthSpecificBudgets = Object.keys(parsedBudgets).some(key => /^\d{4}-\d{2}$/.test(key))
      const monthBudgets = hasMonthSpecificBudgets ? parsedBudgets : { [initialBudgetMonth.current]: parsedBudgets }
      const migratedBudgets = Object.fromEntries(
        Object.entries(monthBudgets).map(([month, budgets]) => {
          const migratedMonth = { ...budgets }
          if (migratedMonth.restaurantes === undefined && migratedMonth.comida !== undefined) {
            migratedMonth.restaurantes = migratedMonth.comida
          }
          delete migratedMonth.comida
          return [month, migratedMonth]
        })
      )
      setCategoryBudgets(migratedBudgets)
    }
    setAreBudgetsLoaded(true)
  }, [])

  useEffect(() => {
    if (areBudgetsLoaded) {
      localStorage.setItem('expenseBudgets', JSON.stringify(categoryBudgets))
    }
  }, [categoryBudgets, areBudgetsLoaded])

  const resetExpenseForm = () => {
    setDescription('')
    setAmount('')
    setCategory('general')
    setDate(new Date().toISOString().split('T')[0])
    setShowQuickAdd(false)
  }

  const saveExpense = (e) => {
    e.preventDefault()
    if (!description || !amount) return

    const newExpense = {
      id: Date.now(),
      description,
      amount: parseFloat(amount),
      category,
      date: new Date(date + 'T00:00:00').toLocaleDateString('es-ES')
    }

    setExpenses(currentExpenses => [...currentExpenses, newExpense])
    resetExpenseForm()
  }

  const editExpense = (expense) => {
    const [day, month, year] = expense.date.split('/')
    setEditingValues({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    })
    setEditingExpenseId(expense.id)
  }

  const saveInlineEdit = (e) => {
    e.preventDefault()
    if (!editingValues?.description || !editingValues.amount) return

    const updatedExpense = {
      ...editingValues,
      amount: parseFloat(editingValues.amount),
      date: new Date(editingValues.date + 'T00:00:00').toLocaleDateString('es-ES')
    }

    setExpenses(currentExpenses => currentExpenses.map(expense =>
      expense.id === editingExpenseId ? { ...expense, ...updatedExpense } : expense
    ))
    setEditingExpenseId(null)
    setEditingValues(null)
  }

  const cancelInlineEdit = () => {
    setEditingExpenseId(null)
    setEditingValues(null)
  }

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(expense => expense.id !== id))
  }

  const getTotal = () => {
    const filteredExpenses = filterExpensesByDate()
    return filteredExpenses.reduce((total, expense) => total + expense.amount, 0).toFixed(2)
  }

  const filterExpensesByDate = () => {
    return expenses.filter(expense => {
      const dateParts = expense.date.split('/')
      const expenseDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
      
      const monthMatch = !filterMonth || expenseDate.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase() === filterMonth.toLowerCase()
      const yearMatch = !filterYear || expenseDate.getFullYear().toString() === filterYear
      
      return monthMatch && yearMatch
    })
  }

  const getCategoryTotal = (categoryId) => {
    const filteredExpenses = filterExpensesByDate()
    return filteredExpenses
      .filter(expense => expense.category === categoryId)
      .reduce((total, expense) => total + expense.amount, 0)
      .toFixed(2)
  }

  const startEditingBudget = (categoryId) => {
    const limit = effectiveCategoryBudgets[categoryId]
    setBudgetDraft(limit === undefined ? '' : String(limit))
    setEditingBudgetCategory(categoryId)
  }

  const saveCategoryBudget = (categoryId) => {
    const parsedLimit = budgetDraft.trim() === '' ? 0 : Number(budgetDraft)
    if (!Number.isFinite(parsedLimit) || parsedLimit < 0) return

    setCategoryBudgets(currentBudgets => {
      const monthBudgets = { ...(currentBudgets[budgetMonth] || {}) }
      monthBudgets[categoryId] = parsedLimit
      return { ...currentBudgets, [budgetMonth]: monthBudgets }
    })
    setEditingBudgetCategory(null)
    setBudgetDraft('')
  }

  const cancelEditingBudget = () => {
    setEditingBudgetCategory(null)
    setBudgetDraft('')
  }

  const budgetExpenses = expenses.filter(expense => {
    const [, month, year] = expense.date.split('/')
    return `${year}-${month.padStart(2, '0')}` === budgetMonth
  })
  const budgetSpentByCategory = categories.reduce((totals, cat) => {
    totals[cat.id] = budgetExpenses
      .filter(expense => expense.category === cat.id)
      .reduce((total, expense) => total + expense.amount, 0)
    return totals
  }, {})
  const octoberBudgetMonth = budgetMonth.endsWith('-10')
    ? budgetMonth
    : `${budgetMonth.slice(0, 4)}-10` in categoryBudgets
      ? `${budgetMonth.slice(0, 4)}-10`
      : Object.keys(categoryBudgets)
        .filter(month => /^\d{4}-10$/.test(month))
        .sort()
        .pop()
  const octoberBudgets = octoberBudgetMonth ? categoryBudgets[octoberBudgetMonth] || {} : {}
  const effectiveCategoryBudgets = categories.reduce((budgets, cat) => {
    const monthBudgets = categoryBudgets[budgetMonth] || {}
    budgets[cat.id] = Object.prototype.hasOwnProperty.call(monthBudgets, cat.id)
      ? Number(monthBudgets[cat.id])
      : octoberBudgets[cat.id]
    return budgets
  }, {})
  const totalBudgetAllowed = categories.reduce((total, cat) => {
    const limit = Number(effectiveCategoryBudgets[cat.id])
    return total + (Number.isFinite(limit) && limit > 0 ? limit : 0)
  }, 0)
  const totalBudgetSpent = Object.values(budgetSpentByCategory).reduce((total, spent) => total + spent, 0)
  const totalBudgetProgress = totalBudgetAllowed > 0
    ? Math.min((totalBudgetSpent / totalBudgetAllowed) * 100, 100)
    : totalBudgetSpent > 0 ? 100 : 0

  const getExpensesByMonth = () => {
    const months = {}
    const filteredExpenses = filterExpensesByDate()
    
    filteredExpenses.forEach(expense => {
      const dateParts = expense.date.split('/')
      const expenseDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
      const monthKey = expenseDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
      if (!months[monthKey]) {
        months[monthKey] = []
      }
      months[monthKey].push(expense)
    })
    return months
  }

  const getAvailableMonthsForYear = (year) => {
    const monthsMap = new Map()
    expenses.forEach(expense => {
      const dateParts = expense.date.split('/')
      const expenseDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
      // Only include months from the selected year
      if (!year || expenseDate.getFullYear().toString() === year) {
        const monthKey = expenseDate.toLocaleDateString('es-ES', { month: 'long' })
        if (!monthsMap.has(monthKey)) {
          monthsMap.set(monthKey, expenseDate)
        }
      }
    })
    const sortedMonths = Array.from(monthsMap.entries()).sort((a, b) => b[1] - a[1])
    return sortedMonths.map(([month]) => month)
  }

  const getAvailableYears = () => {
    const years = new Set()
    expenses.forEach(expense => {
      const dateParts = expense.date.split('/')
      const expenseDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
      years.add(expenseDate.getFullYear().toString())
    })
    return Array.from(years).sort((a, b) => b - a)
  }

  const filteredExpenses = filterExpensesByDate()
  const chartCategoryTotals = categories.reduce((totals, cat) => {
    totals[cat.id] = filteredExpenses
      .filter(expense => expense.category === cat.id)
      .reduce((sum, expense) => sum + expense.amount, 0)
    return totals
  }, {})
  const chartTotal = Object.values(chartCategoryTotals).reduce((sum, amount) => sum + amount, 0)

  const getPieChartGradient = () => {
    const total = chartTotal
    if (total === 0) return 'conic-gradient(#e0e0e0 0% 100%)'

    let currentPercentage = 0
    const slices = categories
      .map(category => ({ category, amount: chartCategoryTotals[category.id] }))
      .filter(slice => slice.amount > 0)

    const gradient = slices.map((slice, index) => {
      const color = hoveredCategory === slice.category.id ? slice.category.brightColor : slice.category.color
      const endPercentage = index === slices.length - 1
        ? 100
        : currentPercentage + (slice.amount / total) * 100
      const segment = `${color} ${currentPercentage}% ${endPercentage}%`
      currentPercentage = endPercentage
      return segment
    }).join(', ')

    return gradient ? `conic-gradient(${gradient})` : 'conic-gradient(#e0e0e0 0% 100%)'
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px' }}>
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
          ← Volver al Inicio
        </a>
      </div>
      <h1 style={{ color: '#333', marginBottom: '20px', textAlign: 'center' }}>
        💰 Control de Gastos
      </h1>

      {/* Global Month Filter */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '10px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <label style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>📅 Filtrar por:</label>
        <select
          value={filterYear}
          onChange={(e) => {
            setFilterYear(e.target.value)
            setFilterMonth('') // Reset month when year changes
          }}
          style={{
            padding: '10px 15px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '15px',
            color: '#333',
            backgroundColor: 'white',
            minWidth: '120px'
          }}
        >
          <option value="">Todos los años</option>
          {getAvailableYears().map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          style={{
            padding: '10px 15px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '15px',
            color: '#333',
            backgroundColor: 'white',
            minWidth: '200px'
          }}
        >
          <option value="">Todos los meses</option>
          {getAvailableMonthsForYear(filterYear).map(month => (
            <option key={month} value={month}>{month.charAt(0).toUpperCase() + month.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Quick Add Expense - Desplegable */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#218838'
            e.target.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#28a745'
            e.target.style.transform = 'translateY(0)'
          }}
        >
          {showQuickAdd ? '▼ Añadir Gasto' : '➕ Añadir Gasto'}
        </button>
        
        {showQuickAdd && (
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '10px', 
            marginTop: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <form onSubmit={saveExpense}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <input
                  aria-label="Descripción del gasto"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción"
                  required
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                />
                <input
                  aria-label="Cantidad en euros"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Cantidad (€)"
                  required
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                />
                <select
                  aria-label="Categoría del gasto"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                <input
                  aria-label="Fecha del gasto"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ padding: '10px 14px', border: 'none', borderRadius: '8px', backgroundColor: '#28a745', color: 'white', cursor: 'pointer' }}>
                  ➕ Añadir Gasto
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Total Gastado - Ancho pero no alto */}
      <div style={{ 
        backgroundColor: '#007bff', 
        color: 'white', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '20px',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: '0', fontSize: '20px' }}>💵 Total Gastado</h2>
        <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0' }}>
          €{getTotal()}
        </p>
      </div>

      {/* Gráfico de porcentajes - Pie Chart */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: showCategoryDistribution ? '25px' : '15px',
        borderRadius: '12px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: showCategoryDistribution ? 'default' : 'pointer'
      }}
        onClick={() => {
          if (!showCategoryDistribution) setShowCategoryDistribution(true)
        }}
      >
        <button
          type="button"
          aria-expanded={showCategoryDistribution}
          aria-controls="category-distribution-content"
          onClick={() => setShowCategoryDistribution(open => !open)}
          style={{ width: '100%', padding: 0, border: 'none', background: 'none', color: '#495057', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', position: 'relative', marginBottom: showCategoryDistribution ? '20px' : 0 }}
        >
          📊 Distribución por Categorías
          <span aria-hidden="true" style={{ position: 'absolute', right: 0 }}>{showCategoryDistribution ? '▲' : '▼'}</span>
        </button>
        <div id="category-distribution-content" style={{ display: showCategoryDistribution ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
          {/* Pie Chart */}
          <div style={{ 
            width: '250px', 
            height: '250px', 
            borderRadius: '50%', 
            background: getPieChartGradient(),
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            position: 'relative',
            transition: 'all 0.3s ease'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {hoveredCategory ? (
                <>
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
                    {categories.find(c => c.id === hoveredCategory)?.icon} {categories.find(c => c.id === hoveredCategory)?.name}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                    {chartTotal === 0 ? '0.0' : ((chartCategoryTotals[hoveredCategory] / chartTotal) * 100).toFixed(1)}%
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>Total</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>€{chartTotal.toFixed(2)}</div>
                </>
              )}
            </div>
          </div>
          
          {/* Legend */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', width: '100%' }}>
            {categories.map(cat => {
              const total = chartCategoryTotals[cat.id]
              if (total === 0) return null
              const percentage = chartTotal === 0 ? 0 : ((total / chartTotal) * 100).toFixed(1)
              return (
                <div
                  key={cat.id}
                  onMouseEnter={() => setHoveredCategory(cat.id)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  style={{
                    backgroundColor: hoveredCategory === cat.id ? '#e8f4fd' : 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: hoveredCategory === cat.id ? '0 4px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: hoveredCategory === cat.id ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    backgroundColor: hoveredCategory === cat.id ? cat.brightColor : cat.color,
                    flexShrink: 0,
                    boxShadow: hoveredCategory === cat.id ? `0 0 10px ${cat.brightColor}` : 'none',
                    transition: 'all 0.3s ease'
                  }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{cat.icon} {cat.name}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>{percentage}% - €{total.toFixed(2)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%', boxSizing: 'border-box' }}>
      {/* Presupuesto mensual por categoría */}
      <section style={{
        backgroundColor: '#f8f9fa',
        padding: showMonthlyBudget ? '25px' : '15px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        order: 2,
        width: '100%',
        boxSizing: 'border-box',
        cursor: showMonthlyBudget ? 'default' : 'pointer'
      }}
        onClick={() => {
          if (!showMonthlyBudget) setShowMonthlyBudget(true)
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '15px', marginBottom: showMonthlyBudget ? '20px' : 0 }}>
          <button
            type="button"
            aria-expanded={showMonthlyBudget}
            aria-controls="monthly-budget-content"
            onClick={() => setShowMonthlyBudget(open => !open)}
            style={{ gridColumn: '1 / -1', gridRow: 1, width: '100%', padding: 0, border: 'none', background: 'none', color: '#495057', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', position: 'relative' }}
          >
            💳 Presupuesto mensual
            <span aria-hidden="true" style={{ position: 'absolute', right: 0 }}>{showMonthlyBudget ? '▲' : '▼'}</span>
          </button>
          {showMonthlyBudget && (
          <label style={{ gridColumn: '1 / -1', gridRow: 2, justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '10px', color: '#495057', fontWeight: 'bold' }}>
            Mes:
            <input
              aria-label="Mes del presupuesto"
              type="month"
              value={budgetMonth}
              onChange={(e) => {
                setBudgetMonth(e.target.value)
                cancelEditingBudget()
              }}
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontWeight: 'normal' }}
            />
          </label>
          )}
        </div>

        <div id="monthly-budget-content" style={{ display: showMonthlyBudget ? 'block' : 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>Gastado</div>
            <strong style={{ display: 'block', fontSize: '22px', color: '#333' }}>€{totalBudgetSpent.toFixed(2)}</strong>
          </div>
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>Total permitido</div>
            <strong style={{ display: 'block', fontSize: '22px', color: '#333' }}>€{totalBudgetAllowed.toFixed(2)}</strong>
          </div>
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>
              {totalBudgetSpent > totalBudgetAllowed ? 'Excedido' : 'Disponible'}
            </div>
            <strong style={{ display: 'block', fontSize: '22px', color: totalBudgetSpent > totalBudgetAllowed ? '#dc3545' : '#28a745' }}>
              €{Math.abs(totalBudgetAllowed - totalBudgetSpent).toFixed(2)}
            </strong>
          </div>
        </div>

        {totalBudgetAllowed > 0 ? (
          <div
            role="progressbar"
            aria-label="Porcentaje del presupuesto mensual gastado"
            aria-valuenow={Math.round(totalBudgetProgress)}
            aria-valuemin="0"
            aria-valuemax="100"
            style={{ height: '12px', backgroundColor: '#e9ecef', borderRadius: '6px', overflow: 'hidden', marginBottom: '20px' }}
          >
            <div style={{
              height: '100%',
              width: `${totalBudgetProgress}%`,
              backgroundColor: totalBudgetSpent > totalBudgetAllowed ? '#dc3545' : '#007bff',
              transition: 'width 0.3s ease'
            }} />
          </div>
        ) : (
          <p style={{ color: '#6c757d', textAlign: 'center', margin: '0 0 20px' }}>
            Define un límite en una o más categorías para calcular el total permitido.
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
          {categories.map(cat => {
            const savedLimit = effectiveCategoryBudgets[cat.id]
            const limit = Number(savedLimit) || 0
            const spent = budgetSpentByCategory[cat.id]
            const overLimit = limit > 0 && spent > limit
            const progress = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0

            return (
              <div key={cat.id} style={{ backgroundColor: 'white', padding: '14px', borderRadius: '8px', borderLeft: `4px solid ${overLimit ? '#dc3545' : cat.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <strong style={{ color: '#333', fontSize: '14px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {cat.icon} {cat.name}
                  </strong>
                  {editingBudgetCategory === cat.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6c757d' }}>
                        €
                        <input
                          aria-label={`Límite mensual para ${cat.name}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Sin límite"
                          value={budgetDraft}
                          onChange={(e) => setBudgetDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCategoryBudget(cat.id)
                            if (e.key === 'Escape') cancelEditingBudget()
                          }}
                          style={{ width: '92px', height: '30px', padding: '4px 6px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box', fontSize: '13px' }}
                          autoFocus
                        />
                      </label>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: limit > 0 ? '#333' : '#6c757d', fontSize: '14px' }}>
                        {limit > 0 ? `€${limit.toFixed(2)}` : 'Sin límite'}
                      </strong>
                      <button
                        type="button"
                        aria-label={`Editar límite para ${cat.name}`}
                        onClick={() => startEditingBudget(cat.id)}
                        style={{ border: 'none', borderRadius: '5px', padding: '3px 5px', backgroundColor: '#e9ecef', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: overLimit ? '#dc3545' : '#6c757d', marginBottom: '8px' }}>
                  {limit > 0
                    ? `Gastado: €${spent.toFixed(2)} de €${limit.toFixed(2)}${overLimit ? ` · Excedido €${(spent - limit).toFixed(2)}` : ''}`
                    : `Gastado: €${spent.toFixed(2)} · Sin límite definido`}
                </div>
                {limit > 0 && (
                  <div style={{ height: '7px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, backgroundColor: overLimit ? '#dc3545' : cat.color }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        </div>
      </section>

      {/* Resumen por categorías */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: showCategorySummary ? '25px' : '15px', 
        borderRadius: '12px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        order: 1,
        width: '100%',
        boxSizing: 'border-box',
        cursor: showCategorySummary ? 'default' : 'pointer'
      }}
        onClick={() => {
          if (!showCategorySummary) setShowCategorySummary(true)
        }}
      >
        <button
          type="button"
          aria-expanded={showCategorySummary}
          aria-controls="category-summary-content"
          onClick={() => setShowCategorySummary(open => !open)}
          style={{ width: '100%', padding: 0, border: 'none', background: 'none', color: '#495057', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', position: 'relative', marginBottom: showCategorySummary ? '12px' : 0 }}
        >
          📈 Resumen por Categorías
          <span aria-hidden="true" style={{ position: 'absolute', right: 0 }}>{showCategorySummary ? '▲' : '▼'}</span>
        </button>
        <div id="category-summary-content" style={{ display: showCategorySummary ? 'grid' : 'none', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: '10px' }}>
          {categories.map(cat => {
            const total = getCategoryTotal(cat.id)
            return (
              <div
                key={cat.id}
                style={{
                  backgroundColor: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${cat.color}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '22px', marginBottom: '5px' }}>{cat.icon}</div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#333', fontSize: '13px' }}>{cat.name}</div>
                <div style={{ fontSize: '18px', color: cat.color, fontWeight: 'bold' }}>
                  €{total}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      </div>

      {/* Lista de gastos por meses */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: showExpenseHistory ? '25px' : '15px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: showExpenseHistory ? 'default' : 'pointer'
      }}
        onClick={() => {
          if (!showExpenseHistory) setShowExpenseHistory(true)
        }}
      >
        <button
          type="button"
          aria-expanded={showExpenseHistory}
          aria-controls="expense-history-content"
          onClick={() => setShowExpenseHistory(open => !open)}
          style={{ width: '100%', padding: 0, border: 'none', background: 'none', color: '#495057', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', position: 'relative', marginBottom: showExpenseHistory ? '20px' : 0 }}
        >
          📅 Historial
          <span aria-hidden="true" style={{ position: 'absolute', right: 0 }}>{showExpenseHistory ? '▲' : '▼'}</span>
        </button>
        <div id="expense-history-content" style={{ display: showExpenseHistory ? 'block' : 'none' }}>
        {expenses.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
            No hay gastos registrados. ¡Añade tu primer gasto!
          </p>
        ) : (
          <div>
            {Object.entries(getExpensesByMonth()).map(([month, monthExpenses]) => (
              <div key={month} style={{ marginBottom: '30px' }}>
                <h3 style={{ 
                  color: '#333', 
                  marginBottom: '15px', 
                  borderBottom: '2px solid #007bff',
                  paddingBottom: '10px',
                  fontSize: '20px'
                }}>
                  📆 {month.charAt(0).toUpperCase() + month.slice(1)}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {monthExpenses.map(expense => {
                    const cat = categories.find(c => c.id === expense.category)
                    return (
                      <div
                        key={expense.id}
                        style={{
                          backgroundColor: 'white',
                          padding: '15px',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderLeft: `5px solid ${cat.color}`,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateX(5px)'
                          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateX(0)'
                          e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        {editingExpenseId === expense.id ? (
                          <form onSubmit={saveInlineEdit} style={{ width: '100%' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                              <input
                                aria-label="Descripción del gasto"
                                type="text"
                                value={editingValues.description}
                                onChange={(e) => setEditingValues({ ...editingValues, description: e.target.value })}
                                required
                                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                              />
                              <input
                                aria-label="Cantidad en euros"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editingValues.amount}
                                onChange={(e) => setEditingValues({ ...editingValues, amount: e.target.value })}
                                required
                                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                              />
                              <select
                                aria-label="Categoría del gasto"
                                value={editingValues.category}
                                onChange={(e) => setEditingValues({ ...editingValues, category: e.target.value })}
                                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                              >
                                {categories.map(option => (
                                  <option key={option.id} value={option.id}>{option.icon} {option.name}</option>
                                ))}
                              </select>
                              <input
                                aria-label="Fecha del gasto"
                                type="date"
                                value={editingValues.date}
                                onChange={(e) => setEditingValues({ ...editingValues, date: e.target.value })}
                                required
                                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                              <button type="button" onClick={cancelInlineEdit} style={{ padding: '10px 14px', border: 'none', borderRadius: '8px', backgroundColor: '#6c757d', color: 'white', cursor: 'pointer' }}>
                                Cancelar
                              </button>
                              <button type="submit" style={{ padding: '10px 14px', border: 'none', borderRadius: '8px', backgroundColor: '#28a745', color: 'white', cursor: 'pointer' }}>
                                💾 Guardar cambios
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <div style={{ fontSize: '28px' }}>{cat.icon}</div>
                              <div>
                                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>
                                  {expense.description}
                                </div>
                                <div style={{ color: '#6c757d', fontSize: '14px' }}>
                                  {cat.name} • {expense.date}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <div style={{ fontSize: '22px', fontWeight: 'bold', color: cat.color }}>
                                €{expense.amount.toFixed(2)}
                              </div>
                              <button
                                onClick={() => editExpense(expense)}
                                aria-label={`Editar gasto: ${expense.description}`}
                                style={{ backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', fontSize: '16px' }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteExpense(expense.id)}
                                aria-label={`Eliminar gasto: ${expense.description}`}
                                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', fontSize: '16px' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

    </div>
  )
}

export default Expenses
