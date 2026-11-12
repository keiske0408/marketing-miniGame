import { Screen } from '../components/Screen';

export function AvpScreen() {
  const videoUrl = import.meta.env.VITE_AVP_VIDEO_URL?.trim();

  return (
    <Screen title="AVP" showBack backTo="/game" className="avp-screen" maxWidth="900px">
      {videoUrl ? (
        <video className="avp-video" controls playsInline preload="metadata" poster="/images/vineyard-estate.jpg" src={videoUrl}>
          Your browser does not support video playback.
        </video>
      ) : (
        <div className="avp-placeholder" role="status"><span>VIDEO</span><strong>Coming soon</strong></div>
      )}
    </Screen>
  );
}