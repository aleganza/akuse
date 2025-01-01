import './styles/AnimeModal.css';

import { ISource } from '@consumet/extensions';
import { faCircleExclamation, faStar, faTv, faVolumeHigh, faVolumeXmark, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import Store from 'electron-store';
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import toast, { Toaster } from 'react-hot-toast';

import { EPISODES_INFO_URL } from '../../../constants/utils';
import { getAnimeInfo } from '../../../modules/anilist/anilistApi';
import { getAnimeHistory, setAnimeHistory } from '../../../modules/history';
import { getSourceFromProvider } from '../../../modules/providers/api';
import {
  capitalizeFirstLetter,
  getParsedFormat,
  getParsedMeanScore,
  getParsedSeasonYear,
  getProgress,
  getTitle,
  getUrlByCoverType,
  relationsToListAnimeData,
} from '../../../modules/utils';
import { ListAnimeData } from '../../../types/anilistAPITypes';
import { MediaFormat, MediaTypes, RelationTypes } from '../../../types/anilistGraphQLTypes';
import { EpisodeInfo } from '../../../types/types';
import AnimeSections from '../AnimeSections';
import { ButtonCircle } from '../Buttons';
import VideoPlayer from '../player/VideoPlayer';
import {
  AnimeModalDescription,
  AnimeModalEpisodes,
  AnimeModalGenres,
  AnimeModalOtherTitles,
  AnimeModalStatus,
  AnimeModalWatchButtons,
} from './AnimeModalElements';
import AutomaticProviderSearchModal from './AutomaticProviderSearchModal';
import EpisodesSection from './EpisodesSection';
import { ModalPage, ModalPageShadow } from './Modal';

const modalsRoot = document.getElementById('modals-root');
const STORE = new Store();
const style = getComputedStyle(document.body);

interface AnimeModalProps {
  listAnimeData: ListAnimeData;
  show: boolean;
  onClose: () => void;
  ref?: React.RefObject<HTMLDivElement>;
}

const AnimeModal: React.FC<AnimeModalProps> = ({
  listAnimeData,
  show,
  onClose,
  ref,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const trailerRef = useRef<HTMLVideoElement>(null);

  // trailer
  const [trailer, setTrailer] = useState<boolean>(true);
  const [trailerVolumeOn, setTrailerVolumeOn] = useState<boolean>(false);
  const [canRePlayTrailer, setCanRePlayTrailer] = useState<boolean>(false);

  // episodes info
  const [episodesInfoHasFetched, setEpisodesInfoHasFetched] =
    useState<boolean>(false);
  const [episodesInfo, setEpisodesInfo] = useState<EpisodeInfo[]>();

  // before player: search provider matching
  const [showAutomaticProviderSerchModal, setShowAutomaticProviderSerchModal] =
    useState<boolean>(false);

  // player
  const [showPlayer, setShowPlayer] = useState<boolean>(false);
  const [animeEpisodeNumber, setAnimeEpisodeNumber] = useState<number>(0);
  const [playerISource, setPlayerISource] = useState<ISource | null>(null);

  // other
  const [providerAnimeId, setProviderAnimeId] = useState<string>()
  const [localProgress, setLocalProgress] = useState<number>();
  const [alternativeBanner, setAlternativeBanner] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);
  const [relatedAnime, setRelatedAnime] = useState<ListAnimeData[]>();
  const [recommendedAnime, setRecommendedAnime] = useState<ListAnimeData[]>();
  const [lastFetchedId, setLastFetchedId] = useState<number>();
  const [onScreen, setOnScreen] = useState<boolean>(true);

  const updateListAnimeData = async () => {
    if (
      !listAnimeData.media?.relations ||
      !listAnimeData.media?.recommendations
    ) {
      if (lastFetchedId === listAnimeData.media.id) return;

      setLastFetchedId(listAnimeData.media.id);

      listAnimeData = {
        id: null,
        mediaId: null,
        progress: null,
        media: await getAnimeInfo(listAnimeData.media.id),
      };

      setLocalProgress(getProgress(listAnimeData.media));
    }
  };

  const getRecommendedAnime = () => {
    const nodes = listAnimeData.media.recommendations?.nodes;
    if (!nodes) return;
    setRecommendedAnime(
      nodes.map((value) => {
        return {
          id: null,
          mediaId: null,
          progress: null,
          media: value.mediaRecommendation,
        };
      }),
    );
  };

  const getRelatedAnime = () => {
    const edges = listAnimeData.media.relations?.edges;
    if (!edges) return;

    const list = edges
      .filter((value) => value.node.type === MediaTypes.Anime)
      .map((value) => {
        value.node.format =
          value.node.format?.substring(0, 2) === 'TV' ||
          value.relationType === RelationTypes.Sequel ||
          value.relationType === RelationTypes.Prequel ||
          value.relationType === RelationTypes.Alternative ||
          // value.relationType === RelationTypes.SideStory ||
          value.relationType === RelationTypes.Parent ||
          value.relationType === RelationTypes.SpinOff
            ? (value.relationType as MediaFormat)
            : value.node.format;

        return value;
      });

    setRelatedAnime(relationsToListAnimeData(list));
  };

  useEffect(() => {
    if (!episodesInfoHasFetched) fetchEpisodesInfo();
  }, []);

  useEffect(() => {
    if (show) {
      setData();
      (async () => {
        await updateListAnimeData();
        getRelatedAnime();
        getRecommendedAnime();
      })();
    }
  }, [show]);

  useEffect(() => {
    if (!showPlayer) {
      setPlayerISource(null);
    }
  }, [showPlayer]);

  useEffect(() => {
    if (!onScreen) return;
    try {
      if (show && trailerRef.current && canRePlayTrailer)
        trailerRef.current.play();
      setTrailerVolumeOn(STORE.get('trailer_volume_on') as boolean);
    } catch (error) {
      console.log(error);
    }
  }, [show]);

  const closeModal = (updateSection: boolean = true) => {
    if (trailerRef.current) {
      trailerRef.current.pause();
      setTimeout(() => {
        if (trailerRef.current) trailerRef.current.currentTime = 0;
      }, 400);
    }

    // if (updateSection) ipcRenderer.send('update-section', 'history');

    onClose();
  };

  // close modal by clicking shadow area
  const handleClickOutside = (event: any) => {
    if (!onScreen) return;
    if (!modalRef.current?.contains(event.target as Node)) {
      closeModal();
    }
  };

  const setData = async () => {
    const animeId = listAnimeData.media.id as number;
    setLocalProgress(getProgress(listAnimeData.media));

    if (listAnimeData.media.nextAiringEpisode !== null) {
      const nextAiringEpisode = listAnimeData.media.nextAiringEpisode;
      if (nextAiringEpisode) {
        const currentTime = Date.now() / 1000;
        nextAiringEpisode.timeUntilAiring = nextAiringEpisode.airingAt
          ? nextAiringEpisode.airingAt - currentTime
          : nextAiringEpisode.timeUntilAiring;
        if (
          nextAiringEpisode.timeUntilAiring < 0 ||
          !nextAiringEpisode.airingAt
        ) {
          /* Not updated history entry. */
          const entry = getAnimeHistory(animeId);
          console.log(entry);
          if (entry) {
            listAnimeData.media = await getAnimeInfo(animeId);
            entry.data = listAnimeData;
            setAnimeHistory(entry);
          }
        }
      }
    }
  };

  const fetchEpisodesInfo = async () => {
    if (STORE.get('light_mode') as boolean) {
      setEpisodesInfoHasFetched(true);
      return;
    }

    axios
      .get(`${EPISODES_INFO_URL}${listAnimeData.media.id}`)
      .then((data) => {
        if (data.data && data.data.episodes)
          setEpisodesInfo(data.data.episodes);
        data.data.images &&
          setAlternativeBanner(
            getUrlByCoverType(data.data.images, 'fanart') ?? undefined,
          );
        setEpisodesInfoHasFetched(true);
      })
      .catch(() => {
        setEpisodesInfoHasFetched(true);
      });
  };

  const handleTrailerPlay = () => {
    if (trailerRef.current) {
      trailerRef.current.volume = trailerVolumeOn ? 1 : 0;
    }
  };

  const handleTrailerLoad = () => {
    try {
      if (trailerRef.current) trailerRef.current.play();
      setCanRePlayTrailer(true);
    } catch (error) {
      console.log(error);
    }
  };

  const handleTrailerError = () => {
    setTrailer(false);
  };

  const toggleTrailerVolume = () => {
    const volumeOn = !trailerVolumeOn;

    if (trailerRef.current) {
      trailerRef.current.volume = volumeOn ? 1 : 0;
      setTrailerVolumeOn(volumeOn);
      STORE.set('trailer_volume_on', volumeOn);
    }
  };

  // automatic anilist-provider matching search
  const searchMatch = async (episode: number) => {
    setAnimeEpisodeNumber(episode);
    setShowAutomaticProviderSerchModal(true);
  };

  const playEpisode = async (provAnimeId: string) => {
    if (trailerRef.current) trailerRef.current.pause();
    
    setShowPlayer(true);
    setLoading(true);

    await getSourceFromProvider(provAnimeId, animeEpisodeNumber).then((video) => {
      if (!video) {
        setLoading(false);
        return;
      }
      setPlayerISource(video);
      setProviderAnimeId(provAnimeId)
    })
  };

  const handleLocalProgressChange = (localProgress: number) => {
    setLocalProgress(localProgress);
  };

  const handleChangeLoading = (value: boolean) => {
    setLoading(value);
  };

  const handlePlayerClose = () => {
    try {
      // if (trailerRef.current) trailerRef.current.play();
      setShowPlayer(false);
    } catch (error) {
      console.log(error);
    }
  };

  return ReactDOM.createPortal(
    <>
      <AutomaticProviderSearchModal
        show={showAutomaticProviderSerchModal}
        onClose={() => {
          setShowAutomaticProviderSerchModal(false);
        }}
        listAnimeData={listAnimeData}
        episode={animeEpisodeNumber}
        onPlay={playEpisode}
      />

      {showPlayer && (
        <VideoPlayer
          source={playerISource}
          listAnimeData={listAnimeData}
          providerAnimeId={providerAnimeId}
          episodesInfo={episodesInfo}
          animeEpisodeNumber={animeEpisodeNumber}
          show={showPlayer}
          loading={loading}
          onLocalProgressChange={handleLocalProgressChange}
          onChangeLoading={handleChangeLoading}
          onClose={handlePlayerClose}
        />
      )}

      <ModalPageShadow show={show} />
      <ModalPage modalRef={ref} show={show} closeModal={closeModal}>
        <div className="anime-page" onClick={handleClickOutside}>
          <div className="content-wrapper" ref={modalRef}>
            <button className="exit" onClick={() => closeModal()}>
              <FontAwesomeIcon className="i" icon={faXmark} />
            </button>

            <div className="up">
              <AnimeModalWatchButtons
                listAnimeData={listAnimeData}
                localProgress={localProgress}
                onPlay={searchMatch}
                loading={false} // loading disabled
              />

              {canRePlayTrailer && (
                <div className="trailer-volume show-trailer">
                  <ButtonCircle
                    icon={trailerVolumeOn ? faVolumeHigh : faVolumeXmark}
                    tint="empty"
                    shadow
                    tooltipText={trailerVolumeOn ? 'Volume off' : 'Volume on'}
                    onClick={toggleTrailerVolume}
                  />
                </div>
              )}

              {trailer && (
                <div
                  className={`trailer-wrapper ${
                    canRePlayTrailer ? 'show-opacity' : ''
                  }`}
                >
                  <video
                    ref={trailerRef}
                    src={`https://inv.tux.pizza/latest_version?id=${listAnimeData.media.trailer?.id}&itag=18`}
                    className="trailer"
                    preload="none"
                    loop
                    playsInline
                    autoPlay
                    onPlay={handleTrailerPlay}
                    onLoadedMetadata={handleTrailerLoad}
                    onError={handleTrailerError}
                  />
                </div>
              )}

              <div className="banner-wrapper">
                {(alternativeBanner || listAnimeData.media.bannerImage) &&
                episodesInfoHasFetched ? (
                  <img
                    src={alternativeBanner || listAnimeData.media.bannerImage}
                    className="banner show-opacity"
                    alt="Banner"
                  />
                ) : null}
              </div>
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
                    {getParsedMeanScore(listAnimeData.media)}%
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
                  {'Released on: '}
                  <span>
                    {capitalizeFirstLetter(listAnimeData.media.season ?? '?')}{' '}
                    {getParsedSeasonYear(listAnimeData.media)}
                  </span>
                </p>
                <AnimeModalGenres genres={listAnimeData.media.genres ?? []} />
                <AnimeModalOtherTitles
                  synonyms={listAnimeData.media.synonyms ?? []}
                />
              </div>
            </div>
            <EpisodesSection
              episodesInfo={episodesInfo}
              episodesInfoHasFetched={episodesInfoHasFetched}
              listAnimeData={listAnimeData}
              loading={loading}
              onPlay={searchMatch}
            />
            {((relatedAnime && relatedAnime.length > 0) ||
              (recommendedAnime && recommendedAnime.length > 0)) && (
              <AnimeSections
                id={'recommended'}
                selectedLabel={(relatedAnime && 'Related') || 'Recommended'}
                onClick={() => {
                  setOnScreen(false);
                  closeModal(false);
                }}
                options={[
                  {
                    label: 'Related',
                    value: relatedAnime === undefined ? [] : relatedAnime,
                  },
                  {
                    label: 'Recommended',
                    value:
                      recommendedAnime === undefined ? [] : recommendedAnime,
                  },
                ]}
              />
            )}
          </div>
        </div>
      </ModalPage>
      <Toaster />
    </>,
    modalsRoot!,
  );
};

export default AnimeModal;
