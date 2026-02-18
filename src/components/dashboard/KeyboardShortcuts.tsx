import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface ShortcutConfig {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  action: () => void
  description: string
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  const location = useLocation()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]')
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

        const ctrlMatch = shortcut.ctrlKey === undefined || e.ctrlKey === shortcut.ctrlKey
        const metaMatch = shortcut.metaKey === undefined || e.metaKey === shortcut.metaKey
        const shiftMatch = shortcut.shiftKey === undefined || e.shiftKey === shortcut.shiftKey

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
          e.preventDefault()
          shortcut.action()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, location.pathname])
}

export const GlobalKeyboardShortcuts = () => {
  const navigate = useNavigate()

  const shortcuts: ShortcutConfig[] = [
    { key: 'n', metaKey: true, ctrlKey: true, action: () => navigate('/dashboard/orders/new'), description: 'Neuer Auftrag' },
    { key: 'k', metaKey: true, ctrlKey: true, action: () => navigate('/dashboard/scan'), description: 'QR scannen' },
    { key: 'u', metaKey: true, ctrlKey: true, action: () => navigate('/dashboard/employees'), description: 'Mitarbeiter' },
    { key: 't', metaKey: true, ctrlKey: true, action: () => navigate('/dashboard/tasks'), description: 'Aufgaben' },
    { key: 'r', metaKey: true, ctrlKey: true, action: () => navigate('/dashboard/reports'), description: 'Berichte' },
    { key: '?', shiftKey: true, action: () => navigate('/dashboard/shortcuts'), description: 'Shortcuts anzeigen' },
    { key: 'Escape', action: () => navigate('/dashboard'), description: 'Zum Dashboard' },
  ]

  useKeyboardShortcuts(shortcuts)

  return null
}
