#!/usr/bin/env python3
"""
Find My integration via icloudpy.
Usage:
  python3 findmy.py list  --account rabia|clare
  python3 findmy.py ring  --account rabia|clare --device <id>
"""
import sys, json, os, argparse

BASE = os.path.dirname(os.path.abspath(__file__))

def cookie_dir(account):
    d = os.path.join(BASE, f'.icloud_{account}')
    os.makedirs(d, exist_ok=True)
    return d

def get_api(account):
    try:
        from icloudpy import ICloudPyService
    except ImportError:
        print(json.dumps({'error': 'icloudpy not installed — run: pip3 install icloudpy'}))
        sys.exit(3)

    key = account.upper()
    email    = os.environ.get(f'ICLOUD_EMAIL_{key}')
    password = os.environ.get(f'ICLOUD_PASSWORD_{key}')
    if not email or not password:
        print(json.dumps({'error': f'ICLOUD_EMAIL_{key} / ICLOUD_PASSWORD_{key} not set in .env'}))
        sys.exit(1)

    api = ICloudPyService(email, password, cookie_directory=cookie_dir(account))

    if api.requires_2fa:
        print(json.dumps({'error': '2FA_REQUIRED', 'account': account}))
        sys.exit(2)

    return api

def device_type_icon(cls):
    c = (cls or '').lower()
    if 'iphone' in c:  return 'iphone'
    if 'ipad'   in c:  return 'ipad'
    if 'mac'    in c:  return 'mac'
    if 'watch'  in c:  return 'watch'
    if 'airpod' in c:  return 'airpods'
    return 'device'

def main():
    p = argparse.ArgumentParser()
    p.add_argument('command', choices=['list', 'ring'])
    p.add_argument('--account', required=True, choices=['rabia', 'clare'])
    p.add_argument('--device',  help='Device identifier for ring command')
    args = p.parse_args()

    api = get_api(args.account)

    if args.command == 'list':
        out = []

        # iCloud devices (iPhone, iPad, Mac, Watch…)
        for d in api.devices:
            c = d.content
            loc = c.get('location') or {}
            out.append({
                'id':       c.get('id', ''),
                'name':     c.get('name', 'Unknown'),
                'type':     device_type_icon(c.get('deviceClass', '')),
                'battery':  c.get('batteryLevel'),          # 0.0–1.0
                'charging': c.get('batteryStatus') == 'Charging',
                'online':   c.get('deviceStatus') == '200',
                'lat':      loc.get('latitude'),
                'lng':      loc.get('longitude'),
                'can_ring': True,
                'account':  args.account,
            })

        # Find My items (AirTags, keys, etc.)
        try:
            items = getattr(api, 'findmy', None)
            if items:
                for item in (items.items if hasattr(items, 'items') else []):
                    loc = item.get('location') or {}
                    out.append({
                        'id':       item.get('identifier', ''),
                        'name':     item.get('name', 'Unknown Item'),
                        'type':     'item',
                        'battery':  None,
                        'charging': False,
                        'online':   item.get('isNearbyFindMyDevice', False),
                        'lat':      loc.get('latitude'),
                        'lng':      loc.get('longitude'),
                        'can_ring': True,
                        'account':  args.account,
                    })
        except Exception:
            pass

        print(json.dumps(out))

    elif args.command == 'ring':
        if not args.device:
            print(json.dumps({'error': 'Device ID required'}))
            sys.exit(1)

        # Try iCloud devices first
        for d in api.devices:
            if d.content.get('id') == args.device:
                d.play_sound()
                print(json.dumps({'ok': True}))
                sys.exit(0)

        # Try Find My items
        try:
            items = getattr(api, 'findmy', None)
            if items:
                for item in (items.items if hasattr(items, 'items') else []):
                    if item.get('identifier') == args.device:
                        # AirTag play sound — icloudpy may or may not support this
                        if hasattr(item, 'play_sound'):
                            item.play_sound()
                        print(json.dumps({'ok': True}))
                        sys.exit(0)
        except Exception as e:
            print(json.dumps({'error': str(e)}))
            sys.exit(1)

        print(json.dumps({'error': 'Device not found'}))
        sys.exit(1)

if __name__ == '__main__':
    main()
