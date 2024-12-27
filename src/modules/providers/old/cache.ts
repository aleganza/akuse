import { IVideo, IAnimeEpisode } from "@consumet/extensions"

export default class ProviderCache {
  search: { [key: string]:  IVideo[] | null};
  animeIds: { [key: string]: string | null};
  episodes: { [key: string]: IAnimeEpisode[] | undefined };

  constructor() {
    this.search = {};
    this.animeIds = {};
    this.episodes = {};
  }
}
