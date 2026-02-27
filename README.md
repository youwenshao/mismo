# Zero-Trust Tailscale Mesh Network Setup

This project provisions a zero-trust mesh network for 5 macOS nodes (3 Studios, 2 MacBooks) using Tailscale and macOS's built-in `pf` (Packet Filter) firewall.

## Architecture & Design

### 1. Tailscale Mesh
- **Software**: We use the open-source CLI version of Tailscale (`tailscaled`) installed via Homebrew. This allows it to run as a background daemon, ensuring Studios auto-reconnect even if they reboot or crash.
- **Roles**:
  - **Admin (MacBooks)**: Have full access to all nodes and ports on the mesh network.
  - **Studio (Studios)**: Restricted to peer-to-peer communication on specific ports (22, 5432, 5678, 6379) to minimize the attack surface.
- **Subnet Routing**: Docker containers on Studios can reach MacBooks and vice versa because subnet routing is enabled via the `--accept-routes` flag.
- **NAT Traversal**: MacBooks on restrictive coffee shop Wi-Fi networks will automatically establish direct UDP connections using NAT traversal (STUN/TURN via DERP relays) provided by Tailscale.

### 2. External Internet Blocking
Tailscale ACLs only govern traffic *within* the Tailnet. To prevent Studios from accessing the general internet while allowing essential services (Supabase, Kimi, GitHub), we employ macOS's `pf` firewall.
- **`pf` Firewall Rules**: A custom anchor (`mismo.studio`) is injected into `/etc/pf.conf`.
- **Allowed Outbound**: 
  - All Tailscale traffic (`utun*` interfaces)
  - HTTPS (443) - Required for GitHub, Supabase, and Kimi APIs.
  - DNS (53), DHCP (67, 68), NTP (123).
- **Blocked Outbound**: Everything else is blocked.

## Prerequisites

1. Homebrew installed on all machines.
2. A Tailscale account.
3. Two separate reusable Tailscale Auth Keys generated from the Admin Console:
   - One for Admins (tagged `tag:admin`)
   - One for Studios (tagged `tag:studio`)

## Setup Instructions

### Step 1: Configure Tailscale ACLs
1. Go to the Tailscale Admin Console -> **Access Controls**.
2. Replace the default rules with the contents of `acl.hujson`.
3. Save the changes.

### Step 2: Provision Nodes
Run the setup script on each machine. It is idempotent and safe to run multiple times.

**On MacBooks (Admin):**
```bash
./tailscale.sh admin <ts-auth-key-admin>
```

**On Studios:**
```bash
./tailscale.sh studio <ts-auth-key-studio>
```

### Step 3: Enable Subnet Routing (Optional but recommended for Docker)
If you have Docker containers on a Studio that need to be accessed from a MacBook, you must advertise the subnet from the Studio.
1. On the Studio, run: `sudo tailscale up --advertise-routes=10.x.x.x/24` (replace with your Docker subnet).
2. Go to the Tailscale Admin Console -> **Machines**.
3. Edit route settings for the Studio and approve the advertised subnet.
4. The setup script already includes `--accept-routes`, so MacBooks will automatically route traffic to the container.

## Verification

Please refer to `verification.md` for detailed steps on verifying:
- MagicDNS connectivity
- Docker subnet routing
- Zero-trust ACL port restrictions
- `pf` firewall internet blocking
- Headless operation

## Troubleshooting

- **Tailscale daemon not running**: `sudo brew services restart tailscale`
- **Studio internet blocking not working**: Ensure `pf` is enabled by running `sudo pfctl -e` and check the rules using `sudo pfctl -s rules`.
- **Cannot ping nodes**: Verify the nodes are online in the Tailscale Admin Console. If using MagicDNS, ensure MagicDNS is enabled in the Tailscale DNS settings.
