import { from, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { ofType } from 'redux-observable';
import { get } from 'lodash';

import { actionTypes, actions } from './Login.actions';
import { login } from './Login.services';

const loginEpic = action$ => action$.pipe(
  ofType(actionTypes.LOGIN.START),
  switchMap(({ username, password, isRemember }) => from(login(username, password)).pipe(
    map(data => actions.login.success({ ...data, isRemember })),
    catchError(error => of(actions.login.error(get(error, 'response.data.error_description')))),
  )),
);

export default [
  loginEpic,
];
