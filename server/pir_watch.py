#!/usr/bin/env python3
"""
PIR motion sensor watcher — gpiozero with lgpio backend.
Handles Pi 4 (chip 0) and Pi 5 (chip 4) automatically.
Spawned by the Node.js server. Prints 'ready' on start, 'motion' on each trigger.
Wiring: VCC → Pin 2 (5V), GND → Pin 6, OUT → Pin 11 (GPIO 17 BCM)
"""
import os
import sys

pin = int(os.environ.get('PIR_GPIO', '17'))

def on_motion():
    print('motion', flush=True)

from gpiozero import MotionSensor, Device
from signal import pause

# lgpio is the only backend that works on Pi 5.
# Pi 4 and earlier use chip=0; Pi 5 uses chip=4.
try:
    from gpiozero.pins.lgpio import LGPIOFactory
except ImportError:
    print('error lgpio not installed — run: sudo apt install python3-lgpio', flush=True, file=sys.stderr)
    sys.exit(1)

last_err = None
for chip in (4, 0):  # Pi 5 uses chip 4; Pi 4 and earlier use chip 0
    try:
        Device.pin_factory = LGPIOFactory(chip=chip)
        pir = MotionSensor(pin, queue_len=1, threshold=0.5, sample_rate=10)
        pir.when_motion = on_motion
        print(f'ready backend=lgpio chip={chip} pin={pin}', flush=True)
        pause()
        sys.exit(0)
    except Exception as e:
        last_err = str(e)
        try:
            Device.pin_factory.close()
        except Exception:
            pass

print(f'error lgpio chips 0 and 4 both failed — last error: {last_err}', flush=True, file=sys.stderr)
print('HINT: Make sure no other process owns the GPIO pin:', file=sys.stderr)
print('  pkill -f pir_watch.py', file=sys.stderr)
print('  sudo usermod -a -G gpio $USER  (then log out/in)', file=sys.stderr)
sys.exit(1)
