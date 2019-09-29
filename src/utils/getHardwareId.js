import { isEmpty } from 'lodash';

import { electronImport } from './electron';

const nodeMachineId = electronImport('node-machine-id');

export default () => {
  let hardwareId = localStorage.getItem('hardwareId');
  if (isEmpty(hardwareId)) {
    hardwareId = nodeMachineId.machineIdSync();
    localStorage.setItem('hardwareId', hardwareId);
  }
  return hardwareId;
};
