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

    // Stripe-inspired geometric patterns
    const stripes = []
    const numStripes = 60

    // Initialize stripes with 3D properties
    for (let i = 0; i < numStripes; i++) {
      stripes.push({
        x: (i / numStripes) * canvas.width * 2,
        y: Math.random() * canvas.height,
        z: Math.random() * 1000 + 500,
        width: Math.random() * 4 + 2,
        rotation: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.5 + 0.1,
        color: i % 3 === 0 ? '#635BFF' : i % 3 === 1 ? '#00D924' : '#FF5CAA'
      })
    }

    const particles = []
    const numParticles = 100

    // Initialize particles
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 800 + 200,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2
      })
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.95)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      time += 0.016

      // Draw animated stripes with 3D perspective
      stripes.forEach((stripe, i) => {
        // Update stripe position and rotation
        stripe.rotation += stripe.speed * 0.02
        stripe.z += Math.sin(time + i * 0.1) * 2

        // 3D perspective calculation
        const perspective = 800
        const scale = perspective / (perspective + stripe.z)
        const x = (stripe.x - canvas.width / 2) * scale + canvas.width / 2
        const y = (stripe.y - canvas.height / 2) * scale + canvas.height / 2

        if (scale > 0.1) {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(stripe.rotation)
          ctx.scale(scale, scale)

          // Create gradient for depth
          const gradient = ctx.createLinearGradient(-50, -2, 50, 2)
          gradient.addColorStop(0, `${stripe.color}00`)
          gradient.addColorStop(0.5, `${stripe.color}CC`)
          gradient.addColorStop(1, `${stripe.color}00`)

          ctx.fillStyle = gradient
          ctx.fillRect(-100, -stripe.width / 2, 200, stripe.width)

          // Add glow effect
          ctx.shadowColor = stripe.color
          ctx.shadowBlur = 20 * scale
          ctx.fillRect(-100, -stripe.width / 2, 200, stripe.width)

          ctx.restore()
        }

        // Reset stripe position when it gets too close
        if (stripe.z < 50) {
          stripe.z = 1000 + Math.random() * 500
          stripe.x = Math.random() * canvas.width * 2
          stripe.y = Math.random() * canvas.height
        }
      })

      // Draw floating particles
      particles.forEach(particle => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.z += Math.sin(time + particle.x * 0.01) * 0.5

        const scale = 400 / (400 + particle.z)
        const x = (particle.x - canvas.width / 2) * scale + canvas.width / 2
        const y = (particle.y - canvas.height / 2) * scale + canvas.height / 2

        if (scale > 0.1) {
          ctx.globalAlpha = particle.opacity * scale
          ctx.fillStyle = '#FFFFFF'
          ctx.beginPath()
          ctx.arc(x, y, particle.size * scale, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }

        // Wrap particles around screen
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0
      })

      // Draw connecting lines between nearby particles
      ctx.strokeStyle = 'rgba(99, 91, 255, 0.1)'
      ctx.lineWidth = 1
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < 100) {
            ctx.globalAlpha = (100 - distance) / 100 * 0.3
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        }
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