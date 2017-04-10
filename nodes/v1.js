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
    } else if (!config['start-toggle']) {
      message = 'Start listening toggle needs to be set';
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

    motion.pr = 0;

    return Promise.resolve();
  }

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

  function motionCalculation(delta) {
    var v = 0;
    if (0 < delta) {
      v = 2;
    } else if (0 > delta) {
      v = 1;
    }
    return v;
  }

  function pitchOrRoll(msg, motion) {
    var m = 0;
    m += motionCalculation(motion.dx);
    m += 10 * motionCalculation(motion.dy);
    m += 100 * motionCalculation(motion.dz);
    return m;
  }

  // Reset values are expected after the signal value, so can be ignored
  function toPhrase(node, msg, pr) {
    //var go = true;
    //console.log('Pitch Roll value is ', pr);
    var context = node.context();
    var resetValue = context.get('resetValue') || null;
    var partial = null;
    //console.log('Comparing with reset of  ', resetValue);

    if (resetValue && pr == resetValue) {
        resetValue = null;
        //go = false;
    } else {
      switch (pr) {
        // Pitch at 45 degrees
        case 1:
          resetValue = 2;
          partial = 'Pitch -45';
          break;
        case 2:
          resetValue = 1;
          partial = 'Pitch +45';
          break;
        // Roll at 45 degrees
        case 10:
          resetValue = 20;
          partial = 'Roll -45';
          break;
        case 20:
          resetValue = 10;
          partial = 'Roll +45';
          break;
        // Roll or Pitch at 180 degrees
        case 200:
          resetValue = 100;
          partial = 'Roll +180';
          break;
        // Pitch at 90 degrees
        case 201:
          resetValue = 102;
          partial = 'Pitch -90';
          break;
        case 202:
          resetValue = 101;
          partial = 'Pitch +90';
          break;
        // Pitch at 45 and Roll at 45 degrees
        case 211:
          resetValue = 122;
          partial = 'Pitch -45 & Roll -45';
          break;
        case 212:
          resetValue = 121;
          partial = 'Pitch +45 & Roll -45';
          break;
        case 221:
          resetValue = 112;
          partial = 'Pitch -45 & Roll +45';
          break;
        case 222:
          resetValue = 111;
          partial = 'Pitch +45 & Roll +45';
          break;
        // Roll at 90 degrees
        case 210:
          resetValue = 120;
          partial = 'Roll -90';
          break;
        case 220:
          resetValue = 110;
          partial = 'Roll +90';
          break;
        default:
          //go = false;
          break;
      }
    }
    context.set('resetValue', resetValue);
    return partial;
  }

  function measureMotion(node, msg, motion, config) {
    if (motion.x || motion.y || motion.z) {
      msg.payload = {
        'X-Rotation' : motion.dx,
        'Y-Rotation' : motion.dy,
        'Z-Rotation' : motion.dz
      };

      motion.pr = pitchOrRoll(msg, motion);
      //node.context().set('pr', pr);
      if (!checkToggle(node, motion, config)) {
        var partial = toPhrase(node, msg, motion.pr);
        if (partial) {
          buildPhrase(node, msg, partial);
        }
      } else {
        var context = node.context();
        var phrase = context.get('phrase') || '';
        msg.payload.phrase = phrase;
        context.set('phrase', '');
        node.send(msg);
        node.status({fill:'green', shape:'dot', text:'Sent'});
      }

      /*
      if (toPhrase(node, msg, pr)) {
         node.status({});
         node.send(msg);
      } else {
         node.status({fill:'green', shape:'dot', text:'Listening...'});
      }
      */
    }
    /*
    else {
      node.status({fill:'blue', shape:'dot', text:'Waiting for motion'});
    }
    */
    //return Promise.resolve(pr);
    return Promise.resolve();
  }

  function checkToggle(node, motion, config) {
    var isToggle = false;
    var context = node.context();
    //var pr = motion.pr;
    var toggle = config['start-toggle'];

    //console.log('toggle is : ', toggle, typeof(toggle));
    //console.log('value is : ', pr, typeof pr);

    if (parseInt(toggle) == motion.pr) {
      var listening = context.get('listening') || false;
      listening = !listening;
      context.set('listening', listening);
      context.set('started', true);

      isToggle = true;
      //console.log('listing : ', listening);
    }
    return isToggle;
  }

  function buildPhrase(node, msg, partial) {
    //console.log('In buildPhrase');

    var context = node.context();
    var started = context.get('started') || false;
    var listening = context.get('listening') || false;

    if (started) {
      //console.log('started has been detected');
      var phrase = context.get('phrase') || '';
      if (listening) {
        //console.log('listening has been detected');
        //console.log('Partial Phrase is : ', partial);
        //console.log('current full phrase is :', phrase);
        phrase += (partial + ' ');
        context.set('phrase', phrase);
        node.status({fill:'blue', shape:'dot', text:phrase});
      } //else {
        //msg.payload.phrase = phrase;
        //context.set('phrase', '');
        //node.send(msg);
        //node.status({fill:'blue', shape:'dot', text:'Sent'});
      //}
    } else {
      context.set('phrase', '');
    }
  }

  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function (msg) {

      var motion = {};

      //node.status({fill:'green', shape:'dot', text:'Processing'});
      initialDataCheck(msg, config)
        .then(function(){
          initMotion(msg.payload.d, motion);
        })
        .then(function(){
          detectMotion(node.context(), motion, config);
        })
        .then(function(){
          measureMotion(node, msg, motion, config);
        })
        //.then(function(){
        //  checkToggle(node, motion, config);
          // var pr = node.context().get('pr') || null;
          //console.log('Detected :', pr);
        //})
        //.then(function(){
        //  buildPhrase(node, msg);
        //})
        .catch(function(err){
          var messageTxt = err.error ? err.error : err;
          node.status({fill:'red', shape:'dot', text: messageTxt});
          node.error(messageTxt, msg);
        });

    });
  }

  RED.nodes.registerType('sensor-rotation-to-phrase', Node);
};
