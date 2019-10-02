import React from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { isEmpty } from 'lodash';
import 'antd/dist/antd.css';

import createStore from './utils/createStore';
import { electron } from './utils/electron';
import migration from './utils/migration';
import styles from './App.module.scss';

import Routes from './App.routes';

function startingAppCheck() {
  const currentVersion = electron.remote.app.getVersion();
  let previousVersion = localStorage.getItem('runningVersion');
  if (isEmpty(previousVersion)) previousVersion = '0.0.0';

  migration(currentVersion, previousVersion);
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
