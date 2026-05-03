#!/usr/bin/env python3
"""
PIR motion sensor watcher.
Works with both HC-SR501 (Keyes) push-pull and open-collector sensors.
pull_up=False enables the Pi's internal pull-down resistor.

Wiring (Keyes PIR / HC-SR501):
  VCC -> Pin 2 (5V)
  GND -> Pin 6
  OUT -> Pin 11 (GPIO 17)

Spawned by the Node.js server. Prints 'ready ...' on start, 'motion' on each trigger.
"""
import os, sys
from signal import pause

pin = int(os.environ.get('PIR_GPIO', '17'))

try:
    from gpiozero import MotionSensor

    def on_motion():
        print('motion', flush=True)

    pir = MotionSensor(pin, pull_up=False, queue_len=1, threshold=0.5, sample_rate=10)
    pir.when_motion = on_motion
    print(f'ready pin={pin}', flush=True)
    pause()

except Exception as e:
    print(f'pir_watch failed: {e}', file=sys.stderr, flush=True)
    sys.exit(1)
