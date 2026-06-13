import { Play, Sparkles, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const VIDEO_ID = 'X_3xNbS7ySY';

interface ProductVideoPlayerProps {
  compact?: boolean;
}

export function ProductVideoPlayer({ compact = false }: ProductVideoPlayerProps) {
  const { t } = useTranslation('auth');
  
  const embedUrl = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=1&rel=0&modestbranding=1&showinfo=0`;
  
  if (compact) {
    return (
      <div className="mb-8">
        {/* Premium header section */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              {t('login.seeDemo')}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t('login.discoverPlatform')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('login.videoDescription')}
          </p>
        </div>

        {/* Video container with premium styling */}
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />
          
          {/* Video frame */}
          <div className="relative rounded-xl overflow-hidden shadow-xl border border-border/50 bg-card">
            {/* Browser-like header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded bg-background/50 text-[10px] text-muted-foreground">
                  <Monitor className="h-3 w-3" />
                  <span>What A App Dashboard</span>
                </div>
              </div>
            </div>
            
            {/* Video */}
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Product Demo Video"
              />
            </div>
          </div>
        </div>

        {/* Watch label */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Play className="h-3 w-3 fill-current" />
            <span>{t('login.watchVideo')}</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {/* Decorative glow effect */}
      <div className="absolute -inset-2 bg-gradient-to-r from-white/20 via-white/10 to-white/20 rounded-3xl blur-xl opacity-60" />
      
      {/* Video container */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
        {/* Glass header bar */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/40 to-transparent p-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>
            <span className="text-xs text-white/60 ml-2">
              Product Demo
            </span>
          </div>
        </div>
        
        {/* Video iframe with 16:9 aspect ratio */}
        <div className="aspect-video bg-black/20">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Product Demo Video"
          />
        </div>
      </div>
      
      {/* Label below video */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
          <Play className="h-4 w-4 text-white/80 fill-white/40" />
          <span className="text-sm font-medium text-white/90">
            {t('login.watchVideo')}
          </span>
        </div>
      </div>
    </div>
  );
}
