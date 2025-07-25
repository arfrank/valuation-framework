import { useEffect, useRef } from 'react'
import './GeometricBackground.css'

const GeometricBackground = ({ isActive }) => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let time = 0

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Dyson Sphere - geometric grid around a central star
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const sphereRadius = Math.min(canvas.width, canvas.height) * 0.3
    
    // Grid lines for the sphere
    const gridLines = []
    const numLatLines = 12  // Latitude lines
    const numLongLines = 16 // Longitude lines
    
    // Create latitude circles
    for (let i = 0; i < numLatLines; i++) {
      const angle = (i / numLatLines) * Math.PI
      gridLines.push({
        type: 'latitude',
        angle: angle,
        radius: sphereRadius * Math.sin(angle),
        y: centerY - sphereRadius * Math.cos(angle),
        phase: i * 0.3
      })
    }
    
    // Create longitude circles
    for (let i = 0; i < numLongLines; i++) {
      const angle = (i / numLongLines) * Math.PI * 2
      gridLines.push({
        type: 'longitude',
        angle: angle,
        phase: i * 0.2
      })
    }

    // Energy beams radiating from center
    const energyBeams = []
    const numBeams = 24
    for (let i = 0; i < numBeams; i++) {
      energyBeams.push({
        angle: (i / numBeams) * Math.PI * 2,
        length: sphereRadius * 1.5,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.01,
        width: Math.random() * 3 + 1
      })
    }

    // Orbiting satellites/nodes
    const satellites = []
    const numSatellites = 8
    for (let i = 0; i < numSatellites; i++) {
      satellites.push({
        orbitRadius: sphereRadius * (1.2 + Math.random() * 0.8),
        angle: (i / numSatellites) * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.01,
        size: 3 + Math.random() * 4,
        hue: Math.random() * 360
      })
    }

    const animate = () => {
      // Deep space background
      ctx.fillStyle = 'rgba(5, 5, 15, 0.95)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      time += 0.015

      // Draw central star with pulsing energy
      const starPulse = Math.sin(time * 3) * 0.3 + 1
      const starSize = 25 * starPulse
      const starHue = (time * 30) % 360
      
      ctx.save()
      ctx.translate(centerX, centerY)
      
      // Star core
      const starGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, starSize)
      starGradient.addColorStop(0, `hsl(${starHue}, 100%, 90%)`)
      starGradient.addColorStop(0.3, `hsl(${starHue + 60}, 100%, 70%)`)
      starGradient.addColorStop(0.7, `hsl(${starHue + 120}, 80%, 40%)`)
      starGradient.addColorStop(1, `hsl(${starHue}, 60%, 20%)`)
      
      ctx.fillStyle = starGradient
      ctx.shadowColor = `hsl(${starHue}, 100%, 50%)`
      ctx.shadowBlur = 40
      ctx.beginPath()
      ctx.arc(0, 0, starSize, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.restore()

      // Draw energy beams radiating from star
      energyBeams.forEach((beam, i) => {
        beam.phase += beam.speed
        
        const intensity = Math.sin(beam.phase) * 0.5 + 0.5
        const beamLength = beam.length * intensity
        const beamHue = (starHue + i * 15) % 360
        
        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate(beam.angle + time * 0.1)
        
        const gradient = ctx.createLinearGradient(0, 0, beamLength, 0)
        gradient.addColorStop(0, `hsla(${beamHue}, 100%, 70%, 0.8)`)
        gradient.addColorStop(0.3, `hsla(${beamHue + 30}, 80%, 60%, 0.4)`)
        gradient.addColorStop(1, `hsla(${beamHue}, 60%, 40%, 0)`)
        
        ctx.strokeStyle = gradient
        ctx.lineWidth = beam.width * intensity
        ctx.shadowColor = `hsl(${beamHue}, 100%, 50%)`
        ctx.shadowBlur = 10
        
        ctx.beginPath()
        ctx.moveTo(starSize, 0)
        ctx.lineTo(beamLength, 0)
        ctx.stroke()
        
        ctx.restore()
      })

      // Draw Dyson sphere grid
      ctx.lineWidth = 1
      ctx.shadowBlur = 5
      
      gridLines.forEach((line, i) => {
        const gridHue = (starHue + 180 + i * 10) % 360
        const pulse = Math.sin(time * 2 + line.phase) * 0.3 + 0.7
        
        ctx.strokeStyle = `hsla(${gridHue}, 70%, 60%, ${pulse * 0.6})`
        ctx.shadowColor = `hsl(${gridHue}, 100%, 50%)`
        
        if (line.type === 'latitude') {
          // Draw latitude circles (horizontal rings)
          ctx.beginPath()
          ctx.arc(centerX, line.y, line.radius, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          // Draw longitude curves (vertical meridians)
          ctx.save()
          ctx.translate(centerX, centerY)
          ctx.rotate(line.angle)
          
          ctx.beginPath()
          ctx.ellipse(0, 0, sphereRadius, sphereRadius * 0.3, 0, 0, Math.PI * 2)
          ctx.stroke()
          
          ctx.restore()
        }
      })

      // Draw orbiting satellites
      satellites.forEach((satellite, i) => {
        satellite.angle += satellite.speed
        
        const x = centerX + Math.cos(satellite.angle) * satellite.orbitRadius
        const y = centerY + Math.sin(satellite.angle) * satellite.orbitRadius * 0.6 // Elliptical orbit
        
        const satHue = (satellite.hue + time * 20) % 360
        const pulse = Math.sin(time * 4 + i) * 0.4 + 0.8
        
        ctx.save()
        ctx.translate(x, y)
        
        // Satellite body
        ctx.fillStyle = `hsl(${satHue}, 80%, 70%)`
        ctx.shadowColor = `hsl(${satHue}, 100%, 50%)`
        ctx.shadowBlur = 15
        ctx.beginPath()
        ctx.arc(0, 0, satellite.size * pulse, 0, Math.PI * 2)
        ctx.fill()
        
        // Satellite solar panels
        ctx.strokeStyle = `hsl(${satHue + 60}, 60%, 50%)`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-satellite.size * 2, 0)
        ctx.lineTo(satellite.size * 2, 0)
        ctx.stroke()
        
        ctx.restore()
        
        // Draw orbit trail
        ctx.strokeStyle = `hsla(${satHue}, 50%, 40%, 0.2)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, satellite.orbitRadius, satellite.orbitRadius * 0.6, 0, 0, Math.PI * 2)
        ctx.stroke()
      })

      // Add some space dust/debris
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2 + time * 0.02
        const distance = sphereRadius * 1.5 + Math.sin(time + i) * 20
        const x = centerX + Math.cos(angle) * distance
        const y = centerY + Math.sin(angle) * distance * 0.7
        
        const dustHue = (starHue + i * 7) % 360
        const alpha = Math.sin(time * 2 + i * 0.1) * 0.3 + 0.2
        
        ctx.fillStyle = `hsla(${dustHue}, 60%, 80%, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive])

  if (!isActive) return null

  return (
    <div className="geometric-background">
      <canvas 
        ref={canvasRef}
        className="geometric-canvas"
      />
      <div className="geometric-overlay">
        <div className="geometric-logo">
          <div className="geometric-pulse">
            <span>ValuFrame</span>
            <div className="geometric-subtitle">Enhanced Experience ✨</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GeometricBackground