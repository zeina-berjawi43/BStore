const fs = require('node:fs');
const path = require('node:path');

module.exports = ({ config }) => {
  // EAS can supply GOOGLE_SERVICES_JSON as a file environment variable.
  const candidate = process.env.GOOGLE_SERVICES_JSON || path.join(__dirname, 'google-services.json');
  if (fs.existsSync(candidate)) {
    const google = JSON.parse(fs.readFileSync(candidate, 'utf8'));
    if (!google.client?.some(client => client.client_info?.android_client_info?.package_name === config.android?.package)) {
      throw new Error('Google services configuration does not match the Android application package.');
    }
    return { ...config, android: { ...config.android, googleServicesFile: candidate } };
  }
  if (process.env.GOOGLE_SERVICES_JSON) throw new Error('GOOGLE_SERVICES_JSON must point to an existing file.');
  return config;
};
