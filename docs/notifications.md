# Notificações Web Push

## Variáveis da Vercel

Gere as chaves uma vez:

```sh
npx web-push generate-vapid-keys
```

Adicione em **Settings > Environment Variables**, para Production e Preview:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`, por exemplo `mailto:voce@exemplo.com`
- `CRON_SECRET`, com um valor aleatório longo

As chaves VAPID devem permanecer as mesmas. Trocar as chaves invalida as assinaturas já feitas nos celulares.

## Agendador

Faça uma requisição a cada cinco minutos:

```text
GET https://seu-dominio.vercel.app/api/notifications/dispatch
Authorization: Bearer SEU_CRON_SECRET
```

O plano Hobby da Vercel aceita Cron apenas uma vez por dia. Para lembretes ao longo do dia, configure um agendador externo que permita cabeçalho `Authorization`, ou use um plano da Vercel que aceite a frequência necessária.

## Celulares

- Android: abra o app e ative as notificações em Perfil.
- iPhone/iPad: primeiro adicione o app à Tela de Início, abra pelo ícone instalado e então ative em Perfil.

Cada celular registra sua própria assinatura. As preferências são vinculadas ao perfil que estava ativo no momento da ativação.

## Preferências dos lembretes

Em Perfil > Lembretes, cada dispositivo pode configurar:

- Refeições e treino: seguem os horários salvos na rotina e na ficha.
- Água: início, último horário e intervalo de 30, 60, 90, 120, 180 ou 240 minutos. A janela deve começar e terminar no mesmo dia.
- Silêncio: pode atravessar a meia-noite (por exemplo, 22h–7h). Avisos suprimidos não são reenviados ao terminar o silêncio.

O envio ignora refeições concluídas, treinos concluídos ou com sessão iniciada e água cuja meta diária já foi atingida. Essa decisão usa os últimos dados sincronizados com o servidor; alterações ainda offline só passam a valer após sincronizar.

O agendador continua necessário. Salvar preferências não configura cron nem chaves VAPID automaticamente. Na versão local de desenvolvimento, a ausência de service worker é informada sem deixar a tela carregando indefinidamente.

## Metas de frequência

Em Progresso > Frequência de treino, escolha de 1 a 7 dias por semana. A alteração vale desde a segunda-feira da semana atual. Metas de semanas anteriores são preservadas.

O calendário conta somente dias do mês selecionado. A lista semanal usa semanas completas, de segunda a domingo, incluindo dias dos meses vizinhos nas bordas. Cada data com treino concluído conta uma vez.
