import { getSupportUrl } from '../config/support';

export default function SupportButton({ compact = false, className = '' }) {
  const openSupport = () => {
    window.open(getSupportUrl(), '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      onClick={openSupport}
      className={`group relative overflow-hidden rounded-2xl border border-vinyl-orange/35 bg-vinyl-orange/10 text-white active:scale-95 transition-all ${compact ? 'h-11 px-4 text-xs' : 'min-h-14 px-5 py-3 text-sm'} ${className}`}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      <span className="relative flex items-center justify-center gap-2 font-label-caps tracking-[0.16em]">
        <span className="material-symbols-outlined text-vinyl-orange text-base">payments</span>
        Apoyar con Bizum
      </span>
    </button>
  );
}
