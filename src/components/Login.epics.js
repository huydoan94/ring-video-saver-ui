import { from, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { ofType } from 'redux-observable';

import { actionTypes, actions } from './Login.actions';
import { login } from './Login.services';

const loginEpic = action$ => action$.pipe(
  ofType(actionTypes.LOGIN.START),
  switchMap(({
    username, password, verificationCode, isRemember,
  }) => from(login(username, password, verificationCode)).pipe(
    map(data => actions.login.success({ ...data, isRemember })),
    catchError(error => of(actions.login.error(error))),
  )),
);

export default [
  loginEpic,
];
