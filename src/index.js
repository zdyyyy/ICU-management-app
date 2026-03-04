
const app = require('./app');

const config = require('./config');


app.listen(config.port, () => {
  
  console.log(`ICU Resource Manager running at http://localhost:${config.port}`);
  
  console.log('API: /api/patients, /api/beds, /api/triage, /api/waitlist, /api/patient-portal');
});
