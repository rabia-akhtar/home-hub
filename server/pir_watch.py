#!/usr/bin/env python3
"""
PIR motion sensor watcher — gpiozero with automatic backend fallback.
Spawned by the Node.js server. Prints 'ready' on start, 'motion' on each trigger.
Wiring: VCC → Pin 2 (5V), GND → Pin 6, OUT → Pin 11 (GPIO 17 BCM)
"""
import os
import sys
import time

pin = int(os.environ.get('PIR_GPIO', '17'))

def on_motion():
    print('motion', flush=True)

# Try each backend in order until one works
backends = []

# 1. Try lgpio (Bookworm default)
try:
    from gpiozero.pins.lgpio import LGPIOFactory
    backends.append(('lgpio', LGPIOFactory))
except Exception:
    pass

# 2. Try RPi.GPIO (Buster/Bullseye default)
try:
    from gpiozero.pins.rpigpio import RPiGPIOFactory
    backends.append(('rpigpio', RPiGPIOFactory))
except Exception:
    pass

# 3. Try pigpio (needs pigpiod running)
try:
    from gpiozero.pins.pigpio import PiGPIOFactory
    backends.append(('pigpio', PiGPIOFactory))
except Exception:
    pass

from gpiozero import MotionSensor, Device
from signal import pause

last_err = None
for name, factory_cls in backends:
    try:
        Device.pin_factory = factory_cls()
        pir = MotionSensor(pin, queue_len=1, threshold=0.5, sample_rate=10)
        pir.when_motion = on_motion
        print(f'ready backend={name} pin={pin}', flush=True)
        pause()
        sys.exit(0)
    except Exception as e:
        last_err = f'{name}: {e}'
        print(f'error backend={name}: {e}', flush=True, file=sys.stderr)
        try:
            Device.pin_factory.close()
        except Exception:
            pass

# All backends failed — print clear diagnostics
print(f'error all_backends_failed last={last_err}', flush=True, file=sys.stderr)
print('HINT: Run these on the Pi to fix:', file=sys.stderr)
print('  sudo apt install python3-lgpio python3-rpi.gpio', file=sys.stderr)
print('  sudo usermod -a -G gpio $USER   (then log out and back in)', file=sys.stderr)
sys.exit(1)
