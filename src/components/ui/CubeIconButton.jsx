import { motion } from 'framer-motion';

export default function CubeIconButton({ 
  icon: Icon, 
  glyph, 
  onClick, 
  className = "", 
  title, 
  colorClass = "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" 
}) {
  const frontBg = "bg-white dark:bg-slate-900";
  const rightBg = "bg-slate-100 dark:bg-slate-800";
  const topBg = "bg-slate-50 dark:bg-slate-700";
  const leftBg = "bg-slate-200 dark:bg-slate-950";
  const bottomBg = "bg-slate-300 dark:bg-slate-950";
  const backBg = "bg-slate-100 dark:bg-slate-800";

  return (
    <div className="relative w-8 h-8 cursor-pointer group" title={title} onClick={onClick} style={{ perspective: '800px' }}>
      <motion.div
        className="w-full h-full relative origin-center"
        style={{ WebkitTransformStyle: 'preserve-3d', transformStyle: 'preserve-3d' }}
        initial="idle"
        whileHover="hover"
        whileTap="tap"
        variants={{
          idle: { rotateX: 0, rotateY: 0, y: 0, scale: 1 },
          hover: { 
            rotateX: -20, 
            rotateY: -30, 
            y: -4,
            scale: 1.1,
            transition: { type: "spring", stiffness: 600, damping: 15 }
          },
          tap: {
            rotateY: -390,
            rotateX: -20,
            scale: 0.9,
            transition: { duration: 0.2, ease: "easeOut" }
          }
        }}
      >
        {/* Front Face */}
        <div 
          className={`absolute inset-0 flex items-center justify-center ${frontBg} border border-slate-200 dark:border-slate-700 rounded shadow-[inset_0_0_10px_rgba(0,0,0,0.05)] ${colorClass} ${className}`}
          style={{ transform: 'translateZ(16px)' }}
        >
          {Icon ? <Icon className="w-[18px] h-[18px]" /> : <span className="text-[13px] leading-none font-semibold">{glyph}</span>}
        </div>
        
        {/* Back Face */}
        <div 
          className={`absolute inset-0 ${backBg} border border-slate-200 dark:border-slate-700 rounded shadow-[inset_0_0_15px_rgba(0,0,0,0.1)]`}
          style={{ transform: 'rotateY(180deg) translateZ(16px)' }}
        />
        
        {/* Right Face */}
        <div 
          className={`absolute inset-0 ${rightBg} border border-slate-200 dark:border-slate-700 rounded shadow-[inset_0_0_15px_rgba(0,0,0,0.1)]`}
          style={{ transform: 'rotateY(90deg) translateZ(16px)' }}
        />
        
        {/* Left Face */}
        <div 
          className={`absolute inset-0 ${leftBg} border border-slate-200 dark:border-slate-700 rounded shadow-[inset_0_0_15px_rgba(0,0,0,0.1)]`}
          style={{ transform: 'rotateY(-90deg) translateZ(16px)' }}
        />
        
        {/* Top Face */}
        <div 
          className={`absolute inset-0 ${topBg} border border-slate-200 dark:border-slate-700 rounded shadow-[inset_0_0_15px_rgba(0,0,0,0.1)]`}
          style={{ transform: 'rotateX(90deg) translateZ(16px)' }}
        />
        
        {/* Bottom Face */}
        <div 
          className={`absolute inset-0 ${bottomBg} border border-slate-200 dark:border-slate-700 rounded shadow-[inset_0_0_15px_rgba(0,0,0,0.1)]`}
          style={{ transform: 'rotateX(-90deg) translateZ(16px)' }}
        />
      </motion.div>
    </div>
  );
}
