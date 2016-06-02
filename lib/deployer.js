'use strict';

const fs = require('fs');
const async = require('async');
const SSH = require('node-ssh');
const uuid = require('node-uuid');
const request = require('request');

function deploy(consul, statusEntry, nodes) {
  const zipName = '/tmp/' + uuid.v1() + '.zip';
  const repoInfo = statusEntry.Value.current;

  request(`https://github.com/${repoInfo.account}/${repoInfo.repo}/archive/${repoInfo.branch}.zip`)
  .pipe(fs.createWriteStream(zipName))
  .on('error', (err) => {
    console.log(err);
  })
  .on('finish', () => {
    async.eachSeries(nodes, (node, cb) => {
      console.log(`Deploying to ${node.Address}`);
      const s = new SSH();
      s.connect({
        readyTimeout: 5000,
        host: node.Address,
        username: 'ubuntu',
        privateKey: '/home/ubuntu/.ssh/id_rsa'
      })
      .then(() => {
        // Remove from Consul
        return s.execCommand('curl -X PUT localhost:8500/v1/agent/maintenance?enable=true');
      })
      .then(() => {
        // Copy zip
        return s.put(zipName, zipName);
      })
      .then(() => {
        // Remove previous app
        return s.execCommand('sudo rm -rf /opt/current-app');
      })
      .then(() => {
        // Decompress app
        return s.execCommand(`sudo unzip ${zipName} -d /opt/current-app`);
      })
      .then(() => {
        // Run app
        return s.execCommand('sudo npm i --production && pm2 delete all && pm2 start npm -- start', { cwd: `/opt/current-app/${repoInfo.repo}-${repoInfo.branch}`});
      })
      .then(() => {
        // Add to Consul
        return s.execCommand('curl -X PUT localhost:8500/v1/agent/maintenance?enable=false');
      })
      .then(() => {
        console.log(`Deployment complete on ${node.Address}`);
        return cb();
      })
      .catch(cb);
    }, (err) => {
      if (err) {
        console.log(err);
        return;
      }

      statusEntry.Value.deployedAt = Date.now();
      statusEntry.Value = JSON.stringify(statusEntry.Value);
      consul.kv.set(statusEntry).catch(console.log);
    });
  });
}

module.exports = deploy;
