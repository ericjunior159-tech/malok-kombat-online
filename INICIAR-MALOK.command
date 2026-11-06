#!/bin/bash
cd "$(dirname "$0")" || exit 1
printf '\n MALOK KOMBAT — MULTIPLAYER LOCAL V2.7.4\n\n'
if ! command -v node >/dev/null 2>&1; then
  echo 'Instale o Node.js LTS em https://nodejs.org/'
  read -r -p 'Pressione Enter para fechar...' _
  exit 1
fi
node server.mjs
printf '\nO servidor parou. Pressione Enter para fechar...\n'
read -r _
