import './styles/AutomaticProviderSearchModal.css';

import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Store from 'electron-store';
import { useEffect, useRef, useState } from 'react';
import { Dots } from 'react-activity';
import ReactDOM from 'react-dom';

import {
  searchAutomaticMatchInProvider,
  searchInProvider as searchInProviderApi,
} from '../../../modules/providers/api';
import { ListAnimeData } from '../../../types/anilistAPITypes';
import { LANGUAGE_OPTIONS } from '../../tabs/Tab4';
import { ModalPage, ModalPageShadow, ModalPageSizeableContent } from './Modal';

const modalsRoot = document.getElementById('modals-root');
const STORE = new Store();

const AutomaticProviderSearchModal: React.FC<{
  show: boolean;
  listAnimeData?: ListAnimeData;
  episode?: number;
  onClose: () => void;
  onPlay: (providerAnimeId: string) => void;
}> = ({ show, listAnimeData, episode, onClose, onPlay }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedTitle, setSelectedTitle] = useState('');

  const handlePlayClick = (providerAnimeId: string) => {
    onPlay(providerAnimeId);
    closeModal();
  };

  const closeModal = () => {
    onClose();
    setResults([]);
    setSelectedTitle('');
  };

  const handleInputKeydown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.keyCode === 229) return;
    if (event.code === 'Enter' && !loading) searchInProvider();
  };

  const startAutomaticMatch = async () => {
    setResults([]);
    setLoading(true);

    const providerResult = await searchAutomaticMatchInProvider(
      listAnimeData!,
      episode!,
    );
    providerResult && setResults([providerResult]);

    setLoading(false);
  };

  const searchInProvider = async () => {
    setResults([]);
    setLoading(true);

    const providerResults = await searchInProviderApi(selectedTitle);
    providerResults && setResults(providerResults);

    setLoading(false);
  };

  // modal is opened
  useEffect(() => {
    if (show) {
      startAutomaticMatch();
    }
  }, [show]);

  return ReactDOM.createPortal(
    <>
      <ModalPageShadow show={show} zIndex={21} />
      <ModalPage
        show={show}
        modalRef={modalRef}
        closeModal={closeModal}
        zIndex={22}
      >
        <ModalPageSizeableContent
          width={400}
          closeModal={closeModal}
          title="Select source"
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Dots />
            </div>
          ) : (
            <div
              className="automatic-provider-search-content"
              onKeyDown={handleInputKeydown}
            >
              <div className="search-container">
                <input
                  type="text"
                  id="search-page-filter-title"
                  placeholder="Search manually by title..."
                  value={selectedTitle}
                  onChange={(event: any) =>
                    setSelectedTitle(event.target.value)
                  }
                />

                <button onClick={searchInProvider}>
                  <FontAwesomeIcon className="i" icon={faSearch} />
                </button>
              </div>

              {results.length !== 0 ? (
                <span>
                  {`Results from ${
                    LANGUAGE_OPTIONS.find(
                      (l) => l.value == (STORE.get('source_flag') as string),
                    )?.label
                  }`}
                </span>
              ) : (
                <span>No matching results.</span>
              )}

              <div className="cards-group">
                {results.length !== 0 &&
                  results?.map((result, index) => (
                    <div
                      key={index}
                      className="card"
                      onClick={() => {
                        handlePlayClick(result.id);
                      }}
                    >
                      {result?.image && (
                        <img src={result?.image} alt="anime image" />
                      )}
                      <div className="right">
                        <p>
                          <strong>Title: </strong>
                          {result?.title}
                        </p>
                        <p>
                          <strong>Id: </strong>
                          {result?.id}
                        </p>
                      </div>
                    </div>
                  ))}
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
