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
      // If data has come from an Android Bridge then
      // the motion will be on acc_x, acc_y, accel_z
      if (msg.payload.d.acc_x) {
        androidSource(msg);
      }
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

  function androidSource(msg) {
    msg.payload.d.accelX = msg.payload.d.acc_x || 0;
    msg.payload.d.accelY = msg.payload.d.acc_y || 0;
    msg.payload.d.accelZ = msg.payload.d.acc_z || 0;
  }

  // Sensitivity is used to determine how much of a rotational
  // reading is to be detected as a motion.
  function configCheck(msg, config) {
    var message = '';

    if (isNaN(parseFloat(config['sensitivity']))) {
      message = 'Sensitivity setting must be a number';
    } else if (!config['start-toggle']) {
      message = 'Start listening toggle needs to be set';
    }

    return message;
  }

  // A payload is needed to act on and minimum
  // configuration options need to have been set.
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

  // Initialise the fields that will be used to determine what
  // motion has occured.
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

    motion.pr = 0;

    return Promise.resolve();
  }

  // For each of the three axis, determine if there has been
  // a change, then using the sensitivity setting determine
  // if the extent of the change is sufficient to be registered.
  function detectMotion(context, motion, config){
    // Value in the context will be the last postion
    var lastPosition = context.get('position') || null;

    // Initial Data Checks will have ensured that all data
    // and configuration is as expected.
    if (lastPosition) {
      // console.log('Will be calculating rotation here');
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

  // Calculate a tertiary number
  // No motion == 0
  // -ve motion == 1
  // +ve motion == 2
  function motionCalculation(delta) {
    var v = 0;
    if (0 < delta) {
      v = 2;
    } else if (0 > delta) {
      v = 1;
    }
    return v;
  }

  // Codify the pitch and roll into a 3 digit tertiary number
  function pitchOrRoll(msg, motion) {
    var m = 0;
    m += motionCalculation(motion.dx);
    m += 10 * motionCalculation(motion.dy);
    m += 100 * motionCalculation(motion.dz);
    return m;
  }

  // Get the text to be added to the phrase from the context.
  // Reset values are expected after the signal value, so can be ignored
  function toPhrase(node, msg, config, pr) {
    var context = node.context();
    var resetValue = context.get('resetValue') || null;
    var partial = null;
    var setting = null;

    if (resetValue && pr == resetValue) {
        resetValue = null;
        //go = false;
    } else {
      switch (pr) {
        // Pitch at 45 degrees
        case 1:
          resetValue = 2;
          setting = 'pm45-r0';
          break;
        case 2:
          resetValue = 1;
          setting = 'pp45-r0';
          break;
        // Roll at 45 degrees
        case 10:
          resetValue = 20;
          setting = 'p0-rm45';
          break;
        case 20:
          resetValue = 10;
          setting = 'p0-rp45';
          break;
        // Roll or Pitch at 180 degrees
        case 200:
          resetValue = 100;
          setting = 'p0-rp180';
          break;
        // Pitch at 90 degrees
        case 201:
          resetValue = 102;
          setting = 'pm90-r0';
          break;
        case 202:
          resetValue = 101;
          setting = 'pp90-r0';
          break;
        // Pitch at 45 and Roll at 45 degrees
        case 211:
          resetValue = 122;
          setting = 'pm45-rm45';
          break;
        case 212:
          resetValue = 121;
          setting = 'pp45-rm45';
          break;
        case 221:
          resetValue = 112;
          setting = 'pm45-rp45';
          break;
        case 222:
          resetValue = 111;
          setting = 'pp45-rp45';
          break;
        // Roll at 90 degrees
        case 210:
          resetValue = 120;
          setting = 'p0-rm90';
          break;
        case 220:
          resetValue = 110;
          setting = 'p0-rp90';
          break;
        default:
          break;
      }
      if (setting) {
        partial = config[setting];
      }
    }
    context.set('resetValue', resetValue);
    return partial;
  }

  // If motion has been detected, then determine how much of
  // a pitch and roll and add the appropriate words to the
  // phrase being constructed.
  function measureMotion(node, msg, motion, config) {
    if (motion.x || motion.y || motion.z) {
      msg.payload = {
        'X-Rotation' : motion.dx,
        'Y-Rotation' : motion.dy,
        'Z-Rotation' : motion.dz
      };

      motion.pr = pitchOrRoll(msg, motion);
      //node.context().set('pr', pr);
      if (!checkToggle(node, msg, motion, config)) {
        var partial = toPhrase(node, msg, config, motion.pr);
        if (partial) {
          buildPhrase(node, msg, partial);
        }
      }
    }
    return Promise.resolve();
  }


  // If the motion is a toggle, then we are either starting
  // listening or a phrase has been completed ready to be
  // be sent.
  function checkToggle(node, msg, motion, config) {
    var isToggle = false;
    var context = node.context();
    var toggle = config['start-toggle'];

    if (parseInt(toggle) == motion.pr) {
      var listening = context.get('listening') || false;
      listening = !listening;
      context.set('listening', listening);
      context.set('started', true);

      console.log('listening set to : ' , listening);

      isToggle = true;
      if (listening) {
        node.status({fill:'green', shape:'dot', text:'Listening...'});
      } else {
        var started = context.get('started') || false;
        if (started) {
          var phrase = context.get('phrase') || '';
          msg.payload = phrase;
          context.set('phrase', '');
          node.send(msg);
          node.status({fill:'green', shape:'dot', text:'Sent'});
        }
      }
    }
    return isToggle;
  }

  // Provided we have started and are listening then append the
  // new wording to the phrase.
  function buildPhrase(node, msg, partial) {
    var context = node.context();
    var started = context.get('started') || false;
    var listening = context.get('listening') || false;

    if (started) {
      var phrase = context.get('phrase') || '';
      if (listening) {
        phrase += (partial + ' ');
        context.set('phrase', phrase);
        node.status({fill:'blue', shape:'dot', text:phrase});
      }
    } else {
      context.set('phrase', '');
    }
  }

  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function (msg) {
      var motion = {};

      initialDataCheck(msg, config)
        .then(function(){
          return initMotion(msg.payload.d, motion);
        })
        .then(function(){
          return detectMotion(node.context(), motion, config);
        })
        .then(function(){
          return measureMotion(node, msg, motion, config);
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
