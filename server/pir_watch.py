#!/usr/bin/env python3
"""
PIR motion sensor watcher — polls GPIO via lgpio (no callback threads).
Keyes HC-SR501: push-pull, active-high, connect OUT to GPIO 17.

Wiring:
  VCC -> Pin 2 (5V)
  GND -> Pin 6
  OUT -> Pin 11 (GPIO 17)

Spawned by the Node.js server. Prints 'ready' on start, 'motion' on each trigger.
"""
import os, sys, time, signal as _sig

pin = int(os.environ.get('PIR_GPIO', '17'))

def _on_sig(signum, frame):
    print(f'killed by signal {signum} ({_sig.Signals(signum).name})', file=sys.stderr, flush=True)
    sys.exit(1)

_sig.signal(_sig.SIGTERM, _on_sig)
_sig.signal(_sig.SIGHUP,  _on_sig)

try:
    import lgpio

    h    = lgpio.gpiochip_open(0)   # chip 0 == Pi 5 header (gpiochip4 symlinks here)
    lgpio.gpio_claim_input(h, pin, lgpio.SET_PULL_DOWN)
    print(f'ready backend=lgpio-poll pin={pin}', flush=True)

    last = 0
    while True:
        val = lgpio.gpio_read(h, pin)
        if val == 1 and last == 0:   # rising edge
            print('motion', flush=True)
        last = val
        time.sleep(0.1)

except Exception as e:
    print(f'pir_watch failed: {e}', file=sys.stderr, flush=True)
    sys.exit(1)
