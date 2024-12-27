import { IVideo } from '@consumet/extensions';
import Store from 'electron-store';

import { ListAnimeData } from '../../types/anilistAPITypes';
import { animeCustomTitles } from '../animeCustomTitles';
import { getParsedAnimeTitles } from '../utils';
import { getEpisodeUrl as animeunity } from './animeunity';
import { getEpisodeUrl as gogoanime } from './gogoanime';

const STORE = new Store();

/**
 * Gets the episode url and isM3U8 flag, with stored language and dubbed
 *
 * @param listAnimeData
 * @param episode
 * @returns
 */
export const getUniversalEpisodeUrl = async (
  listAnimeData: ListAnimeData,
  episode: number,
): Promise<IVideo | null> => {
  const lang = (await STORE.get('source_flag')) as string;
  const dubbed = (await STORE.get('dubbed')) as boolean;

  const customTitle = animeCustomTitles[lang] && animeCustomTitles[lang][listAnimeData.media?.id!];

  const animeTitles = getParsedAnimeTitles(listAnimeData.media);
  if (customTitle) animeTitles.unshift(customTitle.title);

  console.log(lang + ' ' + dubbed + ' ' + customTitle?.title);

  switch (lang) {
    case 'GOGOANIME': {
      const data = await gogoanime(
        animeTitles,
        customTitle ? customTitle.index : 0,
        episode,
        dubbed,
        listAnimeData.media.startDate?.year ?? 0,
      );
      return data ? getDefaultQualityVideo(data) : null;
    }
    case 'ANIMEUNITY': {
      const data = await animeunity(
        animeTitles,
        customTitle ? customTitle.index : 0,
        episode,
        dubbed,
        listAnimeData.media.startDate?.year ?? 0,
      );
      return data ? getDefaultQualityVideo(data) : null;
    }
  }

  return null;
};

export const getDefaultQualityVideo = (videos: IVideo[]): IVideo =>
  videos.find((video) => video.quality === 'default') ??
  getBestQualityVideo(videos);

export const getBestQualityVideo = (videos: IVideo[]): IVideo => {
  const qualityOrder = ['1080p', '720p', '480p', '360p', 'default', 'backup'];

  videos.sort((a, b) => {
    const indexA = qualityOrder.indexOf(a.quality || 'default');
    const indexB = qualityOrder.indexOf(b.quality || 'default');

    if (indexA < indexB) return -1;
    if (indexA > indexB) return 1;
    return 0;
  });

  return videos[0];
};
