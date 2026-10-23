import { motion } from 'framer-motion';

// Indicador de progreso compartido por los dos flujos de entrada (crear
// sala y unirse). El objetivo es que en todo momento se vea cuántos pasos
// faltan y en cuál se está — antes ambas pantallas eran un único muro con
// todo a la vez y no se entendía por dónde empezar.
export function StepProgress({ steps, current, onGoTo }) {
  return (
    <div className="w-full">
      {/* pt-[34px] compensa el -mt-[34px] de los botones: sin esto el bloque
          se comería el espacio de lo que tenga encima. */}
      <div className="flex items-center gap-1.5 pt-[34px]">
        {steps.map((step, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          // Solo se puede volver a un paso ya completado, nunca saltar
          // hacia adelante sin llenar lo de antes.
          const canGo = isDone && typeof onGoTo === 'function';
          return (
            <button
              key={step}
              type="button"
              disabled={!canGo}
              onClick={canGo ? () => onGoTo(index) : undefined}
              aria-label={canGo ? `Volver al paso ${index + 1}: ${step}` : `Paso ${index + 1}: ${step}`}
              aria-current={isCurrent ? 'step' : undefined}
              // La barra se ve fina (8 px) pero se puede pulsar para volver a
              // un paso, así que la zona táctil se agranda: el aspecto no
              // cambia y el dedo sí acierta.
              //
              // El reparto es ASIMÉTRICO a propósito. Antes era `-my-[22px]`,
              // simétrico, y esos 22 px de abajo caían ENCIMA de "PASO 1 DE 3":
              // no era solo un solape visual, es que tocar la etiqueta pulsaba
              // la barra y te mandaba a otro paso. Arriba hay hueco libre, así
              // que la zona táctil crece hacia arriba (-34) y apenas hacia
              // abajo (-10), donde vive el texto.
              className={`group flex flex-1 items-center min-h-touch -mt-[34px] -mb-[10px] ${canGo ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`block h-2 w-full rounded-full transition-colors ${
                  isDone ? 'bg-neon-green' : isCurrent ? 'bg-neon-green/60' : 'bg-white/12'
                }`}
              />
            </button>
          );
        })}
      </div>
      <div className="relative z-10 mt-4 flex items-baseline justify-between gap-3">
        <p className="font-label-caps text-xs tracking-[0.18em] text-neon-green">
          PASO {current + 1} DE {steps.length}
        </p>
        <p className="truncate font-label-caps text-xs text-on-surface-variant">{steps[current]}</p>
      </div>
    </div>
  );
}

// Barra de acción fija al fondo. El botón principal de cada paso vive
// siempre aquí, al alcance del pulgar y sin depender de cuánto haya que
// scrollear el contenido — resuelve el "el botón no se ve / está
// escondido" que se repitió en varias pantallas.
export function StepActionBar({
  onBack,
  backLabel = 'ATRÁS',
  onNext,
  nextLabel,
  nextIcon = 'arrow_forward',
  nextDisabled = false,
  hint
}) {
  return (
    <div
      className="barra-inferior fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/95 px-4 pt-3 app-blur-permitido"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto w-full max-w-lg">
        {hint && (
          <p className="mb-2 text-center text-sm leading-snug text-on-surface-variant">{hint}</p>
        )}
        <div className={`grid gap-2 ${onBack ? 'grid-cols-[auto_1fr]' : 'grid-cols-1'}`}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-14 items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/5 px-4 font-label-caps text-sm font-bold text-white active:scale-95 transition-transform"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_back</span>
              {backLabel}
            </button>
          )}
          <motion.button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            whileTap={nextDisabled ? {} : { scale: 0.97 }}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-neon-green font-label-caps text-base font-black text-black shadow-[0_0_28px_rgba(57,255,20,0.35)] transition-all disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
          >
            {nextLabel}
            <span aria-hidden="true" className="material-symbols-outlined text-xl">{nextIcon}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Contenedor animado de un paso: entra desde la derecha al avanzar, para
// que se sienta un flujo con dirección y no saltos sueltos.
export function StepPanel({ children, stepKey }) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
