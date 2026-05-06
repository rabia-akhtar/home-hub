#!/usr/bin/env python3
"""
PIR motion sensor watcher — libgpiod (no background threads).
Keyes HC-SR501: push-pull, active-high, connect OUT to GPIO 17.

Wiring:
  VCC -> Pin 2 (5V)
  GND -> Pin 6
  OUT -> Pin 11 (GPIO 17)

Install: sudo apt install python3-gpiod
Spawned by the Node.js server. Prints 'ready' on start, 'motion' on each trigger.
"""
import os, sys, time, signal as _sig, ctypes, ctypes.util

pin = int(os.environ.get('PIR_GPIO', '17'))

# ── Die automatically if the parent Node process exits (Linux only) ──────────
# prctl(PR_SET_PDEATHSIG, SIGKILL): kernel sends SIGKILL to us if our parent dies.
# This ensures no orphan processes even though we ignore SIGTERM below.
try:
    _libc = ctypes.CDLL(ctypes.util.find_library('c'), use_errno=True)
    _libc.prctl(1, 9)  # PR_SET_PDEATHSIG=1, SIGKILL=9
except Exception:
    pass  # non-Linux — skip

# ── Ignore SIGTERM — Node uses SIGKILL (pkill -9) for cleanup ────────────────
# SIGTERM is being sent spuriously (possibly by the lgpio internal thread of a
# stale previous process in the same session, or a pkill timing race).
# Ignoring it lets this process survive and keep the sensor running.
# SIGHUP is still respected so shell session close works.
_sig.signal(_sig.SIGTERM, _sig.SIG_IGN)

def _on_hup(signum, frame):
    print(f'exiting on SIGHUP — PID={os.getpid()}', file=sys.stderr, flush=True)
    sys.exit(0)
_sig.signal(_sig.SIGHUP, _on_hup)


def backend_gpiod_v2():
    """python3-gpiod >= 2.x (Pi OS Bookworm default)"""
    import gpiod
    from gpiod.line import Direction, Value  # raises ImportError on v1
    for chippath in ['/dev/gpiochip4', '/dev/gpiochip0']:
        if not os.path.exists(chippath):
            continue
        try:
            with gpiod.request_lines(
                chippath,
                consumer='pir_watch',
                config={pin: gpiod.LineSettings(direction=Direction.INPUT)},
            ) as req:
                print(f'ready backend=gpiod-v2 chip={chippath} pin={pin}', flush=True)
                last = 0
                while True:
                    # Compare against the enum directly — str() trick is unreliable
                    # because "INACTIVE".endswith("ACTIVE") is True in Python.
                    val = 1 if req.get_value(pin) == Value.ACTIVE else 0
                    if val == 1 and last == 0:
                        print('motion', flush=True)
                    last = val
                    time.sleep(0.1)
        except Exception:
            continue
    raise RuntimeError('gpiod-v2: no working chip found')


def backend_gpiod_v1():
    """python3-gpiod 1.x"""
    import gpiod
    if not hasattr(gpiod, 'LINE_REQ_DIR_IN'):
        raise ImportError('not gpiod v1 (LINE_REQ_DIR_IN missing)')
    for chippath in ['/dev/gpiochip4', '/dev/gpiochip0']:
        if not os.path.exists(chippath):
            continue
        try:
            chip = gpiod.Chip(chippath)
            line = chip.get_line(pin)
            line.request(consumer='pir_watch', type=gpiod.LINE_REQ_DIR_IN)
            print(f'ready backend=gpiod-v1 chip={chippath} pin={pin}', flush=True)
            last = 0
            while True:
                val = line.get_value()
                if val == 1 and last == 0:
                    print('motion', flush=True)
                last = val
                time.sleep(0.1)
        except Exception:
            continue
    raise RuntimeError('gpiod-v1: no working chip found')


def backend_sysfs():
    """sysfs GPIO — no library required"""
    base = f'/sys/class/gpio/gpio{pin}'
    export_path = '/sys/class/gpio/export'
    if not os.path.exists(export_path):
        raise RuntimeError('sysfs not available')
    if not os.path.exists(base):
        open(export_path, 'w').write(str(pin))
        time.sleep(0.25)
    open(f'{base}/direction', 'w').write('in')
    print(f'ready backend=sysfs pin={pin}', flush=True)
    last = 0
    while True:
        val = int(open(f'{base}/value').read().strip())
        if val == 1 and last == 0:
            print('motion', flush=True)
        last = val
        time.sleep(0.1)


errors = []
for backend in [backend_gpiod_v2, backend_gpiod_v1, backend_sysfs]:
    try:
        backend()
        sys.exit(0)
    except ImportError as e:
        errors.append(f'{backend.__name__}: not installed ({e})')
    except Exception as e:
        errors.append(f'{backend.__name__}: {e}')

print('pir_watch failed — tried all backends:', file=sys.stderr, flush=True)
for err in errors:
    print(f'  {err}', file=sys.stderr, flush=True)
print('Fix: sudo apt install python3-gpiod', file=sys.stderr, flush=True)
sys.exit(1)
