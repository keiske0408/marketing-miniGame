import { useEffect, useRef, useState } from 'react';
import { Screen } from '../components/Screen';
import { useTranslation } from '../services/i18n';
import { soundManager } from '../services/audio';
import { useGameStore } from '../store/gameStore';

export function AvpScreen() {
  const t = useTranslation();
  const videoUrl = import.meta.env.VITE_AVP_VIDEO_URL?.trim() || '/gvi-avp-2026.mp4';
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const settings = useGameStore((state) => state.settings);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = settings.muted;
      videoRef.current.volume = Math.max(0, Math.min(1, settings.masterVolume / 100));
    }
  }, [settings.muted, settings.masterVolume]);

  useEffect(() => () => { soundManager.setVideoActive(false); }, []);

  return (
    <Screen title="AVP" showBack backTo="/game" className="avp-screen" maxWidth="900px">
      <video ref={videoRef} className="avp-video" controls playsInline preload="metadata" poster="/images/vineyard-estate.jpg" src={videoUrl}
        onPlay={() => soundManager.setVideoActive(true)}
        onPause={() => soundManager.setVideoActive(false)}
        onEnded={() => soundManager.setVideoActive(false)}
        onError={() => {
          console.error('AVP playback failed:', videoRef.current?.error, videoUrl);
          setFailed(true);
          soundManager.setVideoActive(false);
        }}>
        {t('Your browser does not support video playback.')}
      </video>
      {failed && <div role="alert" className="avp-error">
        <p>{t('Video could not be played. Check the file or use a direct MP4 URL without a sign-in page.')}</p>
        <button type="button" className="btn ghost" onClick={() => { setFailed(false); videoRef.current?.load(); }}>{t('Retry video')}</button>
      </div>}
    </Screen>
  );
}