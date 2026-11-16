const pad = (n) => String(n).padStart(2, '0')

// Local calendar date as 'YYYY-MM-DD' (not UTC: toISOString() would shift the day for early-morning times in Korea).
export function localDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayString() {
  return localDateString(new Date())
}

// 'overdue' | 'today' | '' — dueDate is a local 'YYYY-MM-DD' string, so plain string comparison works.
export function dueStatus(todo, today) {
  if (!todo.dueDate || todo.done) return ''
  if (todo.dueDate < today) return 'overdue'
  if (todo.dueDate === today) return 'today'
  return ''
}
