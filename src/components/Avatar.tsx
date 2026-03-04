import React from 'react';
import { cn } from '../utils/cn';

const colors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-rose-500'
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface AvatarProps {
  name: string;
  className?: string;
  title?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, className, title }) => {
  // Get the first character. If it's English, uppercase it.
  // If it's Chinese, it will just be the first character.
  const firstChar = name ? name.charAt(0).toUpperCase() : '?';
  const colorClass = getAvatarColor(name || '?');
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center text-white font-medium rounded-full shrink-0",
        colorClass,
        className
      )}
      title={title || name}
    >
      {firstChar}
    </div>
  );
};
