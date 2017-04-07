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
  function initialDataCheck(msg) {
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

    if (message){
      return Promise.reject(message);
    }
    return Promise.resolve();
  }


  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function (msg) {

      var motion = {};

      node.status({fill:'green', shape:'dot', text:'Processing'});
      initialDataCheck(msg)
        .then(function(){
          node.status({});
          node.send(msg);
        })
        .catch(function(err){
          node.status({fill:'red', shape:'dot', text: err});
          node.error(err, msg);
        });

      //msg.motion.accelX = parseFloat(msg.payload.d.accelX) || 0;
      //msg.motion.accelY = parseFloat(msg.payload.d.accelY) || 0;
      //msg.motion.accelZ = parseFloat(msg.payload.d.accelZ) || 0;

      //msg.motion.x = false;
      //msg.motion.y = false;
      //msg.motion.z = false;

      //msg.motion.dx = 0;
      //msg.motion.dy = 0;
      // msg.motion.dz = 0;



      node.status({});

      node.send(msg);
    });
  }

  RED.nodes.registerType('sensor-rotation-to-phrase', Node);
};
