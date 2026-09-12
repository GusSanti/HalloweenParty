import { useEffect, useMemo, useState } from 'react'

function calculate(target: number) {
  const remaining = Math.max(0, target - Date.now())
  return { ended: remaining === 0, days: Math.floor(remaining / 86400000), hours: Math.floor((remaining / 3600000) % 24), minutes: Math.floor((remaining / 60000) % 60), seconds: Math.floor((remaining / 1000) % 60) }
}

export function Countdown({ date }: { date: string }) {
  const target = useMemo(() => new Date(date.length === 10 ? `${date}T00:00:00-03:00` : date).getTime(), [date])
  const [value, setValue] = useState(() => calculate(target))
  useEffect(() => { const id = window.setInterval(() => setValue(calculate(target)), 1000); return () => window.clearInterval(id) }, [target])
  if (value.ended) return <p className="countdown-ended">Evento encerrado</p>
  return (
    <div className="countdown" aria-label={`Faltam ${value.days} dias, ${value.hours} horas, ${value.minutes} minutos e ${value.seconds} segundos`}>
      {([['DIAS', value.days], ['HORAS', value.hours], ['MIN', value.minutes], ['SEG', value.seconds]] as const).map(([label, count]) => (
        <div key={label}><strong>{String(count).padStart(2, '0')}</strong><span>{label}</span></div>
      ))}
    </div>
  )
}
