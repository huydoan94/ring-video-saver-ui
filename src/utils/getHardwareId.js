import { isEmpty } from 'lodash';

const electron = window.require('electron');
const nodeMachineId = electron.remote.require('node-machine-id');

export default () => {
  let hardwareId = localStorage.getItem('hardwareId');
  if (isEmpty(hardwareId)) {
    hardwareId = nodeMachineId.machineIdSync();
    localStorage.setItem('hardwareId', hardwareId);
  }
  return hardwareId;
};
