import { AnimeData, ListAnimeData } from '../types/anilistAPITypes';
import {
  AiringSchedule,
  Media,
  MediaFormat,
  MediaStatus,
  MediaTypes,
  Relation,
  RelationType,
  RelationTypes,
} from '../types/anilistGraphQLTypes';

const MONTHS = {
  '1': 'January',
  '2': 'February',
  '3': 'March',
  '4': 'April',
  '5': 'May',
  '6': 'June',
  '7': 'July',
  '8': 'August',
  '9': 'Septempber',
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'Septempber',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};

const DISCORD_PHRASES: string[] = [
  'On a trip with the Survey Corps.',
  'Honing Nen abilities.',
  'Getting the Hunter License.',
  'Looking for the One Piece.',
  'Training to become the Hokage.',
  'On a mission with the Hashiras.',
  'Eating apples with Ryuk.',
  'Exploring The Abyss.',
  'Training with Saitama.',
  'Rebuilding civilization.',
  'Playing poker with in Egypt.',
  'Watching a movie with Makima.',
  'Attempting to summon Mahoraga.',
];

export const getRandomDiscordPhrase = (): string =>
  DISCORD_PHRASES[Math.floor(Math.random() * DISCORD_PHRASES.length)];

export const getCacheId = (
  animeSearch: string,
  episode: number,
  dubbed: boolean,
): string => `${animeSearch}-${episode}-${dubbed ? 'dub' : 'sub'}`;

export const airingDataToListAnimeData = (
  airingScheduleData: AiringSchedule[],
): ListAnimeData[] => {
  return airingScheduleData.map((value) => {
    return {
      id: null,
      mediaId: null,
      progress: null,
      media: value.media as Media,
    };
  });
};

export const relationsToListAnimeData = (
  relations: Relation[],
): ListAnimeData[] => {
  return relations.map((value) => {
    return {
      id: null,
      mediaId: null,
      progress: null,
      media: value.node,
    };
  });
};

export const animeDataToListAnimeData = (
  animeData: AnimeData,
): ListAnimeData[] => {
  if (animeData?.media) {
    let data: ListAnimeData[] = [];

    animeData.media.forEach((media) => {
      data.push({
        id: null,
        mediaId: null,
        progress: null,
        media: media,
      });
    });

    return data;
  }

  return [];
};

/**
 * Gets the anime title (english or romaji)
 *
 * @param {*} animeEntry
 * @returns title
 */
export const getTitle = (animeEntry: Media): string => {
  if (!animeEntry.title) return '';

  if (animeEntry.title.english) {
    return animeEntry.title.english;
  } else if (animeEntry.title.romaji) {
    return animeEntry.title.romaji;
  } else {
    return '';
  }
};

/**
 * Gets english, romaji and synonyms and combines them into an array
 *
 * @param {*} animeEntry
 * @returns anime titles
 */
export const getTitlesAndSynonyms = (animeEntry: Media): string[] => {
  var animeTitles: string[] = [];

  if (!animeEntry.title) return animeTitles;

  if (animeEntry.title.romaji) animeTitles.push(animeEntry.title.romaji);
  if (animeEntry.title.english) animeTitles.push(animeEntry.title.english);

  return !animeEntry.synonyms
    ? animeTitles
    : animeTitles.concat(Object.values(animeEntry.synonyms));
};

/**
 * Gets the anime episodes number from 'episodes' or 'nextAiringEpisode'
 *
 * @param {*} animeEntry
 * @returns episodes number
 */
export const getEpisodes = (animeEntry: Media): number | null | undefined =>
  animeEntry.episodes == null
    ? animeEntry.nextAiringEpisode == null
      ? null
      : animeEntry.nextAiringEpisode.episode - 1
    : animeEntry.episodes;

/**
 * Get the sequel from the media.
 *
 * @param {*} animeEntry
 * @returns sequel
 */
export const getSequel = (animeEntry: Media): Media | null => {
  const relations = animeEntry.relations;
  if (!relations) return null;

  for (const relation of relations.edges) {
    const sequel =
      relation.relationType === RelationTypes.Sequel &&
      relation.node.type === MediaTypes.Anime &&
      relation.node;
    if (!sequel) continue;

    return sequel;
  }

  return null;
  // const sequel: Relation = relations.edges.reduce((previous, value) => {
  //   const media = value.node;

  //   console.log(value.relationType === RelationTypes.Sequel, media.type)

  //   return value.relationType === RelationTypes.Sequel &&
  //          media.type === MediaTypes.Anime &&
  //          value || previous;
  // });

  // if (sequel.relationType !== "SEQUEL" && sequel.node.type !== MediaTypes.Anime)
  //   return null

  // return sequel.node;
};

