const GET_FILES = {
  START: 'GET_FILES_START',
  SUCCESS: 'GET_FILES_SUCCESS',
  ERROR: 'GET_FILES_ERROR',
};

const getFiles = {
  start: fromDir => ({ type: GET_FILES.START, fromDir }),
  success: files => ({ type: GET_FILES.SUCCESS, files }),
  error: error => ({ type: GET_FILES.ERROR, error }),
};

const actions = { getFiles };
const actionTypes = { GET_FILES };

export {
  actions,
  actionTypes,
};
