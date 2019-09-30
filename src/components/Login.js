import React, { useEffect, useState } from 'react';
import {
  shape, func, string,
} from 'prop-types';
import { compose } from 'redux';
import { connect, useSelector } from 'react-redux';
import { isEmpty, get } from 'lodash';
import cx from 'classnames';
import {
  Form, Icon, Input,
  Button, Checkbox,
  Typography, Row, Col,
} from 'antd';

import { actions } from './Login.actions';
import {
  getLogInState, getAccessToken,
  getIsRemember, getError,
} from './Login.selectors';
import { logout } from './Login.services';
import isAuthenticated from '../utils/isAuthenticated';

import styles from './Login.module.scss';

let resendCountInterval;
function LoginForm({
  form, login, history,
  paths, reset,
}) {
  const { getFieldDecorator, validateFields, setFieldsValue } = form;
  const [is2faRequired, setIs2faRequired] = useState(false);
  const [userAndPass, setUserAndPass] = useState({});
  const [resendRemain, setResendRemain] = useState(30);
  const isLoggingIn = useSelector(getLogInState);
  const accessToken = useSelector(getAccessToken);
  const isRemembered = useSelector(getIsRemember);
  const error = useSelector(getError);

  const clearResendCountdown = () => {
    if (!isEmpty(resendCountInterval)) {
      clearInterval(resendCountInterval);
      resendCountInterval = undefined;
    }
  };

  const triggerResendCountdown = () => {
    clearResendCountdown();
    setResendRemain(30);
    resendCountInterval = setInterval(() => {
      setResendRemain((oldC => oldC - 1));
    }, 1000);
  };

  useEffect(() => {
    const isRemember = localStorage.getItem('isRemember');
    if (!isRemember) {
      logout();
    }
    if (isAuthenticated() && isRemember) {
      history.push(paths.dashboard);
    }
    return () => {
      reset();
    };
  }, []);

  useEffect(() => {
    if (isEmpty(error) && !isEmpty(accessToken)) {
      if (isRemembered) localStorage.setItem('isRemember', true);
      else localStorage.setItem('isRemember', false);
      history.push(paths.dashboard);
    }

    let message = get(error, 'response.data.error');
    message = typeof message === 'string' ? message : '';
    const errorStatus = get(error, 'response.status', 400);
    if (errorStatus === 412 || (errorStatus === 400 && message.startsWith('Verification Code'))) {
      setIs2faRequired(true);
      triggerResendCountdown();
    }
  }, [accessToken, error]);

  useEffect(() => {
    if (resendRemain < 1) {
      clearResendCountdown();
    }
    return () => {
      clearResendCountdown();
    };
  }, [resendRemain]);

  const onClickResend = () => {
    login(userAndPass.username, userAndPass.password, undefined, userAndPass.isRemember);
  };

  const onClickBack = () => {
    setFieldsValue({ username: userAndPass.username });
    setUserAndPass({});
    setIs2faRequired(false);
    clearResendCountdown();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    validateFields(
      (err, {
        username, password,
        verificationCode, isRemember,
      }) => {
        if (isEmpty(err)) {
          if (is2faRequired) {
            login(userAndPass.username, userAndPass.password, verificationCode, userAndPass.isRemember);
          } else {
            login(username, password, undefined, isRemember);
            setUserAndPass({ username, password, isRemember });
          }
          clearResendCountdown();
        }
      },
    );
  };

  const content2fa = (
    <Form.Item>
      <Typography.Paragraph className={styles.inputTitle}>Verification Code</Typography.Paragraph>
      <Row>
        <Col xs={14}>
          {getFieldDecorator('verificationCode', {
            rules: [{ required: is2faRequired, message: 'Please input 6 digits sent to your phone' }],
          })(
            <Input
              placeholder="Verification Code"
              className={styles.verificationInput}
            />,
          )}
        </Col>
        <Col xs={10}>
          <Button
            onClick={onClickResend}
            className={styles.verificationButton}
            disabled={resendRemain > 0 || isLoggingIn}
          >
            {`Resend ${resendRemain > 0 ? resendRemain : ''}`}
          </Button>
        </Col>
      </Row>
    </Form.Item>
  );

  return (
    <div className={styles.container}>
      <Form onSubmit={handleSubmit} className={cx(styles.form, 'login-form')}>
        <Form.Item>
          <Typography.Title className={styles.inputTitle} level={2}>Login</Typography.Title>
        </Form.Item>
        {is2faRequired ? content2fa : (
          <React.Fragment>
            <Form.Item>
              <Typography.Paragraph className={styles.inputTitle}>Email</Typography.Paragraph>
              {getFieldDecorator('username', {
                rules: [{ required: true, message: 'Please input your username!' }],
              })(
                <Input
                  prefix={<Icon type="user" className={styles.inputIcon} />}
                  placeholder="Username"
                />,
              )}
            </Form.Item>
            <Form.Item>
              <Typography.Paragraph className={styles.inputTitle}>Password</Typography.Paragraph>
              {getFieldDecorator('password', {
                rules: [{ required: true, message: 'Please input your password!' }],
              })(
                <Input
                  prefix={<Icon type="lock" className={styles.inputIcon} />}
                  type="password"
                  placeholder="Password"
                />,
              )}
            </Form.Item>
            <Form.Item className={styles.inputNoMargin}>
              {getFieldDecorator('isRemember', {
                valuePropName: 'checked',
                initialValue: true,
              })(<Checkbox>Remember me</Checkbox>)}
            </Form.Item>
          </React.Fragment>
        )}
        <Row>
          {is2faRequired && (
            <Col xs={12}>
              <Button
                className={cx(styles.inputButton, 'login-form-button', { [styles.backButton]: is2faRequired })}
                disabled={isLoggingIn}
                onClick={onClickBack}
              >
                Back
              </Button>
            </Col>
          )}
          <Col xs={is2faRequired ? 12 : 24}>
            <Button
              type="primary"
              htmlType="submit"
              className={cx(styles.inputButton, 'login-form-button', { [styles.loginButton]: is2faRequired })}
              disabled={isLoggingIn}
              loading={isLoggingIn}
            >
              Log in
            </Button>
          </Col>
        </Row>
        {!isEmpty(error)
          && (
            <Typography.Paragraph type="danger" className={styles.formError}>
              {get(error, 'response.data.error_description', get(error, 'response.data.error'))}
            </Typography.Paragraph>
          )
        }
      </Form>
    </div>
  );
}

LoginForm.propTypes = {
  form: shape({
    getFieldDecorator: func.isRequired,
    validateFields: func.isRequired,
    setFieldsValue: func.isRequired,
  }).isRequired,
  history: shape({
    push: func.isRequired,
  }).isRequired,
  paths: shape({
    dashboard: string.isRequired,
  }).isRequired,
  login: func.isRequired,
  reset: func.isRequired,
};

const mapDispatchToProps = dispatch => ({
  login: (...params) => dispatch(actions.login.start(...params)),
  reset: () => dispatch(actions.resetLoginState()),
});

export default compose(
  Form.create({ name: 'login_form' }),
  connect(null, mapDispatchToProps),
)(LoginForm);
