#!/bin/sh
set -e

# Host domain to use for cert paths; default to 'aggregator'
HOST_DOMAIN=${HOST_DOMAIN:-aggregator}

# Replace placeholder in nginx conf
if [ -f /etc/nginx/conf.d/default.conf ]; then
  sed -i "s/__HOST_DOMAIN__/${HOST_DOMAIN}/g" /etc/nginx/conf.d/default.conf
fi

# If Let's Encrypt certs exist under /etc/letsencrypt/live/$HOST_DOMAIN, use them.
# Otherwise copy dev self-signed certs from /certs into that path so nginx can start.
LE_DIR=/etc/letsencrypt/live/$HOST_DOMAIN

if [ ! -f "$LE_DIR/fullchain.pem" ] || [ ! -f "$LE_DIR/privkey.pem" ]; then
  echo "Let's Encrypt certs not found for $HOST_DOMAIN; checking for dev certs at /certs"
  if [ -f /certs/server.crt.pem ] && [ -f /certs/server.key.pem ]; then
    echo "Copying dev certs into $LE_DIR"
    mkdir -p /etc/letsencrypt/live/$HOST_DOMAIN
    cp /certs/server.crt.pem /etc/letsencrypt/live/$HOST_DOMAIN/fullchain.pem
    cp /certs/server.key.pem /etc/letsencrypt/live/$HOST_DOMAIN/privkey.pem
  else
    echo "No certs available; nginx will likely fail to start unless certs are provided."
  fi
else
  echo "Found Let's Encrypt certs for $HOST_DOMAIN"
fi

exec nginx -g 'daemon off;'
