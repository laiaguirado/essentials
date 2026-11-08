const tableByKey = {
  dailyTasks: { table: 'daily_tasks', identity: ['id'], columns: 'id,text,completed,due_date' },
  dailyHabits: { table: 'daily_habits', identity: ['habit_key'], columns: 'habit_key,value' },
  dailyReminders: { table: 'daily_reminders', identity: ['id'], columns: 'id,task,due_date,category,completed' },
  expenses: { table: 'expense_movements', identity: ['id'], columns: 'id,description,amount,category,type,movement_date' },
  expenseBudgets: { table: 'expense_budgets', identity: ['month', 'category'], columns: 'month,category,amount' },
  recurringMovements: { table: 'expense_recurring_movements', identity: ['id'], columns: 'id,description,amount,category,type,frequency,next_date,day_of_month' },
  savingsGoals: { table: 'expense_savings_goals', identity: ['id'], columns: 'id,name,target,saved' },
  notes: { table: 'notes', identity: ['id'], columns: 'id,title,content,updated_at' }
}

function toIsoDate(value) {
  if (typeof value !== 'string') return null
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)

  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
}

function isoMonth(value) {
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : null
}

function formatMovementDate(value) {
  if (typeof value !== 'string') return ''
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ''
  return `${match[3]}/${match[2]}/${match[1]}`
}

function restoreId(value) {
  const id = String(value)
  const numericId = Number(id)
  return Number.isSafeInteger(numericId) && String(numericId) === id ? numericId : id
}

function getBudgetEntries(value) {
  const entries = Object.entries(value || {})
  const hasMonthKeys = entries.some(([key]) => /^\d{4}-\d{2}$/.test(key))
  const monthEntries = hasMonthKeys
    ? entries
    : [[new Date().toISOString().slice(0, 7), value || {}]]

  return monthEntries.flatMap(([month, categories]) => (
    Object.entries(categories || {}).map(([category, amount]) => ({
      month,
      category: category === 'comida' ? 'restaurantes' : category,
      amount: Number(amount) || 0
    }))
  ))
}

export function tableConfigForKey(key) {
  const config = tableByKey[key]
  if (!config) throw new Error(`No hay una tabla configurada para "${key}".`)
  return config
}

export function toTableRows(key, value, userId) {
  const baseRows = (Array.isArray(value) ? value : []).map(item => ({ ...item, user_id: userId }))

  switch (key) {
    case 'dailyTasks':
      return baseRows.map(item => ({
        user_id: userId,
        id: String(item.id),
        text: item.text || '',
        completed: Boolean(item.completed),
        due_date: toIsoDate(item.date)
      }))
    case 'dailyHabits':
      return Object.entries(value || {}).map(([habit_key, habitValue]) => ({
        user_id: userId,
        habit_key,
        value: habitValue
      }))
    case 'dailyReminders':
      return baseRows.map(item => ({
        user_id: userId,
        id: String(item.id),
        task: item.task || item.text || '',
        due_date: toIsoDate(item.date),
        category: item.category || '',
        completed: Boolean(item.completed)
      }))
    case 'expenses':
      return baseRows.map(item => {
        const category = item.category === 'comida' ? 'restaurantes' : item.category || 'general'
        return {
          user_id: userId,
          id: String(item.id),
          description: item.description || '',
          amount: Number(item.amount) || 0,
          category,
          type: item.type === 'income' ? 'income' : 'expense',
          movement_date: toIsoDate(item.date)
        }
      })
    case 'expenseBudgets':
      return getBudgetEntries(value).map(({ month, category, amount }) => ({
        user_id: userId,
        month: isoMonth(month),
        category,
        amount
      }))
    case 'recurringMovements':
      return baseRows.map(item => ({
        user_id: userId,
        id: String(item.id),
        description: item.description || '',
        amount: Number(item.amount) || 0,
        category: item.category || 'general',
        type: item.type === 'income' ? 'income' : 'expense',
        frequency: item.frequency || 'monthly',
        next_date: toIsoDate(item.nextDate),
        day_of_month: item.dayOfMonth ?? null
      }))
    case 'savingsGoals':
      return baseRows.map(item => ({
        user_id: userId,
        id: String(item.id),
        name: item.name || '',
        target: Number(item.target) || 0,
        saved: Number(item.saved) || 0
      }))
    case 'notes':
      return baseRows.map(item => ({
        user_id: userId,
        id: String(item.id),
        title: item.title || '',
        content: item.content || '',
        updated_at: item.updatedAt || null
      }))
    default:
      throw new Error(`No hay una tabla configurada para "${key}".`)
  }
}

export function recordsFromTableRows(rowsByKey) {
  const records = {}
  for (const [key, rows] of Object.entries(rowsByKey)) {
    if (key === 'dailyHabits') {
      records[key] = Object.fromEntries(rows.map(row => [row.habit_key, row.value]))
    } else if (key === 'expenseBudgets') {
      records[key] = rows.reduce((budgets, row) => {
        const month = row.month.slice(0, 7)
        budgets[month] ||= {}
        budgets[month][row.category] = Number(row.amount)
        return budgets
      }, {})
    } else if (key === 'dailyTasks') {
      records[key] = rows.map(row => ({
        id: restoreId(row.id),
        text: row.text,
        completed: row.completed,
        ...(row.due_date ? { date: row.due_date } : {})
      }))
    } else if (key === 'dailyReminders') {
      records[key] = rows.map(row => ({
        id: restoreId(row.id),
        task: row.task,
        date: row.due_date,
        category: row.category,
        completed: row.completed
      }))
    } else if (key === 'expenses') {
      records[key] = rows.map(row => ({
        id: restoreId(row.id),
        description: row.description,
        amount: Number(row.amount),
        category: row.category,
        type: row.type,
        date: formatMovementDate(row.movement_date)
      }))
    } else if (key === 'recurringMovements') {
      records[key] = rows.map(row => ({
        id: restoreId(row.id),
        description: row.description,
        amount: Number(row.amount),
        category: row.category,
        type: row.type,
        frequency: row.frequency,
        nextDate: row.next_date,
        dayOfMonth: row.day_of_month
      }))
    } else if (key === 'savingsGoals') {
      records[key] = rows.map(row => ({
        id: restoreId(row.id),
        name: row.name,
        target: Number(row.target),
        saved: Number(row.saved)
      }))
    } else if (key === 'notes') {
      records[key] = rows.map(row => ({
        id: restoreId(row.id),
        title: row.title,
        content: row.content,
        updatedAt: row.updated_at
      }))
    } else {
      throw new Error(`No hay una conversión desde las columnas para "${key}".`)
    }
  }
  return records
}

export function getTableRowIdentity(key, row) {
  const { identity } = tableConfigForKey(key)
  return identity.map(field => String(row[field])).join(':')
}
