const LOGIN = {
  START: 'LOGIN_START',
  SUCCESS: 'LOGIN_SUCCESS',
  ERROR: 'LOGIN_ERROR',
};

const CLEAR_ERROR_CODE = 'CLEAR_ERROR_CODE';
const RESET_LOGIN_STATE = 'RESET_LOGIN_STATE';

const login = {
  start: (username, password, verificationCode, isRemember) => ({
    type: LOGIN.START, username, password, isRemember, verificationCode,
  }),
  success: data => ({ type: LOGIN.SUCCESS, data }),
  error: error => ({ type: LOGIN.ERROR, error }),
};

const clearErrorCode = () => ({ type: CLEAR_ERROR_CODE });
const resetLoginState = () => ({ type: RESET_LOGIN_STATE });

const actions = { login, clearErrorCode, resetLoginState };
const actionTypes = { LOGIN, CLEAR_ERROR_CODE, RESET_LOGIN_STATE };

export {
  actions,
  actionTypes,
};
