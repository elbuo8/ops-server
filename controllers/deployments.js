'use strict';

const Router = require('koa-router');

const deploy = require('../lib/deployer');

const deployments = new Router({
  prefix: 'deployments'
});

deployments.use(function *(next) {
  try {
    yield next;
  } catch (err) {
    // Add logger
    // Format slack response
    this.body = {
      response_type: 'in_channel'
    };
    this.body.text = err.status ? err.message : 'Houston, we have a problem';
    this.status = err.status || 500;
  }
});

deployments.post('/deploy', function*(next) {
  // Validate payload is authentic by verifying token
  if (this.request.body !== 'token') {
    this.throw('Invalid token', 403);
  }

  yield next;
}, function *(next) {
  // Parse message
  const info = this.request.body.text.split(' ');
  this.deploymentInfo = {
    account: info[0],
    repo: info[1],
    branch: info[2]
  };

  yield next;
}, function* (next) {
  // Check Status of Canary
  this.consul.kv.get('canary-status', (err, statusEntry) => {
    if (err) {
      throw err;
    }

    if (statusEntry) {
      statusEntry.Value = JSON.parse(statusEntry.Value);
      if (statusEntry.Value.testing) {
        this.throw('Canary already in use', 400);
      }
    } else {
      statusEntry = {
        Key: 'canary-status',
        Value: { current: this.deploymentInfo }
      };
    }

    statusEntry.Value.previous = statusEntry.Value.current;
    statusEntry.Value.current = this.deploymentInfo;
    statusEntry.Value.testing = true;

    this.statusEntry = statusEntry;

    yield next;
  }, function*() {
    this.consul.catalog.service.node({ service: 'a0', tag: 'canary' }, (err, nodes) {
      if (err) {
        throw err;
      }

      deploy(consul, this.statusEntry, nodes);

      this.status = 200;
      this.body = {
        text: 'Deployment in progress',
        response_type: 'in_channel'
      };
    });
  });
});

module.exports = deployments.routes();
