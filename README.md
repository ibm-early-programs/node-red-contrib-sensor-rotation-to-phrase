# Node-RED Contrib Sensor Rotation to Phrase
Allows you to interprets TI sensortag rotation as phrases.

## Install

Run the following command in the root directory of your Node-RED install:

````
    npm install node-red-contrib-sensor-rotation-to-phrase
````

## Usage

This node expects input from an IBM IOT In Node. The IOT Node will have been
configured to report on device events from a TI Sensor Tag. Consequently this node
expects the rotational acceleration to be provided as input on
````
    msg.payload.d
````
as from an iOS bridge
````
    msg.payload.d.accelX
    msg.payload.d.accelY
    msg.payload.d.accelZ
````
or if from an Android bridge
````
    msg.payload.d.acc_x
    msg.payload.d.acc_y
    msg.payload.d.acc_z
````

### Calibration

The sensitivity configuration allows you to determine how much motion is
required before then node detects rotational motion. You will need to tune
the sensitivity and the frequency in which the sensorTag reports to get the
best response for you. I have mine tuned at sensitivity of 0.5 and a frequency
of an event every 200ms.

If you lay the sensortag down, light sensor up, text the right way round,
then the side facing away from you is the bow, the side nearest you is the
stern. Left is port and right is starboard.

Then the **Pitch** will be the up down rolling motion of the bow and port.
The **Roll** is the tilting motion of the port and starboard. The **Yaw**
doesn't generate an acceleration reading in the sensortag, so will be
ignored.

Once a Pitch or Roll of 45, 90 or 180 degrees has been detected, the Node will
expect a Pitch or Roll that resets the sensorTag back to the horisontal reset
position. ie. After a Pitch of +45 a Pitch of -45 is expected. If something
else is seen then that is seen as a new signal Pitch or Roll.

Consequently the following will be detected.
A +ve Pitch is the bow rising and a +ve Roll is the port rising

| Pitch   | Roll     | Detected  |
| ------: |---------:|:---------:|
| -90     |    0     |    √      |
| -45     |  -45     |    √      |
| -45     |    0     |    √      |
| -45     |   45     |    √      |
|   0     |  -90     |    √      |
|   0     |  -45     |    √      |
|   0     |   45     |    √      |
|   0     |   90     |    √      |
|   0     |  180     |    √      |
|  45     |  -45     |    √      |
|  45     |    0     |    √      |
|  45     |   45     |    √      |
|  90     |    0     |    √      |


### Interpretation

Select one of the actions as a start / stop toggle. Define the others
as set utterances that can are added together to construct a phrase. The node
only sends the phase on ````msg.payload```` when the stop toggle is detected.


### Example usage flow

````
[{"id":"bc7e4c51.38dbd","type":"ibmiot in","z":"2a1981fa.9a2dee","authentication":"apiKey","apiKey":"","inputType":"evt","deviceId":"xyz","applicationId":"","deviceType":"+","eventType":"+","commandType":"","format":"json","name":"IBM IoT","service":"registered","allDevices":false,"allApplications":"","allDeviceTypes":true,"allEvents":true,"allCommands":"","allFormats":"","qos":0,"x":231,"y":672,"wires":[["c77dc62.0f5ab38"]]},{"id":"c77dc62.0f5ab38","type":"sensor-rotation-to-phrase","z":"2a1981fa.9a2dee","name":"","sensitivity":"0.5","start-toggle":"200","pm90-r0":"to blue","pm45-rm45":"to green","pm45-r0":"to red","pm45-rp45":"to yellow","p0-rm90":"the lamp","p0-rm45":"the lighting","p0-rp45":"in my office ","p0-rp90":"on my desk","p0-rp180":"nine","pp45-rm45":"off","pp45-r0":"please turn","pp45-rp45":"twelve","pp90-r0":"I would like you to switch","x":432.5,"y":583,"wires":[["cd2b73a5.8c7c6","d665f2b1.02683"]]},{"id":"d665f2b1.02683","type":"debug","z":"2a1981fa.9a2dee","name":"","active":true,"console":"false","complete":"false","x":596.5,"y":647,"wires":[]},{"id":"367d4406.5542ac","type":"ibmiot","z":"","name":"SC-PI","keepalive":"60","domain":"","cleansession":true,"appId":"SCTest","shared":true}]
````


## Contributing

For simple typos and fixes please just raise an issue pointing out our mistakes. If you need to raise a pull request please read our [contribution guidelines](https://github.com/node-red-contrib-utils/node-red-contrib-sensor-rotation-to-phrase/blob/master/CONTRIBUTING.md) before doing so.

## Copyright and license

Copyright 2017 IBM Corp. under the Apache 2.0 license.
