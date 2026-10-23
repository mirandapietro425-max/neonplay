# Fontes e licenças — NeonPlay

Este documento acompanha o catálogo das referências reunidas pelo usuário no arquivo `LISTA-COMPLETA-FINAL-jogos-emuladores-archive.pdf`. O catálogo registra 135 entradas da lista, agrupando URLs repetidas para exibir 132 fontes distintas. Os nomes e links vêm da lista enviada; os tags são uma classificação editorial para navegação, não uma auditoria jurídica nem atestado de que o jogo está executando no NeonPlay.

## Regras de integração

- Repositório público não significa permissão automática para republicar todos os arquivos, imagens, músicas, fontes ou marcas nele presentes.
- Inspecionar sempre o arquivo `LICENSE`, avisos de terceiros e termos de assets; se não há licença clara, não importar para hospedagem pública.
- Licenças como MIT exigem conservar avisos pertinentes; copyleft como GPL pode impor obrigações na distribuição de obras derivadas. Conferir a versão exata da licença e o conteúdo copiado.
- Jogos multiplayer podem precisar de WebSocket/backend persistente, banco de dados e configuração antiabuso. A homepage estática não os transforma em multiplayer funcional.
- Emuladores são software; BIOS, ROMs e jogos comerciais são conteúdo separado e devem ser licenciados ou claramente autorizados. Use apenas homebrew autorizado, domínio público, freeware redistribuível ou incorporações oficiais do arquivo de origem.
- Para serviços externos (Poki, CrazyGames, itch.io etc.), abrir o site de origem é diferente de copiar o jogo para o NeonPlay. Não tente extrair arquivos de seus players nem contornar suas proteções.
- Franchises e marcas famosas podem envolver direitos autorais/marcas; nomes no catálogo identificam a referência apresentada pelo usuário, não uma afirmação de afiliação.

## UX aplicada com base em pesquisa pública

A página usa padrões vistos em documentação pública dos portais de jogos: entrar rapidamente no jogo, controles claramente apresentados, suporte a teclado/toque quando o jogo tiver suporte, opção de tela cheia quando apropriada, thumbnails e recomendações. A documentação de Poki descreve o player e requisitos de UI responsiva e entrada rápida; a documentação de qualidade da CrazyGames destaca objetivos claros, controles intuitivos, layout confortável e full-screen gerido pela plataforma. Referências: https://developers.poki.com/guide/your-game-page ; https://developers.poki.com/guide/requirements-quality ; https://docs.crazygames.com/requirements/quality/ .

## Auditoria futura recomendada

Adicionar a cada jogo importado: URL do upstream, commit SHA, licença exata, créditos, arquivos modificados, dependências de build, necessidade de backend, se foi testado no desktop e no celular, data da última verificação e plano de remoção caso upstream revogue a permissão.
