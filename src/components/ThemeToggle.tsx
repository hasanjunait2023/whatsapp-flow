import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'default';
  className?: string;
  showLabel?: boolean;
}

const iconVariants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: { 
    scale: 1, 
    rotate: 0, 
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 15 }
  },
  exit: { 
    scale: 0, 
    rotate: 180, 
    opacity: 0,
    transition: { duration: 0.15 }
  },
};

export function ThemeToggle({ 
  variant = 'button', 
  size = 'default',
  className,
  showLabel = false 
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getCurrentIcon = () => {
    if (theme === 'system') {
      return <Monitor className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />;
    }
    if (resolvedTheme === 'dark') {
      return <Moon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />;
    }
    return <Sun className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />;
  };

  const getLabel = () => {
    if (theme === 'system') return 'System';
    if (resolvedTheme === 'dark') return 'Dark';
    return 'Light';
  };

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={size === 'sm' ? 'sm' : 'default'}
            className={cn(
              'relative overflow-hidden gap-2',
              'glass hover:shadow-glow transition-all duration-300',
              className
            )}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={theme}
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex items-center justify-center"
              >
                {getCurrentIcon()}
              </motion.span>
            </AnimatePresence>
            {showLabel && <span className="text-sm">{getLabel()}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem 
            onClick={() => setTheme('light')}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              theme === 'light' && 'bg-accent'
            )}
          >
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setTheme('dark')}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              theme === 'dark' && 'bg-accent'
            )}
          >
            <Moon className="h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setTheme('system')}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              theme === 'system' && 'bg-accent'
            )}
          >
            <Monitor className="h-4 w-4" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Simple button variant - cycles through themes
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className={cn(
        'relative overflow-hidden',
        'hover:bg-accent/80 hover:shadow-glow transition-all duration-300',
        size === 'sm' && 'h-8 w-8',
        className
      )}
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={theme}
          variants={iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0 flex items-center justify-center"
        >
          {getCurrentIcon()}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
