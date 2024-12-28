import Store from 'electron-store';
import * as os from 'os';
import React, { ChangeEvent, useContext, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

import { getViewerInfo } from '../../modules/anilist/anilistApi';
import { getOptions, makeRequest } from '../../modules/requests';
import { AuthContext } from '../App';
import Heading from '../components/Heading';
import Select from '../components/Select';

const STORE = new Store();

interface Option {
  value: any;
  label: string;
}

export const LANGUAGE_OPTIONS: Option[] = [
  { value: 'HIANIME', label: '🌍 HiAnime' }, // zoro from consumet
  { value: 'GOGOANIME', label: '🇺🇸 Gogoanime ' },
  { value: 'ANIMEUNITY', label: '🇮🇹 AnimeUnity' },
  // { value: 'ANIX', label: '🇺🇸 Anix' }, needs working proxy
];

const Element: React.FC<{
  label: string;
  newItem?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}> = ({ label, newItem = false, disabled = false, children, onClick }) => {
  return (
    <div
      className={`item${onClick ? ' clickable' : ''}${disabled ? ' disabled' : ''}`}
      onClick={onClick}
    >
      {newItem && <span className="new-item">New!</span>}
      <p>{label}</p>
      {children}
    </div>
  );
};

const CheckboxElement: React.FC<{
  label: string;
  checked: boolean;
  newItem?: boolean;
  onChange: () => void;
}> = ({ label, checked, newItem = false, onChange }) => {
  return (
    <Element label={label} newItem={newItem}>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="slider round"></span>
      </label>
    </Element>
  );
};

const TextInputElement: React.FC<{
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, value, onChange }) => {
  return (
    <Element label={label}>
      <label>
        <input
          type="text"
          className="text-input-field"
          value={value}
          onChange={onChange}
        />
      </label>
    </Element>
  );
};

const SelectElement: React.FC<{
  label: string;
  value: number | string;
  options: Option[];
  width?: number;
  zIndex?: number;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}> = ({ label, value, options, width = 140, zIndex = 1, onChange }) => {
  return (
    <Element label={label}>
      <label>
        <Select
          zIndex={zIndex}
          options={[...options]}
          selectedValue={value}
          onChange={onChange}
          width={width}
        />
      </label>
    </Element>
  );
};

