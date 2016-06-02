'use strict';

const deploy = require('./deployer');

function promoter(consul) {
  consul.kv.get('canary-status').then((statusEntry) => {
    if (statusEntry) {
      statusEntry.Value = JSON.parse(statusEntry.Value);

      if (statusEntry.Value.deployedAt > Date.now() - 900000) {
        statusEntry.Value.testing = false;

        consul.catalog.service.nodes({ service: 'a0' }).then((nodes) => {

          deploy(consul, statusEntry, nodes);
        }).catch(console.log);

      }
    }
  })
  .catch(console.log);
}

module.exports = promoter;
