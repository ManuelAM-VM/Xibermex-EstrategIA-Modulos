'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PlusCircle, CheckSquare, List,
  Sparkles, CreditCard, Upload, ChevronDown, ChevronUp, Menu, X,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

const navItems = [
  { href: '/panel',           label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/panel/registrar', label: 'Registrar',         icon: PlusCircle },
  { href: '/panel/aprobar',   label: 'Aprobar',           icon: CheckSquare },
  { href: '/panel/modulos',   label: 'Módulos',           icon: List },
  { href: '/panel/analisis',  label: 'Análisis IA',       icon: Sparkles },
  { href: '/panel/pagos',     label: 'Pagos',             icon: CreditCard },
  { href: '/panel/importar',  label: 'Importar',          icon: Upload },
]

interface Config {
  tarifa_dia: string
  horas_dia: string
  anthropic_api_key: string
}

export default function Sidebar() {
  const pathname  = usePathname()
  const isMobile  = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [config, setConfig] = useState<Config>({
    tarifa_dia: '500', horas_dia: '4', anthropic_api_key: '',
  })

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setConfig({
          tarifa_dia:        data.tarifa_dia        || '500',
          horas_dia:         data.horas_dia         || '4',
          anthropic_api_key: data.anthropic_api_key || '',
        })
      })
      .catch(() => {})
  }, [])

  // Cerrar menú al navegar
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const tarifaHora = parseFloat(config.tarifa_dia) / parseFloat(config.horas_dia) || 0

  const handleSaveConfig = async () => {
    await fetch('/api/configuracion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
  }

  const TARIFA_DIA_OPTIONS = ['300', '400', '500', '600', '700', '800', '1000']
  const HORAS_DIA_OPTIONS  = ['2', '3', '4', '5', '6', '7', '8']

  // ── MOBILE ──────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Top bar */}
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          backgroundColor: '#13131a',
          borderBottom: '1px solid #1e1e2e',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: '52px',
        }}>
          <Link href="/panel" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0' }}>
              Estrateg<span style={{ color: '#7c3aed' }}>IA</span>
            </span>
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: '#9ca3af', padding: '8px', display: 'flex' }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        {/* Drawer overlay */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 190,
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}
          />
        )}

        {/* Drawer panel */}
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 195,
          width: '260px',
          backgroundColor: '#13131a',
          borderLeft: '1px solid #1e1e2e',
          display: 'flex', flexDirection: 'column',
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          overflowY: 'auto',
        }}>
          {/* Header del drawer */}
          <div style={{ padding: '16px', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>
              Estrateg<span style={{ color: '#7c3aed' }}>IA</span>
            </span>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#6b7280', padding: '4px', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {navItems.map((item) => {
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
                  <Icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Config */}
          <ConfigPanel
            config={config} setConfig={setConfig}
            tarifaHora={tarifaHora}
            showApiKey={showApiKey} setShowApiKey={setShowApiKey}
            handleSaveConfig={handleSaveConfig}
            TARIFA_DIA_OPTIONS={TARIFA_DIA_OPTIONS}
            HORAS_DIA_OPTIONS={HORAS_DIA_OPTIONS}
          />
        </div>

        {/* Bottom nav (accesos rápidos) */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          backgroundColor: '#13131a',
          borderTop: '1px solid #1e1e2e',
          display: 'flex',
          height: '56px',
        }}>
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '3px',
                color: isActive ? '#7c3aed' : '#6b7280',
                textDecoration: 'none', fontSize: '9px',
                borderTop: isActive ? '2px solid #7c3aed' : '2px solid transparent',
              }}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </>
    )
  }

  // ── DESKTOP ──────────────────────────────────────────────────────────────
  return (
    <aside style={{
      width: '220px', minWidth: '220px',
      backgroundColor: '#13131a',
      borderRight: '1px solid #1e1e2e',
      display: 'flex', flexDirection: 'column',
      height: '100vh',
      position: 'fixed', top: 0, left: 0,
      zIndex: 100, overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 14px', borderBottom: '1px solid #1e1e2e' }}>
        <Link href="/panel" style={{ textDecoration: 'none' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0' }}>
            Estrateg<span style={{ color: '#7c3aed' }}>IA</span>
          </h1>
          <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>panel / módulos</p>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 20px', fontSize: '13px',
              color: isActive ? '#e2e8f0' : '#9ca3af',
              backgroundColor: isActive ? '#7c3aed22' : 'transparent',
              borderLeft: isActive ? '2px solid #7c3aed' : '2px solid transparent',
              textDecoration: 'none', transition: 'all 0.15s',
            }}>
              <Icon size={15} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <ConfigPanel
        config={config} setConfig={setConfig}
        tarifaHora={tarifaHora}
        showApiKey={showApiKey} setShowApiKey={setShowApiKey}
        handleSaveConfig={handleSaveConfig}
        TARIFA_DIA_OPTIONS={TARIFA_DIA_OPTIONS}
        HORAS_DIA_OPTIONS={HORAS_DIA_OPTIONS}
      />
    </aside>
  )
}

// ── Panel de configuración reutilizable ──────────────────────────────────────
function ConfigPanel({
  config, setConfig, tarifaHora,
  showApiKey, setShowApiKey, handleSaveConfig,
  TARIFA_DIA_OPTIONS, HORAS_DIA_OPTIONS,
}: {
  config: Config
  setConfig: (c: Config) => void
  tarifaHora: number
  showApiKey: boolean
  setShowApiKey: (v: boolean) => void
  handleSaveConfig: () => void
  TARIFA_DIA_OPTIONS: string[]
  HORAS_DIA_OPTIONS: string[]
}) {
  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid #1e1e2e', fontSize: '12px' }}>
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: '#6b7280' }}>$/día</span>
          <select
            value={config.tarifa_dia}
            onChange={(e) => setConfig({ ...config, tarifa_dia: e.target.value })}
            onBlur={handleSaveConfig}
            style={{ fontSize: '12px', padding: '2px 20px 2px 6px', width: 'auto' }}
          >
            {TARIFA_DIA_OPTIONS.map((v) => <option key={v} value={v}>${v}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>hrs/día</span>
          <select
            value={config.horas_dia}
            onChange={(e) => setConfig({ ...config, horas_dia: e.target.value })}
            onBlur={handleSaveConfig}
            style={{ fontSize: '12px', padding: '2px 20px 2px 6px', width: 'auto' }}
          >
            {HORAS_DIA_OPTIONS.map((v) => <option key={v} value={v}>{v} hrs</option>)}
          </select>
        </div>
      </div>

      <div style={{
        backgroundColor: '#7c3aed', borderRadius: '6px',
        padding: '6px 10px', textAlign: 'center',
        color: 'white', fontWeight: '600', marginBottom: '8px',
      }}>
        ${tarifaHora.toFixed(2)} / hr
      </div>

      <div>
        <button
          onClick={() => setShowApiKey(!showApiKey)}
          style={{
            background: 'none', color: '#6b7280', fontSize: '11px',
            padding: '2px 0', display: 'flex', alignItems: 'center', gap: '4px', width: '100%',
          }}
        >
          ANTHROPIC API KEY
          {showApiKey ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        {showApiKey ? (
          <input
            type="password"
            value={config.anthropic_api_key}
            onChange={(e) => setConfig({ ...config, anthropic_api_key: e.target.value })}
            onBlur={handleSaveConfig}
            placeholder="sk-ant-..."
            style={{ fontSize: '11px', marginTop: '4px', padding: '4px 8px' }}
          />
        ) : (
          <p style={{ color: '#4b5563', fontSize: '10px', marginTop: '2px' }}>
            Opcional — para análisis IA
          </p>
        )}
      </div>
    </div>
  )
}
