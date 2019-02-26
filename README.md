
# Ted IoT Device Simulator

## INTRODUCTION
Ted IoT Device Simulator is a simple application that enables to simulate common virtual entities including bulbs, fire sensor and self-driving car.

![Simulator Screenshot](https://raw.githubusercontent.com/ykhwong/ted_iot_dev/master/resources/bk.png)

## PREREQUISITES
* Microsoft Windows 7 or higher (x86-64 only)
* Any solution that receives the HTTP POST method from the simulator

## HOW TO USE
* Download from https://github.com/ykhwong/ted_iot_dev/releases and extract the archive.
* Run the exeutbale.

## FEATURES
* Self-Driving Car
* IoT Bulb
* IoT Flame Sensor
* Demo Auto Runner

## GPX path
The current GPX used by the Self-Driving Car represents a track from Malaysia to Singapore. To change the route, please follow:

* Go to https://maps.google.com and create a route with the car driving mode. (e.g, Tokyo Station to Akihabara Station)
* Copy the URI address from the web browser.
* Go to https://mapstogpx.com/ and enter the URI that you copied from the Google Maps.
* Generate and download a new GPX file. Rename the file to "trace.gpx".
* Copy the trace.gpx to the path where the device simulator software is placed.

## SEE ALSO
* N3N's Wizeye solution from https://n3n.io/
