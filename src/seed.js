/**
 * 开发用示例数据种子脚本
 * 使用方式：在项目根目录执行 node src/seed.js
 */
const { store, id } = require('./store');

function seed() {
  // 清空并写入 3 名示例病人
  store.patients = [
    // 危重、需 ICU 床、当前时间到达
    { id: id(), name: 'Patient A', mrn: 'MRN001', priorityLevel: 'CRITICAL', requiredBedType: 'ICU', arrivalTime: new Date().toISOString(), status: 'WAITING', notes: '' },
    // 紧急、需 ICU 床、1 小时前到达（用于测试等待时间排序）
    { id: id(), name: 'Patient B', mrn: 'MRN002', priorityLevel: 'URGENT', requiredBedType: 'ICU', arrivalTime: new Date(Date.now() - 3600000).toISOString(), status: 'WAITING', notes: '' },
    // 高优先级、需普通床
    { id: id(), name: 'Patient C', mrn: 'MRN003', priorityLevel: 'HIGH', requiredBedType: 'GENERAL', arrivalTime: new Date().toISOString(), status: 'WAITING', notes: '' }
  ];
  // 清空并写入 3 张示例床位
  store.beds = [
    { id: id(), label: 'ICU-1', type: 'ICU', status: 'AVAILABLE', patientId: null, occupiedAt: null },
    { id: id(), label: 'ICU-2', type: 'ICU', status: 'AVAILABLE', patientId: null, occupiedAt: null },
    { id: id(), label: 'GEN-1', type: 'GENERAL', status: 'AVAILABLE', patientId: null, occupiedAt: null }
  ];
  // 候诊列表：取前 2 名病人，为每人生成一条候诊记录
  store.waitlist = store.patients.slice(0, 2).map(p => ({
    id: id(),
    patientId: p.id,
    arrivalTime: p.arrivalTime,
    addedAt: new Date().toISOString()
  }));
  console.log('Seeded:', store.patients.length, 'patients,', store.beds.length, 'beds,', store.waitlist.length, 'waitlist entries');
}

// 执行种子函数
seed();
