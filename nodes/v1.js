/**
 * Copyright 2017 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {

  // This node is expecting a device event from a TI SensorTag,
  // which will come in as msg.payload.d
  // It works on the rotatational acceleration so that data should
  // also be provided.
  function payloadCheck(msg) {
    var message = '';
    if (msg && msg.payload && msg.payload.d) {
      if (! msg.payload.d.accelX ||
            ! msg.payload.d.accelY ||
            ! msg.payload.d.accelZ) {
        message = 'Missing rotational acceleration';
      }
    } else {
      message = 'Missing device event';
    }
    return message;
  }

  function configCheck(msg, config) {
    var message = '';

    if (isNaN(parseFloat(config['sensitivity']))) {
      message = 'Sensitivity setting must be a number';
    }
    return message;
  }

  function initialDataCheck(msg, config) {
    var message = '';

    message = payloadCheck(msg);
    if (!message) {
      message = configCheck(msg, config);
    }
    if (message) {
      return Promise.reject(message);
    }
    return Promise.resolve();
  }

  function initMotion(deviceEvent, motion) {
    motion.accelX = parseFloat(deviceEvent.accelX) || 0;
    motion.accelY = parseFloat(deviceEvent.accelY) || 0;
    motion.accelZ = parseFloat(deviceEvent.accelZ) || 0;

    motion.x = false;
    motion.y = false;
    motion.z = false;

    motion.dx = 0;
    motion.dy = 0;
    motion.dz = 0;

    return Promise.resolve();
  }

  function detectMotion(context, motion, config){
    // Value in the context will be the last postion
    var lastPosition = context.get('position') || null;

    // Initial Data Checks will have ensured that all data
    // and configuration is as expected.
    if (lastPosition) {
      console.log('Will be calculating rotation here');
      var sensitivity = parseFloat(config['sensitivity']) || 0.5;

      if (lastPosition.accelX != motion.accelX) {
          if (sensitivity <= Math.abs(lastPosition.accelX - motion.accelX)) {
              motion.x = true;
              motion.dx = lastPosition.accelX - motion.accelX;
          }
      }
      if (lastPosition.accelY != motion.accelY) {
          if (sensitivity <= Math.abs(lastPosition.accelY - motion.accelY)) {
              motion.y = true;
              motion.dy = lastPosition.accelY - motion.accelY;
          }
      }
      if (lastPosition.accelZ != motion.accelZ) {
          if (sensitivity <= Math.abs(lastPosition.accelZ - motion.accelZ)) {
              motion.z = true;
              motion.dz = lastPosition.accelZ - motion.accelZ;
          }
      }
    }
    // Store the current postion
    context.set('position', motion);
    return Promise.resolve();
  }

  function reportIfMotion(node, msg, motion) {
    if (motion.x || motion.y || motion.z) {
      msg.payload = {
        'X-Rotation' : motion.dx,
        'Y-Rotation' : motion.dy,
        'Z-Rotation' : motion.dz
      };

      node.status({});
      node.send(msg);
    } else {
      node.status({fill:'blue', shape:'dot', text:'Waiting for motion'});
    }
    return Promise.resolve();
  }

  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function (msg) {

      var motion = {};

      node.status({fill:'green', shape:'dot', text:'Processing'});
      initialDataCheck(msg, config)
        .then(function(){
          initMotion(msg.payload.d, motion);
        })
        .then(function(){
          detectMotion(node.context(), motion, config);
        })
        .then(function(){
          reportIfMotion(node, msg, motion);
        })
        .catch(function(err){
          var messageTxt = err.error ? err.error : err;
          node.status({fill:'red', shape:'dot', text: messageTxt});
          node.error(messageTxt, msg);
        });

    });
  }

  RED.nodes.registerType('sensor-rotation-to-phrase', Node);
};
