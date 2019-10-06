import { actionTypes } from './BrowseVideo.actions';

const initialState = {
  files: [],
  error: null,
};

const browseVideo = (state = initialState, { type, files, error }) => {
  switch (type) {
    case actionTypes.GET_FILES.START:
      return {
        ...state,
        error: null,
      };
    case actionTypes.GET_FILES.SUCCESS: {
      return {
        ...state,
        files,
        error: null,
      };
    }
    case actionTypes.GET_FILES.ERROR:
      return {
        ...state,
        error,
      };
    default:
      return state;
  }
};

export default {
  browseVideo,
};
