import { combineEpics } from 'redux-observable';

import loginEpics from './components/Login.epics';

const rootEpics = combineEpics(
  ...loginEpics,
);

export default rootEpics;
