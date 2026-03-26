import React from 'react';
import { motion } from 'motion/react';

interface HeartButtonProps {
  onClick?: () => void;
  active?: boolean;
  size?: number;
  className?: string;
}

export default function HeartButton({ onClick, active, size = 24, className = "" }: HeartButtonProps) {
  const Component = onClick ? motion.button : motion.div;
  
  return (
    <Component
      whileTap={onClick ? { scale: 0.8 } : undefined}
      onClick={onClick}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg 
        viewBox="0 0 24 24" 
        fill={active ? "#F3B4C2" : "none"} 
        stroke={active ? "#F3B4C2" : "#9E919A"} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="w-full h-full transition-colors duration-300"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
      {active && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-[#F3B4C2] rounded-full"
        />
      )}
    </Component>
  );
}
