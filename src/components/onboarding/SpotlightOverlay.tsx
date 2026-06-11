import { motion, AnimatePresence } from 'framer-motion';

interface SpotlightOverlayProps {
  isVisible: boolean;
  targetRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  padding?: number;
  borderRadius?: number;
  onClick?: () => void;
}

export function SpotlightOverlay({
  isVisible,
  targetRect,
  padding = 8,
  borderRadius = 8,
  onClick,
}: SpotlightOverlayProps) {
  if (!targetRect) return null;

  const cutoutX = targetRect.x - padding;
  const cutoutY = targetRect.y - padding;
  const cutoutWidth = targetRect.width + padding * 2;
  const cutoutHeight = targetRect.height + padding * 2;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[98] pointer-events-auto"
          onClick={onClick}
        >
          <svg className="w-full h-full">
            <defs>
              <mask id="spotlight-mask">
                {/* White = visible, Black = hidden (cutout) */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <motion.rect
                  initial={{ 
                    x: cutoutX + cutoutWidth / 2, 
                    y: cutoutY + cutoutHeight / 2,
                    width: 0,
                    height: 0
                  }}
                  animate={{ 
                    x: cutoutX, 
                    y: cutoutY,
                    width: cutoutWidth,
                    height: cutoutHeight
                  }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 300, 
                    damping: 30,
                    delay: 0.1
                  }}
                  rx={borderRadius}
                  ry={borderRadius}
                  fill="black"
                />
              </mask>
            </defs>

            {/* Dark overlay with cutout */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#spotlight-mask)"
            />

            {/* Glowing border around cutout */}
            <motion.rect
              initial={{ 
                x: cutoutX + cutoutWidth / 2, 
                y: cutoutY + cutoutHeight / 2,
                width: 0,
                height: 0,
                opacity: 0
              }}
              animate={{ 
                x: cutoutX - 2, 
                y: cutoutY - 2,
                width: cutoutWidth + 4,
                height: cutoutHeight + 4,
                opacity: 1
              }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 30,
                delay: 0.1
              }}
              rx={borderRadius + 2}
              ry={borderRadius + 2}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              className="animate-pulse"
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
