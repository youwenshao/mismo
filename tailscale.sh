#!/bin/bash
set -e

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <role> <auth_key>"
    echo "Roles: admin, studio"
    exit 1
fi

ROLE=$1
TS_KEY=$2

if [[ "$ROLE" != "admin" && "$ROLE" != "studio" ]]; then
    echo "Error: role must be 'admin' or 'studio'"
    exit 1
fi

echo "--- Installing Tailscale ---"
if ! command -v tailscale &>/dev/null; then
    echo "Tailscale not found. Installing via Homebrew..."
    brew install tailscale
else
    echo "Tailscale is already installed."
fi

echo "--- Starting tailscaled daemon ---"
# Start the background daemon so it auto-starts on boot
sudo brew services start tailscale

echo "--- Authenticating Node ($ROLE) ---"
# Authenticate and advertise the appropriate tag. 
# --accept-routes enables subnet routing (allowing access to Docker containers if routes are advertised)
sudo tailscale up --authkey="$TS_KEY" --advertise-tags="tag:$ROLE" --accept-routes

if [ "$ROLE" == "studio" ]; then
    echo "--- Configuring macOS pf firewall for Studio ---"
    PF_ANCHOR="/etc/pf.anchors/mismo.studio"
    
    # Create the custom pf anchor for the zero-trust block
    sudo tee "$PF_ANCHOR" > /dev/null <<EOF
# Allow local loopback
pass quick on lo0 all

# Allow all traffic on Tailscale interfaces
pass in quick on utun* all
pass out quick on utun* all

# Allowed HTTPS destinations (principle of least privilege)
# Supabase (AWS Global Accelerator ranges)
pass out quick proto tcp to 13.248.0.0/16 port 443
pass out quick proto tcp to 76.223.0.0/16 port 443
# GitHub
pass out quick proto tcp to 140.82.112.0/20 port 443
pass out quick proto tcp to 185.199.108.0/22 port 443
pass out quick proto tcp to 143.55.64.0/20 port 443
# Kimi API (Moonshot AI)
pass out quick proto tcp to 47.236.0.0/16 port 443
# npm registry (for package installs)
pass out quick proto tcp to 104.16.0.0/12 port 443

# DNS (restrict to Tailscale MagicDNS + system resolver)
pass out quick proto udp to 100.100.100.100 port 53
pass out quick proto tcp to 100.100.100.100 port 53
# Fallback DNS (Cloudflare)
pass out quick proto udp to 1.1.1.1 port 53
pass out quick proto udp to 1.0.0.1 port 53

# DHCP and NTP (required for network operation)
pass out quick proto udp to any port { 67, 68, 123 }

# Block all other outbound internet traffic
block out quick all
EOF

    # Inject the anchor into the main pf.conf if not already present
    if ! grep -q 'anchor "mismo.studio"' /etc/pf.conf; then
        echo "Injecting pf anchor into /etc/pf.conf..."
        sudo cp /etc/pf.conf /etc/pf.conf.bak
        
        # Append the anchor definitions to the end of pf.conf
        echo 'anchor "mismo.studio"' | sudo tee -a /etc/pf.conf > /dev/null
        echo 'load anchor "mismo.studio" from "/etc/pf.anchors/mismo.studio"' | sudo tee -a /etc/pf.conf > /dev/null
    fi
    
    echo "--- Reloading pf rules ---"
    # Validate the file first, then load it, and finally enable pf
    sudo pfctl -n -f /etc/pf.conf
    sudo pfctl -f /etc/pf.conf
    sudo pfctl -E
    
    echo "Studio firewall rules applied successfully."
fi

echo "--- Setup complete for node role: $ROLE ---"
echo "Your node should now be connected to the Tailscale mesh network."
