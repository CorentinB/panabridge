# Panabridge

Panabridge is a Homebridge plugin for Panasonic Blu-ray players, focused primarily on retrieving the playback status for light automations in HomeKit. It is derived from the [Home Assistant Panasonic Blu-ray integration](https://www.home-assistant.io/integrations/panasonic_bluray/) and [python-panacotta](https://github.com/u1f35c/python-panacotta).

## Overview

This plugin allows you to query the play status (playing, paused, standby/stopped, or off) of your Panasonic Blu-ray player. The main goal is to enable simple automations based on the player's status in your HomeKit environment.

## Tested Device

- **Model:** UB820  
- **Firmware:** 1.82

> **Note:**  
> For the plugin to work correctly, make sure that **Network Voice Control** is enabled on your Panasonic Blu-ray player.
