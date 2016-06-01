'use strict';

const Router = require('koa-router');

const deploy = require('../lib/deployer');

const alerts = new Router({
  prefix: 'alerts'
});

alerts.post('/datadog', function(next) {
  this.consul.kv.get('canary-status', (err, statusEntry) => {
    if (err) {
      throw err;
    }

    statusEntry.Value = JSON.parse(statusEntry.Value);
    statusEntry.Value.current = statusEntry.Value.previous;

    this.consul.catalog.service.node({ service: 'a0', tag: 'canary' }, (err, nodes) {
      if (err) {
        throw error;
      }

      deploy(this.consul, statusEntry, nodes);
    });
  });
});

module.exports = alerts.routes();
