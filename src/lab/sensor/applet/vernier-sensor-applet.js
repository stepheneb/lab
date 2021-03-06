/*global define: false */

define(function(require) {

  var miniClass    = require('common/mini-class'),
      SensorApplet = require('./sensor-applet');

  return miniClass.extendClass(SensorApplet, {

    // Before appending the applet, set this value with the path to an object that will receive applet callbacks.
    listenerPath: '',

    // Before appending the applet, set this to the sensor type
    // supported values are:
    //   "temperature"
    //   "light"
    //   "force 5n"
    //   "force 50n"
    //   "co2"
    //   "o2"
    //   "ph"
    //   "distance"
    measurementType: '',

    // supported values are:
    //  "labquest"
    //  "golink"
    deviceType: '',

    appletId:     'sensor-applet',
    classNames:   'applet sensor-applet',

    jarUrls:     ['com/sun/jna/jna.jar',
                  'org/concord/sensor/sensor.jar',
                  'org/concord/sensor/sensor-vernier/sensor-vernier.jar',
                  'org/concord/sensor/sensor-applets/sensor-applets.jar'],

    deviceSpecificJarUrls: [],

    code:         'org.concord.sensor.applet.SensorApplet',

    getHTML: function() {
      var allJarUrls = this.jarUrls.concat(this.deviceSpecificJarUrls);

      return [
       '<applet ',
         'id="',       this.appletId,         '" ',
         'class="',    this.classNames,       '" ',
         'archive="',  allJarUrls.join(', '), '" ',
         'code="',     this.code,             '" ',
         'codebase="', this.getCodebase(), '" ',
         'width="1px" ',
         'height="1px" ',
         'MAYSCRIPT="true" ',
       '>',
          '<param name="MAYSCRIPT" value="true" />',
        '</applet>'
      ].join('');
    },

    testAppletReady: function() {
      try {
        // We only care to see if this throws or not. (In some versions of IE, it's not possible
        // to 'probe' for the mere existence of this.appletInstance.getSensorRequest by testing
        // it for truthiness, because Java methods can be invoked but not included in expressions.)
        this.appletInstance.getSensorRequest(this.measurementType);
      } catch(e) {
        return false;
      }
      return true;
    },

    /**
      Returns true if the correct device type is connected.

      NOTE: This will throw if the applet hasn't been initialized yet (which occurs asynchronously
      after the <applet> tag is appended to the DOM).
    */
    isSensorConnected: function() {
      return this.appletInstance.isInterfaceConnected(this.deviceType);
    },

    /**
      Try to initialize the sensor for the correct device and measurement type (e.g., goio,
      distance). Returns true on success.

      NOTE: This will throw if the applet hasn't been initialized yet (which occurs asynchronously
      after the <applet> tag is appended to the DOM).
    */
    initializeSensor: function() {
      var req;

      if (!this.isSensorConnected()) {
        return false;
      }

      req = this.appletInstance.getSensorRequest(this.measurementType);
      return this.appletInstance.initSensorInterface(this.listenerPath, this.deviceType, [req]);
    },

    // In some browsers, calling an applet method from within a callback triggered by
    // an applet seems to cause problems (lock up the browser). Therefore, make sure
    // not to call the applet's stopCollecting, startCollecting methods within an applet
    // callback.

    _stopSensor: function() {
      var self = this;

      if (this.getIsInAppletCallback()) {
        window.setTimeout(function() { self.appletInstance.stopCollecting(); }, 10);
      }
      else {
        this.appletInstance.stopCollecting();
      }
    },

    _startSensor: function() {
      var self = this;

      if (this.getIsInAppletCallback()) {
        window.setTimeout(function() { self.appletInstance.startCollecting(); }, 10);
      }
      else {
        this.appletInstance.startCollecting();
      }
    },

    // applet callbacks

    sensorsReady: function() {
      this.startAppletCallback();
      this.sensorIsReady();
      this.endAppletCallback();
    },

    dataReceived: function(type, count, data) {
      data = data || [];
      this.startAppletCallback();
      for (var i = 0, len = data.length; i < len; i++) {
        this.emit('data', data[i]);
      }
      this.endAppletCallback();
    },

    deviceUnplugged: function() {
      var self = this;
      this.startAppletCallback();
      window.setTimeout(function() { self.emit('deviceUnplugged'); }, 10);
      this.endAppletCallback();
    },

    sensorUnplugged: function() {
      var self = this;
      this.startAppletCallback();
      window.setTimeout(function() { self.emit('sensorUnplugged'); }, 10);
      this.endAppletCallback();
    }
  });
});
