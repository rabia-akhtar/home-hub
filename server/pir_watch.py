#!/usr/bin/env python3
"""
PIR motion sensor watcher — Keyes HC-SR501 (push-pull, active-high output).

Wiring:
  VCC -> Pin 2 (5V)
  GND -> Pin 6
  OUT -> Pin 11 (GPIO 17)

Spawned by the Node.js server. Prints 'ready' on start, 'motion' on each trigger.
"""
import os, sys
from signal import pause

pin = int(os.environ.get('PIR_GPIO', '17'))

try:
    from gpiozero import DigitalInputDevice

    def on_motion():
        print('motion', flush=True)

    pir = DigitalInputDevice(pin, pull_up=False)
    pir.when_activated = on_motion
    print(f'ready pin={pin}', flush=True)
    pause()

except Exception as e:
    print(f'pir_watch failed: {e}', file=sys.stderr, flush=True)
    sys.exit(1)
