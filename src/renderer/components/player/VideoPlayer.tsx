import './styles/VideoPlayer.css';
import 'react-activity/dist/Dots.css';

import { ISubtitle, IVideo } from '@consumet/extensions';
import { faFastForward } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { ipcRenderer } from 'electron';
import Store from 'electron-store';
import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import toast, { Toaster } from 'react-hot-toast';

import { EPISODES_INFO_URL } from '../../../constants/utils';
import {
  getAnimeInfo,
  updateAnimeFromList,
  updateAnimeProgress,
} from '../../../modules/anilist/anilistApi';
import AniSkip from '../../../modules/aniskip';
import { getAnimeHistory, setAnimeHistory } from '../../../modules/history';
import { getUniversalEpisodeUrl } from '../../../modules/providers/api';
import {
  getAvailableEpisodes,
  getRandomDiscordPhrase,
  getSequel,
} from '../../../modules/utils';
import { ListAnimeData } from '../../../types/anilistAPITypes';
import { SkipEvent, SkipEventTypes } from '../../../types/aniskipTypes';
import { EpisodeInfo } from '../../../types/types';
import { ButtonMain } from '../Buttons';
import BottomControls from './BottomControls';
import MidControls from './MidControls';
import TopControls from './TopControls';

const STORE = new Store();
const style = getComputedStyle(document.body);
const videoPlayerRoot = document.getElementById('video-player-root');
const debounces: { [key: string]: NodeJS.Timeout } = {};

const debounce = (id: string, func: () => void, delay: number) => {
  const timeoutId = debounces[id];
  if (timeoutId) clearTimeout(timeoutId);
  debounces[id] = setTimeout(() => {
    func();
    delete debounces[id];
  }, delay);
};

