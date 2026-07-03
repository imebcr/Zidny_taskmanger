'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Download, BarChart3, Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DEPARTMENTS } from '@/lib/types'

interface Stats {
  statusDist: Record<string, number>
  workload: { fullName: string; openTasks: number; overdueTasks: number }[]
  overdueTasks: { id: string; title: string; daysLate: number; assignees: string[] }[]
  weeklyThroughput: { week: string; count: number }[]
  avgCompletionHours: number
  onTimeRate: number
  deptDist: Record<string, number>
  unassignedTasks: { id: string; title: string; deadline: string; priority: string }[]
  totalTasks: number
  totalUsers: number
}

const STATUS_COLORS: Record<string, string> = { TODO: '#0C224B', IN_PROGRESS: '#2AA4E7', OVERDUE: '#DC2626', DONE: '#16A34A' }
const STATUS_LABELS: Record<string, string> = { TODO: 'À faire', IN_PROGRESS: 'En cours', OVERDUE: 'En retard', DONE: 'Terminé' }
const PIE_COLORS = ['#2AA4E7', '#0A60AD', '#DC2626', '#16A34A', '#D97706', '#6B7280', '#8B5CF6']

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') { router.push('/dashboard'); return }
    fetch('/api/admin/stats').then(r => r.json()).then(setStats)
  }, [session, router])

  async function exportCSV() {
    setExportLoading(true)
    const res = await fetch('/api/admin/export')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zidny-export-${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportLoading(false)
  }

  if (!stats) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-navy/40">Chargement…</div>
    </div>
  )

  const statusChartData = Object.entries(stats.statusDist).map(([k, v]) => ({
    name: STATUS_LABELS[k] || k, value: v, fill: STATUS_COLORS[k] || '#888'
  }))

  const deptChartData = Object.entries(stats.deptDist).map(([k, v]) => ({
    name: DEPARTMENTS.find(d => d.value === k)?.label || k, value: v,
  })).sort((a, b) => b.value - a.value)

  const weeklyData = stats.weeklyThroughput.map(w => ({
    name: format(parseISO(w.week), 'dd MMM', { locale: fr }),
    Tâches: w.count,
  }))

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 28 } } }

  return (
    <div>
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-brand" size={22} />
          <div>
            <h1 className="text-navy font-bold text-xl">Tableau de bord Admin</h1>
            <p className="text-navy/45 text-sm">{stats.totalTasks} tâches · {stats.totalUsers} membres actifs</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          disabled={exportLoading}
          className="flex items-center gap-2 bg-brand hover:bg-ocean text-white font-semibold rounded-xl px-4 py-2 text-sm shadow-sm shadow-brand/25 transition-colors disabled:opacity-60"
        >
          <Download size={16} />
          {exportLoading ? 'Export…' : 'Exporter CSV'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI row */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Taux de ponctualité', value: `${stats.onTimeRate}%`, icon: <TrendingUp size={20} />, color: 'text-green-500' },
            { label: 'Durée moy. complétion', value: `${stats.avgCompletionHours}h`, icon: <Clock size={20} />, color: 'text-brand' },
            { label: 'Tâches en retard', value: stats.overdueTasks.length, icon: <AlertTriangle size={20} />, color: 'text-red-500' },
            { label: 'Non assignées', value: stats.unassignedTasks.length, icon: <Users size={20} />, color: 'text-amber-500' },
          ].map(kpi => (
            <motion.div key={kpi.label} variants={item} className="glass rounded-2xl p-4">
              <div className={`mb-2 ${kpi.color}`}>{kpi.icon}</div>
              <div className="text-2xl font-bold text-navy">{kpi.value}</div>
              <div className="text-xs text-navy/45 font-medium">{kpi.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Weekly throughput */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-5 lg:col-span-2">
            <h3 className="text-navy font-bold mb-4">Tâches terminées par semaine</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weeklyData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#0C224B99' }} />
                <YAxis tick={{ fontSize: 11, fill: '#0C224B99' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.9)' }} />
                <Line type="monotone" dataKey="Tâches" stroke="#2AA4E7" strokeWidth={2.5} dot={{ fill: '#2AA4E7', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Status pie */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-5">
            <h3 className="text-navy font-bold mb-4">Distribution par statut</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                  {statusChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.9)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center">
              {statusChartData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                  <span className="text-xs text-navy/50">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Workload + Dept */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Workload */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-5">
            <h3 className="text-navy font-bold mb-4">Charge de travail par membre</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.workload.sort((a, b) => b.openTasks - a.openTasks).slice(0, 8)}>
                <XAxis dataKey="fullName" tick={{ fontSize: 10, fill: '#0C224B99' }} />
                <YAxis tick={{ fontSize: 11, fill: '#0C224B99' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.9)' }} />
                <Bar dataKey="openTasks" name="Tâches ouvertes" fill="#2AA4E7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdueTasks" name="En retard" fill="#DC2626" radius={[4, 4, 0, 0]} />
                <Legend formatter={v => <span className="text-xs text-navy/60">{v}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Department */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass rounded-2xl p-5">
            <h3 className="text-navy font-bold mb-4">Tâches par département</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={deptChartData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#0C224B99' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#0C224B99' }} width={80} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.9)' }} />
                <Bar dataKey="value" fill="#0A60AD" radius={[0, 4, 4, 0]}>
                  {deptChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Overdue table */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-5">
          <h3 className="text-navy font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Tâches en retard
            <span className="ml-auto text-sm font-normal text-navy/40">{stats.overdueTasks.length} tâche{stats.overdueTasks.length !== 1 ? 's' : ''}</span>
          </h3>
          {stats.overdueTasks.length === 0 ? (
            <p className="text-navy/40 text-sm text-center py-6">🎉 Aucune tâche en retard</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/40">
                    <th className="text-left py-2 px-3 text-navy/50 font-medium text-xs">Tâche</th>
                    <th className="text-left py-2 px-3 text-navy/50 font-medium text-xs">Responsable(s)</th>
                    <th className="text-left py-2 px-3 text-navy/50 font-medium text-xs">Jours de retard</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.overdueTasks.map(t => (
                    <tr key={t.id} className="border-b border-white/20 hover:bg-white/20 transition-colors">
                      <td className="py-2.5 px-3 text-navy font-semibold">{t.title}</td>
                      <td className="py-2.5 px-3 text-navy/60">{t.assignees.join(', ') || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-red-50 text-red-600 text-xs font-bold rounded-full px-2 py-0.5">
                          J+{t.daysLate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Unassigned quick-assign panel */}
        {stats.unassignedTasks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass rounded-2xl p-5">
            <h3 className="text-navy font-bold mb-4">Tâches non assignées — Attribution rapide</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.unassignedTasks.slice(0, 9).map(task => (
                <div key={task.id} className="glass-sm rounded-xl p-3">
                  <p className="text-navy font-semibold text-sm line-clamp-2 mb-1">{task.title}</p>
                  <p className="text-navy/40 text-xs">{format(new Date(task.deadline), 'dd/MM/yyyy')}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
