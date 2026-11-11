import type { CSSProperties } from 'react';
import { REALISTIC_WINE_GLASS_SRC } from '../config/vintageAssets';

interface VintageWineGlassProps {
  isSilhouette?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * 100% Exact Photorealistic Wine Glass Model
 * Extracted directly from reference2.png and shared by BOTH the moving wine glass
 * and the target silhouette to guarantee 100% identical aspect ratio and perfect sub-pixel alignment.
 */
export function VintageWineGlass({
  isSilhouette = false,
  className = '',
  style,
}: VintageWineGlassProps) {
  if (isSilhouette) {
    return (
      <div className={`vintage-silhouette-container ${className}`} style={style} aria-hidden="true">
        <img
          src={REALISTIC_WINE_GLASS_SRC}
          alt=""
          className="silhouette-target-glass"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className={`vintage-glass-container ${className}`} style={style} aria-label="Vintage Wine Glass filled with red wine">
      <img
        src={REALISTIC_WINE_GLASS_SRC}
        alt="Vintage Wine Glass"
        className="moving-wine-glass-img"
        draggable={false}
      />
    </div>
  );
}
