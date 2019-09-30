import { mapKeys, camelCase } from 'lodash';
import moment from 'moment';

import { actionTypes } from './Login.actions';

const initialState = {
  accessToken: null,
  expiresIn: null,
  refreshToken: null,
  scope: null,
  tokenType: null,
  isLoggingIn: false,
  errorCode: null,
  isRemember: false,
  lastLoggedIn: null,
};

const login = (state = initialState, {
  type, data, error,
}) => {
  switch (type) {
    case actionTypes.LOGIN.START:
      return {
        ...state,
        isLoggingIn: true,
        errorCode: null,
      };
    case actionTypes.LOGIN.SUCCESS: {
      const toCamelCaseKey = mapKeys(data, (v, k) => camelCase(k));
      return {
        ...state,
        ...toCamelCaseKey,
        isLoggingIn: false,
        lastLoggedIn: moment().format(),
        errorCode: null,
      };
    }
    case actionTypes.LOGIN.ERROR:
      return {
        ...state,
        isLoggingIn: false,
        errorCode: error,
      };
    case actionTypes.CLEAR_ERROR_CODE:
      return {
        ...state,
        errorCode: null,
      };
    case actionTypes.RESET_LOGIN_STATE:
      return initialState;
    default:
      return state;
  }
};

export default {
  authData: login,
};
