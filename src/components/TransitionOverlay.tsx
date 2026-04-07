import React from 'react';
import { motion } from 'motion/react';

interface TransitionOverlayProps {
  targetMode: 'work' | 'life';
}

export function TransitionOverlay({ targetMode }: TransitionOverlayProps) {
  const isLife = targetMode === 'life';
  const text = isLife ? "LifeFlow".split("") : "TaskFlow".split("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`fixed inset-0 z-[100] flex items-center justify-center ${
        isLife ? 'bg-orange-50' : 'bg-slate-900'
      }`}
    >
      {isLife ? (
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.15, delayChildren: 0.4 }
            }
          }}
          initial="hidden"
          animate="visible"
          className="font-handwriting italic text-7xl md:text-8xl text-emerald-600 tracking-wider"
        >
          {text.map((char, i) => (
            <motion.span
              key={i}
              variants={{
                hidden: { opacity: 0, y: 20, rotate: -15 },
                visible: { opacity: 1, y: 0, rotate: 0, transition: { type: 'spring', damping: 12 } }
              }}
              className="inline-block"
            >
              {char}
            </motion.span>
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={{
            hidden: { opacity: 1 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.4 }
            }
          }}
          initial="hidden"
          animate="visible"
          className="font-mono text-6xl md:text-7xl text-slate-100 flex items-center"
        >
          {text.map((char, i) => (
            <motion.span
              key={i}
              variants={{
                hidden: { opacity: 0, display: 'none' },
                visible: { opacity: 1, display: 'inline' }
              }}
            >
              {char}
            </motion.span>
          ))}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            className="w-1.5 h-12 md:h-14 bg-indigo-500 ml-3"
          />
        </motion.div>
      )}
    </motion.div>
  );
}
