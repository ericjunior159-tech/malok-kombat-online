# Malok Kombat V3.0 — Online + PWA

## Versão original preservada
Esta versão deriva da **V2.7.5**, sem alterações visuais nos lutadores, no combate, na torre, na home, nos controles e nas músicas.
As modificações se limitam à hospedagem online, textos de conexão, PWA e proteção básica de capacidade do servidor.

## Funcionalidades
- Jogo completo no navegador (Chrome, Safari e similares com suporte a WebGL).
- Luta Livre, Campeonato e Multiplayer.
- Salas simultâneas, duas vagas por sala (desafiante + convidado), com código de 6 caracteres.
- Comunicação WebSocket no mesmo domínio, automaticamente WSS sob HTTPS.
- Instalação como aplicativo web (PWA) via navegador, com ícone do Malok Kombat.
- Após o primeiro carregamento, arquivos essenciais ficam em cache; multiplayer exige conexão ativa.

## Publicar no Render
1. Crie um repositório GitHub (preferencialmente privado) e envie **todos os arquivos desta pasta para a raiz do repositório**. Não envie só o ZIP.
2. No Render, crie um **Web Service** conectado ao repositório.
3. Runtime: **Node**. Build: `npm install --omit=dev`. Start: `npm start`.
4. Configure `NODE_ENV=production`. O Render fornece a porta via `PORT` automaticamente.
5. Selecione o plano. O plano grátis pode suspender o serviço após inatividade, derrubando salas; para partidas contínuas, use uma instância paga que fique ativa.
6. Ao publicar, use o endereço **https://SEU-JOGO.onrender.com**. O endereço para convidar leva `?room=CODIGO`.
7. Confira `https://SEU-JOGO.onrender.com/health` e `/diagnostico`.

**Escala:** as salas ficam na memória de um processo Node. Isso suporta várias salas ao mesmo tempo em **uma instância**. Para múltiplas instâncias/balanço horizontal será necessário coordenar sessões via Redis e roteamento adequado; esta V3.0 não implementa isso.

## Jogar e instalar
- Navegador: abra o endereço HTTPS. Em Multiplayer, crie uma sala ou entre com o código enviado.
- iPhone: Safari > Compartilhar > Adicionar à Tela de Início > Abrir como App (onde disponível).
- Android: Chrome > menu > Instalar aplicativo ou Adicionar à tela inicial.
- PWA instalado usa o mesmo servidor online para salas e lutas.

## Rodar localmente para testar
`npm start` (Node 20+). Acesse `http://localhost:8765`. Outros dispositivos só acessam pela rede local com o IP do computador.

## Importante antes da divulgação pública
O projeto contém músicas, imagens/rostos e modelos. Confirme que você tem direito de distribuição pública desses recursos, especialmente da música de abertura fornecida anteriormente. Os direitos de autor não são concedidos automaticamente pelo upload do arquivo.

## Versão online e multiplayer
- Não há contas, matchmaking público, anti-cheat nem reconexão após queda do servidor.
- O desafiante (Jogador 1) executa a simulação da luta; o convidado (Jogador 2) recebe estados e envia comandos. A latência de internet pode afetar a jogabilidade. Salas reiniciam se o servidor for reiniciado.
- Há limites básicos de salas/conexões e heartbeat. Para grande público, proteções adicionais e testes de carga são recomendados.
