/** tailwind.config.js
 * -----------------------------------------------------------------------------
 * Sistema de diseño «Sala de control» — SolarFlow.
 *
 * Este archivo es el que da vida a TODA la interfaz: define la paleta navy/solar,
 * la tipografía, las sombras suaves por capas, las animaciones y los fondos de
 * retícula. Los componentes ya consumen estos tokens (bg-navy-900, text-solar-400,
 * shadow-card, animate-sheen, font-display…), así que al ajustarlos aquí se
 * eleva la app completa de forma coherente.
 *
 * Colócalo en la raíz del proyecto (junto a package.json). Requiere que
 * postcss.config.js incluya tailwindcss y autoprefixer.
 * -----------------------------------------------------------------------------
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ---------------------------------------------------------------------
      // Paleta. Dos familias: `navy` (superficie sala de control, fría y
      // profunda) y `solar` (acento fotovoltaico ámbar/oro). Ramas calibradas
      // para leer bien tanto sobre blanco como sobre navy-900.
      // ---------------------------------------------------------------------
      colors: {
        navy: {
          50: '#eef2f9',
          100: '#dde5f2',
          200: '#bccbe4',
          300: '#93a8cf',
          400: '#6781b1',
          500: '#455f92',
          600: '#334a76',
          700: '#293c60',
          800: '#1e2f4d',
          900: '#0e1a2b',
          950: '#070f1c',
        },
        solar: {
          50: '#fff7e8',
          100: '#feeac2',
          200: '#fdd587',
          300: '#fbc04e',
          400: '#f5a524', // acento principal (coincide con el foco :focus-visible)
          500: '#e08b0e',
          600: '#b96a09',
        },
      },

      // ---------------------------------------------------------------------
      // Tipografía. Display técnico y geométrico (Space Grotesk) para titulares
      // y etiquetas de instrumento; Inter para cuerpo; JetBrains Mono para las
      // lecturas tabulares tipo tablero (KPIs, códigos PRJ-0000, fechas).
      // Las fuentes se importan en style.css.
      // ---------------------------------------------------------------------
      fontFamily: {
        display: ['"Space Grotesk"', 'Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      // ---------------------------------------------------------------------
      // Sombras. Premium = suaves, por capas y con tinte navy (nada de negro
      // duro). `solar` es el halo cálido del CTA; `glass`/`inset` para paneles.
      // ---------------------------------------------------------------------
      boxShadow: {
        card: '0 1px 2px rgba(14,26,43,0.04), 0 6px 16px -6px rgba(14,26,43,0.10)',
        'card-hover': '0 2px 6px rgba(14,26,43,0.06), 0 18px 40px -12px rgba(14,26,43,0.22)',
        solar: '0 8px 22px -8px rgba(245,165,36,0.60), 0 2px 6px -2px rgba(245,165,36,0.45)',
        glass: '0 10px 40px -12px rgba(7,15,28,0.45), inset 0 1px 0 rgba(255,255,255,0.07)',
        inset: 'inset 0 1px 2px rgba(14,26,43,0.10)',
      },

      // Radios un punto más generosos que el default para un aire más suave.
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },

      // ---------------------------------------------------------------------
      // Fondos generados. `solar-sheen` es la barra de luz que barre las
      // cabeceras (animate-sheen). Los patrones de retícula viven en style.css
      // como utilidades (.bg-grid / .bg-grid-light / .bg-control).
      // ---------------------------------------------------------------------
      backgroundImage: {
        'solar-sheen':
          'linear-gradient(90deg, transparent 0%, rgba(251,192,78,0.0) 10%, rgba(245,165,36,0.9) 50%, rgba(251,192,78,0.0) 90%, transparent 100%)',
      },

      // ---------------------------------------------------------------------
      // Movimiento. Entradas escalonadas (rise), halos que respiran (floatGlow),
      // barrido de luz (sheen) y pulso de alarma crítica (pulseRing).
      // ---------------------------------------------------------------------
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatGlow: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '0.85' },
          '50%': { transform: 'translate3d(14px,-18px,0) scale(1.08)', opacity: '1' },
        },
        sheen: {
          '0%': { transform: 'translateX(-120%)' },
          '55%, 100%': { transform: 'translateX(560%)' },
        },
        pulseRing: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(244,63,94,0.45)' },
          '50%': { boxShadow: '0 0 0 5px rgba(244,63,94,0.0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.22,1,0.36,1) both',
        floatGlow: 'floatGlow 9s ease-in-out infinite',
        sheen: 'sheen 6s ease-in-out infinite',
        pulseRing: 'pulseRing 1.8s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
      },
    },
  },
  plugins: [],
}