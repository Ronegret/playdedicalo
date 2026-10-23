/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // Un escalon por debajo del `sm` de Tailwind (640px). Hace falta porque
      // los moviles mas estrechos que se usan de verdad (iPhone SE, 375px)
      // caen todos por debajo de `sm`, asi que `sm:` no sirve para distinguir
      // "movil estrecho" de "movil normal": con `sm:` una etiqueta se
      // esconderia en TODOS los telefonos.
      "screens": {
        "xs": "380px"
      },
      // Solo los colores que la app usa de verdad: el volcado Material-3
      // (33 tokens sin uso) se quitó para que el autocompletado no ofrezca
      // colores que nadie ha diseñado para este juego.
      "colors": {
        "primary": "#ff8a1f",
        "surface-container-high": "#142135",
        "vinyl-orange": "#ff7a1a",
        "surface": "#07101f",
        "surface-container-lowest": "#040912",
        "surface-container-low": "#0c1526",
        "surface-container": "#101a2d",
        "neon-green": "#39ff14",
        "on-surface": "#f4f8ff",
        "deep-blue": "#3f78ff",
        "surface-container-highest": "#18263d",
        "background": "#050816",
        "error": "#ff7a95",
        "surface-bright": "#1d2e4b",
        "on-surface-variant": "#b7c3d9",
        "chaos-gold": "#ffbf4d",
        "intense-red": "#ff6b8b",
        "surface-variant": "#1a2740",
        "glass-surface": "rgba(8, 16, 31, 0.58)",
        "on-background": "#f5f8ff",
        "electric-purple": "#a855f7"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px",
        // Se usaba suelto como rounded-[2rem]; con nombre queda en el sistema.
        "4xl": "2rem"
      },
      "spacing": {
        // En rem para que el margen de página crezca con fs-large / fs-xl.
        "margin-mobile": "1.25rem",
        "stack-md": "24px",
        "margin-desktop": "40px",
        "unit": "4px",
        "gutter": "16px",
        "stack-sm": "8px",
        "stack-lg": "48px",
        // En px a propósito: el dedo no crece con el tamaño de letra.
        "touch": "52px"
      },
      "minWidth": {
        "touch": "52px"
      },
      "minHeight": {
        "touch": "52px"
      },
      "fontFamily": {
        "headline-xl": ["Montserrat", "Arial", "sans-serif"],
        "stats-xl": ["Space Mono", "monospace"],
        "body-sm": ["Hanken Grotesk", "Arial", "sans-serif"],
        "headline-lg-mobile": ["Montserrat", "Arial", "sans-serif"],
        "body-md": ["Hanken Grotesk", "Arial", "sans-serif"],
        "headline-lg": ["Montserrat", "Arial", "sans-serif"],
        "label-caps": ["Barlow Condensed", "Montserrat", "Arial", "sans-serif"]
      },
      "fontSize": {
        /* En rem (no px): así estos tamaños también crecen con la escala de
           letra global (--root font-size en index.css / fs-large / fs-xl)
           en vez de quedar congelados a un tamaño fijo mientras el resto de
           la app crece a su alrededor. */
        "headline-xl": ["3rem", {"lineHeight": "1.1", "letterSpacing": "-0.04em", "fontWeight": "900"}],
        "stats-xl": ["4rem", {"lineHeight": "1", "letterSpacing": "-0.02em", "fontWeight": "900"}],
        "body-sm": ["0.875rem", {"lineHeight": "1.4", "fontWeight": "400"}],
        "headline-lg-mobile": ["1.75rem", {"lineHeight": "1.2", "fontWeight": "800"}],
        "body-md": ["1rem", {"lineHeight": "1.5", "fontWeight": "400"}],
        "headline-lg": ["2rem", {"lineHeight": "1.2", "fontWeight": "800"}],
        "label-caps": ["0.875rem", {"lineHeight": "1.2", "letterSpacing": "0.14em", "fontWeight": "800"}],
        // Suelo legible para etiquetas pequeñas en mayúsculas: las de 0.65rem /
        // 0.706rem (~11-12px) no se leen a distancia de fiesta.
        "micro-caps": ["0.8rem", {"lineHeight": "1.1", "letterSpacing": "0.14em", "fontWeight": "700"}]
      }
    },
  },
  plugins: [],
}
