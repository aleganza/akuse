import '..//styles/components.css';
import '../styles/style.css';
import '../styles/animations.css';

import Store from 'electron-store';
import { createContext, useEffect, useState } from 'react';
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';

import { getViewerId } from '../modules/anilist/anilistApi';
import Navbar from './Navbar';
import Tab1 from './tabs/Tab1';

const store = new Store();

export const AuthContext = createContext<boolean>(false);
export const ViewerIdContext = createContext<any | null>(null);

function TabScreen1() {
  return <Tab1 />;
}

function TabScreen2() {
  return <Tab1 />;
}

function TabScreen3() {
  return <Tab1 />;
}

export default function App() {
  const [logged, setLogged] = useState<boolean>(false);
  const [viewerId, setViewerId] = useState<number | null>(null);

  const loadContext = async () => {
    const isLogged = store.get('logged') as boolean
    setLogged(isLogged)

    if(isLogged) {
      const id = await getViewerId()
      setViewerId(id)
    }
  };

  useEffect(() => {
    loadContext();
  }, []);

  return (
    <AuthContext.Provider value={logged}>
      <ViewerIdContext.Provider value={viewerId}>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<TabScreen1 />} />
            <Route path="/tab2" element={<TabScreen2 />} />
            <Route path="/tab3" element={<TabScreen3 />} />
          </Routes>
        </Router>
      </ViewerIdContext.Provider>
    </AuthContext.Provider>
  );
}