export default function VinylVisualizer({ rotating = true, logoSrc, size = 'default' }) {
  const isHero = size === 'hero';
  const isCompact = size === 'compact';
  const shellSize = isHero ? 'w-[360px] h-[360px] md:w-[420px] md:h-[420px]' : isCompact ? 'w-36 h-36 md:w-44 md:h-44' : 'w-64 h-64 md:w-80 md:h-80';
  const labelSize = isHero ? 'w-36 h-36 md:w-44 md:h-44' : isCompact ? 'w-16 h-16 md:w-20 md:h-20' : 'w-28 h-28 md:w-36 md:h-36';
  const spotifyLabelSize = isHero ? 'w-40 h-40 md:w-48 md:h-48' : isCompact ? 'w-20 h-20 md:w-24 md:h-24' : 'w-32 h-32 md:w-40 md:h-40';
  const discShadow = isHero ? 'shadow-[0_12px_34px_rgba(0,0,0,0.35)]' : 'shadow-[0_0_40px_rgba(0,0,0,0.8)]';

  return (
    <div className={`relative ${shellSize} flex items-center justify-center`}>
      <div className={`absolute inset-0 ${rotating ? 'vinyl-spin' : ''}`}>
        <div className={`w-full h-full rounded-full bg-gradient-to-tr from-surface-container-lowest via-surface-container-highest to-surface-container-lowest border-[10px] border-surface-container-low ${discShadow} relative flex items-center justify-center overflow-hidden`}>
          <div className="absolute inset-0 opacity-20" style={{ background: 'repeating-radial-gradient(circle, transparent 0px, transparent 2px, #fff 3px, transparent 5px)' }}></div>
        </div>
      </div>

      {logoSrc ? (
        <div className={`relative z-10 ${labelSize} bg-white rounded-full p-2 flex items-center justify-center overflow-hidden animate-pulse`}>
          <img alt="Dedícalo Logo" className="w-full h-full object-contain" src={logoSrc} />
        </div>
      ) : (
        <div className={`relative z-10 ${spotifyLabelSize} rounded-full bg-surface-container-high neon-glow-purple border-4 border-electric-purple flex items-center justify-center`}>
          <div className="absolute inset-0 rounded-full bg-electric-purple/10 animate-pulse"></div>
          <svg className="w-20 h-20 text-neon-green drop-shadow-[0_0_15px_rgba(57,255,20,0.8)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.306c-.215.353-.674.463-1.025.249-2.846-1.738-6.429-2.131-10.648-1.168-.403.093-.806-.162-.899-.564-.093-.402.162-.806.564-.899 4.622-1.057 8.578-.603 11.758 1.341.353.213.465.673.25 1.026v1.015zm1.464-3.262c-.271.439-.848.58-1.288.311-3.258-2.001-8.225-2.584-12.078-1.414-.492.15-1.011-.129-1.161-.62-.15-.492.129-1.011.62-1.161 4.41-1.339 9.897-.689 13.606 1.587.439.27.581.848.311 1.288l-.01.009zm.126-3.4c-3.907-2.321-10.347-2.535-14.102-1.396-.598.181-1.233-.162-1.414-.761-.181-.598.162-1.233.761-1.414 4.312-1.309 11.416-1.049 15.932 1.632.538.319.715 1.014.396 1.552-.319.537-1.014.714-1.552.396l-.021-.009z"></path>
          </svg>
        </div>
      )}
    </div>
  );
}
