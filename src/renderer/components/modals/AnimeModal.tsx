import React, { MouseEventHandler, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  faCircleExclamation,
  faFilm,
  faStar,
  faTv,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  capitalizeFirstLetter,
  getEpisodes,
  getParsedFormat,
  getParsedSeasonYear,
  getTitle,
} from '../../../modules/utils';
import { ListAnimeData } from '../../../types/anilistAPITypes';
import {
  AnimeModalDescription,
  AnimeModalEpisodes,
  AnimeModalGenres,
  AnimeModalOtherTitles,
  AnimeModalStatus,
  AnimeModalWatchButtons,
} from './AnimeModalElements';
import { Button2 } from '../Buttons';
import { ModalPage, ModalPageShadow } from './Modal';
import EpisodesSection from './EpisodesSection';

const modalsRoot = document.getElementById('modals-root');

interface AnimeModalProps {
  listAnimeData: ListAnimeData;
  show: boolean;
  onClose: () => void;
}

const AnimeModal: React.FC<AnimeModalProps> = ({
  listAnimeData,
  show,
  onClose, 
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // close modal by clicking shadow area
  const handleClickOutside = (event: any) => {
    if (!modalRef.current?.contains(event.target as Node)) {
      onClose();
    }
  };
  
  // close modal by pressing ESC
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (show) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [show]);

  return ReactDOM.createPortal(
    <>
      <ModalPageShadow show={show} />
      <ModalPage show={show}>
        <div className="anime-page" onClick={handleClickOutside}>
          <div className="content-wrapper" ref={modalRef}>
            <button className="exit" onClick={onClose}>
              <FontAwesomeIcon className="i" icon={faXmark} />
            </button>
            <div className="banner-wrapper">
              {listAnimeData.media.bannerImage && (
                <img src={listAnimeData.media.bannerImage} className="banner" />
              )}
              <AnimeModalWatchButtons listAnimeData={listAnimeData} />
            </div>
            <div className="content">
              <div className="left">
                <h1 className="title">{getTitle(listAnimeData.media)}</h1>
                <ul className="info">
                  {listAnimeData.media.isAdult && (
                    <li style={{ color: '#ff6b6b' }}>
                      <FontAwesomeIcon
                        className="i"
                        icon={faCircleExclamation}
                        style={{ marginRight: 7 }}
                      />
                      Adults
                    </li>
                  )}
                  <li style={{ color: '#e5a639' }}>
                    <FontAwesomeIcon
                      className="i"
                      icon={faStar}
                      style={{ marginRight: 7 }}
                    />
                    {listAnimeData.media.meanScore}%
                  </li>
                  <AnimeModalStatus status={listAnimeData.media.status} />
                  <li>
                    <FontAwesomeIcon
                      className="i"
                      icon={faTv}
                      style={{ marginRight: 7 }}
                    />
                    {getParsedFormat(listAnimeData.media.format)}
                  </li>
                  <AnimeModalEpisodes listAnimeData={listAnimeData} />
                </ul>
                <AnimeModalDescription listAnimeData={listAnimeData} />
              </div>
              <div className="right">
                <p className="additional-info">
                  <span>Released on: </span>
                  {capitalizeFirstLetter(
                    listAnimeData.media.season ?? '?',
                  )}{' '}
                  {getParsedSeasonYear(listAnimeData.media)}
                </p>
                <AnimeModalGenres genres={listAnimeData.media.genres ?? []} />
                <AnimeModalOtherTitles
                  synonyms={listAnimeData.media.synonyms ?? []}
                />
              </div>
            </div>
            <EpisodesSection listAnimeData={listAnimeData} />
            <div className="episodes-section"></div>
          </div>
        </div>
      </ModalPage>
    </>,
    modalsRoot!,
  );
};

export default AnimeModal;