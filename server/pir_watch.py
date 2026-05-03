#!/usr/bin/env python3
"""
PIR motion sensor watcher — Keyes HC-SR501 (push-pull, active-high output).

Wiring:
  VCC -> Pin 2 (5V)
  GND -> Pin 6
  OUT -> Pin 11 (GPIO 17)

Spawned by the Node.js server. Prints 'ready' on start, 'motion' on each trigger.
"""
import os, sys, signal as _sig

pin = int(os.environ.get('PIR_GPIO', '17'))

# Catch all signals so we can log what killed us
def _on_signal(signum, frame):
    import traceback
    print(f'pir_watch killed by signal {signum} ({_sig.Signals(signum).name})', file=sys.stderr, flush=True)
    traceback.print_stack(frame, file=sys.stderr)
    sys.exit(1)

for s in (_sig.SIGTERM, _sig.SIGHUP, _sig.SIGINT):
    _sig.signal(s, _on_signal)

try:
    from gpiozero import DigitalInputDevice

    def on_motion():
        print('motion', flush=True)

    pir = DigitalInputDevice(pin, pull_up=False)
    pir.when_activated = on_motion
    print(f'ready pin={pin}', flush=True)
    _sig.pause()

except Exception as e:
    print(f'pir_watch failed: {e}', file=sys.stderr, flush=True)
    sys.exit(1)
