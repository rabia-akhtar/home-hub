#!/usr/bin/env python3
"""
PIR motion sensor watcher — uses lgpio directly (bypasses gpiozero).
Keyes HC-SR501: push-pull, active-high, connect OUT to GPIO 17.

Wiring:
  VCC -> Pin 2 (5V)
  GND -> Pin 6
  OUT -> Pin 11 (GPIO 17)

Spawned by the Node.js server. Prints 'ready' on start, 'motion' on each trigger.
"""
import os, sys, signal as _sig
from signal import pause

def _on_sig(signum, frame):
    print(f'killed by signal {signum} ({_sig.Signals(signum).name})', file=sys.stderr, flush=True)
    sys.exit(1)
_sig.signal(_sig.SIGTERM, _on_sig)
_sig.signal(_sig.SIGHUP,  _on_sig)

pin  = int(os.environ.get('PIR_GPIO', '17'))

try:
    import lgpio

    def on_motion(chip, gpio, level, tick):
        if level == 1:
            print('motion', flush=True)

    # chip=0 is the Pi 5 GPIO header (/dev/gpiochip4 is a symlink to gpiochip0)
    h = lgpio.gpiochip_open(0)
    lgpio.gpio_claim_input(h, pin, lgpio.SET_PULL_DOWN)
    lgpio.callback(h, pin, lgpio.RISING_EDGE, on_motion)
    print(f'ready backend=lgpio pin={pin}', flush=True)
    pause()

except Exception as e:
    print(f'pir_watch failed: {e}', file=sys.stderr, flush=True)
    sys.exit(1)
