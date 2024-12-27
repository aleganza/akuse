import './styles/AutomaticProviderSearchModal.css';

import { faMagnifyingGlass, faPlay } from '@fortawesome/free-solid-svg-icons';
import { useRef, useState } from 'react';
import { Dots } from 'react-activity';
import ReactDOM from 'react-dom';

import { ButtonMain } from '../Buttons';
import { ModalPage, ModalPageShadow, ModalPageSizeableContent } from './Modal';

const modalsRoot = document.getElementById('modals-root');

const AutomaticProviderSearchModal: React.FC<{
  show: boolean;
  onClose: () => void;
  animeId?: string;
  animeImage?: string;
  loading: boolean;
  onPlay: () => void;
}> = ({ show, onClose, animeId, animeImage, loading, onPlay }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const handlePlayClick = () => {
    onPlay();
    onClose();
  };

  return ReactDOM.createPortal(
    <>
      <ModalPageShadow show={show} zIndex={21} />
      <ModalPage
        show={show}
        modalRef={modalRef}
        closeModal={onClose}
        zIndex={22}
      >
        <ModalPageSizeableContent
          width={400}
          closeModal={onClose}
          title={
            loading
              ? 'Looking for anime...'
              : animeId
                ? 'Match found'
                : 'No match found'
          }
        >
          {loading ? (
            <Dots />
          ) : (
            <div className="automatic-provider-search-content">
              {animeId && (
                <>
                  <p>
                    <strong>Id: </strong>
                    {animeId}
                  </p>
                  <p>
                    <strong>Title: </strong>
                    {animeId}
                  </p>
                  {animeImage && <img src={animeImage} alt="anime image" />}
                </>
              )}

              <div className="automatic-provider-search-wrapper">
                <ButtonMain
                  text={'Search Manually'}
                  tint="light"
                  icon={faMagnifyingGlass}
                  disabled
                />
                {animeId && (
                  <ButtonMain
                    text={'Play'}
                    tint="primary"
                    icon={faPlay}
                    onClick={handlePlayClick}
                  />
                )}
              </div>
            </div>
          )}
        </ModalPageSizeableContent>
      </ModalPage>
    </>,
    modalsRoot!,
  );
};

export default AutomaticProviderSearchModal;
