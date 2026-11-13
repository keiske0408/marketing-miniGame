import eventWordmark from '../assets/wine_game_UI/SCREEN 1/The 23rd Grand Wine Experience-01 copy.png';
import eventLogos from '../assets/wine_game_UI/SCREEN 2/23rd logos.png';

export function EventBrand({ registration = false }: { registration?: boolean }) {
  return (
    <div className={`event-brand${registration ? ' event-brand-registration' : ''}`}>
      {registration ? (
        <>
          <img className="event-wordmark" src={eventWordmark} alt="The 23rd Grand Wine Experience" />
          <svg className="event-sponsor" viewBox="549 72 225 93" role="img" aria-label="Global Visions Holdings Inc.">
            <image href={eventLogos} width="774" height="245" />
          </svg>
        </>
      ) : (
        <img src={eventLogos} width="774" height="245" alt="The 23rd Grand Wine Experience and Global Visions Holdings Inc." />
      )}
    </div>
  );
}
