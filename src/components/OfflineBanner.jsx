import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -48 }}
          animate={{ y: 0 }}
          exit={{ y: -48 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-[400] h-10 flex items-center justify-center gap-2 bg-intense-red text-white font-label-caps text-xs tracking-widest pointer-events-none"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-sm">wifi_off</span>
          SIN CONEXIÓN — RECONECTANDO...
        </motion.div>
      )}
    </AnimatePresence>
  );
}
