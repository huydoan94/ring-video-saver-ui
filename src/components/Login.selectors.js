import { createSelector } from 'reselect';

const getLoginStates = states => states.authData;

export const getLogInState = createSelector(
  getLoginStates,
  state => state.isLoggingIn,
);

export const getAccessToken = createSelector(
  getLoginStates,
  state => state.accessToken,
);

export const getRefreshToken = createSelector(
  getLoginStates,
  state => state.refreshToken,
);

export const getIsRemember = createSelector(
  getLoginStates,
  state => state.isRemember,
);

export const getError = createSelector(
  getLoginStates,
  state => state.errorCode,
);
