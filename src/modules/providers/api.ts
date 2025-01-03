import 'dotenv/config';

import { IVideo } from '@consumet/extensions';
import axios from 'axios';
import Store from 'electron-store';

import { ListAnimeData } from '../../types/anilistAPITypes';
import { animeCustomTitles } from '../animeCustomTitles';
import { getParsedAnimeTitles } from '../utils';
import AnimeUnityApi from './animeunity';
import AnixApi from './anix';
import GogoanimeApi from './gogoanime';
import HiAnimeAPI from './hianime';

const STORE = new Store();

export const searchInProvider = async (query: string) => {
  const lang = (await STORE.get('source_flag')) as string;
  const dubbed = (await STORE.get('dubbed')) as boolean;

  switch (lang) {
    case 'HIANIME': {
      const api = new HiAnimeAPI();
      return await api.searchInProvider(query, dubbed);
    }
    case 'ANIX': {
      const api = new AnixApi();
      return await api.searchInProvider(query, dubbed);
    }
    case 'GOGOANIME': {
      const api = new GogoanimeApi();
      return await api.searchInProvider(query, dubbed);
    }
    case 'ANIMEUNITY': {
      const api = new AnimeUnityApi();
      return await api.searchInProvider(query, dubbed);
    }
  }

  return null
};

export const searchAutomaticMatchInProvider = async (
  listAnimeData: ListAnimeData,
  episode: number,
) => {
  const lang = (await STORE.get('source_flag')) as string;
  const dubbed = (await STORE.get('dubbed')) as boolean;

  // build custom titles
  const customTitle =
    animeCustomTitles[lang] &&
    animeCustomTitles[lang][listAnimeData.media?.id!];
  const animeTitles = getParsedAnimeTitles(listAnimeData.media);
  if (customTitle) animeTitles.unshift(customTitle.title);

  console.log(lang + ' ' + dubbed + ' ' + customTitle?.title);

  switch (lang) {
    case 'HIANIME': {
      const api = new HiAnimeAPI();
      return await api.searchMatchInProvider(
        animeTitles,
        customTitle ? customTitle.index : 0,
        episode,
        dubbed,
        listAnimeData.media.startDate?.year ?? 0,
      );
    }
    case 'ANIX': {
      const api = new AnixApi();
      return await api.searchMatchInProvider(
        animeTitles,
        customTitle ? customTitle.index : 0,
        episode,
        dubbed,
        listAnimeData.media.startDate?.year ?? 0,
      );
    }
    case 'GOGOANIME': {
      const api = new GogoanimeApi();
      return await api.searchMatchInProvider(
        animeTitles,
        customTitle ? customTitle.index : 0,
        episode,
        dubbed,
        listAnimeData.media.startDate?.year ?? 0,
      );
    }
    case 'ANIMEUNITY': {
      const api = new AnimeUnityApi();
      return await api.searchMatchInProvider(
        animeTitles,
        customTitle ? customTitle.index : 0,
        episode,
        dubbed,
        listAnimeData.media.startDate?.year ?? 0,
      );
    }
  }

  return null;
};

export const getSourceFromProvider = async (
  providerAnimeId: string,
  episode: number,
) => {
  const lang = (await STORE.get('source_flag')) as string;
  const dubbed = (await STORE.get('dubbed')) as boolean;

  switch (lang) {
    case 'HIANIME': {
      const api = new HiAnimeAPI();
      const source = await api.getEpisodeSource(providerAnimeId, episode, dubbed);

      return source;
    }
    case 'ANIX': {
      const api = new AnixApi();
      const source = await api.getEpisodeSource(providerAnimeId, episode);

      return source;
    }
    case 'GOGOANIME': {
      const api = new GogoanimeApi();
      const source = await api.getEpisodeSource(providerAnimeId, episode);

      return source;
    }
    case 'ANIMEUNITY': {
      const api = new AnimeUnityApi();
      const source = await api.getEpisodeSource(providerAnimeId, episode);

      return source;
    }
  }

  return null;
};

export const apiRequest = async (url: string) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'x-api-key': process.env.SOFAMAXXING_API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};
