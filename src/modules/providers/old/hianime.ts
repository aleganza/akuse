import { IVideo } from '@consumet/extensions';
import ProviderCache from './cache';
import Zoro from '@consumet/extensions/dist/providers/anime/zoro';
import axios from 'axios';
import { getCacheId } from '../../utils';

const cache = new ProviderCache();
const consumet = new Zoro();
const apiUrl = 'https://aniwatch-api-ch0nker.vercel.app'

export const getEpisodeUrl = async (
  animeTitles: string[],
  index: number,
  episode: number,
  dubbed: boolean,
): Promise<IVideo[] | null> => {
  console.log(
    `%c Episode ${episode}, looking for ${consumet.name} source...`,
    `color: #ffc119`,
  );

  for (const animeSearch of animeTitles) {
    const result = await searchEpisodeUrl(
      animeSearch,
      index,
      episode,
      dubbed
    );
    if (result) {
      return result;
    }
  }

  return null;
};

/**
 * Gets the episode url and isM3U8 flag
 *
 * @param {*} animeSearch
 * @param {*} episode anime episode to look for
 * @param {*} dubbed dubbed version or not
 * @returns IVideo sources if found, null otherwise
 */
async function searchEpisodeUrl(
  animeSearch: string,
  index: number,
  episode: number,
  dubbed: boolean,
): Promise<IVideo[] | null> {
  const cacheId = getCacheId(animeSearch, episode, dubbed);

  if(cache.search[cacheId] !== undefined)
    return cache.search[cacheId];

  const animeId = await getAnimeId(
    index,
    dubbed ? `${animeSearch} (Dub)` : animeSearch,
    dubbed,
  );

  if (animeId) {
    const animeEpisodeId = await getAnimeEpisodeId(animeId, episode);
    console.log('episodeId',animeEpisodeId)
    if (animeEpisodeId) {
      try {
        const data = await consumet.fetchEpisodeSources(animeEpisodeId);
        console.log(`%c ${animeSearch}`, `color: #45AD67`);
        return (
          cache.search[cacheId] = data.sources.map((value) => {
              value.tracks = data.subtitles;
              value.skipEvents = {
                intro: data.intro,
                outro: data.outro
              };

              return value;
          }) ?? null
        );
      } catch {
        /* consumet fails to get raw servers so this needed. damn */
        const episodeId = animeEpisodeId.replace('$episode$', '?ep=').split('$')[0];

        const servers = (await axios.get(
          `${apiUrl}/anime/servers?episodeId=${episodeId}`
        )).data;
        const episodeInfo = await axios.get(
          `${apiUrl}/anime/episode-srcs?id=${episodeId}&server=hd-1&category=${dubbed ?
            'dub' :
            servers.sub.length > 0 ? 'sub' : 'raw'
          }`
        );

        return (
          cache.search[cacheId] = (episodeInfo.data.sources as IVideo[]).map((value) => {
              value.tracks = (episodeInfo.data.tracks as any[]).map(value => ({
                url: value.file,
                lang: value.label
              }));

              value.skipEvents = {
                intro: episodeInfo.data.intro,
                outro: episodeInfo.data.outro
              };

              console.log(value.tracks)

              return value;
          }) ?? null
        )
      }
    }
  }

  cache.search[cacheId] = null;
  console.log(`%c ${animeSearch}`, `color: #E5A639`);
  return null;
}

/**
 * Gets the anime id
 *
 * @param {*} animeSearch
 * @returns anime id if found, otherwise null
 */
export const getAnimeId = async (
  index: number,
  animeSearch: string,
  dubbed: boolean,
): Promise<string | null> => {
  if(cache.animeIds[animeSearch] !== undefined)
    return cache.animeIds[animeSearch];

  const data = await consumet.search(animeSearch);

  const filteredResults = data.results.filter((result) =>
    dubbed
      ? (result.title as string).includes('(Dub)')
      : !(result.title as string).includes('(Dub)'),
  );

  const normalizedSearch = animeSearch.toLowerCase();

  const result = (
    cache.animeIds[animeSearch] = filteredResults.filter(
      result =>
        (result.title.toString()).toLowerCase() === normalizedSearch ||
        (result.japaneseTitle.toString()).toLowerCase() === normalizedSearch
    )[index]?.id ?? null
  );

  return result;
};

/**
 * Gets the anime episode id
 *
 * @param {*} animeId
 * @param {*} episode
 * @returns anime episode id if found, otherwise null
 */
export const getAnimeEpisodeId = async (
  animeId: string,
  episode: number,
): Promise<string | null> => {
  if(cache.episodes[animeId] !== undefined) {
    const found = cache.episodes[animeId]?.find((ep) => ep.number == episode)

    if(found)
      return found.id;
  }

  const data = await consumet.fetchAnimeInfo(animeId);
  return (
    cache.episodes[animeId] = data?.episodes
  )?.find((ep) => ep.number == episode)?.id ?? null;
};
