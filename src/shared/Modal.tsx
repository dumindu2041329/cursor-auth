import type { PropsWithChildren, ReactNode } from 'react'

type ModalProps = PropsWithChildren<{
  open: boolean
  title?: ReactNode
  onClose: () => void
}>

function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-window">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(180deg, #7c3aed, #5b21b6)' }} />
            {title}
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal


