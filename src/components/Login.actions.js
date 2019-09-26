const LOGIN = {
  START: 'LOGIN_START',
  SUCCESS: 'LOGIN_SUCCESS',
  ERROR: 'LOGIN_ERROR',
};

const CLEAR_ERROR_CODE = 'CLEAR_ERROR_CODE';

const login = {
  start: (username, password, isRemember) => ({
    type: LOGIN.START, username, password, isRemember,
  }),
  success: data => ({ type: LOGIN.SUCCESS, data }),
  error: error => ({ type: LOGIN.ERROR, error }),
};

const clearErrorCode = () => ({ type: CLEAR_ERROR_CODE });

const actions = { login, clearErrorCode };
const actionTypes = { LOGIN, CLEAR_ERROR_CODE };

export {
  actions,
  actionTypes,
};
