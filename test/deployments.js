'use strict';

const koa = require('koa');
const sinon = require('sinon');
const request = require('supertest');
const expect = require('chai').expect;
const bodyParser = require('koa-bodyparser');

const deploymentController = require('../controllers/deployments');

describe('DeploymentController', ()=> {
  const app = koa();
  let consul, deploy, promote;
  before(() => {
    app.use(function*(next) {
      this.deploy = deploy;
      this.promote = promote;
      this.consul = consul;
      yield next;
    });
    app.use(bodyParser());
    app.use(deploymentController);
  });
  describe('POST /deploy', () => {
    it('should throw if token is not valid', (done) => {
      request(app.listen())
      .post('/deployments/deploy')
      .expect(403, done);
    });
    it('should throw if text is not provided', (done) => {
      request(app.listen())
      .post('/deployments/deploy')
      .send('token=token')
      .expect(400, done);
    });
    it('should throw if text is not provided properly', (done) => {
      request(app.listen())
      .post('/deployments/deploy')
      .send('token=token')
      .send('text=a b')
      .expect(400, done);
    });
    it('should throw if canaray is already in use', (done) => {
      consul = {
        kv: {
          get: (key) => {
            return new Promise((resolve, reject) => {
              return resolve({Key: key, Value: '{"testing": true}'});
            });
          }
        }
      }
      request(app.listen())
      .post('/deployments/deploy')
      .send('token=token')
      .send('text=a b c')
      .expect(400, done);
    });
    it('should call deploy on success', (done) => {
      consul = {
        kv: {
          get: (key) => {
            return new Promise((resolve, reject) => {
              return resolve();
            });
          }
        },
        catalog: {
          service: {
            nodes: (val) => {
              return new Promise((resolve, reject) => {
                return resolve();
              });
            }
          }
        }
      }

      deploy = sinon.spy();

      request(app.listen())
      .post('/deployments/deploy')
      .send('token=token')
      .send('text=a b c')
      .expect(200, (err, res) => {
        expect(err).to.not.exist;
        expect(deploy.calledOnce).to.be.true;
        done();
      });
    });
  });
});
