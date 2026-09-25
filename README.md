# FitnessHub pessoal

Aplicativo mobile-first em Next.js. As cinco áreas ficam na mesma aplicação e a navegação usa links com hash (incluindo voltar/avançar do navegador).

## Executar

Use Node.js compatível com a versão instalada do Next.js. Instale as dependências, configure o banco e execute:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Preencha `DATABASE_URL` com a connection string do Neon. A tabela `fitness_profiles` é criada automaticamente no primeiro acesso; o mesmo SQL também está disponível em `database/schema.sql`.

Instale e execute no mesmo ambiente (Windows ou WSL), pois o compilador usa módulos nativos. Ao trocar de ambiente, reinstale as dependências. Evite executar builds de Windows e WSL simultaneamente na mesma pasta de cache `.next`.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Em **Storage**, conecte um banco Neon ao projeto.
3. Confirme que a integração criou `DATABASE_URL` ou `POSTGRES_URL` nos ambientes desejados.
4. Faça um novo deploy depois de conectar o banco.

Não coloque a connection string em uma variável `NEXT_PUBLIC_*`: ela deve ficar disponível somente no servidor.

## Funcionalidades

- Perfis: criação e troca de perfis independentes, sem login.
- Hoje: rotina em timeline, checkboxes, sequência de dias completos, água e último peso.
- Alimentação: adicionar, editar e remover refeições e horários. O plano inicial vem da rotina existente.
- Treinos: nome e horário do treino diário, cadastro de exercícios, séries, repetições, carga, checkboxes por dia e conclusão do treino.
- Progresso: registro/atualização de peso por data, gráfico dos últimos 14 registros, lista de pesagens e consulta do histórico diário.
- Perfil: nome, meta de água, capacidade da garrafa, meta opcional de peso, exportação e restauração de backup JSON.

## Dados

Cada perfil é salvo no Neon e fica disponível em qualquer dispositivo que abra a aplicação. O navegador guarda apenas o identificador do último perfil selecionado. No primeiro acesso após esta mudança, os dados válidos da antiga chave `fitnesshub.personal.v1` são migrados automaticamente se o banco ainda não tiver perfis.

Não existe autenticação. Portanto, qualquer pessoa que conheça a URL do deploy pode visualizar, criar e alterar os perfis. Isso é intencional para o uso pessoal; adicione autenticação antes de compartilhar o endereço publicamente.

O consumo de água começa em zero e cada toque soma uma garrafa inteira, inclusive acima da meta. O botão de retirada subtrai uma garrafa, sem valores negativos. Pesagens e exercícios começam vazios; não há histórico fictício.

O dia segue a data local do dispositivo. Checkboxes e água recomeçam no dia seguinte. Alterações no plano e nas metas valem para hoje e os próximos dias, preservando snapshots anteriores. A sequência conta dias consecutivos com todas as etapas concluídas; o dia atual pendente não interrompe a sequência de ontem. A conclusão do treino é explícita e independente das marcações de exercícios.

Backups são validados antes da restauração e só substituem os dados do perfil ativo após confirmação. Alterações são aplicadas imediatamente na interface e persistidas no Neon em sequência; falhas de sincronização aparecem no topo da aplicação.
