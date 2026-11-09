import { Fragment, memo, useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useUserData } from './auth/useUserData.js'

function formatCurrency(amount) {
  return `${Number(amount).toFixed(2)} €`
}

function compareMovementDatesAscending(first, second) {
  const [firstDay, firstMonth, firstYear] = first.date.split('/')
  const [secondDay, secondMonth, secondYear] = second.date.split('/')
  return Date.UTC(Number(firstYear), Number(firstMonth) - 1, Number(firstDay)) -
    Date.UTC(Number(secondYear), Number(secondMonth) - 1, Number(secondDay))
}

function getTimelineBuckets(movements, filterMonths, filterYears) {
  const monthNames = Array.from({ length: 12 }, (_, index) => (
    new Date(Date.UTC(2024, index, 1)).toLocaleDateString('es-ES', { month: 'long', timeZone: 'UTC' })
  ))
  const selectedMonthIndexes = filterMonths
    .map(month => monthNames.indexOf(month.toLocaleLowerCase('es-ES')))
    .filter(index => index !== -1)
    .sort((first, second) => first - second)
  const selectedYears = [...filterYears].sort((first, second) => Number(first) - Number(second))
  const selectedMonthIndex = selectedMonthIndexes[0]
  const amountsByPeriod = new Map()

  movements.forEach(movement => {
    const [day, month, year] = movement.date.split('/').map(Number)
    if (!day || !month || !year) return
    const monthIndex = month - 1
    let periodKey
    if (selectedMonthIndexes.length > 0 && selectedYears.length !== 1) {
      periodKey = `${year}-${String(month).padStart(2, '0')}`
    } else if (selectedYears.length !== 1) {
      periodKey = String(year)
    } else if (selectedMonthIndexes.length === 1) {
      periodKey = String(day)
    } else {
      periodKey = String(monthIndex)
    }
    const totals = amountsByPeriod.get(periodKey) || {
      expenses: 0,
      income: 0,
      expenseCount: 0,
      incomeCount: 0,
      expenseCategories: {},
      incomeCategories: {}
    }
    const isIncome = movement.type === 'income'
    const series = isIncome ? 'income' : 'expenses'
    const categorySeries = isIncome ? 'incomeCategories' : 'expenseCategories'
    const categoryId = movement.category || 'general'
    const categoryTotals = totals[categorySeries]
    categoryTotals[categoryId] ||= { count: 0, amount: 0 }
    categoryTotals[categoryId].count += 1
    categoryTotals[categoryId].amount += Number(movement.amount) || 0
    totals[series] += Number(movement.amount) || 0
    totals[isIncome ? 'incomeCount' : 'expenseCount'] += 1
    amountsByPeriod.set(periodKey, totals)
  })

  const emptyPeriod = () => ({
    expenses: 0,
    income: 0,
    expenseCount: 0,
    incomeCount: 0,
    expenseCategories: {},
    incomeCategories: {}
  })

  if (selectedMonthIndexes.length === 1 && selectedYears.length === 1) {
    const yearsToCheck = [Number(selectedYears[0])]
    const dayCount = Math.max(...yearsToCheck.map(year => (
      new Date(Date.UTC(year, selectedMonthIndex + 1, 0)).getUTCDate()
    )))
    return Array.from({ length: dayCount }, (_, index) => {
      const key = String(index + 1)
      return { label: key, key, ...emptyPeriod(), ...amountsByPeriod.get(key) }
    })
  }

  if (selectedMonthIndexes.length > 0 && selectedYears.length !== 1) {
    const years = selectedYears.length > 1
      ? selectedYears
      : [...new Set([...amountsByPeriod.keys()].map(key => key.split('-')[0]))]
        .sort((first, second) => Number(first) - Number(second))
    return years.flatMap(year => selectedMonthIndexes.map(monthIndex => {
      const month = monthIndex + 1
      const key = `${year}-${String(month).padStart(2, '0')}`
      return {
        key,
        label: `${monthNames[monthIndex].slice(0, 3)} ${year}`,
        ...emptyPeriod(),
        ...amountsByPeriod.get(key)
      }
    }))
  }

  if (selectedYears.length !== 1) {
    const years = selectedYears.length > 1
      ? selectedYears
      : [...amountsByPeriod.keys()].sort((first, second) => Number(first) - Number(second))
    return years.map(year => ({
      key: year,
      label: year,
      ...emptyPeriod(),
      ...amountsByPeriod.get(year)
    }))
  }

  const monthIndexes = selectedMonthIndexes.length > 1
    ? selectedMonthIndexes
    : monthNames.map((_, index) => index)
  return monthIndexes.map(index => {
    const month = monthNames[index]
    const key = String(index)
    return {
      label: month.slice(0, 3),
      key,
      ...emptyPeriod(),
      ...amountsByPeriod.get(key)
    }
  })
}

const PDF_CAPTURE_SCALE = 2
const PDF_PAGE_CONTENT_HEIGHT_RATIO = 277 / 190
const HISTORY_PAGE_SIZE = 100

const categories = [
  { id: 'general', name: 'General', color: '#6c757d', brightColor: '#868e96', icon: '📦' },
  { id: 'restaurantes', name: 'Restaurantes', color: '#ff6384', brightColor: '#ff85a1', icon: '🍽️' },
  { id: 'supermercado', name: 'Supermercado', color: '#28a745', brightColor: '#52c76f', icon: '🛒' },
  { id: 'suscripciones', name: 'Suscripciones', color: '#845ec2', brightColor: '#a27de0', icon: '📺' },
  { id: 'transporte', name: 'Transporte', color: '#36a2eb', brightColor: '#5bb8f5', icon: '🚗' },
  { id: 'entretenimiento', name: 'Entretenimiento', color: '#ff9f40', brightColor: '#ffb366', icon: '🎮' },
  { id: 'compras', name: 'Compras', color: '#4bc0c0', brightColor: '#6dd4d4', icon: '🛍️' },
  { id: 'salud', name: 'Salud', color: '#9966ff', brightColor: '#b385ff', icon: '💊' },
  { id: 'hogar', name: 'Hogar', color: '#ffcd56', brightColor: '#ffdb7a', icon: '🏠' },
  { id: 'seguros', name: 'Seguros', color: '#20a39e', brightColor: '#40c4b5', icon: '🛡️' },
  { id: 'viajes', name: 'Viajes', color: '#5b7cfa', brightColor: '#8098ff', icon: '✈️' }
]
const incomeCategories = [
  { id: 'salary', name: 'Salario', color: '#28a745', brightColor: '#52c76f', icon: '💼' },
  { id: 'refunds', name: 'Devoluciones', color: '#36a2eb', brightColor: '#5bb8f5', icon: '↩️' },
  { id: 'sales', name: 'Ventas', color: '#845ec2', brightColor: '#a27de0', icon: '🛍️' },
  { id: 'other-income', name: 'Otros ingresos', color: '#ff9f40', brightColor: '#ffb366', icon: '💰' }
]
const allCategories = [...categories, ...incomeCategories]
const categoriesById = new Map(allCategories.map(category => [category.id, category]))

