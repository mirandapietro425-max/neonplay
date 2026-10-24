# Fontes, commits e licenças dos jogos do primeiro lote

## Jogos HTML5 locais
| Título | Fonte | Commit fixado | Licença indicada |
|---|---|---|---|
| 2048 | https://github.com/gabrielecirulli/2048 | `478b6ec346e3787f589e4af751378d06ded4cbbc` | MIT |
| HTML5 Asteroids | https://github.com/dmcinnes/HTML5-Asteroids | `930301cbda83ed3b120f64b801d937d077ee2da0` | MIT |
| Pac-Man Lite | https://github.com/attogram/pacman-lite | `bcab1cfa3d3250654fa7247f24e2bf0800559c46` | GPL-3.0 |
| Clumsy Bird | https://github.com/ellisonleao/clumsy-bird | `fae3d487d5102af29fb3f78431cbd45e9b83aed3` | GPL-3.0 |
| Missile Game | https://github.com/bwhmather/missile-game | `a11582cdb97f7b72123d974cf8f3bf14e3f4afee` | AGPL-3.0 |
| HexGL | https://github.com/BKcore/HexGL | `6addc95a2fce3bf05f4d751823cc054c61a16d68` | MIT |
| Particle Clicker | https://github.com/particle-clicker/particle-clicker | `d6762d54eced10cca613262072fe5b44d157aa38` | MIT |
| NS-Shaft | https://github.com/iPel/NS-SHAFT | `03a2b16660d328516fa8ff80d0428a56a1396f46` | Apache-2.0 |
| Tap Tap Tap | https://github.com/MahdiF/taptaptap | `da4b06a051c8ad1ddeb429232e56478f02811fb7` | MIT |
| The House | https://github.com/arturkot/the-house-game | `5b255969cbc5751a3d2768a2c708097c1b8d704c` | MIT |

## Jogos com backend incluído
| Jogo | Fonte | Commit fixado | Licença indicada | Execução |
|---|---|---|---|---|
| Jogos para 2 pessoas | https://github.com/tridpt/TwoPlayerGames | `c96b802232d87d58408ed653dcbe43c0a68611f6` | MIT | Serviço Node.js + WebSocket independente |
| Open IO — Snake Multiplayer | https://github.com/gibboa/Open_IO | `5d6390cf3ddc5eb20f0cc7f7d542c87e1b8c0f42` | MIT | Serviço Node.js + Express + Socket.IO independente |

Os repositórios devem manter seus arquivos de licença e avisos de copyright em suas próprias pastas. `Missile Game` informa condições diferentes para alguns arquivos em `lib`; esses avisos são preservados e devem ser revistos antes de redistribuição pública. O importador não inclui `node_modules` nem pastas `.git` dos projetos.

A lista original do PDF contém outras opções com backends; o primeiro lote não as remove do plano. `BrowserQuest` depende de Redis e de uma stack histórica Node; `Blobl.io` usa vários serviços; `AirMash` é um componente de servidor e depende de outros pacotes do projeto; WorldGuessr, Swordbattle.io, Kaetram e Freeciv-web têm repositórios grandes e requisitos próprios. Cada um deve receber implantação isolada, confirmar licença e ser testado antes de aparecer como jogável.


## Backlog de servidores da lista original

Consulte `server-games-backlog.json` para os candidatos restantes do PDF, incluindo engines e fontes de catálogo, com estado de importação e pendências explícitas. Esses projetos não são considerados jogáveis ainda, mas tampouco são excluídos por precisarem de servidor. Requisitos de banco de dados, autenticação, build, tamanho do repositório, licença e múltiplos serviços são registrados para uma importação separada.


### Custom Tetris
- Fonte: https://github.com/ondras/custom-tetris
- Commit: `0e7101ab2c80a872c64152e5b60b949e7b0c978b`
- Licença declarada: BSD-3-Clause; o arquivo `license.txt` é preservado na importação.
- Nota funcional: README do projeto informa que as partidas em rede usam Firebase. O modo local/IA pode ser servido localmente; a configuração de rede externa não é provisionada pelo NeonPlay.


### Arashi (Tempest)
- Fonte: https://github.com/stephank/arashi-js
- Commit: `cb8c908591e8c73cd23508d177c9803325b7d12b`
- Licença: GPL-2.0, arquivo `COPYING` preservado.
- Compatibilidade: o arquivo de entrada referencia uma cópia de jQuery por HTTP; o importador ajusta a URL para HTTPS para evitar mixed content.


## Reprodutibilidade da importação

Os commits-fonte ficam fixados no manifesto. Cada diretório instalado recebe `NEONPLAY-SOURCE.md` ou `NEONPLAY-INTEGRATION.md` com o commit e a revisão de integração; o workflow só reimporta arquivos estáticos quando o commit ou a revisão muda. Para atualizar uma transformação, incremente a constante `IMPORTER_REVISION` no script correspondente.
