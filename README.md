# mechanic-fe

# Patch notes: 25 Sep → 8 Oct 2026

Frontend (`mechanic-fe`), from `0a989ab` ("users page implemented") to `882bba5`: 4 commits, 37 files, about 4,100 lines added and 380 removed.

## New: Associated services

Several services on the same car and client can now be linked into one **association**. An example is a Mecânica job plus a Laboratório job on the same visit.

- **Tabs on the service page:** each service in the association gets its own tab at the top, coloured by status. The **+** tab adds a new service to the association or links an existing one.
- **Choosing which data to keep:** when linking an existing service that has different values, you pick which side to keep. The shared fields are responsável, entrada, prev. saída, kms, saída, marcação and descrição de avaria.
- **Same car and client:** a different car or client is shown as a hard block, not as a choice.
- **Shared fields stay in sync:** changing one of the shared fields on one service updates the rest of the association, and the tabs refresh straight away.
- **Delivering the car:** setting the Saída date (checkout) needs every service in the association to be Terminado first, because the car leaves once for all of them.

## Serviços list reworked

- **One row per association:** an association shows as a single row (or card on phones) with its size and number. Expand it to see every service in it.
- **Association status:** an association shows the status of its least-advanced service. It only counts as done when every job in it is done.
- **Filters match whole associations:** if one service matches a filter, the whole association comes back, so you never see half of one.
- **The URL keeps your view:** filters, sort and page are saved in the URL, so reloading, going back from a service, or sharing the link keeps the view.
- **New sort options:** Nr. Associação, Telemóvel, Marca, Modelo, Tipo and Estado.
- **Phone cards:** dates show short ("08 Set"). Filters wait a moment after you stop typing before searching. Slow responses can no longer overwrite newer results.

## New: Eventos

- **New page** under Gestão → **Eventos**, for creating, editing and deleting events. Each event has a title, a description, start and end dates with optional times (all-day if left blank), a colour and an optional user.
- **Events on both calendars** (Marcações and Serviços):
  - On a computer, events are coloured bars across the days, with multi-day events joined into one continuous bar.
  - On a phone, each day shows a strip with a "2/3"-style counter for multi-day events.
- **Click an event** on either calendar to open a popup where you can edit or delete it.

## Laboratório (service page)

- New buttons to add or remove actions on each lab item.
- Deleting a lab item now warns that it also removes the item's actions and properties.

## Phones and tablets

- **Service page:**
  - On narrow screens the menu is only **Imprimir** and **Imprimir Resumo**, each on its own full-width row.
  - Produtos Aplicados is a compact block per product, with the checkbox centered.
  - Fixed: the header's "Validado" was squeezed, and product names were cut off.
- **Marcações:**
  - Shows cards instead of the table up to 900px.
  - Tapping the arrow on a card no longer opens the marcação.
  - The Lista/Calendário toggle no longer gets cut off.
- **Gestão de Laboratório:**
  - The tables stack on narrow screens, each with its title and a divider.
  - Item names are no longer cut to one letter.
  - The **+** is centered.
- **Tempos dos Utilizadores:** tapping or hovering a name shows the full name, so you can tell Antonio (Pai) from Antonio (Filho).
- **Tables (Viaturas, Gestão de Serviços, Clientes…):**
  - Better column widths and a smaller header font on tablets.
  - On phones, labels no longer run into their values.
- **Eventos:** the ✓ and ✗ buttons are the same height and sit side by side.
- **Pedidos de Produtos:** Qt. and the checkbox line up on the right on phones.
- **Footer:** the Serviços, Marcações and Calendário links were removed.

## Fixes

- Notification links now open the right service page (`services/<id>`).
- General look of the search pickers (client, car, etc.).

## Since `882bba5` (not committed yet)

### New: Registos de Tempo
A new page under Gestão → **Registos de Tempo** (`/time_records`) lists the time entries and punches (Ponto) of every service.

- **Three tabs with counts:** Tempos, Pontos, and **Pontos em Aberto** (started and never stopped). The last one turns red when there are any.
- **Filters:** funcionário, nº de serviço, matrícula, cliente, and a De/Até date range.
- **Sorting:** by data, serviço, matrícula, cliente, funcionário or minutos.
- **Editing inline:**
  - a time entry's date, service, employee and minutes;
  - a punch's start and end time. This is how a forgotten punch gets fixed, and emptying the end reopens it.
- **Adding and deleting:** add with "Adicionar Tempo" / "Adicionar Ponto"; delete after a confirmation.
- **Safe with two people:** rows are edited by their real id, so two people working at once can't hit the wrong row.

### Service page: saving
- **Only changed fields are saved:** each autosave sends the fields that changed, together with the value they had before.
  - Two people editing different fields, even on different services of the same association, no longer overwrite each other.
  - When both change the **same** field, the second one sees "Kms foi alterado por outro utilizador…", and their other edits are still saved.
- **Leaving saves first:** switching association tab or leaving the page saves what was typed in the last half-second. The next service waits for that save before loading, so it never shows stale values.
- **Closing or reloading** the tab with an unsaved edit asks before leaving.
- **A refused save only undoes the refused field.** If you change several fields and one breaks a rule (e.g. Prev. Saída before Entrada), only that field goes back.
- Fixed: typing **0** in kms made the page save in a loop forever.
- **Fewer requests:** the association tabs only reload when Saída changes.

### Service page: other changes
- **New time entries start inside the service's dates:** the default date is today, or Entrada if the service starts later.
- **Errors now show** when a quantity is refused in Pedido de Produtos or Produtos Aplicados (e.g. a negative number), and the saved value comes back.
- **The kms boxes don't go below 0**, and the minutes boxes are limited to 1–1440.
- **The padlock has a label** ("Desbloquear campos" / "Bloquear campos").

### Associations (the + tab)
- **Faster linking:** "Associar Serviço Existente" and "Importar e Criar Serviço" are now one request each. A dropped connection can no longer leave half a link, or a loose duplicate service.
- **"Importar e Criar Serviço" works straight away:** the only card is already selected, and the button looks disabled when it is.
- **Cards show the right number:** "Associação #N" (the association's number) or "Serviço #N" for a service on its own. It used to show "Associação #<service number>".

### Notificações
- **Local time:** times are shown in local time. They used to be an hour behind in summer (UTC).
- **"Mesmo carro" popup:** it shows each service's **type** and **Entrada** date, so a Mecânica + Laboratório pair is easy to tell from a duplicate. It also now shows the right second service when the message mentions an association.

### Smaller fixes
- **Pages open at the top** instead of keeping the previous page's scroll. Back/Forward still restore the position.
- **Messages in Portuguese:** the English success/error messages for marcações and time entries.
- **Client search dropdown and client card:** the phone and NIF no longer split across lines, and there's more space between them.
- **Pedido de Produtos:** the headers no longer squash together on tablets.

## Not in this repo

- **Backend:** the PHP backend (`Oficina_Lima`) has its own commits over the same period. They add the association API endpoints and implementation, plus bug fixes.
- **Database rules:** finishing a service needs **Serviço Realizado**, the notification links were fixed, and the rest of the database changes are in the backend's migration files. See `2026-10-08-backend.md`.
