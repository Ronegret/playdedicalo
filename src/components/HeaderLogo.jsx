// Logo del header. Antes era `logo-main.png` a h-8 y sin fondo: un logo
// oscuro sobre una barra oscura, tan chico que apenas se distinguía. Ahora
// va el icono de la app dentro de una pastilla blanca — el mismo
// tratamiento de "etiqueta de vinilo" que ya se usa en el resto de la app
// — bastante más grande y con un halo naranja suave para que se despegue
// del fondo.
export default function HeaderLogo({ className = '' }) {
  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_0_0_2px_rgba(255,122,26,0.35),0_0_18px_rgba(255,122,26,0.35)] ${className}`}
      aria-hidden="false"
    >
      <img
        src="/images/icon-app.webp"
        alt="Dedícalo"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}
