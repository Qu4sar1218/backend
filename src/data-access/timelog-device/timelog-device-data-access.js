const { TimelogDevice, School, DeviceType, Department } = require('../../sequelize/models');

const toDeviceResponse = (device) => {
  const raw = device.toJSON();
  return {
    id: raw.id,
    school_id: raw.schoolId,
    device_type_id: raw.deviceTypeId,
    code: raw.code,
    name: raw.name,
    serial_number: raw.serialNumber,
    mac_address: raw.macAddress,
    ip_address: raw.ipAddress,
    location_name: raw.locationName,
    department_id: raw.departmentId,
    address: raw.address,
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
    is_entry_only: raw.isEntryOnly,
    is_exit_only: raw.isExitOnly,
    status: raw.status,
    settings: raw.settings,
    remarks: raw.remarks,
    installed_date: raw.installedDate,
    last_sync_date: raw.lastSyncDate,
    last_online_date: raw.lastOnlineDate,
    created_by: raw.createdBy,
    updated_by: raw.updatedBy,
    created_at: raw.createdAt,
    updated_at: raw.updatedAt,
    school: raw.school
      ? {
          id: raw.school.id,
          name: raw.school.name
        }
      : null,
    device_type: raw.device_type
      ? {
          id: raw.device_type.id,
          code: raw.device_type.code,
          name: raw.device_type.name
        }
      : null,
    department: raw.department
      ? {
          id: raw.department.id,
          name: raw.department.name
        }
      : null
  };
};

const includes = [
  { model: School, as: 'school', attributes: ['id', 'name'] },
  { model: DeviceType, as: 'device_type', attributes: ['id', 'code', 'name'] },
  { model: Department, as: 'department', attributes: ['id', 'name'] }
];

const timelogDeviceDataAccess = {
  getDevices: async () => {
    const devices = await TimelogDevice.findAll({
      include: includes,
      order: [['createdAt', 'DESC']]
    });
    return devices.map(toDeviceResponse);
  },

  getDeviceById: async (id) => {
    const device = await TimelogDevice.findByPk(id, { include: includes });
    if (!device) return null;
    return toDeviceResponse(device);
  },

  updateDevice: async (id, data) => {
    const device = await TimelogDevice.findByPk(id, { include: includes });
    if (!device) return null;
    try {
      await device.update(data);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const constrainedField = error?.errors?.[0]?.path || 'field';
        throw new Error(`${constrainedField} already exists`);
      }
      throw error;
    }
    return toDeviceResponse(device);
  },

  getByCode: async (code) => {
    const device = await TimelogDevice.findOne({
      where: { code },
      include: includes
    });
    if (!device) return null;
    return toDeviceResponse(device);
  },

  deviceTypeExists: async (id) => {
    const row = await DeviceType.findByPk(id, { attributes: ['id'] });
    return Boolean(row);
  },

  departmentExists: async (id) => {
    const row = await Department.findByPk(id, { attributes: ['id'] });
    return Boolean(row);
  }
};

module.exports = timelogDeviceDataAccess;
