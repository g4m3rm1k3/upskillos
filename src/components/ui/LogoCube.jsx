import { motion } from 'framer-motion';

function LogoSVG({ activeMeta }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className="w-full h-full"
      style={{ filter: `drop-shadow(${activeMeta.glow})` }}
    >
      <defs>
        <linearGradient id="logoBgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className={activeMeta.text || "text-brand-500"} stopColor="currentColor" />
          <stop offset="100%" className={activeMeta.stop2 || "text-slate-800 dark:text-slate-100"} stopColor="currentColor" />
        </linearGradient>
        <linearGradient id="logoCaretGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="text-white" stopColor="currentColor" />
          <stop offset="100%" className="text-slate-200" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" fill="url(#logoBgGrad)" />
      <g transform="matrix(4.8069 0 0 3.7957 126.0017 180)">
        <text
          fontFamily="'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif"
          fontSize="75"
          fontWeight="900"
          fill="url(#logoCaretGrad)"
        >
          <tspan x="-24.7559" y="23.5605">^</tspan>
        </text>
      </g>
    </svg>
  );
}

export default function LogoCube({ activeMeta, className = "" }) {
  const depth = 16; // 32px width = 16px half-depth for translateZ
  
  return (
    <div className={`relative w-8 h-8 group perspective-[800px] ${className}`}>
      <motion.div
        className="w-full h-full relative origin-center"
        style={{ WebkitTransformStyle: 'preserve-3d', transformStyle: 'preserve-3d' }}
        animate={{ 
          rotateX: [0, 360],
          rotateY: [0, 360]
        }}
        transition={{
          duration: 12,
          ease: "linear",
          repeat: Infinity
        }}
      >
        {/* Front Face */}
        <div 
          className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden"
          style={{ transform: `translateZ(${depth}px)` }}
        >
          <LogoSVG activeMeta={activeMeta} />
        </div>
        
        {/* Back Face */}
        <div 
          className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden"
          style={{ transform: `rotateY(180deg) translateZ(${depth}px)` }}
        >
          <LogoSVG activeMeta={activeMeta} />
        </div>
        
        {/* Right Face */}
        <div 
          className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden"
          style={{ transform: `rotateY(90deg) translateZ(${depth}px)` }}
        >
          <LogoSVG activeMeta={activeMeta} />
        </div>
        
        {/* Left Face */}
        <div 
          className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden"
          style={{ transform: `rotateY(-90deg) translateZ(${depth}px)` }}
        >
          <LogoSVG activeMeta={activeMeta} />
        </div>
        
        {/* Top Face */}
        <div 
          className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden"
          style={{ transform: `rotateX(90deg) translateZ(${depth}px)` }}
        >
          <LogoSVG activeMeta={activeMeta} />
        </div>
        
        {/* Bottom Face */}
        <div 
          className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden"
          style={{ transform: `rotateX(-90deg) translateZ(${depth}px)` }}
        >
          <LogoSVG activeMeta={activeMeta} />
        </div>
      </motion.div>
    </div>
  );
}
