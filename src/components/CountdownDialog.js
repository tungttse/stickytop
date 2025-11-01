import React, { useEffect } from 'react'

const PRESETS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '10m', seconds: 10 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '20m', seconds: 20 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '30m', seconds: 30 * 60 },
]

export default function CountdownDialog({ onSelectDuration, onClose }) {
  // Tạm thời set window opacity về 1.0 khi dialog mở
  useEffect(() => {
    let savedOpacity = 1.0
    
    const setFullOpacity = async () => {
      try {
        if (window.electronAPI && window.electronAPI.getTransparency) {
          const result = await window.electronAPI.getTransparency()
          if (result.success) {
            savedOpacity = result.opacity
            // Set opacity về 1.0 để dialog hiển thị rõ
            if (window.electronAPI && window.electronAPI.setTransparency) {
              await window.electronAPI.setTransparency(1.0)
            }
          }
        }
      } catch (error) {
        console.error('Error setting full opacity for dialog:', error)
      }
    }
    
    setFullOpacity()
    
    // Restore opacity khi dialog đóng
    return () => {
      if (window.electronAPI && window.electronAPI.setTransparency) {
        window.electronAPI.setTransparency(savedOpacity).catch(error => {
          console.error('Error restoring opacity:', error)
        })
      }
    }
  }, [])
  
  const handleClose = () => {
    onClose()
  }
  
  const handleSelect = (seconds) => {
    onSelectDuration(seconds)
  }
  
  return (
    <div className="countdown-dialog-overlay" onClick={handleClose}>
      <div className="countdown-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="countdown-dialog-header">
          <h3>Select Timer Duration</h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        <div className="countdown-dialog-presets">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              className="preset-btn"
              onClick={() => handleSelect(preset.seconds)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

