import React, { useEffect, useState } from 'react'
import { useUserContext } from '../../contexts/UserContext'

const PRESETS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '10m', seconds: 10 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '20m', seconds: 20 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '30m', seconds: 30 * 60 },
]

export default function CountdownDialog({ onSelectDuration, onClose }) {
  const { isPremium } = useUserContext()
  const [customTime, setCustomTime] = useState({ hours: 0, minutes: 0, seconds: 0 })
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

  const handleCustomTimeSubmit = () => {
    const totalSeconds = 
      customTime.hours * 3600 + 
      customTime.minutes * 60 + 
      customTime.seconds
    if (totalSeconds > 0) {
      onSelectDuration(totalSeconds)
      onClose()
    }
  }

  const formatCustomTime = () => {
    const parts = []
    if (customTime.hours > 0) parts.push(`${customTime.hours}h`)
    if (customTime.minutes > 0) parts.push(`${customTime.minutes}m`)
    if (customTime.seconds > 0) parts.push(`${customTime.seconds}s`)
    return parts.length > 0 ? parts.join(' ') : '0s'
  }
  
  return (
    <div className="countdown-dialog-overlay" onClick={handleClose}>
      <div className="countdown-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="countdown-dialog-header">
          <h3>Select Timer Duration</h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        {/* Preset buttons - Available for all users */}
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

        {/* Custom time input - Premium only */}
        {isPremium() ? (
          <div className="countdown-dialog-custom">
            <div className="countdown-dialog-divider">
              <span>Or set custom time</span>
            </div>
            <div className="countdown-custom-inputs">
              <div className="countdown-custom-input-group">
                <label>Hours</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={customTime.hours}
                  onChange={(e) => setCustomTime({...customTime, hours: Math.max(0, Math.min(23, parseInt(e.target.value) || 0))})}
                />
              </div>
              <div className="countdown-custom-input-group">
                <label>Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customTime.minutes}
                  onChange={(e) => setCustomTime({...customTime, minutes: Math.max(0, Math.min(59, parseInt(e.target.value) || 0))})}
                />
              </div>
              <div className="countdown-custom-input-group">
                <label>Seconds</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customTime.seconds}
                  onChange={(e) => setCustomTime({...customTime, seconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0))})}
                />
              </div>
            </div>
            <button 
              className="preset-btn preset-btn-primary"
              onClick={handleCustomTimeSubmit}
              disabled={customTime.hours === 0 && customTime.minutes === 0 && customTime.seconds === 0}
            >
              Set Custom Time ({formatCustomTime()})
            </button>
          </div>
        ) : (
          <div className="countdown-dialog-upgrade-hint">
            <div className="upgrade-hint-icon">⭐</div>
            <div className="upgrade-hint-text">
              <strong>Unlock custom countdown times</strong>
              <span>Upgrade to Premium to set any duration</span>
            </div>
            <button 
              className="upgrade-hint-btn" 
              onClick={() => {
                // TODO: Open upgrade modal
                console.log('Upgrade to Premium clicked')
              }}
            >
              Upgrade
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

