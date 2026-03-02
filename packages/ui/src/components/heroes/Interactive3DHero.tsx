import React, { useEffect, useRef } from 'react'
import { cn } from '../../utils'

export const Interactive3DHero = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // This is a placeholder for actual Three.js logic
    // To keep it lightweight and not add heavy dependencies just for a placeholder,
    // we'll just draw a simple interactive grid or particles on a 2D canvas
    // that simulates a 3D-ish feel on mouse move.

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    let mouseX = width / 2
    let mouseY = height / 2

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    window.addEventListener('mousemove', handleMouseMove)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    const particles = Array.from({ length: 50 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
    }))

    let animationId: number

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw subtle background grid that shifts with mouse
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.1)'
      ctx.lineWidth = 1

      const offsetX = (mouseX - width / 2) * 0.05
      const offsetY = (mouseY - height / 2) * 0.05

      const gridSize = 50

      ctx.beginPath()
      for (let x = (offsetX % gridSize) - gridSize; x < width; x += gridSize) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      for (let y = (offsetY % gridSize) - gridSize; y < height; y += gridSize) {
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      }
      ctx.stroke()

      // Update and draw particles
      ctx.fillStyle = 'rgba(150, 150, 150, 0.5)'
      particles.forEach((p) => {
        p.x += p.speedX
        p.y += p.speedY

        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <section className={cn('relative h-screen w-full overflow-hidden bg-background', className)}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 pointer-events-none">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Interactive Space</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-10">
          Experience the web in a new dimension. Lightweight, performant, and engaging.
        </p>
        <button className="pointer-events-auto bg-foreground text-background px-8 py-3 rounded-full font-medium transition-transform hover:scale-105">
          Enter Experience
        </button>
      </div>
    </section>
  )
}
