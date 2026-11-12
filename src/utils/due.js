const pad = (n) => String(n).padStart(2, '0')

export function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 'overdue' | 'today' | '' — dueDate is a local 'YYYY-MM-DD' string, so plain string comparison works.
export function dueStatus(todo, today) {
  if (!todo.dueDate || todo.done) return ''
  if (todo.dueDate < today) return 'overdue'
  if (todo.dueDate === today) return 'today'
  return ''
}
