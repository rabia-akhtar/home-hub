#!/usr/bin/env python3
"""
One-time iCloud 2FA setup. Run this once per Apple ID on the Pi.
  python3 findmy_setup.py rabia
  python3 findmy_setup.py clare
"""
import sys, os

BASE = os.path.dirname(os.path.abspath(__file__))

def setup(account):
    try:
        from pyicloud import PyiCloudService
    except ImportError:
        print('pyicloud not installed. Run: pip3 install pyicloud --break-system-packages')
        sys.exit(1)

    print(f'\n── iCloud setup for {account} ──')
    email    = input('Apple ID email:    ').strip()
    password = input('Apple ID password: ').strip()

    cookie_dir = os.path.join(BASE, f'.icloud_{account}')
    os.makedirs(cookie_dir, exist_ok=True)

    print('\nConnecting to iCloud...')
    api = PyiCloudService(email, password, cookie_directory=cookie_dir)

    if api.requires_2fa:
        print('Two-factor authentication required.')
        print('Check your Apple device for a 6-digit code.')
        code = input('Enter 2FA code: ').strip()
        if not api.validate_2fa_code(code):
            print('Invalid code.')
            sys.exit(1)
        print('Code accepted.')

        if api.is_trusted_session:
            print('Session trusted.')
        else:
            api.trust_session()
            print('Session trust requested.')

    print(f'\n✓ Setup complete for {account}!')
    print(f'\nAdd these to ~/home-hub/server/.env if not already there:')
    print(f'ICLOUD_EMAIL_{account.upper()}={email}')
    print(f'ICLOUD_PASSWORD_{account.upper()}={password}')

if __name__ == '__main__':
    account = sys.argv[1] if len(sys.argv) > 1 else input('Account (rabia/clare): ').strip()
    setup(account)
