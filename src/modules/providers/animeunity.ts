import { ISource, IVideo } from '@consumet/extensions';
import { SOFAMAXXING_URL } from '../../constants/utils';
import { getCacheId } from '../utils';
import { apiRequest } from './api';
import ProviderCache from './cache';

const api = `${SOFAMAXXING_URL}/animeunity`;
const cache = new ProviderCache();

class AnimeUnityApi {
  searchInProvider = async (query: string, dubbed: boolean) => {
    const searchResults = await apiRequest(
      `${api}/${dubbed ? `${query} (ITA)` : query}`,
    );

    return searchResults.results.filter((result: any) =>
      dubbed
        ? (result.title as string).includes('(ITA)')
        : !(result.title as string).includes('(ITA)'),
    );
  };

  /**
   *
   * @returns animeId from provider
   */
  searchMatchInProvider = async (
    animeTitles: string[],
    index: number,
    episode: number,
    dubbed: boolean,
    releaseDate: number,
  ) => {
    console.log(
      `%c Episode ${episode}, looking for AnimeUnity match...`,
      `color: #0c7475`,
    );

    // start searching
    for (const animeSearch of animeTitles) {
      // first, check cache
      const cacheId = getCacheId(animeSearch, episode, dubbed);
      if (cache.search[cacheId] !== undefined) return cache.search[cacheId];
      if (cache.animeIds[animeSearch] !== undefined)
        return cache.animeIds[animeSearch];

      // search anime (per dub too)
      const searchResults = await apiRequest(
        `${api}/${dubbed ? `${animeSearch} (ITA)` : animeSearch}`,
      );
      const filteredResults = searchResults.results.filter((result: any) =>
        dubbed
          ? (result.title as string).includes('(ITA)')
          : !(result.title as string).includes('(ITA)'),
      );

      // find the best result: first check for same name,
      // then check for same release date.
      // finally, update cache
      const animeResult = (cache.animeIds[animeSearch] =
        filteredResults.filter(
          (result: any) =>
            result.title.toLowerCase().trim() ==
              animeSearch.toLowerCase().trim() ||
            result.releaseDate == releaseDate.toString(),
        )[index] ?? null);

      if (animeResult) return animeResult;
    }

    return null;
  };

  getEpisodeSource = async (animeId: string, episode: number) => {
    // first, check cache
    // if(cache.episodes[animeId] !== undefined) {
    //   const found = cache.episodes[animeId]?.find((ep) => ep.number == episode)
    //   if(found)
    //     return found.id;
    // }

    const animeInfo = await apiRequest(
      `${api}/info/${animeId}?page=${episode > 120 ? Math.floor(episode / 120) + 1 : 1}`,
    );

    const episodeId =
      (cache.episodes[animeId] = animeInfo?.episodes)?.find(
        (ep: any) => ep.number == episode,
      )?.id ?? null;

    if (episodeId) {
      const video = await apiRequest(`${api}/episode/${episodeId}`);
      return video as ISource;
    }

    // episode not found
    return null;
  };
}

export default AnimeUnityApi;
