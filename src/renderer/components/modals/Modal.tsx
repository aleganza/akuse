import './styles/Modal.css';

import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Property } from 'csstype';
import { useEffect, useState } from 'react';

export const ModalPage: React.FC<{
  show: boolean;
  modalRef?: React.RefObject<HTMLDivElement>;
  closeModal: () => void;
  children: React.ReactNode;
  zIndex?: number;
}> = ({ show, modalRef = null, closeModal, children, zIndex }) => {
  const [animation, setAnimation] = useState<boolean>(show);
  const [isVisible, setIsVisible] = useState<boolean>(show);

  const handleClickOutside = (event: any) => {
    if (modalRef && modalRef.current && event.target === modalRef.current) {
      closeModal();
    }
  };

  // close modal by pressing ESC
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  };

  useEffect(() => {
    if (show) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [show]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setAnimation(true);
    } else {
      setAnimation(false);
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 400);

      return () => clearTimeout(timeout);
    }
  }, [show]);

  return (
    <div
      className={`modal-page-wrapper fade-in ${animation ? 'show-page' : 'hide-page'}`}
      style={{ display: isVisible ? 'flex' : 'none', zIndex }}
      onClick={handleClickOutside}
      ref={modalRef}
    >
      {children}
    </div>
  );
};

export const ModalPageShadow: React.FC<{
  show: boolean;
  zIndex?: number;
}> = ({ show, zIndex }) => {
  const [animation, setAnimation] = useState<boolean>(show);
  const [isVisible, setIsVisible] = useState<boolean>(show);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setAnimation(true);
    } else {
      setAnimation(false);
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 400);

      return () => clearTimeout(timeout);
    }
  }, [show]);

  return (
    <div
      className={`modal-page-shadow-background ${animation ? 'show-page' : 'hide-page'}-shadow-background`}
      style={{ display: isVisible ? 'flex' : 'none', zIndex }}
    />
  );
};

/*
  use this when you want a small non-scrollable modal
  best practices:
    - title should be on 1 row
    - if you don't give the title, the x button will not overlap to the content
*/

export const ModalPageSizeableContent: React.FC<{
  width?: Property.Width<string | number>;
  height?: Property.Height<string | number>;
  title?: string;
  children: React.ReactNode;
  closeModal: () => void;
}> = ({ width, height, title = '', children, closeModal }) => {
  return (
    <div className="sizeable-content" style={{ width: width, height: height }}>
      {title && <h1>{title}</h1>}
      <button className="exit" onClick={closeModal}>
        <FontAwesomeIcon className="i" icon={faXmark} />
      </button>
      {children}
    </div>
  );
};
