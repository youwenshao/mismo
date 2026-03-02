---
name: tailscale-mesh-network
overview: Deploy a zero-trust mesh using Tailscale via Homebrew. We will use Tailscale ACLs to enforce port restrictions, and macOS `pf` (Packet Filter) on the Studios to restrict external internet access.
todos:
  - id: create-acls
    content: Write `acl.hujson` with tag-based access controls for Admin and Studio roles
    status: completed
  - id: create-setup-script
    content: Write `tailscale.sh` idempotent installation and configuration script
    status: completed
  - id: add-pf-rules
    content: Add macOS `pf` firewall configuration logic to the setup script for the Studios
    status: completed
  - id: verification-steps
    content: Provide verification steps using MagicDNS
    status: completed
isProject: false
---

# Zero-Trust Tailscale Mesh Network Setup

We will configure your 5 macOS nodes using Tailscale. To fulfill the headless and strict routing requirements, we will install the open-source CLI version of Tailscale via Homebrew (`brew install tailscale`), which runs as a background daemon (`tailscaled`) independently of the macOS GUI.

### 1. Tailscale ACLs (`acl.hujson`)

We will provide a declarative HuJSON file to paste into your Tailscale Admin Console. It will use tags (`tag:admin` and `tag:studio`) to enforce the zero-trust rules:

- `tag:admin` (MacBooks) can connect to everything.
- `tag:studio` (Studios) can only connect to other nodes on ports `5678`, `6379`, `5432`, and `22`.

### 2. Idempotent Setup Script (`tailscale.sh`)

We will write a bash script that takes a role (`admin` or `studio`) and a Tailscale Auth Key.

- **Installation**: Uses `brew list tailscale || brew install tailscale` to ensure the CLI daemon is installed.
- **Daemon**: Starts the daemon to run on boot (`sudo brew services start tailscale`).
- **Authentication**: Runs `sudo tailscale up --authkey=$TS_KEY --advertise-tags=tag:$ROLE` to automatically join the mesh.
- **Subnet Routing**: The `--accept-routes` flag will be passed so Docker containers can communicate seamlessly across the mesh.

### 3. Studio External Internet Blocking (`pf` Firewall)

Because Tailscale ACLs only govern traffic _inside_ the VPN, we will configure the macOS built-in Packet Filter (`pf`) on the Studios.
The script will inject a custom anchor into `/etc/pf.conf` that:

- Allows all traffic on the `utun`\* (Tailscale) interfaces.
- Blocks general outbound traffic on physical interfaces (Wi-Fi/Ethernet).
- Allows outbound HTTPS (port 443) traffic. _Note: Since GitHub, Supabase, and Kimi use dynamic CDN IP addresses, standard `pf` cannot block by domain name effectively. Restricting external traffic to strictly HTTPS (443) and DNS (53) while blocking other ports is the most robust host-level approach without installing a third-party application firewall like Little Snitch._

### 4. Verification

Once deployed, we will verify the mesh network using the default MagicDNS names (e.g., `ping studio-1.tailxxxxx.ts.net`). The Tailscale daemon automatically handles NAT traversal for the MacBooks on coffee shop networks.