const Tab4: React.FC<{ viewerId: number | null }> = ({ viewerId }) => {
  const logged = useContext(AuthContext);

  useEffect(() => {
    if (viewerId && !userFetched)
      (async () => {
        const viewerInfo = await getViewerInfo(viewerId);
        const displayAdultContent = viewerInfo.options
          .displayAdultContent as boolean;
        STORE.set('adult_content', displayAdultContent);
        setUserFetched(true);
        setAdultContent(displayAdultContent);
      })();
  });

  const [activeSection, setActiveSection] = useState<string>('General');

  const [updateProgress, setUpdateProgress] = useState<boolean>(
    STORE.get('update_progress') as boolean,
  );
  const [autoplayNext, setAutoplayNext] = useState<boolean>(
    STORE.get('autoplay_next') as boolean,
  );
  const [watchDubbed, setWatchDubbed] = useState<boolean>(
    STORE.get('dubbed') as boolean,
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    STORE.get('source_flag') as string,
  );
  const [introSkipTime, setIntroSkipTime] = useState<number>(
    STORE.get('intro_skip_time') as number,
  );
  const [showDuration, setShowDuration] = useState<boolean>(
    STORE.get('show_duration') as boolean,
  );
  const [episodesPerPage, setEpisodesPerPage] = useState<number>(
    STORE.get('episodes_per_page') as number,
  );
  const [skipTime, setSkipTime] = useState<number>(
    STORE.get('key_press_skip') as number,
  );
  const [adultContent, setAdultContent] = useState<boolean>(
    STORE.get('adult_content') as boolean,
  );
  const [lightMode, setLightMode] = useState<boolean>(
    STORE.get('light_mode') as boolean,
  );

  const [clearHistory, setClearHistory] = useState<boolean>(false);
  const [userFetched, setUserFetched] = useState<boolean>(false);

  const handleEpisodesPerPage = (value: any) => {
    STORE.set('episodes_per_page', parseInt(value));
    setEpisodesPerPage(parseInt(value));
  };

  const handleClearHistory = () => {
    STORE.set('history', { entries: {} });
    setClearHistory(!clearHistory);
  };

  const handleLightMode = () => {
    const val = !lightMode;

    STORE.set('light_mode', val);
    setLightMode(val);
  };

  const handleAdultContent = async () => {
    STORE.set('adult_content', !adultContent);
    if (STORE.get('access_token')) {
      const mutation = `mutation($adultContent:Boolean){
        UpdateUser(displayAdultContent:$adultContent) {
          id
          name
        }
      }`;

      var headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + STORE.get('access_token'),
      };

      var variables = {
        adultContent: !adultContent,
      };

      const options = getOptions(mutation, variables);
      await makeRequest('POST', 'https://graphql.anilist.co', headers, options);
    }

    setAdultContent(!adultContent);
  };

  const handleUpdateProgressChange = () => {
    STORE.set('update_progress', !updateProgress);
    setUpdateProgress(!updateProgress);
  };

  const handleWatchDubbedChange = () => {
    STORE.set('dubbed', !watchDubbed);
    setWatchDubbed(!watchDubbed);
  };

  const handleLanguageChange = (value: any) => {
    STORE.set('source_flag', value);
    setSelectedLanguage(value);
  };

  const handleIntroSkipTimeChange = (value: any) => {
    STORE.set('intro_skip_time', parseInt(value));
    setIntroSkipTime(parseInt(value));
  };

  const handleSkipTimeChange = (value: any) => {
    STORE.set('key_press_skip', parseInt(value));
    setSkipTime(parseInt(value));
  };

  const handleShowDurationChange = () => {
    STORE.set('dubbed', !showDuration);
    setShowDuration(!showDuration);
  };

  const handleAutoplayNextChange = () => {
    STORE.set('autoplay_next', !autoplayNext);
    setAutoplayNext(!autoplayNext);
  };

  const getDetailedOSInfo = () => {
    const platform = os.platform();
    const arch = os.arch();
    const release = os.release();
    const osType = os.type();

    return `${osType} ${arch} (${release})`;
  };

  const renderSectionsSwitch = () => {
    switch (activeSection) {
      case 'General':
        return (
          <div className="show">
            {/* <CheckboxElement
              label="Light mode (disables some data fetching, which can help avoid issues for slow connections)."
              checked={lightMode}
              newItem
              onChange={handleLightMode}
            /> */}

            <CheckboxElement
              label="Show 18+ content"
              checked={adultContent}
              onChange={handleAdultContent}
            />
          </div>
        );
      case 'Player':
        return (
          <div className="show">
            <SelectElement
              label="Select the language in which you want to watch the episodes"
              value={selectedLanguage}
              options={LANGUAGE_OPTIONS}
              zIndex={5}
              onChange={handleLanguageChange}
              width={160}
            />

            <CheckboxElement
              label="Watch dubbed"
              checked={watchDubbed}
              onChange={handleWatchDubbedChange}
            />

            <CheckboxElement
              label="Autoplay next episode"
              checked={autoplayNext}
              onChange={handleAutoplayNextChange}
            />

            <SelectElement
              label="Select the duration of the default intro skip (in seconds)"
              value={introSkipTime}
              options={[
                { value: 60, label: '60' },
                { value: 65, label: '65' },
                { value: 70, label: '70' },
                { value: 75, label: '75' },
                { value: 80, label: '80' },
                { value: 85, label: '85' },
                { value: 90, label: '90' },
                { value: 95, label: '95' },
              ]}
              zIndex={4}
              onChange={handleIntroSkipTimeChange}
            />

            <SelectElement
              label="Select the amount you want to skip using the arrows (in seconds)"
              value={skipTime}
              options={[
                { label: '1', value: 1 },
                { label: '2', value: 2 },
                { label: '3', value: 3 },
                { label: '4', value: 4 },
                { label: '5', value: 5 },
              ]}
              zIndex={3}
              onChange={handleSkipTimeChange}
            />
          </div>
        );

      case 'Appearance':
        return (
          <div className="show">
            <CheckboxElement
              label="Display the video duration instead of the remaining time."
              checked={showDuration}
              onChange={handleShowDurationChange}
            />

            <SelectElement
              label="Episodes Per Page"
              value={episodesPerPage}
              options={[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 20, label: '20' },
                { value: 30, label: '30' },
                { value: 40, label: '40' },
                { value: 50, label: '50' },
              ]}
              zIndex={1}
              onChange={handleEpisodesPerPage}
            />
          </div>
        );

      case 'Sync & Storage':
        return (
          <div className="show">
            {logged && (
              <CheckboxElement
                label="Update AniList progress and lists automatically"
                checked={updateProgress}
                onChange={handleUpdateProgressChange}
              />
            )}

            <CheckboxElement
              label="Clear local history"
              checked={clearHistory}
              onChange={handleClearHistory}
            />
          </div>
        );
    }
  };

  return (
    <div className="body-container show-tab">
      <div className="main-container">
        <Heading text="Settings" />

        <div className="settings-page">
          <div className="left">
            <Element
              label="General"
              disabled={activeSection !== 'General'}
              onClick={() => {
                setActiveSection('General');
              }}
            />
            <Element
              label="Player"
              disabled={activeSection !== 'Player'}
              onClick={() => {
                setActiveSection('Player');
              }}
            />
            <Element
              label="Appearance"
              disabled={activeSection !== 'Appearance'}
              onClick={() => {
                setActiveSection('Appearance');
              }}
            />
            <Element
              label="Sync & Storage"
              disabled={activeSection !== 'Sync & Storage'}
              onClick={() => {
                setActiveSection('Sync & Storage');
              }}
            />

            <div className="version">
              <p>{`akuse v${require('../../../package.json').version}`}</p>
              <p>{getDetailedOSInfo()}</p>
            </div>
          </div>

          <div className="right">{renderSectionsSwitch()}</div>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default Tab4;
