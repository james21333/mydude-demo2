#!/usr/bin/env python3
import json, os, urllib.request, urllib.error, sys

TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]

def api(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print("HTTP", e.code, err)
        raise

zones = api("GET", "/zones?name=1min.to")
if not zones.get("success") or not zones.get("result"):
    print("Zone lookup failed", zones)
    sys.exit(1)
zone_id = zones["result"][0]["id"]
print("ZONE_ID", zone_id)

def upsert(name, content):
    existing = api("GET", f"/zones/{zone_id}/dns_records?type=CNAME&name={name}")
    records = existing.get("result") or []
    body = {"type": "CNAME", "name": name, "content": content, "proxied": True, "ttl": 1}
    if records:
        rid = records[0]["id"]
        print("Updating", name, rid)
        res = api("PUT", f"/zones/{zone_id}/dns_records/{rid}", body)
    else:
        print("Creating", name)
        res = api("POST", f"/zones/{zone_id}/dns_records", body)
    print("success", res.get("success"), "errors", res.get("errors"))
    if not res.get("success"):
        sys.exit(1)
    r = res.get("result") or {}
    print(r.get("name"), "->", r.get("content"), "proxied=", r.get("proxied"))

upsert("1min.to", "onemin-to.pages.dev")
upsert("www.1min.to", "onemin-to.pages.dev")

listing = api("GET", f"/zones/{zone_id}/dns_records?per_page=50")
print("All records:")
for r in listing.get("result") or []:
    print(r["type"], r["name"], "->", r["content"], "proxied=", r.get("proxied"))
