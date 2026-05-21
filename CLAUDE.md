# Radar Societário — Instruções de Desenvolvimento

## Stack
- **Frontend:** React 18 + Vite + React Router v6 + TanStack Query v5 + Tailwind CSS v3
- **Backend:** Express.js + TypeScript (porta 3002)
- **Banco:** MySQL 8.0 — mesmo banco do Aditiva Pronto (`aditiva_pronto`), tabelas prefixadas com `rs_`
- **Deploy:** Docker + Nginx (EasyPanel)

## Comandos

```bash
npm run install:all       # instala tudo
npm run dev:backend       # Express em localhost:3002
npm run dev:frontend      # Vite em localhost:5174
npm run build             # build de produção
```

## Banco de Dados

Executa o script de inicialização no MySQL do Aditiva Pronto:
```bash
mysql -u aditiva -p aditiva_pronto < scripts/init.sql
```

## Variáveis de Ambiente

Copie `.env.example` para `.env` na pasta `src/backend/`:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` — conexão MySQL

## Tipos de Licenciamento (fixos)
1. Alvará de Funcionamento
2. Meio Ambiente
3. Vigilância Sanitária
4. Corpo de Bombeiros
5. IBAMA
6. Taxa de Alvará Anual
7. Alvará da Polícia
8. ANTT
9. Outros

## Status de Licença
- `expired` — vencido (data < hoje)
- `critical` — vence em ≤ 30 dias
- `warning` — vence em 31–60 dias
- `notice` — vence em 61–90 dias
- `ok` — vence em > 90 dias
- `not_set` — data não preenchida
- `not_applicable` — não se aplica à empresa

## Arquitetura
- Tabelas `rs_*` criadas no mesmo banco MySQL do Aditiva Pronto
- `rs_companies` — empresas gerenciadas pelo Radar (importadas ou manuais)
- `rs_company_licenses` — datas de vencimento por empresa/licença
- `rs_settings` — configurações (SMTP, Trello, notificações)
- `rs_notification_log` — evita duplicidade de notificações
- `rs_trello_cards` — evita duplicidade de cards Trello

## Sem Autenticação
Ferramenta interna — sem login/JWT, igual ao Aditiva Pronto.
