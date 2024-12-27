import { IVideo } from '@consumet/extensions';
import AnimeSaturn from '@consumet/extensions/dist/providers/anime/animesaturn';

const consumet = new AnimeSaturn();

/**
 * 
 * @param animeTitles 
 * @param episode 
 * @param dubbed 
 * @returns 
 */
export const getEpisodeUrl = async (
  animeTitles: string[],
  episode: number,
  dubbed: boolean,
): Promise<IVideo | null> => {
  console.log(`%c Episode ${episode}, looking for ${consumet.name} source...`, `color: #6b8cff`);

  for (const animeSearch of animeTitles) {
    const result = await searchEpisodeUrl(animeSearch, episode, dubbed);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Gets the episode url and isM3U8 flag
 *
 * @param {*} animeTitles array of anime titles
 * @param {*} episode anime episode to look for
 * @param {*} dubbed dubbed version or not
 * @returns consumet IVideo if url is found, otherwise null
 */
async function searchEpisodeUrl(animeSearch: string, episode: number, dubbed: boolean): Promise<IVideo | null> {
  const animeId = await getAnimeId(dubbed ? `${animeSearch} (ITA)` : animeSearch);

  if (animeId) {
    const animeEpisodeId = await getAnimeEpisodeId(animeId, episode);
    if (animeEpisodeId) {
      const data = await consumet.fetchEpisodeSources(animeEpisodeId);
      console.log(`%c ${animeSearch}`, `color: #45AD67`);
      return data.sources[1]; // [1] is streamtape
    }
  }

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
  animeSearch: string,
): Promise<string | null> => {
  const data = await consumet.search(animeSearch);
  return data.results[0]?.id ?? null;
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
  const data = await consumet.fetchAnimeInfo(animeId);
  return data?.episodes?.[episode - 1]?.id ?? null;
};
