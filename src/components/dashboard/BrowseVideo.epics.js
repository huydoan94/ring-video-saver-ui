import { of, from } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { ofType } from 'redux-observable';

import { actionTypes, actions } from './BrowseVideo.actions';
import readFilesInDir from '../../utils/readFilesInDir';

const browseVideoEpic = action$ => action$.pipe(
  ofType(actionTypes.GET_FILES.START),
  switchMap(({ fromDir }) => from(readFilesInDir(fromDir, true)).pipe(
    map(data => actions.getFiles.success(data)),
    catchError(error => of(actions.getFiles.error(error))),
  )),
);

export default [
  browseVideoEpic,
];
