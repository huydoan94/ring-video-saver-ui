import React from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import 'antd/dist/antd.css';

import createStore from './utils/createStore';
import styles from './App.module.scss';

import Routes from './App.routes';

function App() {
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
