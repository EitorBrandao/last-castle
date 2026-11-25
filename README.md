# Bastião Final

Jogo de defesa de castelo para celular (PWA), feito com HTML5 Canvas e JavaScript puro, sem build e sem dependências externas. Todos os gráficos e sons são gerados por código. Inspirado no gênero de defesa de castelo cooperativo, mas com nomes e arte originais.

## Como jogar

- Você controla **3 heróis** ao mesmo tempo, posicionados na frente do castelo. Eles atacam automaticamente o inimigo mais próximo.
- **Guerreiro** (corpo a corpo, resistente): *Golpe Giratório* (dano em área) e *Grito de Guerra* (provoca inimigos e reduz o dano recebido).
- **Mago** (distância, área): *Bola de Fogo* (explode no maior grupo) e *Nevasca* (campo que desacelera).
- **Ladino** (rápido, crítico): *Chuva de Adagas* (vários golpes) e *Sombra* (golpe forte no inimigo mais forte).
- Use os **6 botões** na parte de baixo para lançar habilidades (o relógio mostra a recarga).
- **Toque num herói** para selecioná-lo e **toque no chão** para movê-lo (dentro da área na frente do castelo).
- Inimigos: Goblin (rápido), Orc (resistente), Arqueiro (ataca à distância), Xamã (cura aliados) e um **Chefe a cada 5 ondas**.
- Heróis nocauteados voltam após alguns segundos.
- Ao subir de nível o jogo pausa e você escolhe 1 de 3 melhorias.
- O jogo termina quando o castelo chega a 0 PV. O ouro ganho fica salvo (localStorage) e pode ser gasto em **Melhorias** permanentes no menu. O recorde de onda também é salvo.

## Rodar localmente

Módulos ES exigem servidor HTTP (não abra o arquivo direto):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie os arquivos desta pasta para a raiz da branch `main`.
2. Em **Settings > Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. Acesse `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Todos os caminhos são relativos, então funciona em subpastas. Para instalar como app, use "Adicionar à tela inicial". Após a primeira visita o jogo funciona offline (service worker). Ao alterar arquivos, aumente a versão `CACHE` em `sw.js`.

## Estrutura

`index.html`, `style.css`, `manifest.webmanifest`, `sw.js`, `icons/` e `js/` (`main`, `game`, `entities`, `heroes`, `enemies`, `waves`, `ui`, `save`, `render`, `audio`).
