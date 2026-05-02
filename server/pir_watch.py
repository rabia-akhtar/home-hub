#!/usr/bin/env python3
"""
PIR motion sensor watcher — supports both:
  - Inland HC-SR501 type (S/V/G labels, active-high push-pull output)
  - Panasonic PaPIRs EKMB/EKMC/AMN series (OUT/GND/Vdd, open-collector output)

For Panasonic PaPIRs: needs pull_up=False so Pi's internal pull-down holds the
floating open-collector output LOW when nothing is detected.

Wiring (Panasonic PaPIRs NaPiOn):
  Vdd -> Pin 2 (5V)
  GND -> Pin 6
  OUT -> Pin 11 (GPIO 17)

Spawned by the Node.js server. Prints 'ready ...' on start, 'motion' on each trigger.
"""
import os
import sys
from signal import pause

pin = int(os.environ.get('PIR_GPIO', '17'))
started = False

# Try lgpio with chip=4 (Pi 5 GPIO header), then chip=0 (Pi 4)
for chip in (4, 0):
    try:
        from gpiozero.pins.lgpio import LGPIOFactory
        from gpiozero import Device, MotionSensor
        Device.pin_factory = LGPIOFactory(chip=chip)

        def on_motion():
            print('motion', flush=True)

        # pull_up=False enables the Pi's internal pull-down resistor.
        # Required for open-collector sensors (Panasonic PaPIRs).
        # Also works correctly with HC-SR501 push-pull sensors.
        pir = MotionSensor(pin, pull_up=False, queue_len=1, threshold=0.5, sample_rate=10)
        pir.when_motion = on_motion
        print(f'ready backend=lgpio chip={chip} pin={pin}', flush=True)
        started = True
        pause()
        break
    except Exception as e:
        print(f'lgpio chip={chip} failed: {e}', file=sys.stderr, flush=True)

if not started:
    try:
        from gpiozero import MotionSensor
        from signal import pause

        def on_motion():
            print('motion', flush=True)

        pir = MotionSensor(pin, pull_up=False)
        pir.when_motion = on_motion
        print(f'ready backend=gpiozero(default) pin={pin}', flush=True)
        pause()
    except Exception as e:
        print(f'gpiozero fallback failed: {e}', file=sys.stderr, flush=True)
        sys.exit(1)
