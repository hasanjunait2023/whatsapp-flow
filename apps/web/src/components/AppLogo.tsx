import { cn } from '@/lib/utils';
import logoImage from '@/assets/logo.png';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export function AppLogo({ className, size = 'md', showText = false }: AppLogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-12'
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img 
        src={logoImage} 
        alt="What A App" 
        className={cn(sizeClasses[size], "object-contain")}
      />
    </div>
  );
}
