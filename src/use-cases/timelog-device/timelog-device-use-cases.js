const timelogDeviceDataAccess = require('../../data-access/timelog-device/timelog-device-data-access');

const ALLOWED_STATUS = ['Active', 'Inactive', 'Maintenance', 'Offline'];
const MAC_ADDRESS_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1?\d{1,2})(\.(25[0-5]|2[0-4]\d|1?\d{1,2})){3}$/;

const parseBoolean = (value, fieldName) => {
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid ${fieldName}`);
};

const parseNumber = (value, fieldName) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new Error(`Invalid ${fieldName}`);
  return parsed;
};

const normalizeSettings = (settings) => {
  if (settings === undefined) return undefined;
  if (settings === null) return null;
  if (typeof settings === 'object' && !Array.isArray(settings)) return settings;
  if (typeof settings === 'string') {
    try {
      const parsed = JSON.parse(settings);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      throw new Error('Invalid settings');
    }
  }
  throw new Error('Invalid settings');
};

const normalizeDeviceUpdateData = async (data) => {
  const required = ['name', 'code', 'device_type_id', 'status'];
  for (const field of required) {
    if (data[field] === undefined || data[field] === null || String(data[field]).trim() === '') {
      throw new Error(`${field} is required`);
    }
  }

  if (!ALLOWED_STATUS.includes(data.status)) {
    throw new Error('Invalid status');
  }

  if (!(await timelogDeviceDataAccess.deviceTypeExists(data.device_type_id))) {
    throw new Error('Device type not found');
  }

  if (data.department_id !== undefined && data.department_id !== null && data.department_id !== '') {
    if (!(await timelogDeviceDataAccess.departmentExists(data.department_id))) {
      throw new Error('Department not found');
    }
  }

  if (data.ip_address !== undefined && data.ip_address !== null && data.ip_address !== '' && !IPV4_REGEX.test(String(data.ip_address).trim())) {
    throw new Error('Invalid ip_address');
  }

  if (data.mac_address !== undefined && data.mac_address !== null && data.mac_address !== '' && !MAC_ADDRESS_REGEX.test(String(data.mac_address).trim())) {
    throw new Error('Invalid mac_address');
  }

  const latitude = parseNumber(data.latitude, 'latitude');
  const longitude = parseNumber(data.longitude, 'longitude');

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    throw new Error('Invalid latitude');
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    throw new Error('Invalid longitude');
  }

  const isEntryOnly = data.is_entry_only !== undefined ? parseBoolean(data.is_entry_only, 'is_entry_only') : false;
  const isExitOnly = data.is_exit_only !== undefined ? parseBoolean(data.is_exit_only, 'is_exit_only') : false;

  if (isEntryOnly && isExitOnly) {
    throw new Error('is_entry_only and is_exit_only cannot both be true');
  }

  return {
    name: String(data.name).trim(),
    code: String(data.code).trim(),
    deviceTypeId: data.device_type_id,
    departmentId: data.department_id === '' ? null : data.department_id ?? null,
    serialNumber: data.serial_number === '' ? null : data.serial_number ?? null,
    macAddress: data.mac_address === '' ? null : data.mac_address ?? null,
    ipAddress: data.ip_address === '' ? null : data.ip_address ?? null,
    locationName: data.location_name === '' ? null : data.location_name ?? null,
    address: data.address === '' ? null : data.address ?? null,
    latitude,
    longitude,
    timezone: data.timezone === '' ? null : data.timezone ?? null,
    isEntryOnly,
    isExitOnly,
    status: data.status,
    settings: normalizeSettings(data.settings),
    remarks: data.remarks === '' ? null : data.remarks ?? null,
    installedDate: data.installed_date === '' ? null : data.installed_date ?? null
  };
};

const timelogDeviceUseCases = {
  getDevices: async () => timelogDeviceDataAccess.getDevices(),

  getDeviceById: async (id) => {
    const device = await timelogDeviceDataAccess.getDeviceById(id);
    if (!device) {
      throw new Error('Timelog device not found');
    }
    return device;
  },

  getByCode: async (code) => {
    const device = await timelogDeviceDataAccess.getByCode(code);
    if (!device) throw new Error('Timelog device not found');
    return device;
  },

  updateDevice: async (id, data, updatedById) => {
    const normalizedData = await normalizeDeviceUpdateData(data);
    const updated = await timelogDeviceDataAccess.updateDevice(id, {
      ...normalizedData,
      updatedBy: updatedById || null
    });
    if (!updated) {
      throw new Error('Timelog device not found');
    }
    return updated;
  }
};

module.exports = timelogDeviceUseCases;
