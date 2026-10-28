#!/usr/bin/env python3
"""Gera 1 unit systemd por loja a partir de saas/lojas.json.
Uso: python3 scripts/../deploy/gerar-units.py [--dir deploy/units]
Saída: deploy/units/loja-<slug>.service + comandos de enable.
"""
import argparse
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument("--dir", default=os.path.join(BASE, "deploy", "units"))
ap.add_argument("--srv", default="/srv/superloja")
a = ap.parse_args()

reg = json.load(open(os.path.join(BASE, "saas", "lojas.json"), encoding="utf-8"))
os.makedirs(a.dir, exist_ok=True)
for l in reg.get("lojas", []):
    path = os.path.join(a.dir, f"loja-{l['slug']}.service")
    open(path, "w", encoding="utf-8").write(
        f"""[Unit]
Description=Super Loja - {l['slug']} (Jordao Neto Tech)
After=network.target
StartLimitIntervalSec=300
StartLimitBurst=30

[Service]
Type=simple
User=www-data
WorkingDirectory={a.srv}/lojas/{l['slug']}
EnvironmentFile=-{a.srv}/.env.prod
Environment=PORT={l['porta']}
ExecStart=/usr/bin/python3 server.py --host 127.0.0.1 --port {l['porta']}
Restart=always
RestartSec=5
MemoryMax=512M

[Install]
WantedBy=multi-user.target
""")
    print(f"gerado: {path}")

print("\nPara ativar:")
print(f"  sudo cp {a.dir}/*.service /etc/systemd/system/")
print("  sudo systemctl daemon-reload")
for l in reg.get("lojas", []):
    print(f"  sudo systemctl enable --now loja-{l['slug']}")