const VideoPlayer: React.FC<{
  video: IVideo | null;
  listAnimeData: ListAnimeData;
  episodesInfo?: EpisodeInfo[];
  animeEpisodeNumber: number;
  show: boolean;
  loading: boolean;

  // when progress updates from video player,
  // this helps displaying the correct progress value
  onLocalProgressChange: (localprogress: number) => void;
  onChangeLoading: (value: boolean) => void;
  onClose: () => void;
}> = ({
  video,
  listAnimeData,
  episodesInfo,
  animeEpisodeNumber,
  show,
  loading,
  onLocalProgressChange,
  onChangeLoading,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hlsData, setHlsData] = useState<Hls>();

  // const [title, setTitle] = useState<string>(animeTitle); // may be needed in future features
  const [episodeNumber, setEpisodeNumber] = useState<number>(0);
  const [episodeTitle, setEpisodeTitle] = useState<string>('');
  const [episodeDescription, setEpisodeDescription] = useState<string>('');
  const [progressUpdated, setProgressUpdated] = useState<boolean>(false);
  const [activity, setActivity] = useState<boolean>(false);
  const [listAnime, setListAnime] = useState<ListAnimeData>(listAnimeData);
  const [episodeList, setEpisodeList] = useState<EpisodeInfo[] | undefined>(
    episodesInfo,
  );

  const isPlaying = () =>
    videoRef.current &&
    videoRef.current.currentTime > 0 &&
    !videoRef.current.paused &&
    !videoRef.current.ended &&
    videoRef.current.readyState > videoRef.current.HAVE_CURRENT_DATA;

  if (!activity && episodeTitle) {
    setActivity(true);
    ipcRenderer.send('update-presence', {
      details: `Watching ${listAnime.media.title?.english}`,
      state: `Ep: ${episodeNumber} - ${episodeTitle}`,
      startTimestamp: Date.now(),
      largeImageKey: listAnime.media.coverImage?.large || 'akuse',
      largeImageText: listAnime.media.title?.english || 'akuse',
      smallImageKey: 'icon',
      buttons: [
        {
          label: 'Download app',
          url: 'https://github.com/akuse-app/akuse/releases/latest',
        },
      ],
    });
  }

  // controls
  const [showControls, setShowControls] = useState<boolean>(false);
  const [showPauseInfo, setShowPauseInfo] = useState<boolean>(false);
  const [showCursor, setShowCursor] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(true);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [isSettingsShowed, setIsSettingsShowed] = useState<boolean>(false);
  const [showNextEpisodeButton, setShowNextEpisodeButton] =
    useState<boolean>(true);
  const [showPreviousEpisodeButton, setShowPreviousEpisodeButton] =
    useState<boolean>(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // timeline
  const [currentTime, setCurrentTime] = useState<number>();
  const [duration, setDuration] = useState<number>();
  const [buffered, setBuffered] = useState<TimeRanges>();
  // skip events
  const [skipEvents, setSkipEvents] = useState<SkipEvent[]>();
  const [showSkipEvent, setShowSkipEvent] = useState<boolean>(false);
  const [skipEvent, setSkipEvent] = useState<string>('Skip Intro ');
  const [previousSkipEvent, setPreviousSkipEvent] = useState<string>('');
  const [subtitleTracks, setSubtitleTracks] = useState<
    ISubtitle[] | undefined
  >();

  // keydown handlers
  const handleVideoPlayerKeydown = async (
    event: KeyboardEvent | React.KeyboardEvent<HTMLVideoElement>,
  ) => {
    if (event.keyCode === 229 || !videoRef?.current) return;

    const video = videoRef.current;

    switch (event.code) {
      case 'Space': {
        event.preventDefault();
        togglePlaying();
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        video.currentTime -= STORE.get('key_press_skip') as number;
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        video.volume = Math.min(video.volume + 0.1, 1);
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        video.currentTime += STORE.get('key_press_skip') as number;
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        video.volume = Math.max(video.volume - 0.1, 0);
        break;
      }
      case 'F11': {
        event.preventDefault();
        toggleFullScreen();
        break;
      }
    }
    switch (event.key) {
      case 'f': {
        event.preventDefault();
        toggleFullScreen();
        break;
      }
      case 'm': {
        event.preventDefault();
        toggleMute();
        break;
      }
      case 'p': {
        event.preventDefault();
        canPreviousEpisode(episodeNumber) &&
          (await changeEpisode(episodeNumber - 1));
        break;
      }
      case 'n': {
        event.preventDefault();
        canNextEpisode(episodeNumber) &&
          (await changeEpisode(episodeNumber + 1));
        break;
      }
    }
  };

  const handleKeydown = (event: React.KeyboardEvent<HTMLVideoElement>) => {
    if (videoRef.current) {
      handleVideoPlayerKeydown(event);
    }
  };

  useEffect(() => {
    const handleDocumentKeydown = (event: KeyboardEvent) => {
      if (videoRef.current) {
        handleVideoPlayerKeydown(event);
      }
    };

    document.addEventListener('keydown', handleDocumentKeydown);

    return () => {
      document.removeEventListener('keydown', handleDocumentKeydown);
    };
  }, [handleVideoPlayerKeydown]);

  useEffect(() => {
    const video = videoRef.current;
    const handleSeeked = () => {
      // console.log('seeked');
      onChangeLoading(false);
      handleHistoryUpdate();
      setSkipEvent(skipEvent + ' '); /* little hacky but it'll do for now. */
      setPreviousSkipEvent('');
      handleSkipEvents();
      if (!video?.paused) setPlaying(true);
    };

    const handleWaiting = () => {
      // console.log('waiting');
      onChangeLoading(true);
      setPlaying(false);
    };

    if (video) {
      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('waiting', handleWaiting);

      return () => {
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('waiting', handleWaiting);
      };
    }
  }, []);

  useEffect(() => {
    onChangeLoading(loading);
  }, [loading]);

  const getSkipEvents = async (episode: number, video: IVideo) => {
    const duration = videoRef.current?.duration;

    if (video && video.skipEvents) {
      const skipEvent = video.skipEvents as {
        intro?: {
          start: number;
          end: number;
        };
        outro?: {
          start: number;
          end: number;
        };
      };
      const result: SkipEvent[] = [];

      if (skipEvent.intro)
        result.push({
          episodeLength: duration ?? 0,
          interval: {
            startTime: skipEvent.intro.start,
            endTime: skipEvent.intro.end,
          },
          skipId: 'NON-API',
          skipType: 'op',
        });

      if (skipEvent.outro)
        result.push({
          episodeLength: duration ?? 0,
          interval: {
            startTime: skipEvent.outro.start,
            endTime: skipEvent.outro.end,
          },
          skipId: 'NON-API',
          skipType: 'ed',
        });

      setSkipEvents(result);
      return;
    }

    setSkipEvents(
      await AniSkip.getSkipEvents(
        listAnime.media.idMal as number,
        episode ?? episodeNumber ?? animeEpisodeNumber,
        Number.isNaN(duration) ? 0 : duration,
      ),
    );
  };

  useEffect(() => {
    if (video !== null) {
      playSource(video);

      // resume from tracked progress
      const animeId = (listAnime.media.id ||
        (listAnime.media.mediaListEntry &&
          listAnime.media.mediaListEntry.id)) as number;
      const animeHistory = getAnimeHistory(animeId);

      if (animeHistory !== undefined) {
        const currentEpisode = animeHistory.history[animeEpisodeNumber];
        if (currentEpisode !== undefined && videoRef?.current) {
          videoRef.current.currentTime = currentEpisode.time;
        }
      }
      setEpisodeNumber(animeEpisodeNumber);
      setEpisodeTitle(
        episodeList
          ? (episodeList[animeEpisodeNumber].title?.en ??
              `Episode ${animeEpisodeNumber}`)
          : `Episode ${animeEpisodeNumber}`,
      );
      setEpisodeDescription(
        episodeList ? (episodeList[animeEpisodeNumber].summary ?? '') : '',
      );

      setShowNextEpisodeButton(canNextEpisode(animeEpisodeNumber));
      setShowPreviousEpisodeButton(canPreviousEpisode(animeEpisodeNumber));
      getSkipEvents(animeEpisodeNumber, video);
    }
  }, [video, listAnime]);

  const setSubtitleTrack = (subtitleTrack: ISubtitle) => {
    if (!videoRef.current) return;

    let track;
    if ((track = videoRef.current.querySelector('track'))) {
      track.track.mode = 'disabled';
      track.remove();
    }

    track = document.createElement('track');
    track.setAttribute('kind', 'captions');
    track.setAttribute('src', subtitleTrack.url);
    videoRef.current.appendChild(track);

    track.track.mode = 'showing';
  };

  const playSource = (video: IVideo) => {
    if (video.isM3U8) {
      playHlsVideo(video);
    } else {
      if (videoRef.current) {
        videoRef.current.src = video.url;
      }
    }
  };

  const playHlsVideo = (video: IVideo) => {
    const url = video.url;
    try {
      if (Hls.isSupported() && videoRef.current) {
        var hls = new Hls();
        hls.loadSource(url);
        if (video.tracks) {
          const tracks = video.tracks as ISubtitle[];
          setSubtitleTracks(tracks);

          videoRef.current.addEventListener('loadeddata', () => {
            if (!videoRef.current) return;

            const lastUsed = STORE.get('subtitle_language') as string;

            let currentTrack =
              tracks.find(
                (value) =>
                  value.lang.substring(0, lastUsed.length) ===
                  (lastUsed as string),
              ) ?? tracks[0];

            setSubtitleTrack(currentTrack);
          });
        }
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (videoRef.current) {
            hls.currentLevel = hls.levels.length - 1;
            playVideoAndSetTime();
            setHlsData(hls);
          }
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleHistoryUpdate = () => {
    const video = videoRef.current;
    const cTime = video?.currentTime;
    if (cTime === undefined) return;

    const animeId = (listAnime.media.id ||
      (listAnime.media.mediaListEntry &&
        listAnime.media.mediaListEntry.id)) as number;
    if (animeId === null || animeId === undefined || episodeNumber === 0)
      return;

    const entry = getAnimeHistory(animeId) ?? {
      history: {},
      data: listAnime,
    };

    entry.history[episodeNumber] = {
      time: cTime,
      timestamp: Date.now(),
      duration: video?.duration,
      data: (episodeList as EpisodeInfo[])[episodeNumber],
    };

    setAnimeHistory(entry);
    onLocalProgressChange(episodeNumber - 1);
  };

  const playVideo = () => {
    if (videoRef.current) {
      try {
        if (!isPlaying()) {
          setPlaying(true);
          videoRef.current.play();
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  const pauseVideo = () => {
    if (videoRef.current) {
      try {
        setPlaying(false);
        videoRef.current.pause();
        handleHistoryUpdate();
      } catch (error) {
        console.log(error);
      }
    }
  };

  const togglePlayingWithoutPropagation = (event: any) => {
    if (event.target !== event.currentTarget) return;
    playing ? pauseVideo() : playVideo();
  };

  const togglePlaying = () => {
    try {
      playing ? pauseVideo() : playVideo();
    } catch (error) {
      console.log(error);
    }
  };

  const playVideoAndSetTime = () => {
    try {
      if (videoRef.current) {
        setTimeout(() => {
          playVideo();
          setCurrentTime(videoRef.current?.currentTime);
          setDuration(videoRef.current?.duration);
          onChangeLoading(false);
        }, 1000);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateCurrentProgress = (completed: boolean = true) => {
    const status = listAnime.media.mediaListEntry?.status;
    if (STORE.get('logged') as boolean) {
      switch (status) {
        case 'CURRENT': {
          updateAnimeProgress(listAnime.media.id!, episodeNumber);
          break;
        }
        case 'REPEATING':
        case 'COMPLETED': {
          updateAnimeFromList(
            listAnime.media.id,
            'REWATCHING',
            undefined,
            episodeNumber,
          );
        }
        default: {
          updateAnimeFromList(
            listAnime.media.id,
            'CURRENT',
            undefined,
            episodeNumber,
          );
        }
      }
    }

    setProgressUpdated(true);
    onLocalProgressChange(completed ? episodeNumber : episodeNumber - 1);
  };

  const handleSkipEvents = () => {
    const video = videoRef.current;
    if (!video || previousSkipEvent === skipEvent) return;

    if (skipEvents && skipEvents.length > 0) {
      const currentEvent = AniSkip.getCurrentEvent(
        currentTime ?? 0,
        skipEvents,
      );

      if (currentEvent) {
        const eventName = AniSkip.getEventName(currentEvent);
        if (skipEvent !== `Skip ${eventName}`) {
          debounce(
            'skip',
            () => {
              setShowSkipEvent(false);
              setPreviousSkipEvent(`Skip ${eventName}`);
            },
            5000,
          );
        }

        setShowSkipEvent(true);
        setSkipEvent(`Skip ${eventName}`);
      } else {
        setShowSkipEvent(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current?.paused) {
      setPlaying(true);
      onChangeLoading(false);
    }

    const cTime = videoRef.current?.currentTime;
    const dTime = videoRef.current?.duration;

    handleSkipEvents();

    try {
      if (cTime && dTime) {
        setShowPauseInfo(false);
        setCurrentTime(cTime);
        setDuration(dTime);
        setBuffered(videoRef.current?.buffered);
        // handleHistoryUpdate();

        if (
          (cTime * 100) / dTime > 85 &&
          (STORE.get('update_progress') as boolean) &&
          !progressUpdated
        ) {
          // when updating progress, put the anime in current if it wasn't there
          updateCurrentProgress();
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleVideoPause = () => {
    setShowPauseInfo(false);
    setShowControls(true);
    setShowCursor(true);
    debounce(
      'pauseInfo',
      () => {
        !isSettingsShowed && !isDropdownOpen && setShowPauseInfo(true); // first one maybe useless
      },
      7500,
    );
    debounce(
      'pauseControl',
      () => {
        if (!isDropdownOpen) {
          setShowControls(false);
          setShowCursor(false);
        }
      },
      2000,
    );
  };

  const handleVideoEnd = () => {
    if ((STORE.get('autoplay_next') as boolean) === true) {
      canNextEpisode(episodeNumber) && changeEpisode(episodeNumber + 1);
    }
  };

  const handleMouseMove = () => {
    if (!showControls) {
      setShowPauseInfo(false);
      setShowControls(true);
      setShowCursor(true);
    }

    debounce(
      'pauseInfo',
      () => {
        try {
          if (videoRef.current && videoRef.current.paused && !isDropdownOpen) {
            setShowPauseInfo(true);
          }
        } catch (error) {
          console.log(error);
        }
      },
      7500,
    );

    debounce(
      'pauseControl',
      () => {
        if (!isDropdownOpen) {
          setShowControls(false);
          setShowCursor(false);
        }
      },
      2000,
    );

    const video = videoRef.current;
    if (!video) return;

    if (skipEvents && skipEvents.length > 0) {
      const currentEvent = AniSkip.getCurrentEvent(
        currentTime ?? 0,
        skipEvents,
      );

      if (!currentEvent) return;

      const eventName = AniSkip.getEventName(currentEvent);
      setShowSkipEvent(true);
      debounce(
        'skip',
        () => {
          setShowSkipEvent(false);
          setPreviousSkipEvent(`Skip ${eventName}`);
        },
        5000,
      );
    }
  };

  const handleExit = async () => {
    if (document.fullscreenElement) {
      setFullscreen(false);
      document.exitFullscreen();
    }

    if (
      videoRef.current &&
      videoRef.current === document.pictureInPictureElement
    ) {
      await document.exitPictureInPicture();
    }

    onClose();
    if (STORE.get('update_progress'))
      updateCurrentProgress((currentTime ?? 0) > (duration ?? 0) * 0.85);

    ipcRenderer.send('update-presence', {
      details: `🌸 Watch anime without ads.`,
      state: getRandomDiscordPhrase(),
      startTimestamp: Date.now(),
      largeImageKey: 'icon',
      largeImageText: 'akuse',
      smallImageKey: undefined,
      instance: true,
      buttons: [
        {
          label: 'Download app',
          url: 'https://github.com/akuse-app/akuse/releases/latest',
        },
      ],
    });
  };

  const toggleFullScreenWithoutPropagation = (event: any) => {
    if (event.target !== event.currentTarget) return;
    toggleFullScreen();
  };

  const handleDropdownToggle = (isDropdownOpen: boolean) => {
    console.log(isDropdownOpen);
    setIsDropdownOpen(isDropdownOpen);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  const toggleFullScreen = () => {
    if (document.fullscreenElement) {
      setFullscreen(false);
      document.exitFullscreen();
    } else {
      if (document.documentElement.requestFullscreen) {
        setFullscreen(true);
        document.documentElement.requestFullscreen();
      }
    }
  };

  const togglePiP = async () => {
    if (videoRef.current) {
      try {
        if (videoRef.current !== document.pictureInPictureElement) {
          await videoRef.current.requestPictureInPicture();
        } else {
          await document.exitPictureInPicture();
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  const getEpisodeCount = () => {
    const episodes =
      episodeList &&
      Object.values(episodeList).filter(
        (value) => !Number.isNaN(parseInt(value.episode ?? '0')),
      );

    return episodes?.length ?? 0;
  };

  const changeEpisode = async (
    episode: number | null, // null to play the current episode
    reloadAtPreviousTime?: boolean,
  ): Promise<boolean> => {
    onChangeLoading(true);

    const sequel = getSequel(listAnime.media);
    const episodeCount = getEpisodeCount();

    let episodeToPlay = episode || episodeNumber;
    let episodes = episodeList;
    let anime = listAnime;

    console.log({ episodeCount, episodeToPlay });

    if (episodeCount < episodeToPlay && sequel) {
      const animeId = sequel.id;
      const media = await getAnimeInfo(sequel.id);

      anime = {
        id: null,
        mediaId: null,
        progress: null,
        media: media,
      };
      setListAnime(anime);

      episodeToPlay = 1;
      animeEpisodeNumber = 1;

      const data = await axios.get(`${EPISODES_INFO_URL}${animeId}`);

      if (data.data && data.data.episodes) {
        episodes = data.data.episodes;
        setEpisodeList(episodes);
      }
    }

    var previousTime = 0;
    if (reloadAtPreviousTime && videoRef.current)
      previousTime = videoRef.current?.currentTime;

    const setData = (video: IVideo) => {
      playSource(video);

      setEpisodeNumber(episodeToPlay);
      getSkipEvents(episodeToPlay, video);
      setEpisodeTitle(
        episodes
          ? (episodes[episodeToPlay].title?.en ?? `Episode ${episodeToPlay}`)
          : `Episode ${episodeToPlay}`,
      );
      setEpisodeDescription(
        episodes ? (episodes[episodeToPlay].summary ?? '') : '',
      );
      // loadSource(value.url, value.isM3U8 ?? false);
      setShowNextEpisodeButton(canNextEpisode(episodeToPlay));
      setShowPreviousEpisodeButton(canPreviousEpisode(episodeToPlay));
      setProgressUpdated(false);

      try {
        if (videoRef.current && reloadAtPreviousTime)
          videoRef.current.currentTime = previousTime;
      } catch (error) {
        console.log(error);
      }

      onChangeLoading(false);
    };

    console.log({ anime, episodeToPlay });

    const data = await getUniversalEpisodeUrl(anime, episodeToPlay);
    if (!data) {
      toast(`Source not found.`, {
        style: {
          color: style.getPropertyValue('--font-2'),
          backgroundColor: style.getPropertyValue('--color-3'),
        },
        icon: '❌',
      });

      onChangeLoading(false);
      return false;
    }

    setData(data);
    return true;
  };

  const canPreviousEpisode = (episode: number): boolean => {
    return episode !== 1;
  };

  const canNextEpisode = (episode: number): boolean => {
    const hasNext = episode !== getAvailableEpisodes(listAnime.media);

    if (!hasNext) {
      const sequel = getSequel(listAnime.media);

      if (!sequel) return false;
      return getAvailableEpisodes(sequel) !== null;
    }

    return hasNext;
  };

  const handleSkipEvent = () => {
    const video = videoRef.current;
    if (!video || !skipEvents) return;
    const currentEvent = AniSkip.getCurrentEvent(currentTime ?? 0, skipEvents);
    if (!currentEvent) return;
    if (currentEvent.skipType === SkipEventTypes.Outro) {
      const duration = video.duration - currentEvent.interval.endTime;
      console.log(duration);
      if (STORE.get('autoplay_next') && duration < 10) {
        canNextEpisode(episodeNumber) && changeEpisode(episodeNumber + 1);
      } else video.currentTime = currentEvent.interval.endTime;
    } else video.currentTime = currentEvent.interval.endTime;
  };

  return ReactDOM.createPortal(
    show && (
      <>
        <div
          className={`container ${showControls ? 'show-controls' : ''} ${showPauseInfo ? 'show-pause-info' : ''}`}
          onMouseMove={handleMouseMove}
          ref={containerRef}
        >
          <div className="pause-info">
            <div className="content">
              <h1 className="you-are-watching">You are watching</h1>
              <h1 id="pause-info-anime-title">
                {listAnime.media.title?.english}
              </h1>
              <h1 id="pause-info-episode-title">{episodeTitle}</h1>
              <h1 id="pause-info-episode-description">{episodeDescription}</h1>
            </div>
          </div>
          {showSkipEvent && !/ $/.test(skipEvent) && (
            <div
              className="skip-button"
              style={{
                zIndex: '1000',
                marginRight: '10px',
                marginBottom: '20px',
              }}
            >
              <ButtonMain
                text={skipEvent}
                icon={faFastForward}
                tint="light"
                onClick={handleSkipEvent}
              />
            </div>
          )}
          <div
            className={`shadow-controls ${showCursor ? 'show-cursor' : ''}`}
            onClick={togglePlayingWithoutPropagation}
            onDoubleClick={toggleFullScreenWithoutPropagation}
          >
            <TopControls
              videoRef={videoRef}
              hls={hlsData}
              listAnimeData={listAnime}
              episodesInfo={episodeList}
              episodeNumber={episodeNumber}
              episodeTitle={episodeTitle}
              subtitleTracks={subtitleTracks}
              showNextEpisodeButton={showNextEpisodeButton}
              showPreviousEpisodeButton={showPreviousEpisodeButton}
              fullscreen={fullscreen}
              onSubtitleTrack={setSubtitleTrack}
              onFullScreentoggle={toggleFullScreen}
              onPiPToggle={togglePiP}
              onChangeEpisode={changeEpisode}
              onExit={handleExit}
              onClick={togglePlayingWithoutPropagation}
              onDblClick={toggleFullScreenWithoutPropagation}
              onDropdownToggle={handleDropdownToggle}
            />
            <MidControls
              videoRef={videoRef}
              playing={playing}
              playVideo={playVideo}
              pauseVideo={pauseVideo}
              loading={loading}
              onClick={togglePlayingWithoutPropagation}
              onDblClick={toggleFullScreenWithoutPropagation}
            />
            <BottomControls
              videoRef={videoRef}
              containerRef={containerRef}
              currentTime={currentTime}
              duration={duration}
              skipEvents={skipEvents}
              buffered={buffered}
              playVideo={playVideo}
              pauseVideo={pauseVideo}
              onClick={togglePlayingWithoutPropagation}
              onDblClick={toggleFullScreenWithoutPropagation}
            />
          </div>
          <video
            id="video"
            playsInline
            ref={videoRef}
            onKeyDown={handleKeydown}
            onTimeUpdate={handleTimeUpdate}
            onPause={handleVideoPause}
            onEnded={handleVideoEnd}
            crossOrigin="anonymous"
          ></video>
        </div>
        <Toaster />
      </>
    ),
    videoPlayerRoot!,
  );
};

export default VideoPlayer;
