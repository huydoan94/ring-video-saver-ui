/* eslint-disable prefer-destructuring */
/* eslint-disable one-var-declaration-per-line */
/* eslint-disable one-var */
/* eslint-disable no-await-in-loop */
import moment from 'moment';
import {
  get, filter, map, reduce, every,
  some, forEach, isNil, isEmpty, last,
} from 'lodash';
import JSONBigInt from 'json-bigint';
import autoBind from 'auto-bind';

import { API_VERSION } from './constants';
import getHardwareId from './utils/getHardwareId';
import sleep from './utils/sleep';
import promiseFetchWithRetry from './utils/promiseFetchWithRetry';
import promiseAllWithLimit from './utils/promiseAllWithLimit';
import promiseMap from './utils/promiseMap';
import { electron, electronImport } from './utils/electron';
import { login, loginUseToken, createSession } from './components/Login.services';

const fs = electronImport('fs');
const path = electronImport('path');
const libaxios = electronImport('axios');

async function axios(...params) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout !!!'));
    }, 60000);
    libaxios(...params).then((res) => {
      clearTimeout(timeout);
      resolve(res);
    }).catch((err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

class CancellablePromise {
  constructor() {
    this.rejectChain = [];
    this.errorMessage = new Error('Promise cancelled');
    this.isCancelled = false;
  }

  wrap = promiseFunc => new Promise((resolve, reject) => {
    promiseFunc.then((res) => {
      resolve(res);
    }).catch((err) => {
      reject(err);
    });
    if (this.isCancelled) {
      reject(this.errorMessage);
      return;
    }
    this.rejectChain.push(reject);
  })

  run = callback => new Promise((resolve, reject) => {
    if (this.isCancelled) {
      reject(this.errorMessage);
      return;
    }
    this.rejectChain.push(reject);
    callback(resolve, reject);
  })

  cancel = () => {
    this.isCancelled = true;
    forEach(this.rejectChain, (rejectFunc) => {
      rejectFunc(new Error('Promise Cancelled'));
    });
  }
}

let cancellablePromise;
const statusMap = {
  success: 'SUCCESS',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
};
export default class SaveHistoryJob {
  constructor(outsideLogger) {
    this.outsideLogger = outsideLogger;
    this.isCancelled = false;

    const logFilePath = path.join(electron.remote.app.getAppPath(), 'log.txt');
    this.logFile = fs.createWriteStream(logFilePath, { flags: 'a' });

    cancellablePromise = new CancellablePromise();

    autoBind(this);
  }

  // --------- HELPERS PART ---------- //

  logger(message) {
    const formatted = `${moment().format('YYYY-MM-DD HH:mm:ss')}: ${message}`;
    this.outsideLogger(formatted);
    this.logFile.write(`${formatted}\n`);
  }

  async fetcher(...params) {
    const [firstParam, ...others] = params;
    let url = get(firstParam, 'url', '');
    const attachVersionAndToken = get(firstParam, 'attachVersionAndToken', true);
    if (attachVersionAndToken && url.indexOf('api_version') === -1) {
      url = `${url}${url.indexOf('?') === -1 ? `?api_version=${API_VERSION}` : `&api_version=${API_VERSION}`}`;
    }
    if (attachVersionAndToken && url.indexOf('auth_token') === -1) {
      const sessionToken = await this.getSession();
      url = `${url}${url.indexOf('?') === -1 ? `?auth_token=${sessionToken}` : `&auth_token=${sessionToken}`}`;
    }
    let headers = get(firstParam, 'headers', {});
    if (attachVersionAndToken) {
      headers = { ...headers, hardware_id: getHardwareId() };
    }
    const modParams = [{
      ...firstParam, url, headers, attachVersionAndToken: undefined,
    }, ...others];
    return cancellablePromise.wrap(promiseFetchWithRetry(axios, ...modParams)).catch((err) => {
      if (get(err, 'response.status') === 401 && attachVersionAndToken) {
        return this.getSession(true).then(() => this.fetcher(...params));
      }
      throw err;
    });
  }

  async createDirs(dirs) {
    return reduce(dirs, (acc, d) => acc.then(() => cancellablePromise.run((resolve, reject) => {
      fs.mkdir(d, '0777', (err) => {
        if (err) {
          if (err.code === 'EEXIST') resolve();
          else reject(err);
        } else resolve();
      });
    })), Promise.resolve());
  }

  // ---- SESSION AND TOKEN PART ----- //

  async login(skipCurrentToken = false) {
    const authData = JSON.parse(localStorage.getItem('authData'));
    if (!skipCurrentToken && !isEmpty(authData)) {
      return get(authData, 'accessToken');
    }

    const refreshToken = get(authData, 'refreshToken');
    this.logger('Logging in');
    return cancellablePromise.wrap(promiseFetchWithRetry(loginUseToken, refreshToken))
      .then(res => get(res, 'access_token'))
      .catch(() => {
        const { username, password } = JSON.parse(localStorage.getItem('authRequest'));
        return cancellablePromise.wrap(promiseFetchWithRetry(login, username, password));
      })
      .then((res) => {
        this.logger('Log in sucessful');
        return get(res, 'access_token');
      })
      .catch((err) => {
        this.logger('Log in FAIL');
        throw err;
      });
  }

  async getSession(skipCurrentSession = false) {
    const sessionToken = localStorage.getItem('sessionToken');
    if (!skipCurrentSession && !isEmpty(sessionToken)) {
      return sessionToken;
    }

    const authData = JSON.parse(localStorage.getItem('authData'));
    this.logger('Getting session token');
    return cancellablePromise.wrap(promiseFetchWithRetry(createSession, authData.accessToken)).then((res) => {
      this.logger('Get session token sucessful');
      return res;
    }).catch((err) => {
      if (get(err, 'response.status') === 401) {
        return this.login(true).then(() => this.getSession(true));
      }
      this.logger('Get session token FAIL');
      throw err;
    });
  }

  // --- VIDEO STREAM PROCESS PART ---- //

  async saveByteStreamVideo({
    id, createdAt, type,
    videoStreamByteUrl,
    dir, dirPath,
  }) {
    const extension = videoStreamByteUrl.match(/\.[0-9a-z]+?(?=\?)/i)[0];
    const fileName = `${moment(createdAt).format('YYYY-MM-DD_HH-mm-ss')}_${type}${extension}`;
    const dest = path.join(dir, fileName);
    return cancellablePromise.run((resolve, reject) => {
      if (fs.existsSync(dest)) {
        this.logger(`${fileName} in ${dirPath} exist. Skipping ...`);
        resolve(2);
        return;
      }

      this.logger(`Saving event ${id} to file ${fileName} in ${dirPath}`);
      this.fetcher({
        url: videoStreamByteUrl,
        method: 'GET',
        responseType: 'stream',
        attachVersionAndToken: false,
      }).then((response) => {
        const file = fs.createWriteStream(dest, { flag: 'w' });
        const deleteFile = () => {
          fs.unlink(dest, () => { });
        };

        const rejectFileSaving = (err) => {
          file.end();
          deleteFile();
          reject(err);
        };

        let timeout;
        const refreshTimeout = () => {
          if (timeout !== undefined) clearTimeout(timeout);
          timeout = setTimeout(() => {
            rejectFileSaving(new Error(`Timeout on ${videoStreamByteUrl}`));
          }, 10000);
        };

        refreshTimeout();
        response.data.pipe(file);
        response.data.on('data', () => {
          refreshTimeout();
          if (this.isCancelled) {
            clearTimeout(timeout);
            rejectFileSaving(new Error('Cancelled'));
          }
        });
        response.data.on('end', () => {
          clearTimeout(timeout);
          this.logger(`Save file ${fileName} to ${dirPath} SUCCESSFUL`);
          file.close(() => resolve(1));
        });
        response.data.on('error', (err) => {
          clearTimeout(timeout);
          rejectFileSaving(err);
        });
      }).catch(err => reject(err));
    }).catch((err) => {
      this.logger(`Save file ${fileName} to ${dirPath} FAIL`);
      throw err;
    });
  }


  async getVideoStreamByteUrl(downloadUrl) {
    return this.fetcher({
      url: downloadUrl,
      method: 'GET',
    }).then(res => get(res, 'data.url')).catch((err) => {
      throw err;
    });
  }

  async updateDownloadPool(downloadPools, remain = 10) {
    return cancellablePromise.wrap(promiseMap(downloadPools, async (p) => {
      if (p.isFailed || p.isReady) return p;

      let isFailed = false;
      const videoStreamByteUrl = await this.getVideoStreamByteUrl(p.downloadUrl).catch(() => {
        isFailed = true;
      });
      return {
        ...p,
        videoStreamByteUrl,
        isReady: !isEmpty(videoStreamByteUrl) && !isFailed,
        isFailed,
      };
    })).then((res) => {
      if (every(res, r => r.isReady || r.isFailed)) {
        return res;
      }
      if (remain === 0) {
        return res.map((r) => {
          if (r.isReady || r.isFailed) return r;
          return { ...r, isFailed: true };
        });
      }
      return sleep(3000).then(() => this.updateDownloadPool(downloadPools, remain - 1));
    });
  }

  async triggerServerRender(id) {
    this.logger(`Triggering server render for ${id}`);
    return this.fetcher({
      url: `https://api.ring.com/clients_api/dings/${id}/share/download`,
      method: 'GET',
    }).then((res) => {
      this.logger(`Trigger server render for ${id} successful`);
      return get(res, 'data');
    }).catch((err) => {
      this.logger(`Trigger server render for ${id} FAIL`);
      throw err;
    });
  }

  async downloadHistoryVideos(history) {
    this.logger('Start downloading history videos');
    const rootDir = electron.remote.app.getAppPath();
    let downloadPool = await promiseMap(history, async (h) => {
      const downloadUrl = `https://api.ring.com/clients_api/dings/${h.id}/share/download_status`
        + '?disable_redirect=true';
      const videoStreamByteUrl = await this.getVideoStreamByteUrl(downloadUrl);
      const dirPath = get(h, 'doorbot.description', 'Unnamed Device');
      return {
        ...h,
        createdAt: h.created_at,
        type: h.kind,
        downloadUrl,
        videoStreamByteUrl,
        isReady: !isEmpty(videoStreamByteUrl),
        isFailed: false,
        isDownloaded: false,
        isSkipped: false,
        dir: path.join(rootDir, dirPath),
        dirPath,
      };
    });

    await promiseAllWithLimit(map(
      downloadPool,
      p => (p.isReady ? () => Promise.resolve() : () => this.triggerServerRender(p.id)),
    ));

    downloadPool = await this.updateDownloadPool(downloadPool);

    const dirs = reduce(downloadPool, (acc, d) => {
      if (acc.indexOf(d.dir) !== -1) return acc;
      return [d.dir, ...acc];
    }, []);
    await this.createDirs(dirs);

    await promiseAllWithLimit(
      map(downloadPool, d => () => cancellablePromise.wrap(this.saveByteStreamVideo(d))
        .then((res) => {
          // eslint-disable-next-line no-param-reassign
          if (res === 1 || res === 2) { d.isDownloaded = true; }
          // eslint-disable-next-line no-param-reassign
          if (res === 2) { d.isSkipped = true; }
          return res;
        })
        .catch((err) => {
          // eslint-disable-next-line no-param-reassign
          d.isFailed = true;
          throw err;
        })),
      5, false,
    );

    this.logger('Download history videos done');
    return downloadPool;
  }

  // --------- HISTORY PART ---------- //

  async getLimitHistory(earliestEventId, limit = 50, remain = 5) {
    return this.fetcher({
      url: 'https://api.ring.com/clients_api/doorbots/history'
        + `?limit=${limit}${isNil(earliestEventId) ? '' : `&older_than=${earliestEventId}`}`,
      method: 'GET',
      transformResponse: [],
    }).then((res) => {
      let parsed;
      const data = get(res, 'data', '[]');
      try {
        parsed = JSONBigInt.parse(data);
      } catch (_) {
        parsed = [];
      }
      if (remain === 0) {
        return parsed;
      }
      if (some(parsed, d => get(d, 'recording.status') !== 'ready')) {
        return sleep(5000).then(() => this.getLimitHistory(earliestEventId, limit, remain - 1));
      }
      return parsed;
    }).catch((err) => {
      throw err;
    });
  }

  async getHistory(from, to) {
    this.logger(`Geting history from ${moment(from).format('l LT')} `
      + `to ${moment(to).format('l LT')}`);
    if (isEmpty(from)) return [];
    if (moment(from).isAfter(moment(to))) return [];
    let earliestEventId = 0;
    let totalEvents = [];
    while (
      earliestEventId === 0
      || moment(last(totalEvents).created_at).isAfter(moment(from))
    ) {
      const historyEvents = await this.getLimitHistory(earliestEventId);
      if (isEmpty(historyEvents)) break;
      if (earliestEventId.toString() === last(historyEvents).id.toString()) break;
      if (moment(last(historyEvents).created_at).isBefore(moment(from))) {
        const evts = filter(historyEvents, e => moment(e.created_at).isAfter(moment(from)));
        totalEvents = totalEvents.concat(evts);
        break;
      }
      totalEvents = totalEvents.concat(historyEvents);

      const earliestEvent = last(totalEvents);
      earliestEventId = earliestEvent.id;
    }
    this.logger(`Get history from ${moment(from).format('l LT')} `
      + `to ${moment(to).format('l LT')} sucessful`);
    return filter(totalEvents, evt => moment(evt.created_at).isBefore(moment(to)));
  }

  // -------- NORMAL RUN PART -------- //

  async run(from, to) {
    this.logger(`Running at ${moment().format('l LT')}`);
    const parsedFrom = isNil(from) || !moment(from).isValid() ? undefined : moment(from).startOf('day').format();
    const parsedTo = isNil(to) || !moment(to).isValid() ? undefined : moment(to).endOf('day').format();
    try {
      await this.login();
      await this.getSession();
      const processedEvents = await this.downloadHistoryVideos(
        await this.getHistory(parsedFrom, moment(parsedTo)),
      );
      this.writeMeta(this.createMetaData(this.readMeta(), processedEvents));

      let ok = 0, fail = 0, skip = 0;
      forEach(processedEvents, (pe) => {
        if (pe.isSkipped) {
          skip += 1;
        } else if (pe.isDownloaded) {
          ok += 1;
        } else {
          fail += 1;
        }
      });
      // eslint-disable-next-line max-len
      this.logger(`Result:\n\tTotal: ${processedEvents.length}\n\tDownloaded: ${ok}\n\tSkipped: ${skip}\n\tFailed: ${fail}`);
      this.logger(`Finished at ${moment().format('l LT')}`);
      return { status: statusMap.success, data: processedEvents };
    } catch (err) {
      const message = `Run FAILED at ${moment().format('l LT')} --- ${err}`;
      let status = statusMap.failed;
      if (message.indexOf('Cancelled') !== -1) {
        status = statusMap.cancelled;
      }
      this.logger(message);
      return { status, data: [] };
    }
  }

  // ----------- CRON PART ----------- //

  readMeta() {
    const meta = localStorage.getItem('metadata');
    if (isEmpty(meta)) return {};
    return JSONBigInt.parse(meta);
  }

  writeMeta(data) {
    localStorage.setItem('metadata', JSONBigInt.stringify(data));
  }

  createMetaData(oldMeta, downloadPool) {
    const sorted = downloadPool.sort((a, b) => {
      if (moment(a.created_at).isAfter(moment(b.created_at))) return -1;
      if (moment(a.created_at).isBefore(moment(b.created_at))) return 1;
      return 0;
    });
    const oldFailedEvents = get(oldMeta, 'failedEvents', []);
    const traversedEventIDs = get(oldMeta, 'traversedEventIds', []);

    const failedEvents = filter(sorted, e => e.isFailed);
    const downloadedEvent = filter(sorted, e => e.isDownloaded);

    failedEvents.forEach((f) => {
      if (oldFailedEvents.findIndex(o => o.id.toString() === f.id.toString()) === -1) {
        oldFailedEvents.push(f);
      }
    });
    const newFailedEvents = filter(
      oldFailedEvents,
      o => downloadedEvent.findIndex(d => d.id.toString() === o.id.toString()) === -1,
    );

    downloadPool.forEach((d) => {
      if (traversedEventIDs.findIndex(id => id.toString() === d.id.toString()) === -1) {
        traversedEventIDs.push(d.id);
      }
    });
    let lastestEvent = isEmpty(oldMeta.lastestEvent) ? {} : oldMeta.lastestEvent;
    if (!isEmpty(sorted)) {
      if (isEmpty(oldMeta.lastestEventTime)) {
        lastestEvent = sorted[0];
      } else if (moment(oldMeta.lastestEventTime).isBefore(moment(sorted[0].created_at))) {
        lastestEvent = sorted[0];
      }
    }
    return {
      hardwareId: getHardwareId(),
      lastestEvent,
      lastestEventTime: lastestEvent.created_at,
      failedEvents: newFailedEvents,
      traversedEventIds: traversedEventIDs,
    };
  }

  async runCron() {
    const cronJob = async () => {
      if (this.isCancelled) return false;
      this.logger(`Running job at ${moment().format('l LT')}`);
      try {
        let processedEvents = [];
        let meta = this.readMeta();
        if (isEmpty(meta) || isEmpty(meta.lastestEventTime)) {
          const { data: result, status } = await this.run(moment().startOf('day'));
          if (status !== statusMap.success) throw new Error('First run failed');
          processedEvents = result;
          meta = this.createMetaData(meta, result);
        } else {
          let retryFailedEvents = [];
          if (!isEmpty(meta.failedEvents)) {
            retryFailedEvents = await this.downloadHistoryVideos(meta.failedEvents);
          }

          let newEvents = [];
          const lastestEvent = (await this.getLimitHistory(undefined, 1))[0];
          if (moment(lastestEvent.created_at).isAfter(meta.lastestEventTime)) {
            newEvents = await this.downloadHistoryVideos(
              await this.getHistory(meta.lastestEventTime),
            );
          }

          processedEvents = [...retryFailedEvents, ...newEvents];
          meta = this.createMetaData(meta, processedEvents);
        }

        this.writeMeta(meta);
        let ok = 0, fail = 0, skip = 0;
        forEach(processedEvents, (pe) => {
          if (pe.isSkipped) {
            skip += 1;
          } else if (pe.isDownloaded) {
            ok += 1;
          } else {
            fail += 1;
          }
        });
        // eslint-disable-next-line max-len
        this.logger(`Job result:\n\tTotal: ${processedEvents.length}\n\tDownloaded: ${ok}\n\tSkipped: ${skip}\n\tFailed: ${fail}`);
        this.logger(`Job run SUCCESS at ${moment().format('l LT')}`);
      } catch (e) {
        this.logger(`Job run FAIL at ${moment().format('l LT')} --- ${e}`);
      }

      await cancellablePromise.wrap(sleep(60000));
      return cronJob();
    };
    return cronJob();
  }

  cancel() {
    this.isCancelled = true;
    cancellablePromise.cancel();
  }
}
