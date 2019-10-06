import { createSelector } from 'reselect';

const getBrowseVideoStates = states => states.browseVideo;

export const getfilePathsState = createSelector(
  getBrowseVideoStates,
  state => state.files,
);
