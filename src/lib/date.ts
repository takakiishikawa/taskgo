export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function getDaysAgo(dateStr: string): number {
  const then = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - then.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getMonthsFromNow(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  const yearDiff = target.getFullYear() - now.getFullYear()
  const monthDiff = target.getMonth() - now.getMonth()
  return yearDiff * 12 + monthDiff
}

export function formatMonthsFromNow(dateStr: string): string {
  const months = getMonthsFromNow(dateStr)
  if (months < 0) return '期限切れ'
  if (months < 1) return '1ヶ月未満'
  if (months < 12) return `${months}ヶ月先`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return `${years}年先`
  return `${years}年${rem}ヶ月先`
}