/**
 * Gets the anime available episodes number from 'episodes' or 'nextAiringEpisode'
 *
 * @param {*} animeEntry
 * @returns available episodes number
 */
export const getAvailableEpisodes = (animeEntry: Media) =>
  animeEntry.nextAiringEpisode == null
    ? animeEntry.episodes == null
      ? animeEntry.airingSchedule?.edges &&
        animeEntry.airingSchedule?.edges[
          animeEntry.airingSchedule.edges.length - 1
        ]?.node?.episode
      : animeEntry.episodes
    : animeEntry.nextAiringEpisode.episode - 1;

/**
 * Gets an anime mean score
 *
 * @param {*} animeEntry
 * @returns anime mean score
 */
export const getParsedMeanScore = (animeEntry: Media) =>
  animeEntry.meanScore == null ? '?' : animeEntry.meanScore;

/**
 * Gets the anime user status
 *
 * @param {*} animeEntry
 * @returns user status
 */
export const getUserStatus = (animeEntry: Media) =>
  animeEntry.mediaListEntry == null ? '' : animeEntry.mediaListEntry.status;

/**
 * Gets the user anime score
 *
 * @param {*} animeEntry
 * @returns anime score
 */
export const getScore = (animeEntry: Media) =>
  animeEntry.mediaListEntry == null ? -1 : animeEntry.mediaListEntry.score;

/**
 * Gets the user anime progress
 *
 * @param {*} animeEntry
 * @returns anime progress
 */
export const getProgress = (animeEntry: Media): number | undefined =>
  animeEntry.mediaListEntry == null ? 0 : animeEntry.mediaListEntry.progress;

/**
 * Returns whether an anime is available or not
 *
 * @param {*} animeEntry
 * @returns
 */
export const isAnimeAvailable = (animeEntry: Media) => {
  if (!animeEntry.status) return false;

  return (
    getParsedStatus(animeEntry.status) == 'Unreleased' ||
    getParsedStatus(animeEntry.status) == 'Cancelled'
  );
};

/**
 * Returns an object containing how much time remains before the next episode airs
 *
 * @param {*} animeEntry
 * @returns
 */
export const getTimeUntilAiring = (
  animeEntry: Media,
): { days: number; hours: number; minutes: number; seconds: number } | null => {
  if (animeEntry.nextAiringEpisode == null) return null;

  let seconds = animeEntry.nextAiringEpisode.timeUntilAiring;
  let days = Math.floor(seconds / (3600 * 24));

  seconds -= days * 3600 * 24;
  let hours = Math.floor(seconds / 3600);

  seconds -= hours * 3600;
  let minutes = Math.floor(seconds / 60);

  seconds -= minutes * 60;

  return {
    days: days,
    hours: hours,
    minutes: minutes,
    seconds: seconds,
  };
};

export const getMediaListId = (animeEntry: Media) =>
  animeEntry.mediaListEntry == null ? -1 : animeEntry.mediaListEntry.id;

/**
 * Gets the trailer url
 *
 * @param {*} animeEntry
 * @returns
 */
export const getTrailerUrl = (animeEntry: Media) =>
  animeEntry.trailer == null
    ? ''
    : animeEntry.trailer.site == 'youtube'
      ? `https://www.youtube.com/embed/${animeEntry.trailer.id}`
      : '';

/**
 * Removes unwanted spaces/new lines from anime description
 *
 * @param {*} description
 * @returns parsed description
 */
export const parseDescription = (description: string) =>
  description == null ? '' : description.replace('<br>', '');

/**
 * Parses anime status into a better human-readable name
 *
 * @param {*} status
 * @returns
 */
export const getParsedStatus = (status: MediaStatus | undefined) => {
  switch (status) {
    case 'FINISHED':
      return 'Finished';
    case 'RELEASING':
      return 'Releasing';
    case 'NOT_YET_RELEASED':
      return 'Unreleased';
    case 'CANCELLED':
      return 'Cancelled';
    case 'HIATUS':
      return 'Discontinued';
    default:
      return '?';
  }
};

/**
 * Parses anime format into a better human-readable name
 *
 * @param {*} status
 * @returns
 */
