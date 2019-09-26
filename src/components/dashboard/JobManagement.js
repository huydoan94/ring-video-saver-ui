import React, { useState, useEffect } from 'react';
import {
  Typography, Icon, Row, Col,
  DatePicker, Button, Empty,
} from 'antd';
import moment from 'moment';
import { isEmpty, map } from 'lodash';
import cx from 'classnames';

import VideoSaveRunner from '../../VideoSaveRunner';
import styles from './JobManagement.module.scss';

const dateFormat = 'MMM DD, YYYY';
const jobTypeMap = {
  auto: 'auto',
  manual: 'manual',
};
const statusMap = {
  notRunning: 'NOT RUNNING',
  running: 'RUNNING',
  cancelled: 'CANCELLED',
  failed: 'FAILED',
  success: 'SUCCESS',
};

let runTimeInterval;
export default function JobManagement() {
  const [selectedRange, setSelectedRange] = useState([moment().subtract(30, 'days'), moment()]);
  const [isRunning, setIsRunning] = useState(false);
  const [runner, setRunner] = useState(null);
  const [log, updateLog] = useState([]);
  const [jobType, setJobType] = useState(null);
  const [status, setStatus] = useState({
    manualLastStatus: localStorage.getItem('manualLastStatus'),
    manualLastRunTime: localStorage.getItem('manualLastRunTime'),
    autoStatus: statusMap.notRunning,
    autoRunTime: 0,
  });

  useEffect(() => () => {
    clearInterval(runTimeInterval);
  }, []);

  const startCountRunTime = () => {
    runTimeInterval = setInterval(() => {
      setStatus(oldStatus => ({ ...oldStatus, autoRunTime: oldStatus.autoRunTime + 1 }));
    }, 1000);
  };

  const writeLog = (message) => {
    updateLog(oldLog => [message, ...oldLog]);
  };

  const finishAutoJob = () => {
    setRunner(null);
    setIsRunning(false);
    setStatus(oldStatus => ({ ...oldStatus, autoStatus: statusMap.notRunning }));
    clearInterval(runTimeInterval);
  };

  const startAutoJob = () => {
    updateLog([]);
    const instance = new VideoSaveRunner(writeLog);
    instance.runCron().then(() => {
      finishAutoJob();
    });
    setRunner(instance);
    setIsRunning(true);
    setJobType(jobTypeMap.auto);
    setStatus(oldStatus => ({ ...oldStatus, autoStatus: statusMap.running, autoRunTime: 0 }));
    startCountRunTime();
  };

  const triggerAutoJob = () => {
    if (!isRunning) {
      startAutoJob();
    } else {
      runner.cancel();
      finishAutoJob(statusMap.cancelled);
    }
  };

  const finishManualJob = (statusRes) => {
    setRunner(null);
    setIsRunning(false);
    let result = statusMap.success;
    if (statusRes === statusMap.failed) {
      result = statusMap.failed;
    }
    if (statusRes === statusMap.cancelled) {
      result = statusMap.cancelled;
    }
    const lastRunTime = moment();
    setStatus(oldStatus => ({ ...oldStatus, manualLastStatus: result, manualLastRunTime: lastRunTime }));
    localStorage.setItem('manualLastStatus', result);
    localStorage.setItem('manualLastRunTime', lastRunTime.format());
  };

  const startManualJob = () => {
    updateLog([]);
    const instance = new VideoSaveRunner(writeLog);
    instance.run(selectedRange[0], selectedRange[1]).then((res) => {
      finishManualJob(res.status);
    });
    setRunner(instance);
    setIsRunning(true);
    setJobType(jobTypeMap.manual);
    setStatus(oldStatus => ({ ...oldStatus, manualLastStatus: statusMap.running }));
    localStorage.setItem('manualLastStatus', statusMap.running);
  };

  const triggerManualJob = () => {
    if (!isRunning) {
      startManualJob();
    } else {
      runner.cancel();
      finishManualJob(statusMap.cancelled);
    }
  };

  const onSelectRange = (range) => {
    setSelectedRange(range);
  };


  return (
    <React.Fragment>
      <div className={styles.title}>
        <Typography.Title>
          <Icon type="pie-chart" />
          Job Management
        </Typography.Title>
      </div>
      <Row className={styles.content}>
        <Col md={12} className={styles.manualContainer}>
          <Row>
            <Typography.Title level={3}>Manual</Typography.Title>
          </Row>
          <Row>
            <Typography.Text>
              Last run status:
              {' '}
              {status.manualLastStatus}
            </Typography.Text>
            <Typography.Paragraph>
              Last run:
              {' '}
              {status.manualLastRunTime === null
                ? null
                : moment(status.manualLastRunTime).format('MMM dd, YYYY HH:mm:ss')
              }
            </Typography.Paragraph>
          </Row>
          <Row>
            <Col md={16}>
              <DatePicker.RangePicker
                value={selectedRange}
                format={dateFormat}
                allowClear={false}
                disabledDate={current => moment(current).isAfter(moment())}
                onChange={onSelectRange}
              />
            </Col>
            <Col md={8}>
              <Button
                type="primary"
                className={styles.manualContainerButton}
                onClick={triggerManualJob}
                disabled={isRunning && jobType !== jobTypeMap.manual}
              >
                {isRunning && jobType === jobTypeMap.manual ? 'Stop' : 'Start'}
              </Button>
            </Col>
          </Row>
        </Col>
        <Col md={12} className={styles.jobContainer}>
          <Row>
            <Typography.Title level={3}>Job</Typography.Title>
          </Row>
          <Row>
            <Typography.Text>
              Status:
              {' '}
              {status.autoStatus}
            </Typography.Text>
            <Typography.Paragraph>
              Run time:
              {' '}
              {(() => {
                const secs = status.autoRunTime;
                const duration = moment.duration(secs, 'seconds');
                return `${secs > 3600 ? `${duration.hours()}:` : ''}`
                  + `${secs > 60 ? `${duration.minutes()}:` : ''}`
                  + `${duration.seconds()}`;
              })()}
            </Typography.Paragraph>
          </Row>
          <Row>
            <Button
              type="primary"
              className={styles.jobContainerButton}
              disabled={isRunning && jobType !== jobTypeMap.auto}
              onClick={triggerAutoJob}
            >
              {isRunning && jobType === jobTypeMap.auto ? 'Stop' : 'Start'}
            </Button>
          </Row>
        </Col>
      </Row>
      <Row className={cx(styles.log, { [styles.logAlignCenter]: isEmpty(log) })}>
        {isEmpty(log) ? <Empty description={false} /> : map(log, mess => (
          <div key={mess}>
            <Typography.Text>{mess}</Typography.Text>
          </div>
        ))}
      </Row>
    </React.Fragment>
  );
}
