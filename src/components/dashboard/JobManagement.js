import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Icon, Row, Col, Input,
  DatePicker, Button, Empty,
} from 'antd';
import moment from 'moment';
import {
  isEmpty, map, debounce, get,
} from 'lodash';
import cx from 'classnames';

import { electron, electronImport } from '../../utils/electron';
import VideoSaveRunner from '../../VideoSaveRunner';
import styles from './JobManagement.module.scss';

const platformFolders = electronImport('platform-folders');
const path = electronImport('path');

const defaultHomeDir = path.join(platformFolders.getDocumentsFolder(), 'Ring Video Saver');
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
let runner;
export default function JobManagement() {
  const [selectedRange, setSelectedRange] = useState([moment().subtract(30, 'days'), moment()]);
  const [isRunning, setIsRunning] = useState(false);
  const [log, updateLog] = useState([]);
  const [jobType, setJobType] = useState(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [downloadLocation, changeDownloadLocation] = useState(localStorage.getItem('downloadLocation'));
  const [status, setStatus] = useState({
    manualLastStatus: localStorage.getItem('manualLastStatus'),
    manualLastRunTime: localStorage.getItem('manualLastRunTime'),
    autoStatus: statusMap.notRunning,
    autoRunTime: 0,
  });
  const logPanel = useRef(null);

  useEffect(() => {
    if (isEmpty(downloadLocation)) {
      const homedir = defaultHomeDir;
      changeDownloadLocation(homedir);
    }

    return () => {
      clearInterval(runTimeInterval);
      if (runner !== null) runner.cancel();
      runner = null;
    };
  }, []);

  useEffect(() => {
    if (logPanel.current && isAutoScroll) {
      logPanel.current.scrollTo({
        top: logPanel.current.scrollHeight,
      });
    }
  }, [log, isAutoScroll]);

  const updateLogWithBuffer = (() => {
    let buffer = [];
    const freeBuffer = debounce((targetBuffer) => {
      updateLog(oldLog => oldLog.concat(targetBuffer));
      buffer = [];
    }, 150, { maxWait: 500 });

    return (mess) => {
      buffer = buffer.concat(mess);
      freeBuffer(buffer);
    };
  })();

  const startCountRunTime = () => {
    runTimeInterval = setInterval(() => {
      setStatus(oldStatus => ({ ...oldStatus, autoRunTime: oldStatus.autoRunTime + 1 }));
    }, 1000);
  };

  const writeLog = (message) => {
    updateLogWithBuffer(message);
  };

  const finishAutoJob = () => {
    runner = null;
    setIsRunning(false);
    setStatus(oldStatus => ({ ...oldStatus, autoStatus: statusMap.notRunning }));
    clearInterval(runTimeInterval);
  };

  const startAutoJob = () => {
    updateLog([]);
    const instance = new VideoSaveRunner(writeLog, downloadLocation);
    instance.runCron();
    runner = instance;
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
    runner = null;
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
    const instance = new VideoSaveRunner(writeLog, downloadLocation);
    instance.run(selectedRange[0], selectedRange[1]).then((res) => {
      finishManualJob(res.status);
    });
    runner = instance;
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

  const onChangeDownloadLocation = () => {
    electron.remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
    }).then((res) => {
      const folder = get(res, 'filePaths.0');
      if (isEmpty(folder)) return;
      localStorage.setItem('downloadLocation', folder);
      changeDownloadLocation(folder);
    });
  };

  const onSelectRange = (range) => {
    setSelectedRange(range);
  };

  const onScrollLog = (() => {
    const debouceScroll = debounce((scrollHeight, clientHeight, scrollTop) => {
      const shouldAutoScroll = scrollTop + clientHeight + 50 >= scrollHeight;
      if (shouldAutoScroll && !isAutoScroll) setIsAutoScroll(true);
      if (!shouldAutoScroll && isAutoScroll) setIsAutoScroll(false);
    }, 500);
    return (event) => {
      debouceScroll(event.target.scrollHeight, event.target.clientHeight, event.target.scrollTop);
    };
  })();

  return (
    <React.Fragment>
      <div className={styles.title}>
        <Typography.Title>
          <Icon type="pie-chart" />
          Job Management
        </Typography.Title>
      </div>
      <Row className={styles.folderSelectContainer}>
        <div>
          <Typography.Text className={styles.folderSelectTitle}>
            Download to
          </Typography.Text>
        </div>
        <Col xs={20}>
          <Input
            value={downloadLocation}
            size="large"
            className={styles.folderSelectInput}
            disabled
          />
        </Col>
        <Col xs={4}>
          <Button
            type="primary"
            size="large"
            className={styles.folderSelectButton}
            onClick={onChangeDownloadLocation}
            disabled={isRunning}
          >
            Change
          </Button>
        </Col>
      </Row>
      <Row className={styles.content}>
        <Col lg={12} className={styles.manualContainer}>
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
                : moment(status.manualLastRunTime).format('MMM DD, YYYY HH:mm:ss')
              }
            </Typography.Paragraph>
          </Row>
          <Row className={styles.manualContainerActions}>
            <Col md={16}>
              <DatePicker.RangePicker
                value={selectedRange}
                format={dateFormat}
                allowClear={false}
                disabledDate={current => moment(current).isAfter(moment())}
                onChange={onSelectRange}
                className={styles.manualContainerDateSelect}
              />
            </Col>
            <Col md={7}>
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
        <Col lg={12} className={styles.jobContainer}>
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
                const hours = duration.hours();
                const minutes = duration.minutes();
                const seconds = duration.seconds();
                return `${`${hours > 9 ? '' : '0'}${hours}`}:`
                  + `${`${minutes > 9 ? '' : '0'}${minutes}`}:`
                  + `${seconds > 9 ? '' : '0'}${seconds}`;
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
      <div className={cx(styles.log, { [styles.logAlignCenter]: isEmpty(log) })} onScroll={onScrollLog} ref={logPanel}>
        {isEmpty(log) ? <Empty description={false} /> : map(log, mess => (
          <div key={mess}>
            <Typography.Text>{mess}</Typography.Text>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}
