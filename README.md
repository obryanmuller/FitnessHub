# FitnessHub pessoal

Aplicativo mobile-first em Next.js. As cinco áreas ficam na mesma aplicação e a navegação usa links com hash (incluindo voltar/avançar do navegador).

## Executar

Use Node.js compatível com a versão instalada do Next.js. Instale as dependências e execute:

```sh
npm install
npm run dev
```

Instale e execute no mesmo ambiente (Windows ou WSL), pois o compilador usa módulos nativos. Ao trocar de ambiente, reinstale as dependências. Evite executar builds de Windows e WSL simultaneamente na mesma pasta de cache `.next`.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Funcionalidades

- Hoje: rotina em timeline, checkboxes, sequência de dias completos, água e último peso.
- Alimentação: adicionar, editar e remover refeições e horários. O plano inicial vem da rotina existente.
- Treinos: nome e horário do treino diário, cadastro de exercícios, séries, repetições, carga, checkboxes por dia e conclusão do treino.
- Progresso: registro/atualização de peso por data, gráfico dos últimos 14 registros, lista de pesagens e consulta do histórico diário.
- Perfil: nome, meta de água, capacidade da garrafa (800 ml inicialmente), meta opcional de peso, exportação e restauração de backup JSON.

## Dados

Os dados são pessoais e ficam no `localStorage` deste navegador, na chave `fitnesshub.personal.v1`. Não existe login, servidor de dados nem sincronização entre dispositivos. Mudar de navegador, domínio ou porta cria um armazenamento separado. Limpar os dados do site apaga os registros: exporte backups no Perfil.

O consumo de água começa em zero e cada toque soma uma garrafa inteira, inclusive acima da meta. O botão de retirada subtrai uma garrafa, sem valores negativos. Pesagens e exercícios começam vazios; não há histórico fictício.

O dia segue a data local do dispositivo. Checkboxes e água recomeçam no dia seguinte. Alterações no plano e nas metas valem para hoje e os próximos dias, preservando snapshots anteriores. A sequência conta dias consecutivos com todas as etapas concluídas; o dia atual pendente não interrompe a sequência de ontem. A conclusão do treino é explícita e independente das marcações de exercícios.

Backups são validados antes da restauração e só substituem os dados após confirmação na interface. Erros de armazenamento são exibidos sem confirmar gravações que falharam. Abas abertas no mesmo navegador recebem atualizações do armazenamento.

