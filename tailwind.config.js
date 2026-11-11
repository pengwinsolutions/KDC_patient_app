/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      /* Allow any 1% step as an opacity modifier (bg-white/92, from-black/68).
         Tailwind only emits modifiers that exist in this scale. */
      opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, String(i / 100)])),
      colors: {
        /* ---- KDC+ brand, sampled directly from the official logo ---- */
        brand: {
          50: '#EEF6FF',
          100: '#D9EBFF',
          200: '#BCDBFF',
          300: '#8CC3FF',
          400: '#54A3FA',
          500: '#2A84EC',
          600: '#0068C8', // KDC+ primary blue — logo exact
          700: '#0057A8',
          800: '#064887',
          900: '#0A3D70',
          950: '#07264A',
        },
        /* Deep clinical navy used for typography */
        ink: {
          900: '#071724',
          800: '#0E2335',
          700: '#193347',
          600: '#2C4860',
          500: '#425D77',
          400: '#657E94',
          300: '#90A4B6',
          200: '#BBC8D5',
          100: '#D8E1EA',
          50: '#EDF2F7',
        },
        /* Medical red — critical only. Logo exact. */
        critical: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FCCACA',
          500: '#EF4444',
          600: '#E02020',
          700: '#B91C1C',
        },
        /* Health green — success / positive status. Logo exact. */
        vital: {
          50: '#EDFAF0',
          100: '#D4F2DC',
          200: '#AAE5BC',
          300: '#8ADCA0',
          400: '#5EC878',
          500: '#3DB356',
          600: '#309840',
          700: '#237631',
        },
        /* Amber — pending / attention */
        caution: {
          50: '#FFF8EB',
          100: '#FDEFD0',
          200: '#F9DFA6',
          300: '#F3CC72',
          400: '#E8B347',
          500: '#D99C2B',
          600: '#C9871A',
          700: '#A06A10',
        },
        /* Soft gold from the logo rule — reserved for KDC+ Plus membership,
           so a paid tier never has to borrow the brand blue or a status colour */
        gold: {
          50: '#FBF7EC',
          100: '#F5EBD2',
          200: '#EBD9A8',
          300: '#DEC477',
          400: '#D1B057',
          500: '#C9A646',
          600: '#A8862F',
          700: '#806320',
          DEFAULT: '#C9A646',
        },
        canvas: '#EBF0F6',
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'sans-serif'],
        display: ['Manrope', 'Inter', '-apple-system', 'SF Pro Display', 'sans-serif'],
      },
      fontSize: {
        /* iOS-calibrated type ramp */
        'title-xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.6px' }],
        'title-lg': ['25px', { lineHeight: '31px', letterSpacing: '-0.5px' }],
        'title-md': ['20px', { lineHeight: '26px', letterSpacing: '-0.35px' }],
        'title-sm': ['17px', { lineHeight: '22px', letterSpacing: '-0.25px' }],
        'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '-0.1px' }],
        body: ['15px', { lineHeight: '22px', letterSpacing: '-0.1px' }],
        'body-sm': ['13.5px', { lineHeight: '19px' }],
        caption: ['12px', { lineHeight: '16px' }],
        micro: ['10.5px', { lineHeight: '14px', letterSpacing: '0.3px' }],
      },
      borderRadius: { card: '18px', tile: '16px', ctl: '14px', chip: '12px' },
      boxShadow: {
        /* Deliberately soft, blue-tinted elevation — never grey/heavy */
        tile: '0 0 0 1px rgba(7,23,36,0.05), 0 1px 2px rgba(7,23,36,0.05), 0 6px 16px -8px rgba(7,23,36,0.14)',
        card: '0 0 0 1px rgba(7,23,36,0.055), 0 2px 4px rgba(7,23,36,0.06), 0 14px 30px -12px rgba(7,23,36,0.20)',
        lift: '0 0 0 1px rgba(7,23,36,0.06), 0 4px 8px rgba(7,23,36,0.06), 0 24px 48px -18px rgba(7,23,36,0.28)',
        sheet: '0 -8px 40px -12px rgba(11,31,51,0.22)',
        cta: '0 2px 4px rgba(0,104,200,.18), 0 8px 20px -6px rgba(0,104,200,0.55)',
        nav: '0 -1px 0 rgba(11,31,51,0.06)',
      },
      keyframes: {
        ecg: { '0%': { strokeDashoffset: '1400' }, '100%': { strokeDashoffset: '0' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        riseIn: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        sheetUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        pulseRing: { '0%': { transform: 'scale(.86)', opacity: '.55' }, '70%': { transform: 'scale(1.3)', opacity: '0' }, '100%': { opacity: '0' } },
        spinSlow: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        ecg: 'ecg 2.4s cubic-bezier(.4,0,.2,1) forwards',
        shimmer: 'shimmer 1.6s infinite',
        riseIn: 'riseIn .45s cubic-bezier(.22,1,.36,1) both',
        sheetUp: 'sheetUp .36s cubic-bezier(.22,1,.36,1) both',
        pulseRing: 'pulseRing 2.2s cubic-bezier(.4,0,.2,1) infinite',
        spinSlow: 'spinSlow 1s linear infinite',
      },
    },
  },
  plugins: [],
}
