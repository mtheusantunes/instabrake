# InstaBrake

## Contents

- [English](#english)
  - [Features](#features)
  - [Manual installation](#manual-installation)
  - [Configuration](#configuration)
  - [Privacy](#privacy)
- [Português](#português)
  - [Recursos](#recursos)
  - [Instalação manual](#instalação-manual)
  - [Configuração](#configuração)
  - [Privacidade](#privacidade)

## English

InstaBrake is a Chromium extension that helps reduce distractions on Instagram by hiding specific sections, controlling the feed, and limiting Reels consumption.

### Features

- Limit the number of posts displayed in the Following feed.
- Set a daily limit for watched Reels.
- Hide the Reels page.
- Hide the Explore page.
- Hide the Stories section.
- Hide the For You feed.
- Hide the Following feed.
- Hide Threads links.
- Hide suggested followers.
- Redirect the home page to the Following feed.

#### Examples

| Limit posts on the Following feed                          | Daily Reels limit                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| ![Following feed limit message](images/following_feed.png) | <img src="images/reels_limit.png" title="" alt="Daily Reels limit message" width="472" /> |

### Manual installation

1. Clone this repository or download the source code.
2. Open the extensions page in a Chromium-based browser.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the root folder of this repository.
6. Open Instagram and configure the extension through the options popup.

### Configuration

Open the extension popup to configure which sections should be hidden and set usage limits. Options are saved automatically.

![InstaBrake configuration popup](images/menu.png)

Numeric limits accept values between `1` and `500`. The default values are:

| Option                    | Default |
| ------------------------- | ------- |
| Hide Explore              | Enabled |
| Hide For You feed         | Enabled |
| Hide suggested followers  | Enabled |
| Hide Threads links        | Enabled |
| Limit Reels watched       | Enabled |
| Reels limit               | 10      |
| Following feed post limit | 10      |

### Privacy

InstaBrake does not collect, track, or send browsing data. The extension only uses the `storage` permission to save the preferences configured by the user.

The daily Reels control uses the Instagram page's local storage to keep track of the daily count. No data is sent to external servers.

## Português

O InstaBrake é uma extensão para Chromium que ajuda a reduzir distrações no Instagram, ocultando seções específicas, controlando o feed e limitando o consumo de Reels.

### Recursos

- Limitar a quantidade de publicações exibidas no feed “Seguindo”.
- Limitar a quantidade diária de Reels assistidos.
- Ocultar a página de Reels.
- Ocultar a página Explorar.
- Ocultar a seção de Stories.
- Ocultar o feed “Para Você”.
- Ocultar o feed “Seguindo”.
- Ocultar links do Threads.
- Ocultar sugestões de seguidores.
- Redirecionar a página inicial para o feed “Seguindo”.

#### Exemplos

| Limite de publicações no feed “Seguindo”                            | Limite diário de Reels                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| ![Mensagem de limite do feed “Seguindo”](images/following_feed.png) | <img src="images/reels_limit.png" title="" alt="Mensagem de limite diário de Reels" width="472" /> |

### Instalação manual

1. Clone este repositório ou baixe o código-fonte.
2. Abra a página de extensões de um navegador baseado em Chromium.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta raiz deste repositório.
6. Abra o Instagram e configure a extensão pelo popup de opções.

### Configuração

Abra o popup da extensão para configurar as seções que devem ser ocultadas e os limites de uso. As opções são salvas automaticamente.

![Popup de configuração do InstaBrake](images/menu.png)

Os limites numéricos aceitam valores entre `1` e `500`. Os valores padrão são:

| Opção                                    | Padrão  |
| ---------------------------------------- | ------- |
| Ocultar Explorar                         | Ativado |
| Ocultar feed “Para Você”                 | Ativado |
| Ocultar sugestões de seguidores          | Ativado |
| Ocultar links do Threads                 | Ativado |
| Limitar Reels assistidos                 | Ativado |
| Limite de Reels                          | 10      |
| Limite de publicações no feed “Seguindo” | 10      |

### Privacidade

O InstaBrake não coleta, rastreia ou envia dados de navegação. A extensão usa apenas a permissão `storage` para salvar as preferências configuradas pelo usuário.

O controle diário de Reels utiliza o armazenamento local da página do Instagram para manter a contagem do dia. Nenhum dado é enviado para servidores externos.
