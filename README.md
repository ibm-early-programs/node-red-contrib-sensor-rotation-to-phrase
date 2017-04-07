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
as
````
    msg.payload.d.accelX
    msg.payload.d.accelY
    msg.payload.d.accelZ
````

... Motion detection from a TI Device
... Determines axis Motion
... Allows motion to be interpreted as a phrase.

## Contributing

For simple typos and fixes please just raise an issue pointing out our mistakes. If you need to raise a pull request please read our [contribution guidelines](https://github.com/node-red-contrib-utils/node-red-contrib-sensor-rotation-to-phrase/blob/master/CONTRIBUTING.md) before doing so.

## Copyright and license

Copyright 2016 IBM Corp. under the Apache 2.0 license.
