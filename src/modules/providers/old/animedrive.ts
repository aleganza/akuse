import { IVideo } from '@consumet/extensions';
import AnimeDrive from '@consumet/extensions/dist/providers/anime/animedrive';
import ProviderCache from './cache';

const cache = new ProviderCache();
const consumet = new AnimeDrive();

export const getEpisodeUrl = async (
  animeTitles: string[],
  index: number,
  episode: number,
  dubbed: boolean,
): Promise<IVideo[] | null> => {
  console.log(
    `%c Episode ${episode}, looking for ${consumet.name} source...`,
    `color: #6b8cff`,
  );

  for (const animeSearch of animeTitles) {
    const result = await searchEpisodeUrl(animeSearch, index, episode, dubbed);
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
  dubbed: boolean
): Promise<IVideo[] | null> {
  const cacheId = `${animeSearch}-${episode}`;
  if(cache.search[cacheId] !== undefined)
    return cache.search[cacheId];

  const animeId = await getAnimeId(
    dubbed ? 0 : index,
    dubbed ? `${animeSearch} (Dub)` : animeSearch,
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
): Promise<string | null> => {
  if(cache.animeIds[animeSearch] !== undefined)
    return cache.animeIds[animeSearch];

  const data = await consumet.search(animeSearch);
  return (
    cache.animeIds[animeSearch] = data.results[index]?.id ?? null
  );
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
  )?.[episode - 1]?.id ?? null;
};
