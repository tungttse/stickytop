import React from 'react'

const PRESETS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '10m', seconds: 10 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '20m', seconds: 20 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '30m', seconds: 30 * 60 },
]

export default function CountdownDialog({ onSelectDuration, onClose }) {
  return (
    <div className="countdown-dialog-overlay" onClick={onClose}>
      <div className="countdown-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="countdown-dialog-header">
          <h3>Select Timer Duration</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="countdown-dialog-presets">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              className="preset-btn"
              onClick={() => onSelectDuration(preset.seconds)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

