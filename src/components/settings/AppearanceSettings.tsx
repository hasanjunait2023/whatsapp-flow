import { useTheme } from 'next-themes';
import { useColorScheme, ColorScheme } from '@/contexts/ColorSchemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorSchemes: { value: ColorScheme; label: string; colors: { primary: string; secondary: string } }[] = [
  { 
    value: 'maroon', 
    label: 'Maroon', 
    colors: { primary: 'bg-[hsl(0,65%,35%)]', secondary: 'bg-[hsl(350,80%,45%)]' }
  },
  { 
    value: 'blue', 
    label: 'Blue', 
    colors: { primary: 'bg-[hsl(217,91%,50%)]', secondary: 'bg-[hsl(199,89%,48%)]' }
  },
  { 
    value: 'green', 
    label: 'Green', 
    colors: { primary: 'bg-[hsl(142,70%,40%)]', secondary: 'bg-[hsl(160,84%,39%)]' }
  },
  { 
    value: 'purple', 
    label: 'Purple', 
    colors: { primary: 'bg-[hsl(270,70%,50%)]', secondary: 'bg-[hsl(290,80%,55%)]' }
  },
];

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { colorScheme, setColorScheme } = useColorScheme();

  const themes = [
    { value: 'light', label: 'Light', icon: Sun, description: 'A bright, clean look' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Match your device settings' },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Theme Mode
          </CardTitle>
          <CardDescription>
            Choose between light and dark mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Mode</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = theme === t.value;
                return (
                  <Button
                    key={t.value}
                    variant={isActive ? 'default' : 'outline'}
                    className={`h-auto flex-col gap-2 p-4 ${isActive ? '' : 'hover:bg-accent'}`}
                    onClick={() => setTheme(t.value)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{t.label}</span>
                    <span className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {t.description}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Scheme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Scheme
          </CardTitle>
          <CardDescription>
            Choose your preferred accent color
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Accent Color</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {colorSchemes.map((scheme) => {
                const isActive = colorScheme === scheme.value;
                return (
                  <button
                    key={scheme.value}
                    onClick={() => setColorScheme(scheme.value)}
                    className={cn(
                      "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                      isActive 
                        ? "border-primary bg-primary/5 shadow-md" 
                        : "border-border hover:border-primary/50 hover:bg-accent"
                    )}
                  >
                    {/* Color preview circles */}
                    <div className="flex items-center gap-1">
                      <div className={cn("h-8 w-8 rounded-full shadow-inner", scheme.colors.primary)} />
                      <div className={cn("h-6 w-6 rounded-full shadow-inner -ml-2", scheme.colors.secondary)} />
                    </div>
                    
                    {/* Label */}
                    <span className={cn(
                      "text-sm font-medium",
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {scheme.label}
                    </span>

                    {/* Check indicator */}
                    {isActive && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Preview */}
          <div className="mt-6 p-4 rounded-xl border bg-card">
            <p className="text-sm text-muted-foreground mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <Button size="sm">Primary Button</Button>
              <Button size="sm" variant="outline">Outline</Button>
              <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center">
                <Check className="h-4 w-4 text-brand-foreground" />
              </div>
              <div className="h-3 w-20 rounded-full bg-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
