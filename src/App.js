import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import 'antd/dist/antd.css';

import createStore from './utils/createStore';
import styles from './App.module.scss';

import Routes from './App.routes';

function App() {
  return (
    <Provider store={createStore()}>
      <BrowserRouter>
        <div className={styles.App}>
          <Routes />
        </div>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
