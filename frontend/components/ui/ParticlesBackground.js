'use client'
import { useCallback } from 'react'
import Particles from 'react-particles'
import { loadSlim } from 'tsparticles-slim'

const particlesConfig = {
    background: {
        color: { value: 'transparent' }
    },
    particles: {
        number: { value: 40 },
        color: { value: '#C5DEFF' },
        links: {
            enable: true,
            color: '#C5DEFF',
            distance: 150,
            opacity: 20
        },
        move: {
            enable: true,
            speed: 2
        },
        size: { value: { min: 2, max: 5 } },
        opacity: { value: { min: 0.3, max: 1 } }
    },
    interactivity: {
        events: {
            onHover: {
                enable: true,
                mode: 'repulse'
            }
        }
    },
    responsive: [
    {
      maxWidth: 768,
      options: {
        particles: {
          number: {
            value: 30,
          },
          links: {
            distance: 80,
          },
        },
      },
    },
  ],
}

export default function ParticlesBackground() {
    const particlesInit = useCallback(async (engine) => {
        await loadSlim(engine)
    }, [])

    return (
        <Particles
            id="tsparticles"
            init={particlesInit}
            options={particlesConfig}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0
            }}
        />
    )
}