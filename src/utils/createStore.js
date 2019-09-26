import { createStore as createReduxStore, applyMiddleware, compose } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import rootEpic from '../rootEpic';
import rootReducer from '../rootReducer';

function createStore() {
  const initialState = { };
  const epicMiddleware = createEpicMiddleware();

  /* eslint-disable no-underscore-dangle */
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  /* eslint-enable */

  const store = createReduxStore(
    rootReducer,
    initialState,
    composeEnhancers(applyMiddleware(epicMiddleware)),
  );

  epicMiddleware.run(rootEpic);

  return store;
}

export default createStore;
