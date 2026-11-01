import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useUserData } from './auth/useUserData.js'

function formatCurrency(amount) {
  return `${Number(amount).toFixed(2)} €`
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addRecurrenceInterval(dateString, frequency, preferredDay = parseLocalDate(dateString).getDate()) {
  const date = parseLocalDate(dateString)
  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  date.setDate(1)
  date.setMonth(date.getMonth() + 1)
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(preferredDay, lastDayOfMonth))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function Expenses() {
  const [expenses, setExpenses] = useUserData('expenses', [])
  const [recurringMovements, setRecurringMovements] = useUserData('recurringMovements', [])
  const [savingsGoals, setSavingsGoals] = useUserData('savingsGoals', [])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('general')
  const [movementType, setMovementType] = useState('expense')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('monthly')
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalSaved, setGoalSaved] = useState('')
  const [goalContributions, setGoalContributions] = useState({})
  const [goalActionErrors, setGoalActionErrors] = useState({})
  const [editingSavingsGoalId, setEditingSavingsGoalId] = useState(null)
  const [savingsGoalDraft, setSavingsGoalDraft] = useState({ name: '', target: '' })
  const [historySearch, setHistorySearch] = useState('')
  const [historyCategory, setHistoryCategory] = useState('all')
  const [historyType, setHistoryType] = useState('all')
  const [historyFromDate, setHistoryFromDate] = useState('')
  const [historyToDate, setHistoryToDate] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showCategoryDistribution, setShowCategoryDistribution] = useState(false)
  const [showCategorySummary, setShowCategorySummary] = useState(false)
  const [showCategoryReportPreview, setShowCategoryReportPreview] = useState(false)
  const [isGeneratingCategoryReport, setIsGeneratingCategoryReport] = useState(false)
  const [categoryReportError, setCategoryReportError] = useState('')
  const [selectedSummaryCategories, setSelectedSummaryCategories] = useState([])
  const [showMonthlyBudget, setShowMonthlyBudget] = useState(false)
  const [showSavingsGoals, setShowSavingsGoals] = useState(false)
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState('all')
  const [showExpenseHistory, setShowExpenseHistory] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [selectedDistributionCategory, setSelectedDistributionCategory] = useState(null)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [editingValues, setEditingValues] = useState(null)
  const [savedCategoryBudgets, setCategoryBudgets] = useUserData('expenseBudgets', {})
  const [budgetMonth, setBudgetMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const initialBudgetMonth = useRef(budgetMonth)
  const [editingBudgetCategory, setEditingBudgetCategory] = useState(null)
  const [budgetDraft, setBudgetDraft] = useState('')
  const categoryReportPreviewRef = useRef(null)
  const processedRecurringOccurrences = useRef(new Set())

  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const generatedMovements = []
    let hasUpdatedSchedule = false
    const updatedRecurringMovements = recurringMovements.map(template => {
      let nextDate = template.nextDate
      let occurrences = 0
      while (parseLocalDate(nextDate) <= today && occurrences < 240) {
        const occurrenceId = `${template.id}-${nextDate}`
        if (!processedRecurringOccurrences.current.has(occurrenceId)) {
          processedRecurringOccurrences.current.add(occurrenceId)
          generatedMovements.push({
            id: occurrenceId,
            description: template.description,
            amount: template.amount,
            category: template.category,
            type: template.type,
            date: parseLocalDate(nextDate).toLocaleDateString('es-ES'),
            recurringId: template.id
          })
        }
        nextDate = addRecurrenceInterval(nextDate, template.frequency, template.dayOfMonth)
        occurrences += 1
      }
      if (nextDate !== template.nextDate) hasUpdatedSchedule = true
      return nextDate === template.nextDate ? template : { ...template, nextDate }
    })

    if (generatedMovements.length > 0) {
      setExpenses(currentExpenses => {
        const existingIds = new Set(currentExpenses.map(expense => expense.id))
        return [...currentExpenses, ...generatedMovements.filter(expense => !existingIds.has(expense.id))]
      })
    }
    if (hasUpdatedSchedule) setRecurringMovements(updatedRecurringMovements)
  }, [recurringMovements, setExpenses, setRecurringMovements])

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
  const incomeCategories = [
    { id: 'salary', name: 'Salario', color: '#28a745', brightColor: '#52c76f', icon: '💼' },
    { id: 'refunds', name: 'Devoluciones', color: '#36a2eb', brightColor: '#5bb8f5', icon: '↩️' },
    { id: 'sales', name: 'Ventas', color: '#845ec2', brightColor: '#a27de0', icon: '🛍️' },
    { id: 'other-income', name: 'Otros ingresos', color: '#ff9f40', brightColor: '#ffb366', icon: '💰' }
  ]
  const allCategories = [...categories, ...incomeCategories]
  const currentCategories = movementType === 'income' ? incomeCategories : categories

  const hasMonthSpecificBudgets = Object.keys(savedCategoryBudgets).some(key => /^\d{4}-\d{2}$/.test(key))
  const monthBudgets = hasMonthSpecificBudgets
    ? savedCategoryBudgets
    : { [initialBudgetMonth.current]: savedCategoryBudgets }
  const categoryBudgets = Object.fromEntries(
    Object.entries(monthBudgets).map(([month, budgets]) => {
      const migratedMonth = { ...budgets }
      if (migratedMonth.restaurantes === undefined && migratedMonth.comida !== undefined) {
        migratedMonth.restaurantes = migratedMonth.comida
      }
      delete migratedMonth.comida
      return [month, migratedMonth]
    })
  )

  const resetExpenseForm = () => {
    setDescription('')
    setAmount('')
    setCategory('general')
    setMovementType('expense')
    setDate(new Date().toISOString().split('T')[0])
    setIsRecurring(false)
    setRecurrenceFrequency('monthly')
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
      type: movementType,
      date: new Date(date + 'T00:00:00').toLocaleDateString('es-ES')
    }

    setExpenses(currentExpenses => [...currentExpenses, newExpense])
    if (isRecurring) {
      const recurringId = `recurring-${Date.now()}`
      setRecurringMovements(current => [...current, {
        id: recurringId,
        description,
        amount: Number.parseFloat(amount),
        category,
        type: movementType,
        frequency: recurrenceFrequency,
        dayOfMonth: parseLocalDate(date).getDate(),
        nextDate: addRecurrenceInterval(date, recurrenceFrequency)
      }])
    }
    resetExpenseForm()
  }

  const editExpense = (expense) => {
    const [day, month, year] = expense.date.split('/')
    setEditingValues({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      type: expense.type || 'expense',
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    })
    setEditingExpenseId(expense.id)
  }

  const updateEditingMovementType = (type) => {
    setEditingValues(current => current && ({
      ...current,
      type,
      category: type === 'income' ? incomeCategories[0].id : categories[0].id
    }))
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

  const saveSavingsGoal = (event) => {
    event.preventDefault()
    const target = Number(goalTarget)
    const saved = Number(goalSaved || 0)
    if (!goalName.trim() || !Number.isFinite(target) || target <= 0 || !Number.isFinite(saved) || saved < 0) return

    setSavingsGoals(current => [...current, {
      id: `goal-${Date.now()}`,
      name: goalName.trim(),
      target,
      saved
    }])
    setGoalName('')
    setGoalTarget('')
    setGoalSaved('')
  }

  const addSavingsContribution = (goalId) => {
    const contribution = Number(goalContributions[goalId])
    if (!Number.isFinite(contribution) || contribution <= 0) return

    setSavingsGoals(current => current.map(goal => (
      goal.id === goalId ? { ...goal, saved: Number(goal.saved) + contribution } : goal
    )))
    setGoalActionErrors(current => ({ ...current, [goalId]: '' }))
    setGoalContributions(current => ({ ...current, [goalId]: '' }))
  }

  const withdrawSavingsContribution = (goal) => {
    const contribution = Number(goalContributions[goal.id])
    if (!Number.isFinite(contribution) || contribution <= 0) return
    if (contribution > Number(goal.saved)) {
      setGoalActionErrors(current => ({ ...current, [goal.id]: 'No puedes retirar más dinero del que has ahorrado.' }))
      return
    }

    setSavingsGoals(current => current.map(item => (
      item.id === goal.id ? { ...item, saved: Number(item.saved) - contribution } : item
    )))
    setGoalActionErrors(current => ({ ...current, [goal.id]: '' }))
    setGoalContributions(current => ({ ...current, [goal.id]: '' }))
  }

  const startEditingSavingsGoal = (goal) => {
    setEditingSavingsGoalId(goal.id)
    setSavingsGoalDraft({ name: goal.name, target: String(goal.target) })
  }

  const saveEditedSavingsGoal = (goalId) => {
    const name = savingsGoalDraft.name.trim()
    const target = Number(savingsGoalDraft.target)
    if (!name || !Number.isFinite(target) || target <= 0) {
      setGoalActionErrors(current => ({ ...current, [goalId]: 'Introduce un nombre y una meta válida.' }))
      return
    }

    setSavingsGoals(current => current.map(goal => (
      goal.id === goalId ? { ...goal, name, target } : goal
    )))
    setGoalActionErrors(current => ({ ...current, [goalId]: '' }))
    setEditingSavingsGoalId(null)
  }

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(expense => expense.id !== id))
  }

  const getTotal = () => {
    const filteredExpenses = filterExpensesByDate()
    return filteredExpenses
      .filter(expense => expense.type !== 'income')
      .reduce((total, expense) => total + expense.amount, 0)
  }

  const getIncomeTotal = () => {
    return filterExpensesByDate()
      .filter(expense => expense.type === 'income')
      .reduce((total, income) => total + income.amount, 0)
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
      .filter(expense => (
        expense.category === categoryId &&
        (incomeCategories.some(cat => cat.id === categoryId)
          ? expense.type === 'income'
          : expense.type !== 'income')
      ))
      .reduce((total, expense) => total + expense.amount, 0)
  }

  const categoryReportRows = allCategories.map(cat => ({
    ...cat,
    total: getCategoryTotal(cat.id),
    isIncome: incomeCategories.some(incomeCategory => incomeCategory.id === cat.id)
  }))
  const categoryReportDetails = selectedSummaryCategories
    .map(categoryId => {
      const selectedCategory = allCategories.find(cat => cat.id === categoryId)
      if (!selectedCategory) return null

      const isIncome = incomeCategories.some(cat => cat.id === categoryId)
      const movements = filterExpensesByDate()
        .filter(expense => (
          expense.category === categoryId &&
          (isIncome ? expense.type === 'income' : expense.type !== 'income')
        ))
        .sort((first, second) => {
          const [firstDay, firstMonth, firstYear] = first.date.split('/')
          const [secondDay, secondMonth, secondYear] = second.date.split('/')
          return new Date(`${secondYear}-${secondMonth}-${secondDay}`) -
            new Date(`${firstYear}-${firstMonth}-${firstDay}`)
        })

      return { category: selectedCategory, isIncome, movements }
    })
    .filter(Boolean)
  const categoryReportExpenses = getTotal()
  const categoryReportIncome = getIncomeTotal()
  const categoryReportBalance = categoryReportIncome - categoryReportExpenses
  const categoryReportPeriod = [
    filterMonth ? filterMonth.charAt(0).toUpperCase() + filterMonth.slice(1) : null,
    filterYear || null
  ].filter(Boolean).join(' ') || 'Todos los periodos'

  const downloadCategoryReport = async () => {
    setIsGeneratingCategoryReport(true)
    setCategoryReportError('')
    try {
      const { jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      if (!categoryReportPreviewRef.current) {
        throw new Error('No se encontró la vista previa para generar el PDF.')
      }

      const canvas = await html2canvas(categoryReportPreviewRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      })
      const pdf = new jsPDF()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pageMargin = 10
      const imageWidth = pdf.internal.pageSize.getWidth() - pageMargin * 2
      const imageHeight = canvas.height * imageWidth / canvas.width
      const pageContentHeight = pageHeight - pageMargin * 2
      const pixelsPerPage = Math.floor(canvas.height * pageContentHeight / imageHeight)
      let sourceY = 0

      while (sourceY < canvas.height) {
        const sliceHeight = Math.min(pixelsPerPage, canvas.height - sourceY)
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sliceHeight
        const pageContext = pageCanvas.getContext('2d')
        if (!pageContext) throw new Error('No se pudo preparar una página del PDF.')
        pageContext.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)
        const sliceImageHeight = sliceHeight * imageWidth / canvas.width
        if (sourceY > 0) pdf.addPage()
        pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', pageMargin, pageMargin, imageWidth, sliceImageHeight)
        sourceY += sliceHeight
      }

      pdf.save(`resumen-categorias-${filterYear || 'todos'}-${filterMonth || 'meses'}.pdf`)
    } catch (error) {
      console.error('No se pudo generar el resumen PDF por categorías.', error)
      setCategoryReportError('No se pudo generar el PDF. Inténtalo de nuevo.')
    } finally {
      setIsGeneratingCategoryReport(false)
    }
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
    return expense.type !== 'income' && `${year}-${month.padStart(2, '0')}` === budgetMonth
  })
  const budgetSpentByCategory = categories.reduce((totals, cat) => {
    totals[cat.id] = budgetExpenses
      .filter(expense => expense.category === cat.id)
      .reduce((total, expense) => total + expense.amount, 0)
    return totals
  }, {})
  const selectedBudgetMovements = selectedBudgetCategory === 'all'
    ? []
    : budgetExpenses
      .filter(expense => expense.category === selectedBudgetCategory)
      .sort((first, second) => {
        const [firstDay, firstMonth, firstYear] = first.date.split('/')
        const [secondDay, secondMonth, secondYear] = second.date.split('/')
        return new Date(`${secondYear}-${secondMonth}-${secondDay}`) -
          new Date(`${firstYear}-${firstMonth}-${firstDay}`)
      })
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
  const budgetCategory = categories.find(cat => cat.id === selectedBudgetCategory)
  const displayedBudgetSpent = budgetCategory ? budgetSpentByCategory[budgetCategory.id] : totalBudgetSpent
  const displayedBudgetAllowed = budgetCategory
    ? Math.max(Number(effectiveCategoryBudgets[budgetCategory.id]) || 0, 0)
    : totalBudgetAllowed
  const displayedBudgetProgress = displayedBudgetAllowed > 0
    ? (displayedBudgetSpent / displayedBudgetAllowed) * 100
    : displayedBudgetSpent > 0 ? 100 : 0
  const displayedBudgetExceeded = displayedBudgetSpent > displayedBudgetAllowed
  const displayedBudgetProgressColor = displayedBudgetProgress > 100
    ? '#dc3545'
    : displayedBudgetProgress >= 75
      ? '#fd7e14'
      : displayedBudgetProgress >= 50
        ? '#ffc107'
        : '#28a745'

  const getExpensesByMonth = () => {
    const months = {}
    const filteredExpenses = filterHistoryExpenses()
    
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

  const filterHistoryExpenses = () => {
    const search = historySearch.trim().toLocaleLowerCase('es-ES')
    return filterExpensesByDate().filter(expense => {
      const categoryMatches = historyCategory === 'all' || expense.category === historyCategory
      const typeMatches = historyType === 'all' ||
        (historyType === 'income' ? expense.type === 'income' : expense.type !== 'income')
      const [day, month, year] = expense.date.split('/')
      const expenseDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      const fromMatches = !historyFromDate || expenseDate >= historyFromDate
      const toMatches = !historyToDate || expenseDate <= historyToDate
      const categoryName = allCategories.find(item => item.id === expense.category)?.name || ''
      const searchMatches = !search ||
        `${expense.description} ${categoryName}`.toLocaleLowerCase('es-ES').includes(search)
      return categoryMatches && typeMatches && fromMatches && toMatches && searchMatches
    })
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

  const filteredExpenses = filterExpensesByDate().filter(expense => expense.type !== 'income')
  const chartCategoryTotals = categories.reduce((totals, cat) => {
    totals[cat.id] = filteredExpenses
      .filter(expense => expense.category === cat.id)
      .reduce((sum, expense) => sum + expense.amount, 0)
    return totals
  }, {})
  const chartTotal = Object.values(chartCategoryTotals).reduce((sum, amount) => sum + amount, 0)
  const incomeCategoryTotals = incomeCategories.reduce((totals, cat) => {
    totals[cat.id] = filterExpensesByDate()
      .filter(expense => expense.type === 'income' && expense.category === cat.id)
      .reduce((sum, expense) => sum + expense.amount, 0)
    return totals
  }, {})
  const incomeTotal = Object.values(incomeCategoryTotals).reduce((sum, amount) => sum + amount, 0)
  const selectedDistributionCategories = selectedDistributionCategory?.type === 'income'
    ? incomeCategories
    : categories
  const selectedDistributionDetails = selectedDistributionCategory
    ? {
        category: selectedDistributionCategories.find(cat => cat.id === selectedDistributionCategory.id),
        expenses: filterExpensesByDate()
          .filter(expense => (
            expense.category === selectedDistributionCategory.id &&
            (selectedDistributionCategory.type === 'income'
              ? expense.type === 'income'
              : expense.type !== 'income')
          ))
          .sort((first, second) => {
            const [firstDay, firstMonth, firstYear] = first.date.split('/')
            const [secondDay, secondMonth, secondYear] = second.date.split('/')
            return new Date(`${secondYear}-${secondMonth}-${secondDay}`) -
              new Date(`${firstYear}-${firstMonth}-${firstDay}`)
          })
      }
    : null

  const getPieChartGradient = (categoryList, totals, total) => {
    if (total === 0) return 'conic-gradient(#e0e0e0 0% 100%)'

    let currentPercentage = 0
    const slices = categoryList
      .map(category => ({ category, amount: totals[category.id] }))
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
          ← Volver al Inicio
        </Link>
      </div>
      <h1 style={{ color: '#333', marginBottom: '20px', textAlign: 'center' }}>
          💰 Control de las finanzas
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
          {showQuickAdd ? '▼ Añadir movimiento' : '➕ Añadir movimiento'}
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
                <select
                  aria-label="Tipo de movimiento"
                  value={movementType}
                  onChange={event => {
                    const nextType = event.target.value
                    setMovementType(nextType)
                    setCategory(nextType === 'income' ? incomeCategories[0].id : categories[0].id)
                  }}
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                >
                  <option value="expense">💸 Gasto</option>
                  <option value="income">💰 Ingreso</option>
                </select>
                <input
                  aria-label="Descripción del movimiento"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción"
                  required
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                />
                <input
                  aria-label="Importe en euros"
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
                  aria-label="Categoría del movimiento"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                >
                  {currentCategories.map(cat => (
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

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#495057' }}>
                  <input type="checkbox" checked={isRecurring} onChange={event => setIsRecurring(event.target.checked)} />
                  Repetir movimiento
                </label>
                {isRecurring && (
                  <select
                    aria-label="Frecuencia del movimiento"
                    value={recurrenceFrequency}
                    onChange={event => setRecurrenceFrequency(event.target.value)}
                    style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                  >
                    <option value="monthly">Cada mes</option>
                    <option value="weekly">Cada semana</option>
                  </select>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ padding: '10px 14px', border: 'none', borderRadius: '8px', backgroundColor: '#28a745', color: 'white', cursor: 'pointer' }}>
                  {movementType === 'income' ? '💰 Añadir ingreso' : '💸 Añadir gasto'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {recurringMovements.length > 0 && (
        <section style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
          <h2 style={{ margin: '0 0 12px', color: '#495057', fontSize: '18px' }}>🔁 Movimientos recurrentes</h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            {recurringMovements.map(template => {
              const templateCategory = allCategories.find(item => item.id === template.category)
              return (
                <div key={template.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: 'white', borderRadius: '7px', borderLeft: `4px solid ${templateCategory?.color || '#6c757d'}` }}>
                  <span style={{ color: '#333' }}>
                    {templateCategory?.icon} {template.description} · {formatCurrency(template.amount)} · {template.frequency === 'weekly' ? 'Semanal' : 'Mensual'} · Próximo: {parseLocalDate(template.nextDate).toLocaleDateString('es-ES')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRecurringMovements(current => current.filter(item => item.id !== template.id))}
                    aria-label={`Eliminar recurrencia: ${template.description}`}
                    style={{ border: 'none', borderRadius: '6px', padding: '6px 9px', backgroundColor: '#dc3545', color: 'white', cursor: 'pointer', flexShrink: 0 }}
                  >
                    Eliminar
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#fff4f4', color: '#b42318', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '15px' }}>💸 Gastos</div>
          <strong style={{ display: 'block', marginTop: '4px', fontSize: '26px' }}>{formatCurrency(getTotal())}</strong>
        </div>
        <div style={{ backgroundColor: '#effaf2', color: '#18743a', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '15px' }}>💰 Ingresos</div>
          <strong style={{ display: 'block', marginTop: '4px', fontSize: '26px' }}>{formatCurrency(getIncomeTotal())}</strong>
        </div>
        <div style={{ backgroundColor: '#eef5ff', color: '#245eb5', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '15px' }}>⚖️ Balance</div>
          <strong style={{ display: 'block', marginTop: '4px', fontSize: '26px', color: getIncomeTotal() - getTotal() < 0 ? '#b42318' : '#18743a' }}>
            {getIncomeTotal() - getTotal() < 0 ? '−' : ''}{formatCurrency(Math.abs(getIncomeTotal() - getTotal()))}
          </strong>
        </div>
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
          📊 Distribución por categorías
          <span aria-hidden="true" style={{ position: 'absolute', right: 0 }}>{showCategoryDistribution ? '▲' : '▼'}</span>
        </button>
        <div id="category-distribution-content" style={{ display: showCategoryDistribution ? 'flex' : 'none', flexDirection: 'column', gap: '20px' }}>
          <div className="finance-distribution-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', minWidth: 0 }}>
          <h3 style={{ margin: 0, color: '#495057', fontSize: '16px' }}>Gastos por categoría</h3>
          {/* Pie Chart */}
          <div style={{ 
            width: '250px', 
            height: '250px', 
            borderRadius: '50%', 
            background: getPieChartGradient(categories, chartCategoryTotals, chartTotal),
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
              {categories.some(category => category.id === hoveredCategory) ? (
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
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{formatCurrency(chartTotal)}</div>
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
                <button
                  type="button"
                  key={cat.id}
                  aria-pressed={selectedDistributionCategory?.type === 'expense' && selectedDistributionCategory.id === cat.id}
                  onClick={() => setSelectedDistributionCategory(current => (
                    current?.type === 'expense' && current.id === cat.id ? null : { type: 'expense', id: cat.id }
                  ))}
                  onMouseEnter={() => setHoveredCategory(cat.id)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  style={{
                    backgroundColor: hoveredCategory === cat.id ? '#e8f4fd' : 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    border: selectedDistributionCategory?.type === 'expense' && selectedDistributionCategory.id === cat.id
                      ? `2px solid ${cat.color}`
                      : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: hoveredCategory === cat.id ? '0 4px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: hoveredCategory === cat.id ? 'scale(1.03)' : 'scale(1)',
                    textAlign: 'left',
                    font: 'inherit'
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
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>{percentage}% - {formatCurrency(total)}</div>
                </div>
                </button>
              )
            })}
          </div>
          </div>
          <div className="finance-income-distribution" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', minWidth: 0 }}>
            <h3 style={{ margin: 0, color: '#495057', fontSize: '16px' }}>Ingresos por categoría</h3>
            <div style={{
              width: '250px',
              height: '250px',
              maxWidth: '100%',
              borderRadius: '50%',
              background: getPieChartGradient(incomeCategories, incomeCategoryTotals, incomeTotal),
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              position: 'relative'
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
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
                padding: '8px',
                boxSizing: 'border-box'
              }}>
                {incomeCategories.some(cat => cat.id === hoveredCategory) ? (
                  <>
                    <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '5px' }}>
                      {incomeCategories.find(cat => cat.id === hoveredCategory)?.icon} {incomeCategories.find(cat => cat.id === hoveredCategory)?.name}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                      {incomeTotal === 0 ? '0.0' : ((incomeCategoryTotals[hoveredCategory] / incomeTotal) * 100).toFixed(1)}%
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>Total</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{formatCurrency(incomeTotal)}</div>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', width: '100%' }}>
              {incomeCategories.map(cat => {
                const total = incomeCategoryTotals[cat.id]
                if (total === 0) return null
                const percentage = ((total / incomeTotal) * 100).toFixed(1)
                return (
                  <button
                    type="button"
                    key={cat.id}
                    aria-pressed={selectedDistributionCategory?.type === 'income' && selectedDistributionCategory.id === cat.id}
                    onClick={() => setSelectedDistributionCategory(current => (
                      current?.type === 'income' && current.id === cat.id ? null : { type: 'income', id: cat.id }
                    ))}
                    onMouseEnter={() => setHoveredCategory(cat.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    style={{
                      backgroundColor: hoveredCategory === cat.id ? '#e8f4fd' : 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      border: selectedDistributionCategory?.type === 'income' && selectedDistributionCategory.id === cat.id
                        ? `2px solid ${cat.color}`
                        : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: hoveredCategory === cat.id ? '0 4px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textAlign: 'left',
                      font: 'inherit'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: hoveredCategory === cat.id ? cat.brightColor : cat.color,
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{cat.icon} {cat.name}</div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{percentage}% - {formatCurrency(total)}</div>
                  </div>
                  </button>
                )
              })}
            </div>
          </div>
          </div>
          {selectedDistributionDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
              <strong style={{ color: '#333', marginBottom: '4px' }}>
                {selectedDistributionDetails.category?.icon} {selectedDistributionDetails.category?.name}: {selectedDistributionCategory.type === 'income' ? 'ingresos' : 'gastos'} registrados
              </strong>
              {selectedDistributionDetails.expenses.length === 0 ? (
                <span style={{ color: '#6c757d' }}>No hay movimientos para esta categoría en el periodo seleccionado.</span>
              ) : (
                selectedDistributionDetails.expenses.map(expense => (
                  <div
                    key={expense.id}
                    style={{
                      backgroundColor: 'white',
                      padding: '15px',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '15px',
                      borderLeft: `5px solid ${selectedDistributionDetails.category?.color || '#6c757d'}`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {editingExpenseId === expense.id ? (
                      <form onSubmit={saveInlineEdit} style={{ width: '100%' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                          <select
                            aria-label="Tipo de movimiento"
                            value={editingValues.type || 'expense'}
                            onChange={event => updateEditingMovementType(event.target.value)}
                            style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                          >
                            <option value="expense">💸 Gasto</option>
                            <option value="income">💰 Ingreso</option>
                          </select>
                          <input
                            aria-label="Descripción del movimiento"
                            type="text"
                            value={editingValues.description}
                            onChange={event => setEditingValues({ ...editingValues, description: event.target.value })}
                            required
                            style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                          />
                          <select
                            aria-label="Categoría del movimiento"
                            value={editingValues.category}
                            onChange={event => setEditingValues(current => ({ ...current, category: event.target.value }))}
                            style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                          >
                            {(editingValues.type === 'income' ? incomeCategories : categories).map(option => (
                              <option key={option.id} value={option.id}>{option.icon} {option.name}</option>
                            ))}
                          </select>
                          <input
                            aria-label="Importe en euros"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editingValues.amount}
                            onChange={event => setEditingValues({ ...editingValues, amount: event.target.value })}
                            required
                            style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                          />
                          <input
                            aria-label="Fecha del movimiento"
                            type="date"
                            value={editingValues.date}
                            onChange={event => setEditingValues({ ...editingValues, date: event.target.value })}
                            required
                            style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
                          <div style={{ fontSize: '28px' }}>{selectedDistributionDetails.category?.icon}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>{expense.description}</div>
                            <div style={{ color: '#6c757d', fontSize: '14px' }}>
                              {selectedDistributionDetails.category?.name} • {expense.date}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <strong style={{ fontSize: '18px', color: expense.type === 'income' ? '#18743a' : '#b42318' }}>
                            {expense.type === 'income' ? '+' : '−'}{formatCurrency(expense.amount)}
                          </strong>
                          <button
                            type="button"
                            onClick={() => editExpense(expense)}
                            aria-label={`Editar movimiento: ${expense.description}`}
                            style={{ backgroundColor: '#e9ecef', color: '#495057', border: 'none', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' }}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteExpense(expense.id)}
                            aria-label={`Eliminar movimiento: ${expense.description}`}
                            style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '15px', marginBottom: showMonthlyBudget ? '20px' : 0 }}>
          <button
            type="button"
            aria-expanded={showMonthlyBudget}
            aria-controls="monthly-budget-content"
            onClick={() => setShowMonthlyBudget(open => !open)}
            style={{ width: '100%', padding: 0, border: 'none', background: 'none', color: '#495057', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', position: 'relative' }}
          >
            💳 Presupuesto mensual
            <span aria-hidden="true" style={{ position: 'absolute', right: 0 }}>{showMonthlyBudget ? '▲' : '▼'}</span>
          </button>
          {showMonthlyBudget && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#495057', fontWeight: 'bold' }}>
                Resumen de:
                <select
                  aria-label="Categoría del resumen de presupuesto"
                  value={selectedBudgetCategory}
                  onChange={event => setSelectedBudgetCategory(event.target.value)}
                  style={{ maxWidth: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontWeight: 'normal' }}
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#495057', fontWeight: 'bold' }}>
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
            </div>
          )}
        </div>

        <div id="monthly-budget-content" style={{ display: showMonthlyBudget ? 'block' : 'none' }}>
        {budgetCategory && displayedBudgetAllowed > 0 && displayedBudgetProgress > 75 && (
          <div
            role="status"
            style={{
              padding: '10px 12px',
              marginBottom: '12px',
              borderRadius: '7px',
              backgroundColor: displayedBudgetExceeded ? '#fff0f0' : '#fff8e1',
              color: displayedBudgetExceeded ? '#b42318' : '#8a6100',
              fontWeight: 'bold',
              fontSize: '13px'
            }}
          >
            {displayedBudgetExceeded
              ? `⚠️ Presupuesto excedido por ${formatCurrency(displayedBudgetSpent - displayedBudgetAllowed)}.`
              : `⚠️ Has utilizado el ${Math.round(displayedBudgetProgress)}% del presupuesto de ${budgetCategory.name}.`}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>Gastado</div>
            <strong style={{ display: 'block', fontSize: '22px', color: '#333' }}>{formatCurrency(displayedBudgetSpent)}</strong>
          </div>
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>Total permitido</div>
            <strong style={{ display: 'block', fontSize: '22px', color: '#333' }}>
              {budgetCategory && displayedBudgetAllowed === 0 ? 'Sin límite' : formatCurrency(displayedBudgetAllowed)}
            </strong>
          </div>
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>
              {displayedBudgetAllowed === 0 && budgetCategory
                ? 'Disponible'
                : displayedBudgetExceeded ? 'Excedido' : 'Disponible'}
            </div>
            <strong style={{ display: 'block', fontSize: '22px', color: displayedBudgetExceeded ? '#dc3545' : '#28a745' }}>
              {displayedBudgetAllowed === 0 && budgetCategory
                ? 'Sin límite'
                : formatCurrency(Math.abs(displayedBudgetAllowed - displayedBudgetSpent))}
            </strong>
          </div>
        </div>

        {displayedBudgetAllowed > 0 ? (
          <div
            role="progressbar"
            aria-label="Porcentaje del presupuesto mensual gastado"
            aria-valuenow={Math.min(Math.round(displayedBudgetProgress), 100)}
            aria-valuemin="0"
            aria-valuemax="100"
            style={{ height: '12px', backgroundColor: '#e9ecef', borderRadius: '6px', overflow: 'hidden', marginBottom: '20px' }}
          >
            <div style={{
              height: '100%',
              width: `${Math.min(displayedBudgetProgress, 100)}%`,
              backgroundColor: displayedBudgetProgressColor,
              transition: 'width 0.3s ease'
            }} />
          </div>
        ) : (
          <p style={{ color: '#6c757d', textAlign: 'center', margin: '0 0 20px' }}>
            {budgetCategory
              ? `La categoría ${budgetCategory.name} no tiene un límite definido.`
              : 'Define un límite en una o más categorías para calcular el total permitido.'}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
          {categories.map(cat => {
            const savedLimit = effectiveCategoryBudgets[cat.id]
            const limit = Number(savedLimit) || 0
            const spent = budgetSpentByCategory[cat.id]
            const overLimit = limit > 0 && spent > limit
            const progress = limit > 0 ? (spent / limit) * 100 : 0
            const progressColor = progress > 100
              ? '#dc3545'
              : progress >= 75
                ? '#fd7e14'
                : progress >= 50
                ? '#ffc107'
                : '#28a745'

            const isSelected = selectedBudgetCategory === cat.id

            return (
              <div
                key={cat.id}
                onClick={event => {
                  if (event.target.closest('button, input, select')) return
                  setSelectedBudgetCategory(current => current === cat.id ? 'all' : cat.id)
                }}
                style={{
                  backgroundColor: 'white',
                  padding: '14px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${overLimit ? '#dc3545' : cat.color}`,
                  outline: isSelected ? `2px solid ${cat.color}` : 'none',
                  outlineOffset: '1px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={event => {
                      event.stopPropagation()
                      setSelectedBudgetCategory(current => current === cat.id ? 'all' : cat.id)
                    }}
                    style={{ color: '#333', fontSize: '14px', whiteSpace: 'nowrap', flexShrink: 0, border: 'none', padding: 0, background: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {cat.icon} {cat.name}
                  </button>
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
                        {limit > 0 ? formatCurrency(limit) : 'Sin límite'}
                      </strong>
                      <button
                        type="button"
                        aria-label={`Editar límite para ${cat.name}`}
                        onClick={event => {
                          event.stopPropagation()
                          startEditingBudget(cat.id)
                        }}
                        style={{ border: 'none', borderRadius: '5px', padding: '3px 5px', backgroundColor: '#e9ecef', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
                {limit > 0 && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', marginBottom: '6px', fontSize: '12px' }}>
                      <span style={{ color: '#6c757d' }}>Gastado</span>
                      <strong style={{ color: overLimit ? '#dc3545' : '#333', overflowWrap: 'anywhere' }}>
                        {formatCurrency(spent)} de {formatCurrency(limit)}
                      </strong>
                    </div>
                    <div style={{ height: '7px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, backgroundColor: progressColor, transition: 'width 0.3s ease, background-color 0.3s ease' }} />
                    </div>
                    {overLimit && (
                      <strong style={{ display: 'block', color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
                        Excedido {formatCurrency(spent - limit)}
                      </strong>
                    )}
                    {!overLimit && progress > 75 && (
                      <strong style={{ display: 'block', color: '#8a6100', fontSize: '12px', marginTop: '5px' }}>
                        ⚠️ Has utilizado el {Math.round(progress)}% del límite.
                      </strong>
                    )}
                  </>
                )}
                {limit <= 0 && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ color: '#6c757d' }}>Gastado</span>
                      <strong style={{ color: '#333' }}>{formatCurrency(spent)}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Sin límite definido</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
        {budgetCategory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', marginTop: '16px', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
            <strong style={{ color: '#333', marginBottom: '4px' }}>
              {budgetCategory.icon} {budgetCategory.name}: gastos registrados en el mes
            </strong>
            {selectedBudgetMovements.length === 0 ? (
              <span style={{ color: '#6c757d' }}>No hay gastos para esta categoría en el mes seleccionado.</span>
            ) : (
              selectedBudgetMovements.map(expense => (
                <div
                  key={expense.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '15px',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '15px',
                    borderLeft: `5px solid ${budgetCategory.color}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {editingExpenseId === expense.id ? (
                    <form onSubmit={saveInlineEdit} style={{ width: '100%' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                      <select
                        aria-label="Tipo de movimiento"
                        value={editingValues.type || 'expense'}
                        onChange={event => updateEditingMovementType(event.target.value)}
                        style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                      >
                        <option value="expense">💸 Gasto</option>
                        <option value="income">💰 Ingreso</option>
                      </select>
                      <input
                          aria-label="Descripción del gasto"
                          type="text"
                          value={editingValues.description}
                          onChange={event => setEditingValues({ ...editingValues, description: event.target.value })}
                          required
                          style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                        <select
                          aria-label="Categoría del movimiento"
                          value={editingValues.category}
                          onChange={event => setEditingValues(current => ({ ...current, category: event.target.value }))}
                          style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                        >
                          {(editingValues.type === 'income' ? incomeCategories : categories).map(option => (
                            <option key={option.id} value={option.id}>{option.icon} {option.name}</option>
                          ))}
                        </select>
                        <input
                          aria-label="Importe del gasto en euros"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editingValues.amount}
                          onChange={event => setEditingValues({ ...editingValues, amount: event.target.value })}
                          required
                          style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                        <input
                          aria-label="Fecha del gasto"
                          type="date"
                          value={editingValues.date}
                          onChange={event => setEditingValues({ ...editingValues, date: event.target.value })}
                          required
                          style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
                        <div style={{ fontSize: '28px' }}>{budgetCategory.icon}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>{expense.description}</div>
                          <div style={{ color: '#6c757d', fontSize: '14px' }}>{budgetCategory.name} • {expense.date}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <strong style={{ fontSize: '18px', color: '#b42318' }}>−{formatCurrency(expense.amount)}</strong>
                        <button
                          type="button"
                          onClick={() => editExpense(expense)}
                          aria-label={`Editar gasto: ${expense.description}`}
                          style={{ backgroundColor: '#e9ecef', color: '#495057', border: 'none', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' }}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteExpense(expense.id)}
                          aria-label={`Eliminar gasto: ${expense.description}`}
                          style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        </div>
      </section>

      <section style={{ backgroundColor: '#f8f9fa', padding: showSavingsGoals ? '18px' : '15px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <button
          type="button"
          aria-expanded={showSavingsGoals}
          aria-controls="savings-goals-content"
          onClick={() => setShowSavingsGoals(open => !open)}
          style={{ width: '100%', padding: 0, border: 'none', background: 'none', color: '#495057', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', position: 'relative' }}
        >
          🎯 Objetivos de ahorro
          <span aria-hidden="true" style={{ position: 'absolute', right: 0 }}>{showSavingsGoals ? '▲' : '▼'}</span>
        </button>
        <div id="savings-goals-content" style={{ display: showSavingsGoals ? 'block' : 'none', marginTop: '16px' }}>
          <form onSubmit={saveSavingsGoal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: savingsGoals.length ? '16px' : 0 }}>
            <input
              aria-label="Nombre del objetivo de ahorro"
              type="text"
              value={goalName}
              onChange={event => setGoalName(event.target.value)}
              placeholder="Nombre del objetivo"
              required
              style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
            <input
              aria-label="Importe objetivo en euros"
              type="number"
              min="0.01"
              step="0.01"
              value={goalTarget}
              onChange={event => setGoalTarget(event.target.value)}
              placeholder="Meta (€)"
              required
              style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
            <input
              aria-label="Ahorro actual en euros"
              type="number"
              min="0"
              step="0.01"
              value={goalSaved}
              onChange={event => setGoalSaved(event.target.value)}
              placeholder="Ahorrado (€)"
              style={{ minWidth: 0, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
            <button type="submit" style={{ padding: '10px 14px', border: 'none', borderRadius: '7px', backgroundColor: '#245eb5', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
              Añadir objetivo
            </button>
          </form>
          {savingsGoals.length === 0 ? (
            <p style={{ margin: 0, color: '#6c757d', fontSize: '13px' }}>Crea un objetivo para seguir tu progreso de ahorro.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {savingsGoals.map(goal => {
                const progress = Math.min((Number(goal.saved) / Number(goal.target)) * 100, 100)
                const isEditing = editingSavingsGoalId === goal.id
                return (
                  <div key={goal.id} style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px', borderLeft: '4px solid #36a2eb' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                        {isEditing ? (
                          <input
                            aria-label={`Nombre del objetivo ${goal.name}`}
                            type="text"
                            value={savingsGoalDraft.name}
                            onChange={event => setSavingsGoalDraft(current => ({ ...current, name: event.target.value }))}
                            required
                            style={{ minWidth: 0, flex: 1, padding: '5px', border: '1px solid #ddd', borderRadius: '5px', fontWeight: 'bold' }}
                          />
                        ) : (
                          <strong style={{ color: '#333' }}>{goal.name}</strong>
                        )}
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          {isEditing ? (
                            <>
                              <button type="button" onClick={() => saveEditedSavingsGoal(goal.id)} aria-label={`Guardar cambios de ${goal.name}`} style={{ border: 'none', borderRadius: '5px', padding: '4px 7px', backgroundColor: '#e8f5e9', color: '#18743a', cursor: 'pointer' }}>✓</button>
                              <button type="button" aria-label="Cancelar edición" onClick={() => setEditingSavingsGoalId(null)} style={{ border: 'none', borderRadius: '5px', padding: '4px 7px', backgroundColor: '#f1f3f5', color: '#495057', cursor: 'pointer' }}>×</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEditingSavingsGoal(goal)} aria-label={`Editar objetivo ${goal.name}`} style={{ border: 'none', borderRadius: '5px', padding: '4px 7px', backgroundColor: '#e9ecef', cursor: 'pointer' }}>✏️</button>
                              <button
                                type="button"
                                aria-label={`Eliminar objetivo ${goal.name}`}
                                onClick={() => setSavingsGoals(current => current.filter(item => item.id !== goal.id))}
                                style={{ border: 'none', borderRadius: '5px', padding: '4px 7px', backgroundColor: '#dc3545', color: 'white', cursor: 'pointer' }}
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', margin: '8px 0', color: '#6c757d', fontSize: '13px' }}>
                        <span>{formatCurrency(goal.saved)} ahorrados</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                          Meta:
                          {isEditing ? (
                            <input
                              aria-label={`Importe meta de ${goal.name}`}
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={savingsGoalDraft.target}
                              onChange={event => setSavingsGoalDraft(current => ({ ...current, target: event.target.value }))}
                              required
                              style={{ width: '90px', padding: '4px', border: '1px solid #ddd', borderRadius: '5px' }}
                            />
                          ) : (
                            <span>{formatCurrency(goal.target)}</span>
                          )}
                        </label>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#e9ecef', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: progress >= 100 ? '#28a745' : '#36a2eb', transition: 'width 0.2s ease' }} />
                      </div>
                      {progress >= 100 && <strong style={{ display: 'block', marginTop: '8px', color: '#18743a', fontSize: '12px' }}>¡Objetivo alcanzado!</strong>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <input
                        aria-label={`Cantidad para aportar o retirar de ${goal.name}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={goalContributions[goal.id] ?? ''}
                        onChange={event => setGoalContributions(current => ({ ...current, [goal.id]: event.target.value }))}
                        placeholder="Cantidad (€)"
                        style={{ minWidth: 0, flex: 1, padding: '7px', border: '1px solid #ddd', borderRadius: '6px' }}
                      />
                      <button type="button" onClick={() => addSavingsContribution(goal.id)} disabled={!goalContributions[goal.id] || Number(goalContributions[goal.id]) <= 0} style={{ padding: '7px 10px', border: 'none', borderRadius: '6px', backgroundColor: '#18743a', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}>Aportar</button>
                      <button type="button" onClick={() => withdrawSavingsContribution(goal)} disabled={!goalContributions[goal.id] || Number(goalContributions[goal.id]) <= 0} style={{ padding: '7px 10px', border: 'none', borderRadius: '6px', backgroundColor: '#dc3545', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}>Retirar</button>
                    </div>
                    {goalActionErrors[goal.id] && <p role="alert" style={{ margin: '6px 0 0', color: '#b42318', fontSize: '12px' }}>{goalActionErrors[goal.id]}</p>}
                  </div>
                )
              })}
            </div>
          )}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: showCategorySummary ? '12px' : 0 }}>
          <button
            type="button"
            aria-expanded={showCategorySummary}
            aria-controls="category-summary-content"
            onClick={() => setShowCategorySummary(open => !open)}
            style={{ flex: 1, padding: 0, border: 'none', background: 'none', color: '#495057', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', position: 'relative' }}
          >
            📈 Resumen por Categorías
            <span aria-hidden="true" style={{ position: 'absolute', right: 0 }}>{showCategorySummary ? '▲' : '▼'}</span>
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation()
              setShowCategoryReportPreview(true)
            }}
            style={{ flexShrink: 0, padding: '8px 12px', border: 'none', borderRadius: '7px', backgroundColor: '#245eb5', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📄 PDF
          </button>
        </div>
        <div id="category-summary-content" style={{ display: showCategorySummary ? 'grid' : 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation()
              setSelectedSummaryCategories(current => (
                current.length === allCategories.length ? [] : allCategories.map(cat => cat.id)
              ))
            }}
            style={{ gridColumn: '1 / -1', justifySelf: 'start', padding: '6px 10px', border: '1px solid #cbd2da', borderRadius: '6px', backgroundColor: '#fff', color: '#245eb5', cursor: 'pointer' }}
          >
            {selectedSummaryCategories.length === allCategories.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
          </button>
          {allCategories.map(cat => {
            const total = getCategoryTotal(cat.id)
            const isSelected = selectedSummaryCategories.includes(cat.id)
            const isIncome = incomeCategories.some(incomeCategory => incomeCategory.id === cat.id)
            return (
              <button
                type="button"
                key={cat.id}
                aria-pressed={isSelected}
                aria-controls={isSelected ? `category-expenses-${cat.id}` : undefined}
                onClick={event => {
                  event.stopPropagation()
                  setSelectedSummaryCategories(current => (
                    isSelected
                      ? current.filter(categoryId => categoryId !== cat.id)
                      : [...current, cat.id]
                  ))
                }}
                style={{
                  backgroundColor: 'white',
                  padding: '12px',
                  height: '104px',
                  boxSizing: 'border-box',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${cat.color}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  textAlign: 'center',
                  font: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  outline: isSelected ? `2px solid ${cat.color}` : 'none',
                  outlineOffset: '1px'
                }}
              >
                <div style={{ fontSize: '18px', lineHeight: '20px', marginBottom: '2px' }}>{cat.icon}</div>
                <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#333', fontSize: '12px', minHeight: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cat.name}</div>
                <div style={{ fontSize: '14px', color: isIncome ? '#18743a' : '#b42318', fontWeight: 'bold', whiteSpace: 'nowrap', marginTop: 'auto' }}>
                  {total === 0 ? '' : isIncome ? '+' : '−'}{formatCurrency(Number(total))}
                </div>
              </button>
            )
          })}
          {selectedSummaryCategories.map(categoryId => {
            const selectedCategory = allCategories.find(cat => cat.id === categoryId)
            const categoryExpenses = filterExpensesByDate()
              .filter(expense => expense.category === categoryId)
              .sort((first, second) => {
                const [firstDay, firstMonth, firstYear] = first.date.split('/')
                const [secondDay, secondMonth, secondYear] = second.date.split('/')
                return new Date(`${secondYear}-${secondMonth}-${secondDay}`) -
                  new Date(`${firstYear}-${firstMonth}-${firstDay}`)
              })

            return (
              <div
                key={categoryId}
                id={`category-expenses-${categoryId}`}
                style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '8px', backgroundColor: '#f8f9fa' }}
              >
                <strong style={{ color: '#333', marginBottom: '4px' }}>
                  {selectedCategory?.icon} {selectedCategory?.name}: {incomeCategories.some(cat => cat.id === categoryId) ? 'ingresos' : 'gastos'} registrados
                </strong>
                {categoryExpenses.length === 0 ? (
                  <span style={{ color: '#6c757d' }}>No hay gastos para esta categoría en el periodo seleccionado.</span>
                ) : (
                  categoryExpenses.map(expense => (
                    <div
                      key={expense.id}
                      style={{
                        backgroundColor: 'white',
                        padding: '15px',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '15px',
                        borderLeft: `5px solid ${selectedCategory?.color || '#6c757d'}`,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {editingExpenseId === expense.id ? (
                        <form onSubmit={saveInlineEdit} style={{ width: '100%' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                            <select
                              aria-label="Tipo de movimiento"
                              value={editingValues.type || 'expense'}
                              onChange={event => updateEditingMovementType(event.target.value)}
                              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                            >
                              <option value="expense">💸 Gasto</option>
                              <option value="income">💰 Ingreso</option>
                            </select>
                            <input
                              aria-label="Descripción del movimiento"
                              type="text"
                              value={editingValues.description}
                              onChange={event => setEditingValues({ ...editingValues, description: event.target.value })}
                              required
                              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                            />
                            <input
                              aria-label="Importe en euros"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editingValues.amount}
                              onChange={event => setEditingValues({ ...editingValues, amount: event.target.value })}
                              required
                              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                            />
                            <select
                              aria-label="Categoría del movimiento"
                              value={editingValues.category}
                              onChange={event => setEditingValues({ ...editingValues, category: event.target.value })}
                              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                            >
                              {(editingValues.type === 'income' ? incomeCategories : categories).map(option => (
                                <option key={option.id} value={option.id}>{option.icon} {option.name}</option>
                              ))}
                            </select>
                            <input
                              aria-label="Fecha del gasto"
                              type="date"
                              value={editingValues.date}
                              onChange={event => setEditingValues({ ...editingValues, date: event.target.value })}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
                            <div style={{ fontSize: '28px' }}>{selectedCategory?.icon}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>
                                {expense.description}
                              </div>
                              <div style={{ color: '#6c757d', fontSize: '14px' }}>
                                {selectedCategory?.name} • {expense.date}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ fontSize: '22px', fontWeight: 'bold', color: expense.type === 'income' ? '#18743a' : '#b42318' }}>
                              {expense.type === 'income' ? '+' : '−'}{formatCurrency(expense.amount)}
                            </div>
                            <button
                              type="button"
                              onClick={() => editExpense(expense)}
                              aria-label={`Editar gasto: ${expense.description}`}
                              style={{ backgroundColor: '#e9ecef', color: '#495057', border: 'none', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', fontSize: '16px' }}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
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
                  ))
                )}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '18px' }}>
          <input
            aria-label="Buscar movimientos"
            type="search"
            value={historySearch}
            onChange={event => setHistorySearch(event.target.value)}
            placeholder="Buscar descripción o categoría"
            style={{ minWidth: 0, padding: '9px', border: '1px solid #ddd', borderRadius: '6px' }}
          />
          <select aria-label="Filtrar historial por tipo" value={historyType} onChange={event => setHistoryType(event.target.value)} style={{ minWidth: 0, padding: '9px', border: '1px solid #ddd', borderRadius: '6px' }}>
            <option value="all">Todos los tipos</option>
            <option value="expense">Gastos</option>
            <option value="income">Ingresos</option>
          </select>
          <select aria-label="Filtrar historial por categoría" value={historyCategory} onChange={event => setHistoryCategory(event.target.value)} style={{ minWidth: 0, padding: '9px', border: '1px solid #ddd', borderRadius: '6px' }}>
            <option value="all">Todas las categorías</option>
            {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#495057', fontSize: '13px' }}>
            Desde
            <input aria-label="Fecha inicial del historial" type="date" value={historyFromDate} onChange={event => setHistoryFromDate(event.target.value)} style={{ minWidth: 0, width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#495057', fontSize: '13px' }}>
            Hasta
            <input aria-label="Fecha final del historial" type="date" value={historyToDate} onChange={event => setHistoryToDate(event.target.value)} style={{ minWidth: 0, width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
          </label>
        </div>
        {filterHistoryExpenses().length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
            {expenses.length === 0 ? 'No hay movimientos registrados. ¡Añade tu primer movimiento!' : 'No hay movimientos que coincidan con los filtros seleccionados.'}
          </p>
        ) : (
          <div style={{ textAlign: 'left' }}>
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
                    const cat = allCategories.find(c => c.id === expense.category) || categories[0]
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
                              <select
                                aria-label="Tipo de movimiento"
                                value={editingValues.type || 'expense'}
                                onChange={event => updateEditingMovementType(event.target.value)}
                                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                              >
                                <option value="expense">💸 Gasto</option>
                                <option value="income">💰 Ingreso</option>
                              </select>
                              <input
                                aria-label="Descripción del movimiento"
                                type="text"
                                value={editingValues.description}
                                onChange={(e) => setEditingValues({ ...editingValues, description: e.target.value })}
                                required
                                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                              />
                              <input
                                aria-label="Importe en euros"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editingValues.amount}
                                onChange={(e) => setEditingValues({ ...editingValues, amount: e.target.value })}
                                required
                                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                              />
                              <select
                                aria-label="Categoría del movimiento"
                                value={editingValues.category}
                                onChange={(e) => setEditingValues({ ...editingValues, category: e.target.value })}
                                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
                              >
                                {(editingValues.type === 'income' ? incomeCategories : categories).map(option => (
                                  <option key={option.id} value={option.id}>{option.icon} {option.name}</option>
                                ))}
                              </select>
                              <input
                                aria-label="Fecha del movimiento"
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
                                  {expense.type === 'income' ? 'Ingreso' : 'Gasto'} · {cat.name} • {expense.date}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <div style={{ fontSize: '22px', fontWeight: 'bold', color: expense.type === 'income' ? '#18743a' : '#b42318' }}>
                                {expense.type === 'income' ? '+' : '−'}{formatCurrency(expense.amount)}
                              </div>
                              <button
                                onClick={() => editExpense(expense)}
                                aria-label={`Editar gasto: ${expense.description}`}
                                style={{ backgroundColor: '#e9ecef', color: '#495057', border: 'none', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', fontSize: '16px' }}
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

      {showCategoryReportPreview && (
        <div
          role="presentation"
          onClick={() => setShowCategoryReportPreview(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-report-preview-title"
            onClick={event => event.stopPropagation()}
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              backgroundColor: '#eef0f2',
              borderRadius: '12px',
              padding: '20px',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 id="category-report-preview-title" style={{ margin: 0, color: '#333', fontSize: '20px', textAlign: 'left' }}>Vista previa del PDF</h2>
                <p style={{ margin: '5px 0 0', color: '#6c757d', fontSize: '13px' }}>
                  Se muestra el detalle de los gastos o ingresos de cada categoría seleccionada.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar vista previa"
                onClick={() => setShowCategoryReportPreview(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: '#495057' }}
              >
                ×
              </button>
            </div>
            <div ref={categoryReportPreviewRef} style={{ backgroundColor: 'white', padding: 'clamp(18px, 5vw, 42px)', margin: '0 auto 16px', maxWidth: '595px', minHeight: '500px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', boxSizing: 'border-box', textAlign: 'left' }}>
              <h2 style={{ margin: '0 0 6px', color: '#333', fontSize: '22px' }}>Control de las finanzas</h2>
              <h3 style={{ margin: '0 0 4px', color: '#495057', fontSize: '17px' }}>Resumen por categorías</h3>
              <p style={{ margin: '0 0 20px', color: '#6c757d', fontSize: '13px' }}>Periodo: {categoryReportPeriod}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '20px' }}>
                <div style={{ padding: '10px', backgroundColor: '#fff4f4', borderRadius: '6px', color: '#b42318' }}>
                  <div style={{ fontSize: '12px' }}>Gastos</div>
                  <strong>{formatCurrency(categoryReportExpenses)}</strong>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#effaf2', borderRadius: '6px', color: '#18743a' }}>
                  <div style={{ fontSize: '12px' }}>Ingresos</div>
                  <strong>{formatCurrency(categoryReportIncome)}</strong>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#eef5ff', borderRadius: '6px', color: '#245eb5' }}>
                  <div style={{ fontSize: '12px' }}>Balance</div>
                  <strong>{categoryReportBalance < 0 ? '−' : ''}{formatCurrency(Math.abs(categoryReportBalance))}</strong>
                </div>
              </div>
              <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '8px', marginBottom: '4px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(78px, auto) auto', gap: '12px', fontWeight: 'bold', color: '#495057', fontSize: '13px', textAlign: 'left' }}>
                <span>Categoría y detalle seleccionado</span>
                <span>Fecha</span>
                <span>Importe</span>
              </div>
              {categoryReportRows.map(row => (
                <div key={row.id} style={{ borderBottom: '1px solid #dee2e6', padding: '8px 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(78px, auto) auto', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: '#333', fontSize: '14px' }}>{row.icon} {row.name}</span>
                    <span />
                    <strong style={{ color: row.total === 0 ? '#6c757d' : row.isIncome ? '#18743a' : '#b42318', fontSize: '14px', whiteSpace: 'nowrap' }}>
                      {row.total === 0 ? '' : row.isIncome ? '+' : '−'}{formatCurrency(row.total)}
                    </strong>
                  </div>
                  {categoryReportDetails
                    .filter(detail => detail.category.id === row.id)
                    .map(({ category: selectedCategory, isIncome, movements }) => (
                      <div key={selectedCategory.id} style={{ margin: '8px 0 0 14px', paddingLeft: '12px', borderLeft: `3px solid ${selectedCategory.color}`, backgroundColor: '#f8f9fa' }}>
                        {movements.length === 0 ? (
                          <p style={{ margin: 0, padding: '7px 8px', color: '#6c757d', fontSize: '12px' }}>
                            Sin movimientos en el periodo seleccionado.
                          </p>
                        ) : (
                          movements.map(movement => (
                            <div key={movement.id} style={{ borderBottom: '1px solid #e9ecef', padding: '7px 8px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(78px, auto) auto', gap: '10px', alignItems: 'center' }}>
                              <div style={{ minWidth: 0, color: '#333', fontSize: '13px', overflowWrap: 'anywhere' }}>{movement.description}</div>
                              <span style={{ color: '#6c757d', fontSize: '11px', whiteSpace: 'nowrap' }}>{movement.date}</span>
                              <strong style={{ color: isIncome ? '#18743a' : '#b42318', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                {isIncome ? '+' : '−'}{formatCurrency(movement.amount)}
                              </strong>
                            </div>
                          ))
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </div>
            {categoryReportError && (
              <p role="alert" style={{ margin: '0 0 12px', color: '#b42318', textAlign: 'right' }}>
                {categoryReportError}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCategoryReportPreview(false)}
                style={{ padding: '10px 14px', border: '1px solid #cbd2da', borderRadius: '7px', backgroundColor: 'white', color: '#495057', cursor: 'pointer' }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={downloadCategoryReport}
                disabled={isGeneratingCategoryReport}
                style={{ padding: '10px 14px', border: 'none', borderRadius: '7px', backgroundColor: '#245eb5', color: 'white', fontWeight: 'bold', cursor: isGeneratingCategoryReport ? 'wait' : 'pointer', opacity: isGeneratingCategoryReport ? 0.7 : 1 }}
              >
                {isGeneratingCategoryReport ? 'Generando PDF…' : '⬇ Descargar PDF'}
              </button>
            </div>
          </section>
        </div>
      )}

    </div>
  )
}

export default Expenses
