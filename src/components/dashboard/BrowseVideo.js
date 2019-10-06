import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { func } from 'prop-types';

import { actions } from './BrowseVideo.actions';
import { getfilePathsState } from './BrowseVideo.selectors';
import { DEFAULT_HOME_DIR } from '../../constants';

function BrowseVideo({ getFilePaths }) {
  const filePaths = useSelector(getfilePathsState);

  useEffect(() => {
    getFilePaths(DEFAULT_HOME_DIR);
  }, []);

  return (
    <div />
  );
}

BrowseVideo.propTypes = {
  getFilePaths: func.isRequired,
};

const mapDispatchToProps = dispatch => ({
  getFilePaths: dirPath => dispatch(actions.getFiles.start(dirPath)),
});

export default connect(null, mapDispatchToProps)(BrowseVideo);
