/*
    Some anime are difficult to pull automatically, so the
    correct titles for those (I hope rare) exceptions are written here.

    "AnimeId": { title: '`AnimeCustomTitle`', index: 0 } // problem faced

    where title is the anime title and index the element to take
*/

type AnimeCustomTitles = {
  [languageCode: string]: {
    [animeId: string]: {
      title: string;
      index: number;
    };
  };
};

export const animeCustomTitles: AnimeCustomTitles = {
  GOGOANIME: {
    // '235': { title: `Detective Conan Remastered`, index: 0 },
    '132052': { title: 'Kakkou no Iinazuke', index: 1 }, // same releaseDate with another one
    '168623': { title: 'Dahlia in Bloom', index: 0 }, // anilist has wrong name (Madougushi Dahlia wa Utsumukanai -> Madougushi Dahliya wa Utsumukanai)
  },
  ANIX: {},
  HIANIME: {},
  ANIMEUNITY: {},
};
