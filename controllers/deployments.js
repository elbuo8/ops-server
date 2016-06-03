'use strict';

const Router = require('koa-router');

const deployments = new Router({
  prefix: '/deployments'
});

deployments.use(function *(next) {
  try {
    yield next;
  } catch (err) {
    console.log(err);
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
  if (!this.request.body || this.request.body.token !== 'token') {
    this.throw('Invalid token', 403);
  }

  yield next;
}, function*(next) {
  // Parse message
  if (!this.request.body.text) {
    this.throw('Invalid text', 400);
  }

  const info = this.request.body.text.split(' ');

  if (info.length !== 3) {
    this.throw('Invalid text', 400);
  }

  this.deploymentInfo = {
    account: info[0],
    repo: info[1],
    branch: info[2]
  };

  yield next;
}, function*(next) {
  let statusEntry = yield this.consul.kv.get('canary-status');

  if (statusEntry) {
    statusEntry.Value = JSON.parse(statusEntry.Value);
  } else {
    statusEntry = {
      Key: 'canary-status',
      Value: { current: this.deploymentInfo }
    };
  }

  if (statusEntry.Value.testing) {
    this.throw('Canary already in use', 400);
  }

  statusEntry.Value.previous = statusEntry.Value.current;
  statusEntry.Value.current = this.deploymentInfo;
  statusEntry.Value.testing = true;

  this.statusEntry = statusEntry;

  yield next;

}, function*() {
  const nodes = yield this.consul.catalog.service.nodes({ service: 'a0', tag: 'canary' });

  this.deploy(this.consul, this.statusEntry, nodes);

  this.status = 200;
  this.body = {
    text: 'Deployment in progress',
    response_type: 'in_channel'
  };
});

deployments.post('/promote', function*() {
  this.promote(this.consul);
  this.status = 200;
  this.body = {
    text: 'Promotion in progress',
    response_type: 'in_channel'
  };
});

deployments.post('/status', function*() {
  const canaryStatus = yield this.consul.kv.get('canary-status');

  if (!canaryStatus) {
    this.throw('Canary not initialized');
  }

  canaryStatus.Value = JSON.parse(canaryStatus.Value);

  this.status = 200;
  this.body = {
    text: `Current deployment: ${canaryStatus.Value.current}`,
    response_type: 'in_channel'
  }
});

module.exports = deployments.routes();
