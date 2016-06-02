'use strict';

const deploy = require('./deployer');

function promoter(consul) {
  return setInterval(() => {
    consul.kv.get('canary-status', (err, statusEntry) {
      if (err) {
        console.log(err);
        return;
      }

      if (statusEntry) {
        statusEntry.Value = JSON.parse(statusEntry.Value);

        if (statusEntry.Value.deployedAt > Date.now() - 900000) {
          statusEntry.Value.testing = false;

          consul.catalog.service.node({ service 'a0' }, (err, nodes) {
            if (err) {
              console.log(err);
              return;
            }

            deploy(consul, statusEntry, nodes);
          });
        }
      }
    });
  }, 900000);
}

module.exports = promoter;
