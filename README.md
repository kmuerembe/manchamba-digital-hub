# Machamba Digital — loja online de Moçambique

Marketplace estilo AliExpress para Moçambique: qualquer pessoa pode abrir loja, publicar produtos
(da machamba à electrónica) e receber pagamentos **M-Pesa** e **e-Mola** directamente no telemóvel.

## O que está incluído

| Área | Detalhes |
| --- | --- |
| Contas | Registo/entrada com email ou telemóvel (+258) via Supabase Auth; perfis, papéis de admin. |
| Loja | Página inicial com banners, categorias, promoções e mais vendidos; pesquisa com filtros por categoria, província, distrito e ordenação; página de produto com galeria, stock, desconto e entrega. |
| Carrinho e checkout | Carrinho persistente no dispositivo, endereço de entrega (guardado na conta), resumo, criação da encomenda validada no servidor (preços e stock nunca vêm do browser). |
| Pagamentos | **M-Pesa** (API oficial Vodacom, C2B single stage + consulta de estado) e **e-Mola** (gateway BCCS da Movitel, `pushUssdMessage` + callback assíncrono). USSD push → cliente confirma PIN → encomenda fica paga, stock baixa, vendedor é notificado. |
| Encomendas | Lista e detalhe com histórico de pagamentos em tempo real (Supabase Realtime), repetir pagamento, cancelar. |
| Vendedor | Painel com vendas pagas, dados de entrega do cliente, actualização de estado por artigo (confirmado → enviado → entregue), gestão de stock, publicação com várias fotografias. |
| Administração | Painel em `/admin` com resumo e gráficos (encomendas, receita, pagamentos móveis, categorias), aprovação de anúncios, encomendas, utilizadores (dar/retirar admin), categorias, denúncias e artigos. |
| Extras herdados | Diagnóstico de culturas por IA, mensagens em tempo real, favoritos, artigos “Aprender”. |

## Configurar os pagamentos

Copia `.env.example` e preenche as variáveis. Sem credenciais, em desenvolvimento, a loja corre em
**modo de simulação** (o pagamento confirma-se sozinho após alguns segundos e fica marcado como
`simulacao`). Em produção a simulação está desligada.

### M-Pesa (Vodacom)
1. Cria conta em <https://developer.mpesa.vm.co.mz>, cria uma aplicação e activa **C2B Payment**.
2. Copia a **API Key** e a **Public Key** para `MPESA_API_KEY` / `MPESA_PUBLIC_KEY`.
3. `MPESA_SERVICE_PROVIDER_CODE=171717` no sandbox; em produção usa o teu código de comerciante e `MPESA_AMBIENTE=producao`.
4. O servidor cifra a API Key com a chave pública (RSA) e chama
   `https://api.(sandbox.)vm.co.mz:18352/ipg/v1x/c2bPayment/singleStage/`. Estados inconclusivos são
   reconsultados em `:18353/ipg/v1x/queryTransactionStatus/`.

### e-Mola (Movitel)
1. Pede à Movitel a integração e-Mola API (recebes URL do web service, `username`, `password`, `partnerCode` e `key`).
2. Preenche `EMOLA_URL`, `EMOLA_USERNAME`, `EMOLA_PASSWORD`, `EMOLA_PARTNER_CODE`, `EMOLA_KEY`.
3. Regista o callback `https://<o-teu-dominio>/api/pagamentos/emola-callback` (opcionalmente protegido com `EMOLA_CALLBACK_SECRET`).
4. Respostas `0` = pago, `22` = a processar (aguarda callback/consulta), `11` = tempo esgotado.

## Painel de administração

O painel fica em **`/admin`** (atalho na página *Conta* para contas com o papel `admin`). Tem sete áreas:

| Área | O que faz |
| --- | --- |
| Resumo | Receita paga, encomendas, utilizadores e vendedores, gráfico de encomendas/receita dos últimos 14 dias, pagamentos por operadora, categorias com mais anúncios e lista do que precisa de atenção. |
| Aprovações | Revê os anúncios `pendente` e aprova, rejeita, destaca ou ajusta stock (o vendedor recebe notificação). |
| Encomendas | Todas as encomendas com dados de entrega, artigos, pagamentos e mudança de estado. |
| Utilizadores | Procura contas, vê nº de anúncios/encomendas e dá ou retira o papel de administrador, verifica e activa contas. |
| Categorias | Cria, edita e apaga categorias (nome, slug, tipo, ícone, cor, ordem e visibilidade). |
| Denúncias | Trata queixas: pôr em análise, resolver com nota ou arquivar. |
| Artigos | Escreve e publica (ou deixa como rascunho) os conteúdos da secção *Aprender*. |

Alterações de papéis passam por server functions (`src/lib/admin.functions.ts`) que validam o papel de
administrador e escrevem com o service role — `user_roles` não permite escrita directa pelo cliente.

### Dar o primeiro administrador

O painel só é acessível a quem tenha o papel `admin`. Numa conta nova, atribui-o uma vez pelo SQL
editor do Supabase:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from public.profiles where email = 'o-teu-email@exemplo.mz'
on conflict do nothing;
```

Depois disso, o próprio painel (aba *Utilizadores*) já permite dar e retirar acesso a mais contas.

## Base de dados

As migrações estão em `drizzle/migrations`. A `0003_loja_pedidos_pagamentos.sql` adiciona stock,
preço antigo, entrega e vendas aos produtos, categorias gerais, e as tabelas `enderecos`, `pedidos`,
`pedido_itens` e `pagamentos` com RLS (só o servidor escreve encomendas e pagamentos) e triggers que
marcam o pedido como pago, baixam stock e notificam vendedores.

## Estrutura principal

```
src/lib/pagamentos/mpesa.server.ts     cliente API M-Pesa (RSA + C2B + consulta)
src/lib/pagamentos/emola.server.ts     cliente SOAP e-Mola (pushUssdMessage + queryTransaction)
src/lib/pagamentos/processar.server.ts orquestração: cobrar, reconsultar, callback, simulação
src/lib/loja.functions.ts              server functions: criarPedido, iniciarPagamento, consultarPagamento, ...
src/routes/api/pagamentos/emola-callback.ts  callback assíncrono e-Mola
src/routes/{index,pesquisa,produto.$id,carrinho,checkout,pedidos/*,vender,conta}.tsx  páginas da loja
```

---

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e4f8e53a-b203-4f95-955f-ff20010d8735).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
