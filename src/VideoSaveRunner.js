/* eslint-disable prefer-destructuring */
/* eslint-disable one-var-declaration-per-line */
/* eslint-disable one-var */
/* eslint-disable no-await-in-loop */
import moment from 'moment';
import {
  get, filter, map, reduce, every,
  forEach, isNil, isEmpty, last,
} from 'lodash';
import JSONBigInt from 'json-bigint';
import autoBind from 'auto-bind';

import { API_VERSION } from './constants';
import getHardwareId from './utils/getHardwareId';
import sleep from './utils/sleep';
import promiseFetchWithRetry from './utils/promiseFetchWithRetry';
import promiseAllWithLimit from './utils/promiseAllWithLimit';
import promiseMap from './utils/promiseMap';
import { electronImport } from './utils/electron';
import CancellablePromise from './utils/cancellablePromise';
import createDirs from './utils/createDirs';
import userstorage from './utils/userstorage';
import readFilesInDir from './utils/readFilesInDir';
import { loginUseToken, createSession } from './components/Login.services';

const fs = electronImport('fs');
const path = electronImport('path');
const libaxios = electronImport('axios');
const platformFolders = electronImport('platform-folders');

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

let cancellablePromise;
const statusMap = {
  success: 'SUCCESS',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
};
export default class SaveHistoryJob {
  constructor(outsideLogger, downloadLocation) {
    this.outsideLogger = outsideLogger;
    this.isCancelled = false;

    const logFileDir = path.join(platformFolders.getDataHome(), 'Ring Video Saver');
    const logFilePath = path.join(logFileDir, 'log.txt');

    if (!fs.existsSync(logFileDir)) {
      fs.mkdirSync(logFileDir, { recursive: true });
    }

    if (!fs.existsSync(downloadLocation)) {
      fs.mkdirSync(downloadLocation, { recursive: true });
    }

    this.logFile = fs.createWriteStream(logFilePath, { flags: 'a' });
    this.downloadLocation = downloadLocation;

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

  readMeta() {
    const meta = userstorage.getItem('metadata');
    if (isEmpty(meta)) return {};
    return JSONBigInt.parse(meta);
  }

  writeMeta(data) {
    userstorage.setItem('metadata', JSONBigInt.stringify(data));
  }

  createMetaData(oldMeta, downloadPool) {
    const sorted = downloadPool.sort((a, b) => {
      if (moment(a.created_at).isAfter(moment(b.created_at))) return -1;
      if (moment(a.created_at).isBefore(moment(b.created_at))) return 1;
      return 0;
    });
    const oldFailedEvents = get(oldMeta, 'failedEvents', []);
    const traversedEventIDs = get(oldMeta, 'traversedEventIds', []);
    const downloadedFiles = get(oldMeta, 'downloadedFiles', []);

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

    downloadPool.forEach((d) => {
      if (!d.isFailed && !d.isSkipped && downloadedFiles.indexOf(d.filePath) === -1) {
        downloadedFiles.push(d.filePath);
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
      lastestEvent,
      lastestEventTime: lastestEvent.created_at,
      failedEvents: newFailedEvents,
      traversedEventIds: traversedEventIDs,
      downloadedFiles,
    };
  }

  cancel() {
    this.isCancelled = true;
    cancellablePromise.cancel();
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
    const sessionToken = userstorage.getItem('sessionToken');
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
    id, videoStreamByteUrl,
    dir, fileName, filePath,
    isDownloaded, isFailed,
  }) {
    if (isDownloaded) {
      return 2;
    } if (isFailed) {
      throw new Error('Event video not ready !');
    }

    const extension = videoStreamByteUrl.match(/\.[0-9a-z]+?(?=\?)/i)[0];
    const fileNameWithExt = `${fileName}${extension}`;
    const dest = `${filePath}${extension}`;
    return cancellablePromise.run((resolve, reject) => {
      if (fs.existsSync(dest)) {
        resolve(2);
        return;
      }

      this.logger(`Saving event ${id} to file ${fileNameWithExt} in ${dir}`);
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
          file.close(() => {
            deleteFile();
            reject(err);
          });
        };

        let timeout;
        const clearDataTimeout = () => {
          if (timeout === undefined) return;
          clearTimeout(timeout);
          timeout = undefined;
        };
        const refreshTimeout = () => {
          clearDataTimeout();
          timeout = setTimeout(() => {
            rejectFileSaving(new Error(`Timeout on ${videoStreamByteUrl}`));
          }, 10000);
        };

        response.data.pipe(file);
        response.data.on('data', () => {
          if (this.isCancelled) {
            clearDataTimeout();
            rejectFileSaving(new Error('Cancelled'));
            return;
          }
          refreshTimeout();
        });
        response.data.on('end', () => {
          clearDataTimeout();
          file.close(() => {
            this.logger(`Save file ${fileNameWithExt} to ${dir} SUCCESSFUL`);
            resolve(1);
          });
        });
        response.data.on('error', (err) => {
          clearDataTimeout();
          rejectFileSaving(err);
        });

        refreshTimeout();
      }).catch(err => reject(err));
    }).catch((err) => {
      this.logger(`Save file ${fileNameWithExt} to ${dir} FAIL`);
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

  async updateDownloadPool(downloadPools, remain = 10) {
    const isEventMetaDone = event => event.isReady || event.isDownloaded || event.isFailed;
    return cancellablePromise.wrap(promiseMap(downloadPools, async (p) => {
      if (isEventMetaDone(p)) return p;

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
      if (every(res, r => isEventMetaDone(r))) {
        return res;
      }
      if (remain === 0) {
        return res.map((r) => {
          if (isEventMetaDone(r)) return r;
          return { ...r, isFailed: true };
        });
      }
      return sleep(3000).then(() => this.updateDownloadPool(downloadPools, remain - 1));
    });
  }

  async createDownloadPool(histories) {
    const downloadedFiles = await readFilesInDir(this.downloadLocation);
    return promiseMap(histories, async (h) => {
      let history = h;
      let isVideoReady = get(history, 'recording.status') === 'ready';
      if (!isVideoReady) {
        await sleep(3000);
        history = await this.getLimitHistory(undefined, history.id, 1);
        history = get(history, '0', h);
        isVideoReady = get(history, 'recording.status') === 'ready';
      }
      const downloadUrl = `https://api.ring.com/clients_api/dings/${history.id}/share/download_status`
        + '?disable_redirect=true';
      const videoStreamByteUrl = await this.getVideoStreamByteUrl(downloadUrl);
      const dir = get(history, 'doorbot.description', 'Unnamed Device');
      const dirPath = path.join(this.downloadLocation, dir);
      const fileName = `${moment(history.created_at).format('YYYY-MM-DD_HH-mm-ss')}_${history.kind}`;
      const filePath = path.join(dirPath, fileName);
      const isDownloaded = downloadedFiles.indexOf(filePath) !== -1;
      return {
        ...history,
        downloadUrl,
        videoStreamByteUrl,
        dir,
        dirPath,
        fileName,
        filePath,
        isReady: !isEmpty(videoStreamByteUrl),
        isDownloaded,
        isSkipped: isDownloaded,
        isFailed: !isVideoReady,
      };
    });
  }

  async downloadHistoryVideos(history) {
    this.logger('Start downloading history videos');
    let downloadPool = await this.createDownloadPool(history);

    await promiseAllWithLimit(map(
      downloadPool,
      p => (p.isReady || p.isDownloaded || p.isFailed
        ? () => Promise.resolve()
        : () => this.triggerServerRender(p.id)),
    ), 20);

    downloadPool = await this.updateDownloadPool(downloadPool);

    const dirs = reduce(downloadPool, (acc, d) => {
      if (acc.indexOf(d.dirPath) !== -1) return acc;
      return [d.dirPath, ...acc];
    }, []);
    await createDirs(dirs);

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

  async getLimitHistory(olderThan, atId, limit = 50) {
    return this.fetcher({
      url: 'https://api.ring.com/clients_api/doorbots/history'
        + `?limit=${limit}`
        + `${isNil(olderThan) ? '' : `&older_than=${olderThan}`}`
        + `${isNil(atId) ? '' : `&id=${atId}`}`,
      method: 'GET',
      transformResponse: [],
    }).then((res) => {
      try {
        const data = get(res, 'data');
        return JSONBigInt.parse(data);
      } catch (_) {
        return [];
      }
    }).catch((err) => {
      throw err;
    });
  }

  async getHistory(from, to, excludeId) {
    this.logger(`Geting history from ${moment(from).format('l LT')} `
      + `to ${moment(to).format('l LT')}`);
    if (isEmpty(from)) return [];
    if (moment(from).isAfter(moment(to))) return [];

    let earliestEventTime;
    let earliestEventId;
    let totalEvents = [];
    while (moment(earliestEventTime).isAfter(moment(from))) {
      const historyEvents = await this.getLimitHistory(earliestEventId);
      const earliestEvent = last(historyEvents);

      if (isEmpty(historyEvents)) break;
      if (earliestEventTime === earliestEvent.created_at) break;

      earliestEventId = earliestEvent.id;
      earliestEventTime = earliestEvent.created_at;

      if (moment(earliestEventTime).isBefore(moment(from))) {
        const evts = filter(historyEvents, e => moment(e.created_at).isSameOrAfter(moment(from)));
        totalEvents = totalEvents.concat(evts);
      } else {
        totalEvents = totalEvents.concat(historyEvents);
      }
    }

    totalEvents = filter(
      totalEvents,
      evt => moment(evt.created_at).isSameOrBefore(moment(to))
        && (isNil(excludeId) || evt.id.toString() !== excludeId.toString()),
    );
    this.logger(`Get history from ${moment(from).format('l LT')} `
      + `to ${moment(to).format('l LT')} sucessful`);
    return totalEvents;
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
          const lastestEvent = (await this.getLimitHistory(undefined, undefined, 1))[0];
          if (!isEmpty(lastestEvent) && moment(lastestEvent.created_at).isAfter(meta.lastestEventTime)) {
            newEvents = await this.downloadHistoryVideos(
              await this.getHistory(meta.lastestEventTime, undefined, get(meta, 'lastestEvent.id')),
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

      await cancellablePromise.wrap(sleep(60000)).catch(() => { });
      return cronJob();
    };
    return cronJob();
  }
}
