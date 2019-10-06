import { combineReducers } from 'redux';

import getHardwareId from './utils/getHardwareId';
import authReducer from './components/Login.reducers';
import browseVideoReducer from './components/dashboard/BrowseVideo.reducers';

const rootReducer = combineReducers({
  hardwareId: () => getHardwareId(),
  ...authReducer,
  ...browseVideoReducer,
});

export default rootReducer;
