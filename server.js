'use strict';

const koa = require('koa');
const bodyParser = require('koa-bodyparser');
const consul = require('consul')({ host: 'consul-0' });

const app = koa();
const deploymentController = require('./controllers/deployments');

// Start promoter
const promoter = require('./lib/promoter')(consul);

// General middleware
app.use(bodyParser());
app.use(function *(next) {
  this.consul = consul;
  yield next;
});

app.use(deploymentController);

app.listen(process.env.PORT || 3000);