export const getParsedFormat = (
  format: MediaFormat | RelationType | undefined,
) => {
  switch (format) {
    case 'TV':
      return 'TV Show';
    case 'TV_SHORT':
      return 'TV Short';
    case 'MOVIE':
      return 'Movie';
    case 'SPECIAL':
      return 'Special';
    case 'OVA':
      return 'OVA';
    case 'ONA':
      return 'ONA';
    case 'MUSIC':
      return 'Music';
    /* Lazy related */
    case 'SEQUEL':
      return 'Sequel';
    case 'PREQUEL':
      return 'Prequel';
    case 'CHARACTER':
      return 'Character';
    case 'ALTERNATIVE':
      return 'Alternative';
    case 'SIDE_STORY':
      return 'Side Story';
    case 'PARENT':
      return 'Parent';
    case 'SPIN_OFF':
      return 'Spin Off';
    case 'ADAPTATION':
      return 'Adaptation';
    default:
      return '?';
  }
};

/**
 * Return '?' if there is no season year
 *
 * @param {*} animeEntry
 * @returns
 */
export const getParsedSeasonYear = (animeEntry: Media | undefined): string => {
  if (animeEntry?.seasonYear) {
    return animeEntry.seasonYear?.toString();
  } else {
    return '?';
  }
};

/**
 * Capitalizes the first letter of a string
 *
 * @param {*} string
 * @returns parsed string
 */
export const capitalizeFirstLetter = (string: string) =>
  string.toLowerCase().charAt(0).toUpperCase() + string.toLowerCase().slice(1);

/**
 * Returns whether a div is cropped (with -webkit-line-clamp) or not
 *
 * @param {*} div
 * @returns
 */
export const isEllipsisActive = (div: HTMLElement) =>
  div.scrollHeight > div.clientHeight;

/**
 * parses airdate in a better human readable format
 *
 * @param airdate
 * @returns parsed airdate
 */
export const parseAirdate = (airdate: string) =>
  `${airdate.split('-')[2]} ${
    MONTHS[airdate.split('-')[1] as keyof typeof MONTHS]
  } ${airdate.split('-')[0]}`;

/**
 * parses anime titles for episode url searching
 *
 * @param animeEntry
 * @returns parsed anime titles
 */
export const getParsedAnimeTitles = (animeEntry: Media): string[] => {
  let animeTitles = getTitlesAndSynonyms(animeEntry);

  animeTitles.forEach((title) => {
    if (title.includes('Season '))
      animeTitles.push(title.replace('Season ', ''));
    if (title.includes('Season ') && title.includes('Part '))
      animeTitles.push(title.replace('Season ', '').replace('Part ', ''));
    if (title.includes('Part ')) animeTitles.push(title.replace('Part ', ''));
    if (title.includes(':')) animeTitles.push(title.replace(':', ''));
    if (title.includes('(') && title.includes(')'))
      // hunter x hunter
      animeTitles.push(title.replace('(', '').replace(')', ''));
  });

  return animeTitles;
};

export const formatTime = (time: number) => {
  let seconds: any = Math.floor(time % 60),
    minutes: any = Math.floor(time / 60) % 60,
    hours: any = Math.floor(time / 3600);
  seconds = seconds < 10 ? `0${seconds}` : seconds;
  minutes = minutes < 10 ? `0${minutes}` : minutes;
  hours = hours < 10 ? `0${hours}` : hours;
  if (hours == 0) {
    return `${minutes}:${seconds}`;
  }
  return `${hours}:${minutes}:${seconds}`;
};

export const getUrlByCoverType = (
  images: { coverType: string; url: string }[],
  coverType: string,
): string | undefined => {
  const image = images.find(
    (img) => img.coverType.toLowerCase() === coverType.toLowerCase(),
  );
  return image ? image.url : undefined;
};

export const doSomethingToIFrame = (
  iFrame: HTMLIFrameElement,
  func: 'stopVideo' | 'playVideo' | 'pauseVideo',
) => {
  if (!iFrame || !iFrame.contentWindow) return;

  iFrame.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func: func }),
    '*',
  );
};

export const toggleIFrameMute = (iFrame: HTMLIFrameElement, mute: boolean) => {
  if (!iFrame || !iFrame.contentWindow) return;

  iFrame.contentWindow.postMessage(
    JSON.stringify({
      event: 'command',
      func: 'setVolume',
      args: [mute ? 0 : 1],
    }),
    '*',
  );
};
