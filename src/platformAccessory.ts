import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { PanaBridgePlatform } from './platform.js';
import { PanasonicBD } from './panasonic.js';

export class PanasonicPlatformAccessory {
  private service: Service;
  private device: PanasonicBD;

  constructor(
    private readonly platform: PanaBridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // Set accessory information.
    this.accessory.getService(this.platform.api.hap.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, 'Panasonic')
      .setCharacteristic(this.platform.api.hap.Characteristic.Model, 'Blu-Ray')
      .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, 'N/A');

    // Create or get the Switch service (to indicate playback state).
    this.service = this.accessory.getService(this.platform.api.hap.Service.Switch) ||
      this.accessory.addService(this.platform.api.hap.Service.Switch);
    this.service.setCharacteristic(this.platform.api.hap.Characteristic.Name, this.accessory.context.device.displayName);

    // Create the Panasonic device instance.
    this.device = new PanasonicBD(this.accessory.context.device.host);

    // Poll the device status every 30 seconds.
    setInterval(() => {
      this.updateStatus();
    }, 30000);
    // Initial status update.
    this.updateStatus();

    // Set the get handler for the On characteristic.
    this.service.getCharacteristic(this.platform.api.hap.Characteristic.On)
      .onGet(this.handleGet.bind(this));
  }

  async handleGet(): Promise<CharacteristicValue> {
    return new Promise((resolve) => {
      this.device.getPlayStatus((err, state) => {
        // For this accessory, "playing" is considered On.
        if (!err && state === 'playing') {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  updateStatus(): void {
    this.device.getPlayStatus((err, state, playtime, duration) => {
      const isPlaying = (state === 'playing');
      this.platform.log.debug('Panasonic status:', state, playtime, duration);
      this.service.updateCharacteristic(this.platform.api.hap.Characteristic.On, isPlaying);
    });
  }
}