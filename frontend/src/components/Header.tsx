import React from 'react';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { truncate } from '@initia/utils';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuClick: () => void;
}

function Header({ onMenuClick }: HeaderProps) {
  const { address, username, openWallet, openConnect } = useInterwovenKit();

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.headerInfo}>
          <div className={styles.headerLabel}>round 1</div>
          <div className={styles.headerValue}>time left: 3d 4h 23s</div>
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.headerLabel}>bounty</div>
          <div className={styles.headerValue}>1,234,567 INIT</div>
        </div>
      </div>

      <div className={styles.headerRight}>
        {address ? (
          <>
            <button className={styles.connectButton} onClick={openWallet}>
              {truncate(username ?? address)}
            </button>
            <button className={styles.menuButton} onClick={onMenuClick}>
              <div className={styles.hamburger}>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </button>
          </>
        ) : (
          <button className={styles.connectButton} onClick={openConnect}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

export default Header;