const QuickAddMovementForm = memo(function QuickAddMovementForm({ onSave }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('general')
  const [movementType, setMovementType] = useState('expense')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('monthly')
  const [showFutureYearConfirmation, setShowFutureYearConfirmation] = useState(false)
  const currentCategories = movementType === 'income' ? incomeCategories : categories

  const movementData = { description, amount, category, movementType, date, isRecurring, recurrenceFrequency }

  const save = event => {
    event.preventDefault()
    if (!description || !amount) return

    if (Number(date.split('-')[0]) > new Date().getFullYear() + 100) {
      setShowFutureYearConfirmation(true)
      return
    }

    onSave(movementData)
  }

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '10px',
      marginTop: '15px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <form onSubmit={save}>
        <div className="quick-movement-fields">
          <select
            aria-label="Tipo de movimiento"
            value={movementType}
            onChange={event => {
              const nextType = event.target.value
              setMovementType(nextType)
              setCategory(nextType === 'income' ? incomeCategories[0].id : categories[0].id)
            }}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0, width: '100%', boxSizing: 'border-box' }}
          >
            <option value="expense">💸 Gasto</option>
            <option value="income">💰 Ingreso</option>
          </select>
          <input
            aria-label="Descripción del movimiento"
            type="text"
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Descripción"
            required
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0, width: '100%', boxSizing: 'border-box' }}
          />
          <input
            aria-label="Importe en euros"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            placeholder="Cantidad (€)"
            required
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0, width: '100%', boxSizing: 'border-box' }}
          />
          <select
            aria-label="Categoría del movimiento"
            value={category}
            onChange={event => setCategory(event.target.value)}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0, width: '100%', boxSizing: 'border-box' }}
          >
            {currentCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
          <input
            aria-label="Fecha del gasto"
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
            required
            style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0, width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div className="quick-movement-actions">
          <div className="quick-movement-recurrence">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={isRecurring} onChange={event => setIsRecurring(event.target.checked)} />
              Repetir movimiento
            </label>
            {isRecurring && (
              <select
                aria-label="Frecuencia del movimiento"
                value={recurrenceFrequency}
                onChange={event => setRecurrenceFrequency(event.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', minWidth: 0 }}
              >
                <option value="weekly">Cada semana</option>
                <option value="monthly">Cada mes</option>
                <option value="yearly">Cada año</option>
              </select>
            )}
          </div>
          <button type="submit" style={{ padding: '10px 14px', border: 'none', borderRadius: '8px', backgroundColor: '#28a745', color: 'white', cursor: 'pointer' }}>
            {movementType === 'income' ? '💰 Añadir ingreso' : '💸 Añadir gasto'}
          </button>
        </div>
      </form>
      {showFutureYearConfirmation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            backgroundColor: 'rgba(32, 24, 28, 0.48)',
            backdropFilter: 'blur(3px)'
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="future-movement-year-title"
            aria-describedby="future-movement-year-description"
            style={{
              width: 'min(420px, 100%)',
              boxSizing: 'border-box',
              padding: '26px',
              border: '1px solid #f1dfb5',
              borderRadius: '20px',
              background: 'linear-gradient(145deg, #fffdf8, #ffffff 72%)',
              boxShadow: '0 24px 70px rgba(32, 24, 28, 0.24)',
              textAlign: 'center'
            }}
          >
            <div
              aria-hidden="true"
              style={{
                display: 'grid',
                width: '54px',
                height: '54px',
                margin: '0 auto 15px',
                placeItems: 'center',
                borderRadius: '17px',
                backgroundColor: '#fff2d6',
                color: '#b7791f',
                fontSize: '27px'
              }}
            >
              ⚠️
            </div>
            <h2 id="future-movement-year-title" style={{ margin: '0 0 9px', color: '#302b30', fontSize: '21px' }}>
              ¿Es correcta la fecha?
            </h2>
            <p id="future-movement-year-description" style={{ margin: '0', color: '#6d6268', fontSize: '14px', lineHeight: 1.6 }}>
              La fecha del movimiento es <strong style={{ color: '#8a5a14' }}>{date.split('-').reverse().join('/')}</strong>. ¿Estás seguro de la fecha indicada?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '22px' }}>
              <button
                type="button"
                autoFocus
                onClick={() => setShowFutureYearConfirmation(false)}
                style={{ padding: '10px 16px', border: '1px solid #d8c9cf', borderRadius: '10px', backgroundColor: 'white', color: '#5d5057', fontWeight: 700, cursor: 'pointer' }}
              >
                Revisar fecha
              </button>
              <button
                type="button"
                onClick={() => onSave(movementData)}
                style={{ padding: '10px 16px', border: 'none', borderRadius: '10px', backgroundColor: '#b7791f', color: 'white', fontWeight: 700, cursor: 'pointer' }}
              >
                Sí, continuar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
})

QuickAddMovementForm.propTypes = {
  onSave: PropTypes.func.isRequired
}

