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
