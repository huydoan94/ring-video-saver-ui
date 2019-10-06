import { combineEpics } from 'redux-observable';

import loginEpics from './components/Login.epics';
import browseVideoEpics from './components/dashboard/BrowseVideo.epics';

const rootEpics = combineEpics(
  ...loginEpics,
  ...browseVideoEpics,
);

export default rootEpics;
