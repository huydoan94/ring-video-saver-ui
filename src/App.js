import React from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { isEmpty } from 'lodash';
import semver from 'semver';
import 'antd/dist/antd.css';

import createStore from './utils/createStore';
import { electron } from './utils/electron';
import styles from './App.module.scss';

import Routes from './App.routes';

function startingAppCheck() {
  const appVersion = electron.remote.app.getVersion();
  let previousVersion = localStorage.getItem('runningVersion');
  if (isEmpty(previousVersion)) previousVersion = '0.0.0';

  if (semver.gt('0.1.3', previousVersion)) {
    localStorage.clear();
  }

  if (semver.gt('0.1.4', previousVersion)) {
    localStorage.clear();
  }

  if (appVersion !== previousVersion) {
    localStorage.setItem('runningVersion', appVersion);
  }
}

function App() {
  startingAppCheck();

  return (
    <Provider store={createStore()}>
      <HashRouter>
        <div className={styles.App}>
          <Routes />
        </div>
      </HashRouter>
    </Provider>
  );
}

export default App;
