import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import RankBadge from '@/components/ui/RankBadge'
import dynamic from 'next/dynamic'

const AIChatWidget = dynamic(() => import('@/components/ui/AIChatWidget'), { ssr: false })

const RANK_LEVEL: Record<string, number> = {
  F: 0, E: 1, D: 2, C: 3, B: 4, A: 5, S: 6, SS: 7, SSS: 8,
}

const ROLE_LEVEL: Record<string, number> = {
  GUEST: 0, TRIAL_MEMBER: 1, ACCEPTED_MEMBER: 2, ACTIVE_WORKER: 3,
  MODERATOR: 4, COORDINATOR: 5, ADMIN: 6, FOUNDER: 7,
}

interface NavItem {
  href: string
  label: string
  icon: string
  minRole?: string
  minRank?: string
  lockReason?: string
  adminOnly?: boolean
  founderOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',              label: 'Command Center', icon: '⬡' },
  { href: '/dashboard/profile',      label: 'My Profile',     icon: '◉' },
  {
    href: '/dashboard/trial',
    label: 'My Trial',
    icon: '◈',
    minRole: 'TRIAL_MEMBER',
    lockReason: 'Submit your application first',
  },
  {
    href: '/dashboard/quests',
    label: 'Quest Board',
    icon: '◆',
    minRole: 'ACCEPTED_MEMBER',
    lockReason: 'Pass your trial to unlock quests',
  },
  {
    href: '/dashboard/chat',
    label: 'Guild Chat',
    icon: '⬢',
    minRole: 'ACCEPTED_MEMBER',
    lockReason: 'Pass your trial to unlock',
  },
  {
    href: '/dashboard/messages',
    label: 'Messages',
    icon: '◎',
    minRole: 'ACCEPTED_MEMBER',
    minRank: 'D',
    lockReason: 'Requires rank D or higher',
  },
  {
    href: '/dashboard/arena',
    label: 'Fun Arena',
    icon: '◇',
    minRole: 'ACCEPTED_MEMBER',
    lockReason: 'Pass your trial to unlock',
  },
  {
    href: '/dashboard/posts',
    label: 'Guild Board',
    icon: '◈',
    minRole: 'TRIAL_MEMBER',
    lockReason: 'Apply to the guild to access the board',
  },
  {
    href: '/dashboard/achievements',
    label: 'Honours',
    icon: '◆',
    minRole: 'TRIAL_MEMBER',
    lockReason: 'Apply to the guild to view honours',
  },
  { href: '/dashboard/feedback', label: 'Feedback', icon: '◍' },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin',   label: 'Admin Panel',      icon: '⬛', adminOnly: true },
  { href: '/founder', label: 'Founder War Room',  icon: '★', founderOnly: true },
]

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasTrial, setHasTrial] = useState<boolean | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const userRole = session?.user?.role || 'GUEST'
  const userRank = session?.user?.rank || 'F'

  useEffect(() => {
    if (!session) return
    fetch('/api/user/me').then(r => r.json()).then(d => {
      setHasTrial(!!d.trial)
      setAvatarUrl(d.profilePicUrl || null)
    }).catch(() => setHasTrial(null))
  }, [session])

  function loadNotifications() {
    fetch('/api/notifications').then(r => r.json()).then(d => {
      setNotifications(d.notifications || [])
      setUnreadCount(d.unreadCount || 0)
    }).catch(() => {})
  }

  useEffect(() => {
    if (!session) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [session])

  async function markAllRead() {
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  }

  async function openNotification(n: any) {
    setBellOpen(false)
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnreadCount(c => Math.max(0, c - 1))
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
    }
    if (n.link) router.push(n.link)
  }

  function isLocked(item: NavItem): boolean {
    if (item.minRole && ROLE_LEVEL[userRole] < ROLE_LEVEL[item.minRole]) return true
    if (item.minRank && RANK_LEVEL[userRank] < RANK_LEVEL[item.minRank]) return true
    return false
  }

  const visibleAdminNav = ADMIN_NAV.filter(item => {
    if (item.founderOnly) return userRole === 'FOUNDER'
    if (item.adminOnly) return ROLE_LEVEL[userRole] >= ROLE_LEVEL['ADMIN']
    return true
  })

  const noApplication = hasTrial === false && ROLE_LEVEL[userRole] < ROLE_LEVEL['ACCEPTED_MEMBER']

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-purple-500/15">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-7 h-7 flex-shrink-0">
            <div className="absolute inset-0 bg-purple-600/30 rotate-45 group-hover:bg-purple-500/50 transition-all" />
            <span className="absolute inset-0 flex items-center justify-center text-purple-300 font-orbitron font-black text-[10px]">Q</span>
          </div>
          <div>
            <div className="font-orbitron font-black text-white text-xs tracking-widest">QUESTHUB</div>
            <div className="font-rajdhani text-purple-400 text-[10px] tracking-[0.3em]">GUILD</div>
          </div>
        </Link>
      </div>

      {session?.user && (
        <div className="px-4 py-4 border-b border-purple-500/15">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-purple-500/40 flex-shrink-0" />
            ) : (
              <RankBadge rank={session.user.rank} size="sm" />
            )}
            <div className="min-w-0">
              <p className="font-orbitron text-xs text-white truncate">
                {session.user.nickname || session.user.name}
              </p>
              <p className="font-rajdhani text-[11px] text-slate-500 truncate">
                {session.user.xp.toLocaleString()} XP
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`text-[10px] font-rajdhani px-2 py-0.5 border tracking-widest ${
              userRole === 'FOUNDER' ? 'text-amber-300 border-amber-500/50 bg-amber-900/20' :
              userRole === 'ADMIN' ? 'text-red-300 border-red-500/50 bg-red-900/20' :
              userRole === 'ACCEPTED_MEMBER' || userRole === 'ACTIVE_WORKER' ? 'text-green-300 border-green-500/50 bg-green-900/20' :
              userRole === 'TRIAL_MEMBER' ? 'text-yellow-300 border-yellow-500/50 bg-yellow-900/20' :
              'text-slate-400 border-slate-700'
            }`}>
              {userRole.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <div className="font-orbitron text-[9px] text-slate-700 tracking-[0.3em] uppercase px-3 mb-2">
          Navigation
        </div>

        {NAV_ITEMS.map(item => {
          const locked = isLocked(item)
          const active = router.pathname === item.href || router.pathname.startsWith(item.href + '/')

          if (locked) {
            return (
              <div
                key={item.href}
                title={item.lockReason}
                className="flex items-center gap-3 px-3 py-2.5 border border-transparent text-slate-700 cursor-not-allowed relative group"
              >
                <span className="text-base flex-shrink-0 text-slate-800">{item.icon}</span>
                <span className="font-rajdhani font-semibold text-sm tracking-wide line-through decoration-slate-800">
                  {item.label}
                </span>
                <span className="ml-auto text-slate-800 text-xs flex-shrink-0">🔒</span>
                {item.lockReason && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-44 bg-[#0d0017] border border-purple-500/30 px-2.5 py-2 z-50 hidden group-hover:block shadow-xl">
                    <p className="font-rajdhani text-xs text-purple-300/80 leading-snug">{item.lockReason}</p>
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 transition-all duration-200 relative group
                ${active
                  ? 'bg-purple-900/40 border border-purple-500/40 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                  : 'border border-transparent text-slate-500 hover:text-slate-300 hover:bg-purple-900/20 hover:border-purple-500/20'
                }
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-purple-400" />
              )}
              <span className={`text-base flex-shrink-0 ${active ? 'text-purple-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                {item.icon}
              </span>
              <span className="font-rajdhani font-semibold text-sm tracking-wide">{item.label}</span>
            </Link>
          )
        })}

        {visibleAdminNav.length > 0 && (
          <>
            <div className="font-orbitron text-[9px] text-slate-700 tracking-[0.3em] uppercase px-3 mt-4 mb-2">
              {userRole === 'FOUNDER' ? 'Control' : 'Admin'}
            </div>
            {visibleAdminNav.map(item => {
              const active = router.pathname === item.href || router.pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 transition-all duration-200 relative group
                    ${active
                      ? item.founderOnly
                        ? 'bg-amber-900/30 border border-amber-500/40 text-amber-200'
                        : 'bg-red-900/30 border border-red-500/40 text-red-200'
                      : item.founderOnly
                        ? 'border border-transparent text-amber-700 hover:text-amber-400 hover:bg-amber-900/10 hover:border-amber-500/20'
                        : 'border border-transparent text-red-800 hover:text-red-400 hover:bg-red-900/10 hover:border-red-500/20'
                    }
                  `}
                >
                  {active && (
                    <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 ${item.founderOnly ? 'bg-amber-400' : 'bg-red-400'}`} />
                  )}
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                  <span className="font-rajdhani font-semibold text-sm tracking-wide">{item.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-purple-500/15 flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-slate-400 transition-colors"
        >
          <span className="text-base">↩</span>
          <span className="font-rajdhani text-sm tracking-wide">Main Site</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: typeof window !== 'undefined' ? window.location.origin + '/' : '/' })}
          className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-red-400 transition-colors w-full text-left"
        >
          <span className="text-base">⏻</span>
          <span className="font-rajdhani text-sm tracking-wide">Log Out</span>
        </button>
        {/* Discreet identity switch — not a feature normal members are pointed to.
            Signs out of the current session cleanly, then drops straight onto
            the admin/founder login form instead of the public landing page. */}
        <button
          onClick={() => signOut({ callbackUrl: typeof window !== 'undefined' ? window.location.origin + '/admin-login' : '/admin-login', redirect: true })}
          className="flex items-center gap-3 px-3 py-2 text-slate-800 hover:text-purple-500 transition-colors w-full text-left text-[10px] tracking-widest"
          title="Switch account"
        >
          <span className="text-sm">⇄</span>
          <span className="font-rajdhani tracking-wide">Switch Account</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-deep-black flex">
      <aside className="hidden md:flex flex-col w-56 lg:w-60 bg-[#08000f] border-r border-purple-500/15 fixed top-0 left-0 bottom-0 z-40">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-60 bg-[#08000f] border-r border-purple-500/15 flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-purple-500/15">
              <span className="font-orbitron text-xs text-purple-400 tracking-widest">NAVIGATION</span>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 md:ml-56 lg:ml-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-[#08000f]/90 backdrop-blur-md border-b border-purple-500/15 px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-500 hover:text-purple-300 transition-colors p-1"
              aria-label="Open menu"
            >
              <div className="flex flex-col gap-1">
                <span className="w-5 h-0.5 bg-current" />
                <span className="w-5 h-0.5 bg-current" />
                <span className="w-5 h-0.5 bg-current" />
              </div>
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="font-rajdhani text-xs text-slate-600 tracking-widest uppercase">
                {title || 'Guild Network Online'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/feedback" className="text-slate-600 hover:text-purple-300 transition-colors" title="Feedback">
              <span className="text-base">◍</span>
            </Link>
            {ROLE_LEVEL[userRole] >= ROLE_LEVEL['ACCEPTED_MEMBER'] && (
              <Link href="/dashboard/messages" className="text-slate-500 hover:text-purple-300 transition-colors" title="Messages">
                <span className="text-lg">◎</span>
              </Link>
            )}

            {/* Notification bell */}
            {session?.user && (
              <div className="relative">
                <button
                  onClick={() => setBellOpen(o => !o)}
                  className="relative text-slate-500 hover:text-amber-300 transition-colors p-1"
                  title="Notifications"
                >
                  <span className="text-lg">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white font-orbitron text-[8px] min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-[#0d0017] border border-purple-500/30 shadow-xl z-50">
                      <div className="flex items-center justify-between px-3 py-2.5 border-b border-purple-500/15 sticky top-0 bg-[#0d0017]">
                        <span className="font-orbitron text-[10px] text-purple-400 tracking-widest uppercase">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="font-orbitron text-[9px] text-slate-500 hover:text-purple-300 tracking-wider">
                            MARK ALL READ
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <p className="font-rajdhani text-sm text-slate-600 px-4 py-6 text-center">No notifications yet.</p>
                      ) : (
                        notifications.map(n => (
                          <button
                            key={n.id}
                            onClick={() => openNotification(n)}
                            className={`w-full text-left px-3 py-2.5 border-b border-purple-500/5 last:border-0 transition-colors hover:bg-purple-900/15 ${!n.read ? 'bg-purple-900/10' : ''}`}
                          >
                            <div className="flex items-start gap-2">
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />}
                              <div className="min-w-0">
                                <p className={`font-rajdhani text-sm leading-snug ${n.read ? 'text-slate-500' : 'text-slate-200'}`}>{n.title}</p>
                                {n.body && <p className="font-rajdhani text-xs text-slate-600 mt-0.5 leading-snug">{n.body}</p>}
                                <p className="font-orbitron text-[9px] text-slate-700 mt-1">
                                  {new Date(n.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {session?.user && (
              <div className="flex items-center gap-2">
                <RankBadge rank={session.user.rank} size="sm" />
                <span className="hidden sm:block font-orbitron text-xs text-slate-400 tracking-widest">
                  {session.user.nickname || session.user.name}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Apply banner — shown to users who have no application */}
        {noApplication && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              <p className="font-rajdhani text-amber-300 text-sm">
                <span className="font-orbitron text-xs text-amber-400 mr-2">ACTION REQUIRED</span>
                You have an account but no guild application. Submit one to begin your trial.
              </p>
            </div>
            <Link href="/apply">
              <span className="font-orbitron text-[10px] text-amber-300 border border-amber-500/40 bg-amber-900/30 px-3 py-1.5 hover:bg-amber-900/50 transition-all whitespace-nowrap cursor-pointer">
                APPLY NOW →
              </span>
            </Link>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 grid-bg">
          {children}
        </main>
      </div>

      <AIChatWidget />
    </div>
  )
}