'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PlusCircle, CheckSquare, List,
  Sparkles, CreditCard, Upload, Menu, X,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

const navItems = [
  { href: '/panel',           label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/panel/registrar', label: 'Registrar',   icon: PlusCircle },
  { href: '/panel/aprobar',   label: 'Aprobar',     icon: CheckSquare },
  { href: '/panel/modulos',   label: 'Módulos',     icon: List },
  { href: '/panel/analisis',  label: 'Análisis IA', icon: Sparkles },
  { href: '/panel/pagos',     label: 'Pagos',       icon: CreditCard },
  { href: '/panel/importar',  label: 'Importar',    icon: Upload },
]

export default function Sidebar() {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [pathname])

  // ── MOBILE ──
  if (isMobile) {
    return (
      <>
        {/* Top bar */}
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          backgroundColor: '#13131a', borderBottom: '1px solid #1e1e2e',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: '52px',
        }}>
          <Link href="/panel" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0' }}>
              Estrateg<span style={{ color: '#7c3aed' }}>IA</span>
            </span>
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: '#9ca3af', padding: '8px', display: 'flex' }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        {/* Drawer overlay */}
        {menuOpen && (
          <div onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 190, backgroundColor: 'rgba(0,0,0,0.6)' }} />
        )}

        {/* Drawer panel */}
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 195,
          width: '240px', backgroundColor: '#13131a', borderLeft: '1px solid #1e1e2e',
          display: 'flex', flexDirection: 'column',
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease', overflowY: 'auto',
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>
              Estrateg<span style={{ color: '#7c3aed' }}>IA</span>
            </span>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#6b7280', padding: '4px', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 20px', fontSize: '14px',
                  color: isActive ? '#e2e8f0' : '#9ca3af',
                  backgroundColor: isActive ? '#7c3aed22' : 'transparent',
                  borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
                  textDecoration: 'none',
                }}>
                  <Icon size={16} /> {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom nav */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          backgroundColor: '#13131a', borderTop: '1px solid #1e1e2e',
          display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {navItems.slice(0, 5).map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '3px', height: '56px',
                color: isActive ? '#7c3aed' : '#6b7280',
                textDecoration: 'none', fontSize: '9px',
                borderTop: isActive ? '2px solid #7c3aed' : '2px solid transparent',
              }}>
                <Icon size={18} /> <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </>
    )
  }

  // ── DESKTOP ──
  return (
    <aside style={{
      width: '200px', minWidth: '200px',
      backgroundColor: '#13131a', borderRight: '1px solid #1e1e2e',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'fixed', top: 0, left: 0,
      zIndex: 100, overflowY: 'auto', overflowX: 'hidden',
    }}>
      <div style={{ padding: '22px 20px 14px', borderBottom: '1px solid #1e1e2e' }}>
        <Link href="/panel" style={{ textDecoration: 'none' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0' }}>
            Estrateg<span style={{ color: '#7c3aed' }}>IA</span>
          </h1>
          <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>panel / módulos</p>
        </Link>
      </div>
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 20px', fontSize: '13px',
              color: isActive ? '#e2e8f0' : '#9ca3af',
              backgroundColor: isActive ? '#7c3aed22' : 'transparent',
              borderLeft: isActive ? '2px solid #7c3aed' : '2px solid transparent',
              textDecoration: 'none', transition: 'all 0.15s',
            }}>
              <Icon size={15} /> {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
