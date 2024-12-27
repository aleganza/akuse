import { IVideo } from '@consumet/extensions';
import AnimeUnity from '@consumet/extensions/dist/providers/anime/animeunity';
import ProviderCache from './cache';
import { getCacheId } from '../../utils';

const consumet = new AnimeUnity();
const cache = new ProviderCache();

/**
 *
 * @param animeTitles
 * @param episode
 * @param dubbed
 * @returns
 */
export const getEpisodeUrl = async (
  animeTitles: string[],
  index: number,
  episode: number,
  dubbed: boolean,
  releaseDate: number,
): Promise<IVideo[] | null> => {
  console.log(
    `%c Episode ${episode}, looking for ${consumet.name} source...`,
    `color: #0c7475`,
  );

  for (const animeSearch of animeTitles) {
    const result = await searchEpisodeUrl(
      animeSearch,
      index,
      episode,
      dubbed,
      releaseDate,
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
 * @returns consumet IVideo if url is found, otherwise null
 */
async function searchEpisodeUrl(
  animeSearch: string,
  index: number,
  episode: number,
  dubbed: boolean,
  releaseDate: number,
): Promise<IVideo[] | null> {
  const cacheId = getCacheId(animeSearch, episode, dubbed);

  if(cache.search[cacheId] !== undefined)
    return cache.search[cacheId];

  const animeId = await getAnimeId(
    index,
    dubbed ? `${animeSearch} (ITA)` : animeSearch,
    dubbed,
    releaseDate,
  );

  if (animeId) {
    const animeEpisodeId = await getAnimeEpisodeId(animeId, episode);
    if (animeEpisodeId) {
      const data = await consumet.fetchEpisodeSources(animeEpisodeId);
      console.log(`%c ${animeSearch}`, `color: #45AD67`);

      return (
        cache.search[cacheId] = data.sources
      );
    }
  }

  console.log(`%c ${animeSearch}`, `color: #E5A639`);
  return (
    cache.search[cacheId] = null
  );
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
  releaseDate: number,
): Promise<string | null> => {
  if(cache.animeIds[animeSearch] !== undefined)
    return cache.animeIds[animeSearch];

  const data = await consumet.search(animeSearch);

  const filteredResults = data.results.filter((result) =>
    dubbed
      ? (result.title as string).includes('(ITA)')
      : !(result.title as string).includes('(ITA)'),
  );

  return (
    cache.animeIds[animeSearch] = filteredResults.filter(
      (result) => result.releaseDate == releaseDate.toString(),
    )[index]?.id ?? null
  );
  // return data.results[index]?.id ?? null;
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
  const data = await consumet.fetchAnimeInfo(
    animeId,
    episode > 120 ? Math.floor(episode / 120) + 1 : 1,
  );

  return (
    cache.episodes[animeId] = data?.episodes
  )?.find((ep) => ep.number == episode)?.id ?? null;
};
