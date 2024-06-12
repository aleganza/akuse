import { IconDefinition } from '@fortawesome/free-regular-svg-icons';
import './styles/UserNavbar.css';
import {
  faBug,
  faHeart,
  faRightToBracket,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ipcRenderer } from 'electron';
import { useStorageContext } from '../contexts/storage';

interface LiProps {
  text: string;
  icon: IconDefinition;
  onClick: () => void;
  link?: boolean;
}

const Li: React.FC<LiProps> = ({ text, icon, onClick, link = false }) => {
  return (
    <li onClick={onClick} style={{ cursor: link ? 'default' : 'pointer' }}>
      <div className="i-wrapper">
        <FontAwesomeIcon className="i" icon={icon} />
      </div>
    </li>
  );
};

interface UserNavbarProps {
  avatar?: string;
}

const UserNavbar: React.FC<UserNavbarProps> = ({ avatar }) => {
  const { logged } = useStorageContext();
  return (
    <nav className="user">
      <ul>
        <Li
          text="Sponsor"
          icon={faHeart}
          onClick={() => {
            ipcRenderer.send('open-sponsor-url');
          }}
          link
        />
        <Li
          text="Report a bug"
          icon={faBug}
          onClick={() => {
            ipcRenderer.send('open-issues-url');
          }}
          link
        />
        {logged ? (
          <img src={avatar}></img>
        ) : (
          <Li
            text="Login"
            icon={faRightToBracket}
            onClick={() => {
              ipcRenderer.send('open-login-url');
            }}
            link
          />
        )}
      </ul>
    </nav>
  );
};

export default UserNavbar;
