# Homebrew configuration
eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null)"

# Aliases
alias docker-clean="docker system prune -af"
alias n8n-logs="docker logs -f n8n 2>/dev/null || pm2 logs n8n"

# Helper function to SSH into a specific studio
studio-ssh() {
  if [ -z "$1" ]; then
    echo "Usage: studio-ssh <1|2|3>"
    return 1
  fi
  
  # Map number to actual IPs or hostnames defined in Ansible inventory or local /etc/hosts
  local host=""
  case "$1" in
    1) host="studio-1" ;;
    2) host="studio-2" ;;
    3) host="studio-3" ;;
    *) echo "Invalid studio number. Use 1, 2, or 3."; return 1 ;;
  esac
  
  echo "Connecting to $host..."
  ssh "admin@$host"
}
