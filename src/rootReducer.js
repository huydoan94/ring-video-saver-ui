import { combineReducers } from 'redux';

import getHardwareId from './utils/getHardwareId';
import authReducer from './components/Login.reducers';

const rootReducer = combineReducers({
  hardwareId: () => getHardwareId(),
  ...authReducer,
});

export default rootReducer;
