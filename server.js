'use strict';

const koa = require('koa');
const koaLogger = require('koa-logger');
const bodyParser = require('koa-bodyparser');
const consul = require('consul')({ host: 'consul-0', promisify: true });

const app = koa();
const deploymentController = require('./controllers/deployments');

const promoter = require('./lib/promoter');
// General middleware
app.use(koaLogger());
app.use(bodyParser());
app.use(function *(next) {
  this.consul = consul;
  yield next;
});

app.use(deploymentController);

setInterval(() => {
  promote(consul);
}, process.env.PROMOTION_INTERVAL || 90000);

app.listen(process.env.PORT || 3000);