function getPdfPageEnds(totalHeight, pageHeight, candidatePageBreaks) {
  const pageEnds = []
  let pageStart = 0

  while (pageStart < totalHeight) {
    const pageLimit = Math.min(pageStart + pageHeight, totalHeight)
    const pageBreak = candidatePageBreaks
      .filter(({ position }) => position > pageStart && position <= pageLimit)
      .pop()
    const pageEnd = pageLimit === totalHeight || pageBreak === undefined
      ? { position: pageLimit }
      : { position: pageBreak.position, breakId: pageBreak.id }

    pageEnds.push(pageEnd)
    pageStart = pageEnd.position
  }

  return pageEnds
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

  if (frequency === 'yearly') {
    const targetYear = date.getFullYear() + 1
    const month = date.getMonth()
    const lastDayOfMonth = new Date(targetYear, month + 1, 0).getDate()
    date.setFullYear(targetYear, month, Math.min(preferredDay, lastDayOfMonth))
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
  const [historyPeriod, setHistoryPeriod] = useState(null)
  const [historyVisibleCount, setHistoryVisibleCount] = useState(HISTORY_PAGE_SIZE)
  const [filterMonths, setFilterMonths] = useState([])
  const [filterYears, setFilterYears] = useState(() => [String(new Date().getFullYear())])
  const [showMonthFilter, setShowMonthFilter] = useState(false)
  const [showYearFilter, setShowYearFilter] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showCategoryDistribution, setShowCategoryDistribution] = useState(false)
  const [showCategorySummary, setShowCategorySummary] = useState(false)
  const [showMovementTimeline, setShowMovementTimeline] = useState(true)
  const [selectedTimelineTypes, setSelectedTimelineTypes] = useState(['expense'])
  const [hoveredTimelinePeriod, setHoveredTimelinePeriod] = useState(null)
  const [selectedTimelinePeriod, setSelectedTimelinePeriod] = useState(null)
  const [showCategoryReportPreview, setShowCategoryReportPreview] = useState(false)
  const [categoryReportPageBreaks, setCategoryReportPageBreaks] = useState([])
  const [isGeneratingCategoryReport, setIsGeneratingCategoryReport] = useState(false)
  const [categoryReportError, setCategoryReportError] = useState('')
  const [selectedSummaryCategories, setSelectedSummaryCategories] = useState([])
  const [showMonthlyBudget, setShowMonthlyBudget] = useState(false)
  const [showSavingsGoals, setShowSavingsGoals] = useState(false)
  const [showRecurringMovements, setShowRecurringMovements] = useState(false)
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState('all')
  const [showExpenseHistory, setShowExpenseHistory] = useState(false)
  const [shouldScrollToHistory, setShouldScrollToHistory] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [selectedDistributionCategory, setSelectedDistributionCategory] = useState(null)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [editingValues, setEditingValues] = useState(null)
  const [expenseIdToDelete, setExpenseIdToDelete] = useState(null)
  const [goalIdToDelete, setGoalIdToDelete] = useState(null)
  const [recurringIdToDelete, setRecurringIdToDelete] = useState(null)
  const [savedCategoryBudgets, setCategoryBudgets] = useUserData('expenseBudgets', {})
  const [budgetMonth, setBudgetMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const initialBudgetMonth = useRef(budgetMonth)
  const [editingBudgetCategory, setEditingBudgetCategory] = useState(null)
  const [budgetDraft, setBudgetDraft] = useState('')
  const categoryReportPreviewRef = useRef(null)
  const historySectionRef = useRef(null)
  const chartOriginFiltersRef = useRef(null)
  const monthFilterRef = useRef(null)
  const yearFilterRef = useRef(null)
  const processedRecurringOccurrences = useRef(new Set())
  const timelineType = selectedTimelineTypes.length > 1
    ? 'both'
    : selectedTimelineTypes[0] || 'none'

  const toggleTimelineType = type => {
    setSelectedTimelineTypes(current => (
      current.includes(type)
        ? current.filter(selectedType => selectedType !== type)
        : [...current, type]
    ))
  }

  const toggleFilterMonth = month => {
    setFilterMonths(current => (
      current.includes(month)
        ? current.filter(selectedMonth => selectedMonth !== month)
        : [...current, month]
    ))
  }

  const toggleFilterYear = year => {
    setFilterYears(current => (
      (current.includes(year)
        ? current.filter(selectedYear => selectedYear !== year)
        : [...current, year])
        .sort((first, second) => Number(second) - Number(first))
    ))
  }

  useEffect(() => {
    setHoveredTimelinePeriod(null)
    setSelectedTimelinePeriod(null)
  }, [filterMonths, filterYears, timelineType])

  useEffect(() => {
    if (!showMonthFilter) return undefined

    const closeOnOutsideClick = event => {
      if (!monthFilterRef.current?.contains(event.target)) setShowMonthFilter(false)
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') setShowMonthFilter(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [showMonthFilter])

  useEffect(() => {
    if (!showYearFilter) return undefined

    const closeOnOutsideClick = event => {
      if (!yearFilterRef.current?.contains(event.target)) setShowYearFilter(false)
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') setShowYearFilter(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [showYearFilter])

  useEffect(() => {
    setHistoryVisibleCount(HISTORY_PAGE_SIZE)
  }, [expenses, historySearch, historyCategory, historyType, historyFromDate, historyToDate, historyPeriod, filterMonths, filterYears])

  useEffect(() => {
    if (!showExpenseHistory || !shouldScrollToHistory) return undefined

    const frame = requestAnimationFrame(() => {
      historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShouldScrollToHistory(false)
    })
    return () => cancelAnimationFrame(frame)
  }, [showExpenseHistory, shouldScrollToHistory])

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

  const categoryBudgets = useMemo(() => {
    const hasMonthSpecificBudgets = Object.keys(savedCategoryBudgets).some(key => /^\d{4}-\d{2}$/.test(key))
    const monthBudgets = hasMonthSpecificBudgets
      ? savedCategoryBudgets
      : { [initialBudgetMonth.current]: savedCategoryBudgets }
    return Object.fromEntries(
      Object.entries(monthBudgets).map(([month, budgets]) => {
        const migratedMonth = { ...budgets }
        if (migratedMonth.restaurantes === undefined && migratedMonth.comida !== undefined) {
          migratedMonth.restaurantes = migratedMonth.comida
        }
        delete migratedMonth.comida
        return [month, migratedMonth]
      })
    )
  }, [savedCategoryBudgets])

  const saveExpense = useCallback(({ description, amount, category, movementType, date, isRecurring, recurrenceFrequency }) => {
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
    setShowQuickAdd(false)
  }, [setExpenses, setRecurringMovements])

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
    setExpenseIdToDelete(id)
  }

  const confirmDeleteExpense = () => {
    if (recurringIdToDelete !== null) {
      setRecurringMovements(current => current.filter(template => template.id !== recurringIdToDelete))
      setRecurringIdToDelete(null)
      return
    }
    if (goalIdToDelete !== null) {
      setSavingsGoals(currentGoals => currentGoals.filter(goal => goal.id !== goalIdToDelete))
      setGoalIdToDelete(null)
      return
    }
    if (expenseIdToDelete === null) return
    setExpenses(currentExpenses => currentExpenses.filter(expense => expense.id !== expenseIdToDelete))
    setExpenseIdToDelete(null)
  }

  const filteredExpensesByDate = useMemo(() => (
    expenses.filter(expense => {
      const dateParts = expense.date.split('/')
      const expenseDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
      
      const expenseMonth = expenseDate.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase()
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(expenseMonth)
      const yearMatch = filterYears.length === 0 || filterYears.includes(expenseDate.getFullYear().toString())
      
      return monthMatch && yearMatch
    })
  ), [expenses, filterMonths, filterYears])
  const { expenseTotal, incomeTotal, categoryTotals } = useMemo(() => {
    const totals = {
      expenseTotal: 0,
      incomeTotal: 0,
      categoryTotals: Object.fromEntries(allCategories.map(category => [category.id, 0]))
    }

    filteredExpensesByDate.forEach(expense => {
      if (expense.type === 'income') {
        totals.incomeTotal += expense.amount
        if (Object.hasOwn(totals.categoryTotals, expense.category)) {
          totals.categoryTotals[expense.category] += expense.amount
        }
      } else {
        totals.expenseTotal += expense.amount
        if (Object.hasOwn(totals.categoryTotals, expense.category)) {
          totals.categoryTotals[expense.category] += expense.amount
        }
      }
    })

    return totals
  }, [filteredExpensesByDate])
  const movementTimeline = useMemo(
    () => getTimelineBuckets(filteredExpensesByDate, filterMonths, filterYears),
    [filteredExpensesByDate, filterMonths, filterYears]
  )
  const getCategoryTotal = categoryId => categoryTotals[categoryId] || 0

  const categoryReportRows = useMemo(() => allCategories.map(cat => ({
    ...cat,
    total: categoryTotals[cat.id] || 0,
    isIncome: incomeCategories.some(incomeCategory => incomeCategory.id === cat.id)
  })), [categoryTotals])
  const categoryReportDetails = useMemo(() => selectedSummaryCategories
    .map(categoryId => {
      const selectedCategory = allCategories.find(cat => cat.id === categoryId)
      if (!selectedCategory) return null

      const isIncome = incomeCategories.some(cat => cat.id === categoryId)
      const movements = filteredExpensesByDate
        .filter(expense => (
          expense.category === categoryId &&
          (isIncome ? expense.type === 'income' : expense.type !== 'income')
        ))
        .sort(compareMovementDatesAscending)

      return { category: selectedCategory, isIncome, movements }
    })
    .filter(Boolean), [filteredExpensesByDate, selectedSummaryCategories])
  const categoryReportExpenses = expenseTotal
  const categoryReportIncome = incomeTotal
  const categoryReportBalance = categoryReportIncome - categoryReportExpenses
  const categoryReportPeriod = [
    filterMonths.length ? filterMonths.map(month => month.charAt(0).toUpperCase() + month.slice(1)).join(', ') : null,
    filterYears.length ? filterYears.join(', ') : null
  ].filter(Boolean).join(' ') || 'Todos los periodos'

  useEffect(() => {
    if (!showCategoryReportPreview) {
      setCategoryReportPageBreaks([])
      return
    }

    const preview = categoryReportPreviewRef.current
    if (!preview) return

    const updatePageBreaks = () => {
      const bounds = preview.getBoundingClientRect()
      const canvasWidth = Math.round(bounds.width * PDF_CAPTURE_SCALE)
      const gaps = Array.from(preview.querySelectorAll('.pdf-page-gap'))
        .map(element => ({
          top: element.getBoundingClientRect().top - bounds.top,
          height: element.getBoundingClientRect().height
        }))
      const totalGapHeight = gaps.reduce((total, gap) => total + gap.height, 0)
      const canvasHeight = Math.round((bounds.height - totalGapHeight) * PDF_CAPTURE_SCALE)
      const candidatePageBreaks = Array.from(preview.querySelectorAll('[data-pdf-page-break]'))
        .map(element => {
          const elementBottom = element.getBoundingClientRect().bottom - bounds.top
          const precedingGapsHeight = gaps
            .filter(gap => gap.top < elementBottom)
            .reduce((total, gap) => total + gap.height, 0)
          return {
            id: element.dataset.pdfPageBreak,
            position: Math.round((elementBottom - precedingGapsHeight) * PDF_CAPTURE_SCALE)
          }
        })
        .filter(({ position }) => position > 0 && position < canvasHeight)
        .sort((first, second) => first.position - second.position)
      const pageEnds = getPdfPageEnds(
        canvasHeight,
        Math.floor(canvasWidth * PDF_PAGE_CONTENT_HEIGHT_RATIO),
        candidatePageBreaks
      )
      const pageBreaks = []
      let pageStart = 0
      pageEnds.slice(0, -1).forEach(pageEnd => {
        if (pageEnd.breakId) {
          const usedPageHeight = (pageEnd.position - pageStart) / PDF_CAPTURE_SCALE
          const pageMarginHeight = bounds.width * (10 / 190)
          const pageContentHeight = bounds.width * PDF_PAGE_CONTENT_HEIGHT_RATIO
          const bottomWhiteHeight = Math.max(0, pageContentHeight - usedPageHeight + pageMarginHeight)
          pageBreaks.push({
            id: pageEnd.breakId,
            bottomWhiteHeight: Math.round(bottomWhiteHeight * 100) / 100,
            topWhiteHeight: Math.round(pageMarginHeight * 100) / 100,
            dividerHeight: 8
          })
        }
        pageStart = pageEnd.position
      })

      setCategoryReportPageBreaks(current => (
        current.length === pageBreaks.length &&
        current.every((pageBreak, index) => (
          pageBreak.id === pageBreaks[index].id &&
          pageBreak.bottomWhiteHeight === pageBreaks[index].bottomWhiteHeight &&
          pageBreak.topWhiteHeight === pageBreaks[index].topWhiteHeight &&
          pageBreak.dividerHeight === pageBreaks[index].dividerHeight
        ))
          ? current
          : pageBreaks
      ))
    }

    updatePageBreaks()
    const resizeObserver = new ResizeObserver(updatePageBreaks)
    resizeObserver.observe(preview)
    return () => resizeObserver.disconnect()
  }, [showCategoryReportPreview, selectedSummaryCategories, expenses, filterMonths, filterYears])

  const downloadCategoryReport = async () => {
    setIsGeneratingCategoryReport(true)
    setCategoryReportError('')
    try {
      const { jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      if (!categoryReportPreviewRef.current) {
        throw new Error('No se encontró la vista previa para generar el PDF.')
      }

      const preview = categoryReportPreviewRef.current
      const canvas = await html2canvas(preview, {
        scale: PDF_CAPTURE_SCALE,
        backgroundColor: '#ffffff',
        onclone: clonedDocument => {
          clonedDocument.querySelectorAll('.pdf-page-gap').forEach(element => {
            element.style.display = 'none'
          })
        }
      })
      const pdf = new jsPDF()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pageMargin = 10
      const imageWidth = pdf.internal.pageSize.getWidth() - pageMargin * 2
      const pageContentHeight = pageHeight - pageMargin * 2
      const pixelsPerPage = Math.floor(canvas.width * pageContentHeight / imageWidth)
      const previewBounds = preview.getBoundingClientRect()
      const gaps = Array.from(preview.querySelectorAll('.pdf-page-gap'))
        .map(element => ({
          top: element.getBoundingClientRect().top - previewBounds.top,
          height: element.getBoundingClientRect().height
        }))
      const contentHeight = previewBounds.height - gaps.reduce((total, gap) => total + gap.height, 0)
      const canvasScaleY = canvas.height / contentHeight
      const pageBreaks = Array.from(preview.querySelectorAll('[data-pdf-page-break]'))
        .map(element => {
          const elementBottom = element.getBoundingClientRect().bottom - previewBounds.top
          const precedingGapsHeight = gaps
            .filter(gap => gap.top < elementBottom)
            .reduce((total, gap) => total + gap.height, 0)
          return {
            id: element.dataset.pdfPageBreak,
            position: Math.round((elementBottom - precedingGapsHeight) * canvasScaleY)
          }
        })
        .filter(({ position }) => position > 0 && position < canvas.height)
        .sort((first, second) => first.position - second.position)
      let sourceY = 0

      getPdfPageEnds(canvas.height, pixelsPerPage, pageBreaks).forEach((pageEnd, pageIndex) => {
        const sliceHeight = pageEnd.position - sourceY
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sliceHeight
        const pageContext = pageCanvas.getContext('2d')
        if (!pageContext) throw new Error('No se pudo preparar una página del PDF.')
        pageContext.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)
        const sliceImageHeight = sliceHeight * imageWidth / canvas.width
        if (pageIndex > 0) pdf.addPage()
        pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', pageMargin, pageMargin, imageWidth, sliceImageHeight)
        sourceY = pageEnd.position
      })

      pdf.save(`resumen-categorias-${filterYears.join('-') || 'todos'}-${filterMonths.join('-') || 'meses'}.pdf`)
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

  const renderPdfPageGap = breakId => {
    const pageBreak = categoryReportPageBreaks.find(item => item.id === breakId)
    if (!pageBreak) return null

    return (
      <div
        className="pdf-page-gap"
        aria-hidden="true"
        style={{
          marginLeft: 'clamp(-42px, -5vw, -18px)',
          marginRight: 'clamp(-42px, -5vw, -18px)',
          width: 'calc(100% + clamp(36px, 10vw, 84px))'
        }}
      >
        <div style={{ height: `${pageBreak.bottomWhiteHeight}px`, backgroundColor: '#fff' }} />
        <div
          style={{
            height: `${pageBreak.dividerHeight}px`,
            backgroundColor: '#d5d8dc',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.18), 0 -2px 4px rgba(0, 0, 0, 0.12)'
          }}
        />
        <div style={{ height: `${pageBreak.topWhiteHeight}px`, backgroundColor: '#fff' }} />
      </div>
    )
  }

  const budgetExpenses = useMemo(() => expenses.filter(expense => {
    const [, month, year] = expense.date.split('/')
    return expense.type !== 'income' && `${year}-${month.padStart(2, '0')}` === budgetMonth
  }), [expenses, budgetMonth])
  const budgetSpentByCategory = useMemo(() => {
    const totals = Object.fromEntries(categories.map(cat => [cat.id, 0]))
    budgetExpenses.forEach(expense => {
      if (Object.hasOwn(totals, expense.category)) totals[expense.category] += expense.amount
    })
    return totals
  }, [budgetExpenses])
  const selectedBudgetMovements = useMemo(() => selectedBudgetCategory === 'all'
    ? []
    : budgetExpenses
      .filter(expense => expense.category === selectedBudgetCategory)
      .sort(compareMovementDatesAscending), [budgetExpenses, selectedBudgetCategory])
  const octoberBudgetMonth = useMemo(() => budgetMonth.endsWith('-10')
    ? budgetMonth
    : `${budgetMonth.slice(0, 4)}-10` in categoryBudgets
      ? `${budgetMonth.slice(0, 4)}-10`
      : Object.keys(categoryBudgets)
        .filter(month => /^\d{4}-10$/.test(month))
        .sort()
        .pop(), [budgetMonth, categoryBudgets])
  const octoberBudgets = useMemo(
    () => octoberBudgetMonth ? categoryBudgets[octoberBudgetMonth] || {} : {},
    [categoryBudgets, octoberBudgetMonth],
  )
  const effectiveCategoryBudgets = useMemo(() => categories.reduce((budgets, cat) => {
    const monthBudgets = categoryBudgets[budgetMonth] || {}
    budgets[cat.id] = Object.prototype.hasOwnProperty.call(monthBudgets, cat.id)
      ? Number(monthBudgets[cat.id])
      : octoberBudgets[cat.id]
    return budgets
  }, {}), [budgetMonth, categoryBudgets, octoberBudgets])
  const totalBudgetAllowed = useMemo(() => categories.reduce((total, cat) => {
    const limit = Number(effectiveCategoryBudgets[cat.id])
    return total + (Number.isFinite(limit) && limit > 0 ? limit : 0)
  }, 0), [effectiveCategoryBudgets])
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

  const openHistoryForTimelineCategory = (categoryId, bucket) => {
    if (!historyPeriod) {
      chartOriginFiltersRef.current = { months: filterMonths, years: filterYears }
    }

    let period
    let fromDate
    let toDate
    const categoryIsIncome = timelineType === 'income' ||
      (timelineType === 'both' && incomeCategories.some(category => category.id === categoryId))
    if (filterMonths.length > 0 && filterYears.length !== 1) {
      const [year, month] = bucket.key.split('-').map(Number)
      const dayCount = new Date(year, month, 0).getDate()
      period = { month, year }
      fromDate = `${year}-${String(month).padStart(2, '0')}-01`
      toDate = `${year}-${String(month).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`
    } else if (filterYears.length > 1) {
      const year = Number(bucket.key)
      period = { year }
      fromDate = `${year}-01-01`
      toDate = `${year}-12-31`
    } else if (filterMonths.length === 1) {
      const monthIndex = Array.from({ length: 12 }, (_, index) => (
        new Date(Date.UTC(2024, index, 1)).toLocaleDateString('es-ES', { month: 'long', timeZone: 'UTC' })
      )).indexOf(filterMonths[0].toLocaleLowerCase('es-ES'))
      const month = monthIndex + 1
      const matchingMovements = filteredExpensesByDate.filter(movement => {
        const [day, movementMonth] = movement.date.split('/').map(Number)
        return day === Number(bucket.key) &&
          movementMonth === month &&
          movement.category === categoryId &&
          (categoryIsIncome ? movement.type === 'income' : movement.type !== 'income')
      })
      const selectedYear = filterYears.length === 1
        ? Number(filterYears[0])
        : Math.max(...matchingMovements.map(movement => Number(movement.date.split('/')[2])))
      period = {
        day: Number(bucket.key),
        month,
        year: selectedYear
      }
      const date = `${selectedYear}-${String(month).padStart(2, '0')}-${String(period.day).padStart(2, '0')}`
      fromDate = date
      toDate = date
      if (filterYears.length === 0) setFilterYears([String(selectedYear)])
    } else if (filterYears.length === 1) {
      const month = Number(bucket.key) + 1
      const year = Number(filterYears[0])
      period = { month, year }
      fromDate = `${year}-${String(month).padStart(2, '0')}-01`
      toDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
    } else {
      const year = Number(bucket.key)
      period = { year }
      fromDate = `${year}-01-01`
      toDate = `${year}-12-31`
    }

    setHistoryPeriod(period)
    setHistoryCategory(categoryId)
    setHistoryType(categoryIsIncome ? 'income' : 'expense')
    setHistorySearch('')
    setHistoryFromDate(fromDate)
    setHistoryToDate(toDate)
    setShowExpenseHistory(true)
    setShouldScrollToHistory(true)
  }

  const clearChartHistoryFilters = () => {
    const originFilters = chartOriginFiltersRef.current
    if (originFilters) {
      setFilterMonths(originFilters.months)
      setFilterYears(originFilters.years)
    }
    chartOriginFiltersRef.current = null
    setHistoryPeriod(null)
    setHistoryCategory('all')
    setHistoryType('all')
    setHistorySearch('')
    setHistoryFromDate('')
    setHistoryToDate('')
  }

  const filteredHistoryExpenses = useMemo(() => {
    if (!showExpenseHistory) return []

    const search = historySearch.trim().toLocaleLowerCase('es-ES')
    return expenses.filter(expense => {
      const [day, month, year] = expense.date.split('/')
      const movementDate = new Date(year, month - 1, day)
      const expenseMonth = movementDate.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase()
      const monthMatches = filterMonths.length === 0 || filterMonths.includes(expenseMonth)
      const yearMatches = filterYears.length === 0 || filterYears.includes(movementDate.getFullYear().toString())
      if (!monthMatches || !yearMatches) return false

      const periodMatches = !historyPeriod ||
        ((!historyPeriod.month || movementDate.getMonth() + 1 === historyPeriod.month) &&
          (!historyPeriod.year || movementDate.getFullYear() === historyPeriod.year) &&
          (!historyPeriod.day || movementDate.getDate() === historyPeriod.day))
      const categoryMatches = historyCategory === 'all' || expense.category === historyCategory
      const typeMatches = historyType === 'all' ||
        (historyType === 'income' ? expense.type === 'income' : expense.type !== 'income')
      const expenseDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      const fromMatches = !historyFromDate || expenseDate >= historyFromDate
      const toMatches = !historyToDate || expenseDate <= historyToDate
      const categoryName = categoriesById.get(expense.category)?.name || ''
      const searchMatches = !search ||
        `${expense.description} ${categoryName}`.toLocaleLowerCase('es-ES').includes(search)
      return periodMatches && categoryMatches && typeMatches && fromMatches && toMatches && searchMatches
    }).sort(compareMovementDatesAscending)
  }, [
    expenses,
    filterMonths,
    filterYears,
    historySearch,
    historyCategory,
    historyType,
    historyFromDate,
    historyToDate,
    historyPeriod,
    showExpenseHistory
  ])

  const historyExpensesByMonth = useMemo(() => {
    const months = {}
    const firstVisibleIndex = Math.max(0, filteredHistoryExpenses.length - historyVisibleCount)
    filteredHistoryExpenses.slice(firstVisibleIndex).forEach(expense => {
      const dateParts = expense.date.split('/')
      const expenseDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
      const monthKey = expenseDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
      if (!months[monthKey]) {
        months[monthKey] = []
      }
      months[monthKey].push(expense)
    })
    return months
  }, [filteredHistoryExpenses, historyVisibleCount])

  const availableMonths = useMemo(() => {
    const monthsMap = new Map()
    expenses.forEach(expense => {
      const dateParts = expense.date.split('/')
      const expenseDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
      const monthKey = expenseDate.toLocaleDateString('es-ES', { month: 'long' })
      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, expenseDate)
      }
    })
    const sortedMonths = Array.from(monthsMap.entries()).sort((a, b) => b[1] - a[1])
    return sortedMonths.map(([month]) => month)
  }, [expenses])

  const availableYears = useMemo(() => {
    const years = new Set([String(new Date().getFullYear())])
    expenses.forEach(expense => {
      const dateParts = expense.date.split('/')
      const expenseDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
      years.add(expenseDate.getFullYear().toString())
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [expenses])

  const chartCategoryTotals = useMemo(() => Object.fromEntries(
    categories.map(cat => [cat.id, categoryTotals[cat.id]])
  ), [categoryTotals])
  const chartTotal = Object.values(chartCategoryTotals).reduce((sum, amount) => sum + amount, 0)
  const incomeCategoryTotals = useMemo(() => Object.fromEntries(
    incomeCategories.map(cat => [cat.id, categoryTotals[cat.id]])
  ), [categoryTotals])
  const selectedDistributionCategories = selectedDistributionCategory?.type === 'income'
    ? incomeCategories
    : categories
  const selectedDistributionDetails = useMemo(() => selectedDistributionCategory
    ? {
        category: selectedDistributionCategories.find(cat => cat.id === selectedDistributionCategory.id),
        expenses: filteredExpensesByDate
          .filter(expense => (
            expense.category === selectedDistributionCategory.id &&
            (selectedDistributionCategory.type === 'income'
              ? expense.type === 'income'
              : expense.type !== 'income')
          ))
          .sort(compareMovementDatesAscending)
      }
    : null, [filteredExpensesByDate, selectedDistributionCategory, selectedDistributionCategories])

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

  const timelineTitle = filterMonths.length > 1 && filterYears.length !== 1
    ? `Evolución mensual · ${filterMonths.map(month => month.charAt(0).toUpperCase() + month.slice(1)).join(', ')} · ${filterYears.length ? filterYears.join(', ') : 'todos los años'}`
    : filterMonths.length === 1 && filterYears.length !== 1
    ? `Evolución de ${filterMonths[0]} por año`
    : filterYears.length !== 1
      ? `Evolución anual · ${filterYears.length ? filterYears.join(', ') : 'todos los años'}`
      : filterMonths.length === 1
        ? `Evolución diaria · ${filterMonths[0].charAt(0).toUpperCase()}${filterMonths[0].slice(1)} ${filterYears[0]}`
    : filterMonths.length > 1
      ? `Evolución mensual · ${filterMonths.map(month => month.charAt(0).toUpperCase() + month.slice(1)).join(', ')} ${filterYears[0]}`
      : `Evolución mensual · ${filterYears[0]}`
  const timelineSeries = timelineType === 'income' ? 'income' : 'expenses'
  const timelineCountKey = timelineType === 'income' ? 'incomeCount' : 'expenseCount'
  const timelineSeriesLabel = timelineType === 'income' ? 'Ingresos' : timelineType === 'both' ? 'Ingresos y gastos' : 'Gastos'
  const timelineSeriesColor = timelineType === 'income' ? '#28a745' : timelineType === 'both' ? '#495057' : '#dc5968'
  const timelineDetailSeries = timelineType === 'both'
    ? [
        { type: 'expense', label: 'Gastos', series: 'expenses', countKey: 'expenseCount', categoryKey: 'expenseCategories', color: '#dc5968', icon: '💸', categories },
        { type: 'income', label: 'Ingresos', series: 'income', countKey: 'incomeCount', categoryKey: 'incomeCategories', color: '#28a745', icon: '💰', categories: incomeCategories }
      ]
    : timelineType === 'income'
      ? [{ type: 'income', label: 'Ingresos', series: 'income', countKey: 'incomeCount', categoryKey: 'incomeCategories', color: '#28a745', icon: '💰', categories: incomeCategories }]
      : timelineType === 'expense'
        ? [{ type: 'expense', label: 'Gastos', series: 'expenses', countKey: 'expenseCount', categoryKey: 'expenseCategories', color: '#dc5968', icon: '💸', categories }]
        : []
  const hoveredTimelineBucket = movementTimeline.find(bucket => bucket.key === hoveredTimelinePeriod) ||
    movementTimeline.find(bucket => bucket.key === selectedTimelinePeriod)
  const historyPeriodLabel = historyPeriod
    ? historyPeriod.month
      ? `${historyPeriod.day ? `Día ${historyPeriod.day} · ` : ''}${new Date(Date.UTC(2024, historyPeriod.month - 1, 1)).toLocaleDateString('es-ES', { month: 'long', timeZone: 'UTC' })}${historyPeriod.year ? ` ${historyPeriod.year}` : ' · todos los años'}`
      : `Año ${historyPeriod.year}`
    : ''
  const timelineWidth = 1200
  const timelineHeight = 300
  const timelineLeft = Math.min(64, Math.max(54, timelineWidth * 0.14))
  const timelineTop = 18
  const timelineBottom = 42
  const timelinePlotWidth = timelineWidth - timelineLeft - 12
  const timelinePlotHeight = timelineHeight - timelineTop - timelineBottom
  const timelineGroupWidth = timelinePlotWidth / Math.max(movementTimeline.length, 1)
  const timelineOuterBarGap = Math.min(4, timelineGroupWidth * 0.2)
  const timelineBarGap = timelineType === 'both' ? Math.min(4, timelineGroupWidth * 0.15) : 0
  const timelineBarWidth = Math.max(
    1,
    Math.min(
      timelineType === 'both' ? 42 : 84,
      (timelineGroupWidth - timelineOuterBarGap * 2 - timelineBarGap) /
        (timelineType === 'both' ? 2 : 1)
    )
  )
  const timelineMaxValue = Math.max(
    1,
    ...movementTimeline.flatMap(bucket => timelineType === 'both'
      ? [bucket.expenses, bucket.income]
      : timelineType === 'none'
        ? []
        : [bucket[timelineSeries]])
  ) * 1.1
  const timelineLabelInterval = filterMonths.length > 0 && filterYears.length !== 1
    ? 1
    : filterMonths.length === 1
      ? 1
      : Math.max(1, Math.ceil(movementTimeline.length / 20))

  return (
    <div className="finance-page" style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px' }}>
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
        <div ref={yearFilterRef} style={{ position: 'relative', minWidth: '190px', maxWidth: '100%' }}>
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={showYearFilter}
            aria-controls="year-filter-options"
            onClick={() => setShowYearFilter(open => !open)}
            style={{
              width: '100%',
              minHeight: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              padding: '9px 13px',
              border: '1px solid #d5dce3',
              borderRadius: '10px',
              backgroundColor: 'white',
              color: '#343a40',
              fontSize: '14px',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: showYearFilter ? '0 0 0 3px rgba(54, 162, 235, 0.14)' : '0 2px 5px rgba(32, 48, 72, 0.06)'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {filterYears.length === 0
                ? 'Todos los años'
                : filterYears.length === 1
                  ? filterYears[0]
                  : `${filterYears.length} años seleccionados`}
            </span>
            <span aria-hidden="true" style={{ color: '#6c757d', fontSize: '12px' }}>{showYearFilter ? '▲' : '▼'}</span>
          </button>
          {showYearFilter && (
            <div
              id="year-filter-options"
              role="group"
              aria-label="Seleccionar años"
              style={{
                position: 'absolute',
                zIndex: 20,
                top: 'calc(100% + 7px)',
                left: 0,
                right: 0,
                minWidth: '210px',
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '8px',
                border: '1px solid #e1e6eb',
                borderRadius: '12px',
                backgroundColor: 'white',
                boxShadow: '0 10px 28px rgba(32, 48, 72, 0.16)'
              }}
            >
              <button
                type="button"
                onClick={() => setFilterYears([])}
                disabled={filterYears.length === 0}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  border: 0,
                  borderRadius: '8px',
                  backgroundColor: filterYears.length === 0 ? '#f1f3f5' : 'white',
                  color: '#495057',
                  textAlign: 'left',
                  fontWeight: 600,
                  cursor: filterYears.length === 0 ? 'default' : 'pointer'
                }}
              >
                Todos los años
              </button>
              {availableYears.map(year => {
                const isSelected = filterYears.includes(year)
                return (
                  <label
                    key={year}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#eef6fc' : 'white',
                      color: '#343a40',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFilterYear(year)}
                      style={{ width: '16px', height: '16px', accentColor: '#218838', cursor: 'pointer' }}
                    />
                    {year}
                  </label>
                )
              })}
            </div>
          )}
        </div>
        <div ref={monthFilterRef} style={{ position: 'relative', minWidth: '220px', maxWidth: '100%' }}>
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={showMonthFilter}
            aria-controls="month-filter-options"
            onClick={() => setShowMonthFilter(open => !open)}
            style={{
              width: '100%',
              minHeight: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              padding: '9px 13px',
              border: '1px solid #d5dce3',
              borderRadius: '10px',
              backgroundColor: 'white',
              color: '#343a40',
              fontSize: '14px',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: showMonthFilter ? '0 0 0 3px rgba(54, 162, 235, 0.14)' : '0 2px 5px rgba(32, 48, 72, 0.06)'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {filterMonths.length === 0
                ? 'Todos los meses'
                : filterMonths.length === 1
                  ? filterMonths[0].charAt(0).toUpperCase() + filterMonths[0].slice(1)
                  : `${filterMonths.length} meses seleccionados`}
            </span>
            <span aria-hidden="true" style={{ color: '#6c757d', fontSize: '12px' }}>{showMonthFilter ? '▲' : '▼'}</span>
          </button>
          {showMonthFilter && (
            <div
              id="month-filter-options"
              role="group"
              aria-label="Seleccionar meses"
              style={{
                position: 'absolute',
                zIndex: 20,
                top: 'calc(100% + 7px)',
                left: 0,
                right: 0,
                minWidth: '240px',
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '8px',
                border: '1px solid #e1e6eb',
                borderRadius: '12px',
                backgroundColor: 'white',
                boxShadow: '0 10px 28px rgba(32, 48, 72, 0.16)'
              }}
            >
              <button
                type="button"
                onClick={() => setFilterMonths([])}
                disabled={filterMonths.length === 0}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  border: 0,
                  borderRadius: '8px',
                  backgroundColor: filterMonths.length === 0 ? '#f1f3f5' : 'white',
                  color: '#495057',
                  textAlign: 'left',
                  fontWeight: 600,
                  cursor: filterMonths.length === 0 ? 'default' : 'pointer'
                }}
              >
                Todos los meses
              </button>
              {availableMonths.map(month => {
                const isSelected = filterMonths.includes(month)
                return (
                  <label
                    key={month}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#eef6fc' : 'white',
                      color: '#343a40',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFilterMonth(month)}
                      style={{ width: '16px', height: '16px', accentColor: '#218838', cursor: 'pointer' }}
                    />
                    {month}
                  </label>
                )
              })}
            </div>
          )}
        </div>
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
        
        {showQuickAdd && <QuickAddMovementForm onSave={saveExpense} />}
      </div>

      {recurringMovements.length > 0 && (
        <section style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
          <button
            type="button"
            aria-expanded={showRecurringMovements}
            aria-controls="recurring-movements-content"
            onClick={() => setShowRecurringMovements(open => !open)}
            style={{ width: '100%', padding: 0, border: 'none', background: 'none', color: '#495057', fontSize: '18px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>🔁 Movimientos recurrentes ({recurringMovements.length})</span>
            <span aria-hidden="true">{showRecurringMovements ? '▲' : '▼'}</span>
          </button>
          {showRecurringMovements && (
            <div id="recurring-movements-content" style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
              {recurringMovements.map(template => {
                const templateCategory = allCategories.find(item => item.id === template.category)
                return (
                  <div key={template.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: 'white', borderRadius: '7px', borderLeft: `4px solid ${templateCategory?.color || '#6c757d'}` }}>
                    <span style={{ color: '#333' }}>
                      {templateCategory?.icon} {template.description} · {formatCurrency(template.amount)} · {template.frequency === 'weekly' ? 'Semanal' : template.frequency === 'yearly' ? 'Anual' : 'Mensual'} · Próximo: {parseLocalDate(template.nextDate).toLocaleDateString('es-ES')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRecurringIdToDelete(template.id)}
                      aria-label={`Eliminar recurrencia: ${template.description}`}
                      style={{ border: 'none', borderRadius: '6px', padding: '6px 9px', backgroundColor: '#dc3545', color: 'white', cursor: 'pointer', flexShrink: 0 }}
                    >
                      Eliminar
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      <div className="finance-summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#fff4f4', color: '#b42318', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '15px' }}>💸 Gastos</div>
          <strong style={{ display: 'block', marginTop: '4px', fontSize: '26px' }}>{formatCurrency(expenseTotal)}</strong>
        </div>
        <div style={{ backgroundColor: '#effaf2', color: '#18743a', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '15px' }}>💰 Ingresos</div>
          <strong style={{ display: 'block', marginTop: '4px', fontSize: '26px' }}>{formatCurrency(incomeTotal)}</strong>
        </div>
        <div style={{ backgroundColor: '#eef5ff', color: '#245eb5', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '15px' }}>⚖️ Balance</div>
          <strong style={{ display: 'block', marginTop: '4px', fontSize: '26px', color: incomeTotal - expenseTotal < 0 ? '#b42318' : '#18743a' }}>
            {incomeTotal - expenseTotal < 0 ? '−' : ''}{formatCurrency(Math.abs(incomeTotal - expenseTotal))}
          </strong>
        </div>
      </div>

      <section
        aria-labelledby="movement-timeline-title"
        style={{ backgroundColor: '#f8f9fa', padding: '18px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: showMovementTimeline ? 'default' : 'pointer' }}
        onClick={() => {
          if (!showMovementTimeline) setShowMovementTimeline(true)
        }}
      >
        <button
          type="button"
          id="movement-timeline-title"
          aria-expanded={showMovementTimeline}
          aria-controls="movement-timeline-content"
          onClick={event => {
            event.stopPropagation()
            setShowMovementTimeline(open => !open)
          }}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', position: 'relative', marginBottom: showMovementTimeline ? '14px' : 0, padding: 0, border: 0, background: 'none', color: '#495057', textAlign: 'center', font: 'inherit', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          <span><span aria-hidden="true">📈 </span>{timelineTitle}</span>
          <span aria-hidden="true" style={{ position: 'absolute', right: 0 }}>{showMovementTimeline ? '▲' : '▼'}</span>
        </button>
        {showMovementTimeline && (
        <div id="movement-timeline-content">
          <div style={{ marginBottom: '14px' }}>
          <p style={{ margin: '5px 0 0', color: '#6c757d', fontSize: '13px' }}>
            {filterMonths.length > 0 && filterYears.length !== 1
              ? 'Cada barra representa un mes seleccionado dentro de un año incluido en el filtro.'
              : timelineType === 'both'
                ? 'Ingresos y gastos se muestran juntos con la misma escala.'
                : timelineType === 'none'
                  ? 'Selecciona una o ambas series para mostrar su evolución.'
                  : 'Selecciona gastos o ingresos para ver su evolución con una escala propia.'}
          </p>
          </div>
        <div role="group" aria-label="Tipo de movimiento del gráfico" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          {[
            { type: 'expense', label: 'Gastos', color: '#dc5968' },
            { type: 'income', label: 'Ingresos', color: '#218838' }
          ].map(option => (
            <button
              key={option.type}
              type="button"
              aria-pressed={selectedTimelineTypes.includes(option.type)}
              onClick={() => toggleTimelineType(option.type)}
              style={{
                padding: '8px 18px',
                border: `1px solid ${option.color}`,
                borderRadius: '20px',
                backgroundColor: selectedTimelineTypes.includes(option.type) ? option.color : 'white',
                color: selectedTimelineTypes.includes(option.type) ? 'white' : option.color,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {timelineType === 'none' ? (
          <p style={{ margin: 0, color: '#6c757d', textAlign: 'center', padding: '30px 0' }}>
            Selecciona Gastos, Ingresos o ambos para ver el gráfico.
          </p>
        ) : movementTimeline.length === 0 ? (
          <p style={{ margin: 0, color: '#6c757d', textAlign: 'center', padding: '30px 0' }}>
            No hay {timelineSeriesLabel.toLowerCase()} para mostrar en este periodo.
          </p>
        ) : (
          <div style={{ width: '100%', minWidth: 0 }}>
            <svg
              role="img"
              aria-label={`${timelineTitle}, gráfico de ${timelineSeriesLabel.toLowerCase()}`}
              viewBox={`0 0 ${timelineWidth} ${timelineHeight}`}
              width="100%"
              height="300"
              preserveAspectRatio="none"
              style={{ display: 'block', width: '100%', height: '300px' }}
            >
                <title>{timelineTitle}</title>
                <desc>Importes de {timelineSeriesLabel.toLowerCase()} agrupados por periodo. {timelineType === 'both' ? 'Ambas series comparten escala.' : 'El eje monetario utiliza una escala propia para esta serie.'}</desc>
                {[0, 1, 2, 3, 4].map(tick => {
                  const amount = timelineMaxValue * (4 - tick) / 4
                  const y = timelineTop + timelinePlotHeight * tick / 4
                  return (
                    <g key={tick}>
                      <line x1={timelineLeft} y1={y} x2={timelineWidth - 8} y2={y} stroke="#dee2e6" strokeWidth="1" />
                      <text x={timelineLeft - 8} y={y + 4} textAnchor="end" fill="#6c757d" fontSize="11">
                        {new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)} €
                      </text>
                    </g>
                  )
                })}
                {movementTimeline.map((bucket, index) => {
                  const groupWidth = timelineGroupWidth
                  const centerX = timelineLeft + groupWidth * (index + 0.5)
                  const barHeight = bucket[timelineSeries] / timelineMaxValue * timelinePlotHeight
                  const baseline = timelineTop + timelinePlotHeight
                  const showLabel = index % timelineLabelInterval === 0 || index === movementTimeline.length - 1
                  return (
                    <g
                      key={bucket.key}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedTimelinePeriod === bucket.key}
                      aria-label={timelineType === 'both'
                        ? `${bucket.label}: ${bucket.incomeCount} ingresos, ${formatCurrency(bucket.income)}; ${bucket.expenseCount} gastos, ${formatCurrency(bucket.expenses)}`
                        : `${bucket.label}: ${bucket[timelineCountKey]} ${timelineSeriesLabel.toLowerCase()}, ${formatCurrency(bucket[timelineSeries])}`}
                      onMouseEnter={() => {
                        setHoveredTimelinePeriod(bucket.key)
                        if (selectedTimelinePeriod !== null) setSelectedTimelinePeriod(bucket.key)
                      }}
                      onMouseLeave={() => setHoveredTimelinePeriod(null)}
                      onFocus={() => {
                        setHoveredTimelinePeriod(bucket.key)
                        if (selectedTimelinePeriod !== null) setSelectedTimelinePeriod(bucket.key)
                      }}
                      onBlur={() => setHoveredTimelinePeriod(null)}
                      onClick={() => {
                        if (selectedTimelinePeriod !== null) {
                          setSelectedTimelinePeriod(null)
                          setHoveredTimelinePeriod(null)
                          return
                        }
                        setSelectedTimelinePeriod(bucket.key)
                        setHoveredTimelinePeriod(bucket.key)
                      }}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          if (selectedTimelinePeriod !== null) {
                            setSelectedTimelinePeriod(null)
                            setHoveredTimelinePeriod(null)
                          } else {
                            setSelectedTimelinePeriod(bucket.key)
                            setHoveredTimelinePeriod(bucket.key)
                          }
                        }
                      }}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      <rect
                        x={centerX - groupWidth / 2}
                        y={timelineTop}
                        width={groupWidth}
                        height={timelinePlotHeight}
                        fill="transparent"
                        pointerEvents="all"
                      />
                      {timelineType === 'both' ? (
                        <>
                          <rect
                            x={centerX - timelineBarWidth - timelineBarGap / 2}
                            y={baseline - bucket.expenses / timelineMaxValue * timelinePlotHeight}
                            width={timelineBarWidth}
                            height={bucket.expenses / timelineMaxValue * timelinePlotHeight}
                            rx="2"
                            fill="#dc5968"
                          >
                            <title>{`${bucket.label}: gastos ${formatCurrency(bucket.expenses)}`}</title>
                          </rect>
                          <rect
                            x={centerX + timelineBarGap / 2}
                            y={baseline - bucket.income / timelineMaxValue * timelinePlotHeight}
                            width={timelineBarWidth}
                            height={bucket.income / timelineMaxValue * timelinePlotHeight}
                            rx="2"
                            fill="#28a745"
                          >
                            <title>{`${bucket.label}: ingresos ${formatCurrency(bucket.income)}`}</title>
                          </rect>
                        </>
                      ) : (
                        <rect
                          x={centerX - timelineBarWidth / 2}
                          y={baseline - barHeight}
                          width={timelineBarWidth}
                          height={barHeight}
                          rx="2"
                          fill={timelineSeriesColor}
                        >
                          <title>{`${bucket.label}: ${timelineSeriesLabel.toLowerCase()} ${formatCurrency(bucket[timelineSeries])}`}</title>
                        </rect>
                      )}
                      {showLabel && (
                        <text x={centerX} y={baseline + 22} textAnchor="middle" fill="#6c757d" fontSize="11">
                          {bucket.label}
                        </text>
                      )}
                    </g>
                  )
                })}
            </svg>
            {timelineType === 'both' && (
              <div aria-label="Leyenda del gráfico" style={{ display: 'flex', justifyContent: 'center', gap: '18px', flexWrap: 'wrap', color: '#495057', fontSize: '13px' }}>
                <span><span aria-hidden="true" style={{ display: 'inline-block', width: '10px', height: '10px', marginRight: '6px', borderRadius: '2px', backgroundColor: '#dc5968' }} />Gastos</span>
                <span><span aria-hidden="true" style={{ display: 'inline-block', width: '10px', height: '10px', marginRight: '6px', borderRadius: '2px', backgroundColor: '#28a745' }} />Ingresos</span>
              </div>
            )}
            {hoveredTimelineBucket && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  marginTop: '10px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  borderRadius: '14px',
                  border: '1px solid #e9edf2',
                  borderLeft: `5px solid ${timelineSeriesColor}`,
                  boxShadow: '0 4px 14px rgba(32, 48, 72, 0.08)'
                }}
              >
                <strong style={{ display: 'block', marginBottom: '12px', color: '#343a40', fontSize: '17px', textTransform: 'capitalize' }}>
                  {hoveredTimelineBucket.label} · Detalle del periodo
                </strong>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {timelineDetailSeries.map(series => {
                    const count = hoveredTimelineBucket[series.countKey]
                    const categoryTotals = hoveredTimelineBucket[series.categoryKey]
                    return (
                      <section key={series.type} aria-label={`Detalle de ${series.label.toLowerCase()}`}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', color: series.color }}>
                          <strong>{series.icon} {series.label} · {count} {count === 1 ? 'movimiento' : 'movimientos'}</strong>
                          <strong style={{ fontSize: '18px', whiteSpace: 'nowrap' }}>{formatCurrency(hoveredTimelineBucket[series.series])}</strong>
                        </div>
                        {count === 0 ? (
                          <p style={{ margin: '10px 0 0', padding: '10px', color: '#6c757d', backgroundColor: '#f1f3f5', borderRadius: '9px', textAlign: 'center' }}>
                            No hay {series.label.toLowerCase()} en este periodo.
                          </p>
                        ) : (
                          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '10px', margin: '10px 0 0', padding: 0, listStyle: 'none', alignItems: 'stretch' }}>
                            {series.categories
                              .filter(category => categoryTotals[category.id])
                              .map(category => {
                                const categoryTotal = categoryTotals[category.id]
                                return (
                                  <li key={category.id} style={{ minWidth: 0 }}>
                                    <button
                                      type="button"
                                      onClick={() => openHistoryForTimelineCategory(category.id, hoveredTimelineBucket)}
                                      title={`Ver ${series.label.toLowerCase()} de ${category.name} en ${hoveredTimelineBucket.label}`}
                                      style={{ width: '100%', minHeight: '88px', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr) auto', gridTemplateRows: '1fr auto', alignItems: 'center', columnGap: '10px', rowGap: '3px', padding: '12px', backgroundColor: 'white', border: '1px solid #edf0f3', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', font: 'inherit', transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }}
                                      onMouseEnter={event => {
                                        event.currentTarget.style.borderColor = category.color
                                        event.currentTarget.style.boxShadow = '0 3px 10px rgba(32, 48, 72, 0.1)'
                                      }}
                                      onMouseLeave={event => {
                                        event.currentTarget.style.borderColor = '#edf0f3'
                                        event.currentTarget.style.boxShadow = 'none'
                                      }}
                                    >
                                      <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', gridColumn: '1', gridRow: '1 / 3', width: '36px', height: '36px', borderRadius: '9px', backgroundColor: `${category.color}18`, fontSize: '18px' }}>
                                        {category.icon}
                                      </span>
                                      <span style={{ gridColumn: '2', gridRow: '1', minWidth: 0 }}>
                                        <strong style={{ display: 'block', overflow: 'hidden', color: '#495057', fontSize: '13px', lineHeight: '18px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {category.name}
                                        </strong>
                                      </span>
                                      <strong style={{ gridColumn: '3', gridRow: '1', color: '#343a40', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(categoryTotal.amount)}
                                      </strong>
                                      <span style={{ gridColumn: '2 / 4', gridRow: '2', color: '#7b8794', fontSize: '12px', lineHeight: '16px', whiteSpace: 'nowrap' }}>
                                        {categoryTotal.count} {categoryTotal.count === 1 ? 'movimiento' : 'movimientos'}
                                      </span>
                                    </button>
                                  </li>
                                )
                              })}
                          </ul>
                        )}
                      </section>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
        )}
      </section>

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
                    className="finance-movement-card"
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
                  className="finance-movement-card"
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
                                onClick={() => setGoalIdToDelete(goal.id)}
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
            const categoryExpenses = categoryReportDetails
              .find(detail => detail.category.id === categoryId)?.movements || []

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
                      className="finance-movement-card"
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
      <div
        ref={historySectionRef}
        style={{
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
        <div className="history-filter-fields">
          <input
            aria-label="Buscar movimientos"
            type="search"
            value={historySearch}
            onChange={event => setHistorySearch(event.target.value)}
            placeholder="Buscar descripción o categoría"
            style={{ minWidth: 0, width: '100%', boxSizing: 'border-box', padding: '6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px' }}
          />
          <select
            aria-label="Filtrar historial por tipo"
            value={historyType}
            onChange={event => {
              setHistoryType(event.target.value)
              setHistoryCategory('all')
            }}
            style={{ minWidth: 0, width: '100%', boxSizing: 'border-box', padding: '6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px' }}
          >
            <option value="all">Todos los tipos</option>
            <option value="expense">💸 Gastos</option>
            <option value="income">💰 Ingresos</option>
          </select>
          <select aria-label="Filtrar historial por categoría" value={historyCategory} onChange={event => setHistoryCategory(event.target.value)} style={{ minWidth: 0, width: '100%', boxSizing: 'border-box', padding: '6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px' }}>
            <option value="all">Todas las categorías</option>
            {(historyType === 'expense' ? categories : historyType === 'income' ? incomeCategories : allCategories)
              .map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
          </select>
          <label className="history-date-filter" style={{ gap: '4px', color: '#495057', fontSize: '11px' }}>
            Desde
            <input aria-label="Fecha inicial del historial" type="date" value={historyFromDate} onChange={event => setHistoryFromDate(event.target.value)} style={{ minWidth: 0, width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '11px', boxSizing: 'border-box' }} />
          </label>
          <label className="history-date-filter" style={{ gap: '4px', color: '#495057', fontSize: '11px' }}>
            Hasta
            <input aria-label="Fecha final del historial" type="date" value={historyToDate} onChange={event => setHistoryToDate(event.target.value)} style={{ minWidth: 0, width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '11px', boxSizing: 'border-box' }} />
          </label>
        </div>
        {historyPeriod && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', margin: '-4px 0 16px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#eef5ff', color: '#245eb5', fontSize: '13px' }}>
            <span>
              Filtrado desde el gráfico: <strong>{historyPeriodLabel}</strong>
              {historyCategory !== 'all' && ` · ${categoriesById.get(historyCategory)?.name || historyCategory}`}
              {historyType !== 'all' && ` · ${historyType === 'income' ? 'Ingresos' : 'Gastos'}`}
            </span>
            <button
              type="button"
              onClick={clearChartHistoryFilters}
              style={{ border: 0, background: 'transparent', color: '#245eb5', fontWeight: 700, cursor: 'pointer' }}
            >
              Quitar filtro
            </button>
          </div>
        )}
        {filteredHistoryExpenses.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
            {expenses.length === 0 ? 'No hay movimientos registrados. ¡Añade tu primer movimiento!' : 'No hay movimientos que coincidan con los filtros seleccionados.'}
          </p>
        ) : (
          <div style={{ textAlign: 'left' }}>
            {Object.entries(historyExpensesByMonth).map(([month, monthExpenses]) => (
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
                    const cat = categoriesById.get(expense.category) || categories[0]
                    return (
                      <div
                        key={expense.id}
                        className="finance-movement-card"
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
            {historyVisibleCount < filteredHistoryExpenses.length && (
              <button
                type="button"
                onClick={() => setHistoryVisibleCount(count => count + HISTORY_PAGE_SIZE)}
                style={{ display: 'block', margin: '20px auto 0', padding: '10px 18px', border: 'none', borderRadius: '8px', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
              >
                Mostrar más movimientos ({Math.min(HISTORY_PAGE_SIZE, filteredHistoryExpenses.length - historyVisibleCount)})
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      {(expenseIdToDelete !== null || goalIdToDelete !== null || recurringIdToDelete !== null) && (
        <div
          role="presentation"
          onClick={() => {
            setExpenseIdToDelete(null)
            setGoalIdToDelete(null)
            setRecurringIdToDelete(null)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            backgroundColor: 'rgba(32, 24, 28, 0.48)',
            backdropFilter: 'blur(3px)'
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-item-title"
            aria-describedby="delete-item-description"
            onClick={event => event.stopPropagation()}
            style={{
              width: 'min(420px, 100%)',
              boxSizing: 'border-box',
              padding: '26px',
              border: '1px solid #f0d9df',
              borderRadius: '20px',
              background: 'linear-gradient(145deg, #fffafa, #ffffff 72%)',
              boxShadow: '0 24px 70px rgba(32, 24, 28, 0.24)',
              textAlign: 'center'
            }}
          >
            <div
              aria-hidden="true"
              style={{
                display: 'grid',
                width: '54px',
                height: '54px',
                margin: '0 auto 15px',
                placeItems: 'center',
                borderRadius: '17px',
                backgroundColor: '#fce8ec',
                color: '#b42318',
                fontSize: '25px'
              }}
            >
              🗑️
            </div>
            <h2 id="delete-item-title" style={{ margin: '0 0 9px', color: '#302b30', fontSize: '21px' }}>
              {goalIdToDelete !== null
                ? '¿Eliminar meta?'
                : recurringIdToDelete !== null
                  ? '¿Eliminar movimiento recurrente?'
                  : '¿Eliminar movimiento?'}
            </h2>
            <p id="delete-item-description" style={{ margin: 0, color: '#6d6268', fontSize: '14px', lineHeight: 1.6 }}>
              {goalIdToDelete !== null
                ? `Vas a eliminar la meta «${savingsGoals.find(goal => goal.id === goalIdToDelete)?.name || 'esta meta'}». Esta acción no se puede deshacer.`
                : recurringIdToDelete !== null
                  ? `Vas a eliminar la recurrencia «${recurringMovements.find(template => template.id === recurringIdToDelete)?.description || 'este movimiento'}». No se generarán nuevas ocurrencias.`
                  : `Vas a eliminar «${expenses.find(expense => expense.id === expenseIdToDelete)?.description || 'este movimiento'}». Esta acción no se puede deshacer.`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '22px' }}>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setExpenseIdToDelete(null)
                  setGoalIdToDelete(null)
                  setRecurringIdToDelete(null)
                }}
                style={{ padding: '10px 16px', border: '1px solid #d8c9cf', borderRadius: '10px', backgroundColor: 'white', color: '#5d5057', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteExpense}
                style={{ padding: '10px 16px', border: 'none', borderRadius: '10px', backgroundColor: '#b42318', color: 'white', fontWeight: 700, cursor: 'pointer' }}
              >
                Sí, eliminar
              </button>
            </div>
          </section>
        </div>
      )}

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
            <div style={{ position: 'relative', maxWidth: '595px', margin: '0 auto 16px' }}>
            <div ref={categoryReportPreviewRef} style={{ backgroundColor: 'white', padding: 'clamp(18px, 5vw, 42px)', minHeight: '500px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', boxSizing: 'border-box', textAlign: 'left' }}>
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
                <div key={row.id} data-pdf-page-break={`category-${row.id}`} style={{ borderBottom: '1px solid #dee2e6', padding: '8px 0' }}>
                  <div>
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
                            movements.map(movement => {
                              const breakId = `movement-${movement.id}`
                              return (
                                <Fragment key={movement.id}>
                                  <div data-pdf-page-break={breakId} style={{ borderBottom: '1px solid #e9ecef', padding: '7px 8px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(78px, auto) auto', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ minWidth: 0, color: '#333', fontSize: '13px', overflowWrap: 'anywhere' }}>{movement.description}</div>
                                    <span style={{ color: '#6c757d', fontSize: '11px', whiteSpace: 'nowrap' }}>{movement.date}</span>
                                    <strong style={{ color: isIncome ? '#18743a' : '#b42318', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                      {isIncome ? '+' : '−'}{formatCurrency(movement.amount)}
                                    </strong>
                                  </div>
                                  {renderPdfPageGap(breakId)}
                                </Fragment>
                              )
                            })
                          )}
                        </div>
                      ))}
                  </div>
                  {renderPdfPageGap(`category-${row.id}`)}
                </div>
              ))}
            </div>
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
