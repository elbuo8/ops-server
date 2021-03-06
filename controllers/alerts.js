'use strict';

const Router = require('koa-router');

const deploy = require('../lib/deployer');

const alerts = new Router({
  prefix: '/alerts'
});

alerts.post('/datadog', function*(next) {
  let statusEntry = yield this.consul.kv.get('canary-status');

  statusEntry.Value = JSON.parse(statusEntry.Value);
  statusEntry.Value.current = statusEntry.Value.previous;

  const nodes = yield this.consul.catalog.service.nodes({ service: 'a0', tag: 'canary' });

  deploy(this.consul, statusEntry, nodes);
  this.status = 204;
});

module.exports = alerts.routes();
