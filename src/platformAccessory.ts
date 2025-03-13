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
    this.accessory.getService(this.platform.api.hap.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, 'Panasonic')
      .setCharacteristic(this.platform.api.hap.Characteristic.Model, 'Blu-Ray')
      .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, 'N/A');

    this.service =
      this.accessory.getService(this.platform.api.hap.Service.OccupancySensor) ||
      this.accessory.addService(this.platform.api.hap.Service.OccupancySensor);
    this.service.setCharacteristic(
      this.platform.api.hap.Characteristic.Name,
      this.accessory.context.device.displayName,
    );

    this.device = new PanasonicBD(this.accessory.context.device.host);

    const pollInterval = this.platform.config.pollInterval || 500;
    setInterval(() => {
      this.updateStatus();
    }, pollInterval);
    this.updateStatus();

    this.service
      .getCharacteristic(this.platform.api.hap.Characteristic.OccupancyDetected)
      .onGet(this.handleGet.bind(this));
  }

  async handleGet(): Promise<CharacteristicValue> {
    return new Promise((resolve) => {
      this.device.getPlayStatus((err, state) => {
        resolve(!err && state === 'playing');
      });
    });
  }

  updateStatus(): void {
    this.device.getPlayStatus((err, state, playtime, duration) => {
      const isPresent = state === 'playing';
      this.platform.log.debug('Panasonic status:', state, playtime, duration);
      this.service.updateCharacteristic(
        this.platform.api.hap.Characteristic.OccupancyDetected,
        isPresent,
      );
    });
  }
}