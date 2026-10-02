/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Authoritative Army & The Military Palette
        grayGreen: {
          DEFAULT: '#5C7964',          // Primary functional visual identity
          light: '#70937A',
          dark: '#47604F',
          subtle: 'rgba(92, 121, 100, 0.22)',
        },
        matteSage: {
          DEFAULT: '#95A47B',          // Secondary highlight, hover, analytical indicator
          light: '#AEC092',
          dark: '#7A8962',
          subtle: 'rgba(149, 164, 123, 0.20)',
        },
        greige: {
          DEFAULT: '#CBC2B8',          // Neutralizing text, descriptions, metadata, subtle borders
          light: '#DFD8D0',
          dark: '#AFA499',
          subtle: 'rgba(203, 194, 184, 0.16)',
        },
        dullCoffee: {
          DEFAULT: '#7F554B',          // Supporting structural detail / occasional accents only
          light: '#976A5F',
          dark: '#5C3C35',
          subtle: 'rgba(127, 85, 75, 0.25)',
        },
        strawBeige: {
          DEFAULT: '#D5C188',          // Supporting visual highlights / key metric numbers
          light: '#E5D6A4',
          dark: '#B8A366',
          subtle: 'rgba(213, 193, 136, 0.18)',
        },
        richTan: {
          DEFAULT: '#B58A58',          // Small accent only (dividers, small status points)
          light: '#C79F6E',
          dark: '#916A38',
          subtle: 'rgba(181, 138, 88, 0.20)',
        },
        fullWhite: '#FFFFFF',

        // Dedicated Photography Palette for 3D Surface Topography
        photography: {
          winterHazel: '#D0CB93',
          schist: '#A6B890',
          peachBrown: '#CE9770',
          dustyStrawberry: '#B9485A',
          businessBurgundy: '#401421',
        },

        // Semantic Technical Surface Hierarchy (Neutral dark charcoal base - NOT brown/espresso)
        surface: {
          DEFAULT: '#16171A',          // Dark neutral charcoal industrial base
          dark: '#121315',             // Subpanel / recessed dark well
          darker: '#0E0F11',           // Deepest canvas / 3D viewport cavity
          panel: '#1E2024',            // Clean neutral dark structural content panel
          subpanel: '#191B1E',         // Recessed data well
          elevated: '#26292E',         // Raised hover card / dialog
          border: 'rgba(203, 194, 184, 0.18)', // Subtle greige border
        },
        accent: {
          primary: '#5C7964',          // Gray-green primary visual identity
          secondary: '#95A47B',        // Matte Sage secondary highlights
          neutral: '#CBC2B8',          // Greige neutralizing information
          coffee: '#7F554B',           // Dull Coffee supporting structural accent
          highlight: '#D5C188',        // Straw Beige selective highlight
          tan: '#B58A58',              // Rich Tan limited small accent
        },
        content: {
          primary: '#FFFFFF',          // Full White crisp technical typography
          secondary: '#CBC2B8',        // Greige readable metadata / subtitles
          muted: '#8E9196',            // Muted neutral annotations
          light: '#FFFFFF',
          highlight: '#95A47B',        // Matte Sage analytical emphasis
        },
        edge: {
          subtle: 'rgba(203, 194, 184, 0.15)',
          control: 'rgba(149, 164, 123, 0.35)',
          active: '#5C7964',
          highlight: '#95A47B',
        },

        // Inspection Assessment Status Tokens (Professional, restrained, high-contrast)
        status: {
          pass: '#1A2E20',
          passBorder: '#5C7964',
          passText: '#D7EADA',
          review: '#2F2618',
          reviewBorder: '#B58A58',
          reviewText: '#F7E9CE',
          fail: '#3A181C',
          failBorder: '#B9485A',
          failText: '#FFE4E8',
          pending: '#1E2024',
          pendingBorder: 'rgba(203, 194, 184, 0.30)',
          pendingText: '#CBC2B8',
        },

        // Backward compatibility mappings into neutral charcoal + Gray-green / Matte Sage system
        mysticNavy: {
          DEFAULT: '#16171A',
          light: '#1E2024',
          dark: '#121315',
          darker: '#0E0F11',
          subtle: 'rgba(203, 194, 184, 0.15)',
        },
        flatDarkBlue: {
          DEFAULT: 'rgba(203, 194, 184, 0.18)',
          light: 'rgba(149, 164, 123, 0.35)',
          dark: '#1E2024',
          subtle: 'rgba(203, 194, 184, 0.15)',
        },
        mary: {
          DEFAULT: '#5C7964',          // Primary Gray-green functional button / action accent
          light: '#70937A',
          dark: '#47604F',
          subtle: 'rgba(92, 121, 100, 0.25)',
        },
        bestLightBlue: {
          DEFAULT: '#95A47B',          // Matte Sage highlight
          light: '#AEC092',
          dark: '#7A8962',
          muted: '#CBC2B8',
          subtle: 'rgba(149, 164, 123, 0.20)',
        },
        mutedBlue: {
          DEFAULT: '#CBC2B8',          // Greige secondary / annotation text
          light: '#DFD8D0',
          dark: '#8E9196',
          subtle: 'rgba(203, 194, 184, 0.15)',
        },
        greenCalm: {
          DEFAULT: '#5C7964',
          light: '#95A47B',
          dark: '#47604F',
          subtle: 'rgba(92, 121, 100, 0.22)',
        },
        kilimanjaro: {
          DEFAULT: '#5C7964',
          light: '#70937A',
          dark: '#47604F',
          subtle: 'rgba(92, 121, 100, 0.25)',
        },
        abstractCoffee: {
          DEFAULT: '#16171A',
          dark: '#121315',
          darker: '#0E0F11',
          light: '#1E2024',
          subtle: 'rgba(203, 194, 184, 0.15)',
        },
        dustyGold: {
          DEFAULT: '#95A47B',
          light: '#AEC092',
          dark: '#5C7964',
          muted: '#CBC2B8',
          subtle: 'rgba(149, 164, 123, 0.20)',
        },
        domino: {
          DEFAULT: 'rgba(203, 194, 184, 0.18)',
          light: 'rgba(149, 164, 123, 0.35)',
          dark: '#1E2024',
          subtle: 'rgba(203, 194, 184, 0.15)',
        },
        defense: {
          bg: '#16171A',
          panel: '#1E2024',
          subpanel: '#191B1E',
          control: '#1E2024',
          accent: '#5C7964',
          muted: '#CBC2B8',
          border: 'rgba(203, 194, 184, 0.18)',
          highlight: '#95A47B',
          text: '#FFFFFF',
          textMuted: '#CBC2B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'panel': '0 1px 3px 0 rgba(0, 0, 0, 0.35)',
        'elevated': '0 6px 18px 0 rgba(0, 0, 0, 0.50)',
        'technical': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 1px 4px 0 rgba(0, 0, 0, 0.35)',
      },
      borderRadius: {
        'tech': '3px',
      },
    },
  },
  plugins: [],
}