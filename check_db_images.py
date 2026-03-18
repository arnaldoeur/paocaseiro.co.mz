import os
import urllib.request
import json

env_vars = {}
with open('.env', 'r') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env_vars[k] = v.strip('"\'')

url = f"{env_vars.get('VITE_SUPABASE_URL')}/rest/v1/products?select=name,image&limit=10"
req = urllib.request.Request(url, headers={
    'apikey': env_vars.get('VITE_SUPABASE_ANON_KEY'),
    'Authorization': f"Bearer {env_vars.get('VITE_SUPABASE_ANON_KEY')}"
})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print(e)
