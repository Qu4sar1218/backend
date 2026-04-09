'use strict';

const { TimelogDevice } = require('../sequelize/models');

/** Maps scanner / analytics terminal keys to seeded `timelog_devices.code` values. */
const DEVICE_CODE_MAP = {
  hallway: 'HALLWAY-FACE-01',
  classroom: 'CLASSROOM-FACE-01',
  event: 'EVENT-FACE-01'
};

const TERMINAL_KEYS = Object.keys(DEVICE_CODE_MAP);

function getDeviceCodeForTerminal(terminalType) {
  if (!terminalType || typeof terminalType !== 'string') return null;
  const key = terminalType.toLowerCase();
  return DEVICE_CODE_MAP[key] || null;
}

function isValidTerminalKey(terminalType) {
  return Boolean(getDeviceCodeForTerminal(terminalType));
}

/**
 * Resolve an active device for kiosk-style scanning (must exist and be Active).
 * @param {string} terminalType - hallway | classroom | event
 */
async function resolveActiveTerminalDevice(terminalType) {
  const code = getDeviceCodeForTerminal(terminalType);
  if (!code) throw new Error(`Unknown terminal type: ${terminalType}`);

  const device = await TimelogDevice.findOne({
    where: { code },
    attributes: ['id', 'code', 'name', 'status']
  });

  if (!device) throw new Error(`Device not found for terminal: ${terminalType}`);
  if (device.status !== 'Active') {
    throw new Error(`Terminal device is not active (status: ${device.status})`);
  }

  return device;
}

/**
 * Lookup device by terminal key without throwing (for analytics when device missing).
 */
async function findDeviceByTerminal(terminalType) {
  const code = getDeviceCodeForTerminal(terminalType);
  if (!code) return null;
  return TimelogDevice.findOne({
    where: { code },
    attributes: ['id', 'code', 'name', 'status']
  });
}

module.exports = {
  DEVICE_CODE_MAP,
  TERMINAL_KEYS,
  getDeviceCodeForTerminal,
  isValidTerminalKey,
  resolveActiveTerminalDevice,
  findDeviceByTerminal
};
