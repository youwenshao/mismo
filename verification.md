# Verification Steps for Tailscale Zero-Trust Mesh

After successfully running `./tailscale.sh` on all 5 nodes, follow these steps to verify your setup:

### 1. Identify MagicDNS Names
Run the following command on any connected node to see the list of peers and their assigned MagicDNS names:
```bash
tailscale status
```
*Note: Your devices will have names like `studio-1.tailxxxxx.ts.net` or `macbook-pro.tailxxxxx.ts.net`.*

### 2. Verify Connectivity (Ping)
Ensure that you can ping a Studio from a MacBook (and vice versa):
```bash
# Run from MacBook
ping studio-1.tailxxxxx.ts.net

# Run from Studio
ping macbook-pro.tailxxxxx.ts.net
```

### 3. Verify Subnet Routing (Docker Containers)
Since the script uses `--accept-routes`, Docker containers on the Studios can be reached from the MacBook as long as the routes are advertised. 
If your Studio advertises a subnet (e.g., `10.0.0.0/24`), confirm that your MacBook can reach it without explicit port forwarding.

### 4. Verify Zero-Trust ACL Policies
Test the port restrictions applied in your `acl.hujson` file via `nc` (netcat):

**From the MacBook (Admin):**
```bash
# Should SUCCEED (Admin has access to all ports)
nc -vz studio-1.tailxxxxx.ts.net 22     # SSH
nc -vz studio-1.tailxxxxx.ts.net 8080   # Any unlisted port
```

**From a Studio (Peer-to-Peer restriction):**
```bash
# Should SUCCEED (Allowed ports: 22, 5432, 5678, 6379)
nc -vz studio-2.tailxxxxx.ts.net 5432

# Should FAIL / TIMEOUT (Blocked by ACL)
nc -vz studio-2.tailxxxxx.ts.net 8080
```

### 5. Verify Studio External Internet Blocking (`pf` Firewall)
From a Studio node, test standard internet access vs essential services:

```bash
# Should SUCCEED (HTTPS is allowed)
curl -I https://github.com
curl -I https://mismo.supabase.co

# Should FAIL / TIMEOUT (Blocked by pf firewall)
curl -I http://neverssl.com   # Port 80
telnet google.com 80
```

### 6. Verify NAT Traversal (Coffee Shop Scenario)
When a MacBook is on a restrictive coffee shop Wi-Fi network:
- No manual configuration is needed. Tailscale automatically establishes direct peer-to-peer UDP connections using NAT traversal (STUN/TURN via DERP relays).
- Test by joining a public Wi-Fi network or a mobile hotspot and running `ping studio-1.tailxxxxx.ts.net`.

### 7. Verify Headless Operation
- Restart a Studio node.
- The `tailscaled` daemon runs as a background service via Homebrew (`sudo brew services start tailscale`).
- Check that the node reappears as "Online" in the Tailscale Admin Console and can be pinged *before* you log into the macOS GUI.
