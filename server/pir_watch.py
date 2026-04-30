#!/usr/bin/env python3
"""
PIR motion sensor watcher using gpiozero (pre-installed on all Pi OS versions).
Spawned by the Node.js server. Prints 'ready' on start, 'motion' on each trigger.
Wiring: VCC -> Pin 2 (5V), GND -> Pin 6, OUT -> Pin 11 (GPIO 17)
"""
import os
import sys
from gpiozero import MotionSensor
from signal import pause

pin = int(os.environ.get('PIR_GPIO', '17'))

def on_motion():
    print('motion', flush=True)

pir = MotionSensor(pin)
pir.when_motion = on_motion
print('ready', flush=True)
pause()
