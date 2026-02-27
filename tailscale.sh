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

# Allow essential outbound traffic:
# HTTPS (443) for GitHub/Supabase/Kimi
# DNS (53) tcp/udp
# DHCP (67, 68) udp
# NTP (123) udp
pass out quick proto tcp to any port { 443, 53 }
pass out quick proto udp to any port { 53, 67, 68, 123 }

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
