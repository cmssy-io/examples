# catalog-import

A reference integration: it moves a wholesale product catalog from SQL Server into a cmssy
workspace through the admin GraphQL API, and keeps it in step on every later run.

It is a starting point to fork, not a supported tool. It exists to show that the write API is
usable by someone who is not us, and to name what an integration still has to do by hand.

## The data

The source is Microsoft's **Wide World Importers** sample database - a fictional wholesale
distributor, MIT-licensed, published in
[microsoft/sql-server-samples](https://github.com/microsoft/sql-server-samples/tree/master/samples/databases/wide-world-importers).
This repository ships none of it; you restore it yourself.

Wide World Importers is distributed as a SQL Server backup, so you need SQL Server. The Linux
container works and asks you to accept Microsoft's licence (`ACCEPT_EULA=Y`) - that is your call:

```bash
gh release download wide-world-importers-v1.0 -R microsoft/sql-server-samples \
  -p WideWorldImporters-Full.bak -D ./wwi
docker run -d --name wwi -e ACCEPT_EULA=Y -e MSSQL_PID=Developer \
  -e MSSQL_SA_PASSWORD='<a strong password>' -p 127.0.0.1:1433:1433 \
  -v "$PWD/wwi:/wwi" mcr.microsoft.com/mssql/server:2022-latest
docker exec wwi /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P '<the password>' -Q "
  RESTORE DATABASE WideWorldImporters FROM DISK='/wwi/WideWorldImporters-Full.bak' WITH
  MOVE 'WWI_Primary' TO '/var/opt/mssql/data/WWI.mdf',
  MOVE 'WWI_UserData' TO '/var/opt/mssql/data/WWI_UserData.ndf',
  MOVE 'WWI_Log' TO '/var/opt/mssql/data/WWI.ldf',
  MOVE 'WWI_InMemory_Data_1' TO '/var/opt/mssql/data/WWI_InMemory_Data_1'"
```

## Running it

Use a workspace you can throw away. The script creates three models there and writes into them.

```bash
pnpm install
cp .env.example .env    # an API token (Settings -> API tokens), the workspace id, the SQL URL
pnpm sync
pnpm replay
```

Both read `.env` when it exists; variables already in your shell work too.

**`sync`** creates the models if they are missing - `wwi-stock-group`, `wwi-supplier` and
`wwi-product` (a product model: SKU and price) - then brings every record in line with the source:

- rows the workspace does not have yet go in through `record.import`, 1000 per call;
- rows it has are compared field by field, and only the fields that differ are sent through
  `record.patch`; a field the source no longer has is cleared with `null`;
- a row that already matches costs nothing, so a second run writes nothing.

Only the fields this script declares are compared. A field an editor added to the model in cmssy is
left alone.

**`replay`** walks Wide World Importers' system-versioned history (`FOR SYSTEM_TIME ALL`) and sends
every version as the patch it is, eight products in parallel, then checks that the workspace ended
where the source is. It is the closest a static dataset gets to an ERP delivering one change at a
time.

The client waits out a `429` for as long as its `Retry-After` says and tries again, up to five
times. The sync fails when any row is refused, and the replay exits non-zero when a product still differs
from the source afterwards. A workspace accepts a bounded number of record writes a minute from API tokens; an import
costs one per row.

## What it does not handle

- **Deletions.** A product removed from the source stays in cmssy.
- **Variants.** Wide World Importers encodes colour and size in the product name
  (`... (Black) XL`) and has no parent product, so every variant is imported as a product of its
  own. Grouping them needs a naming rule this script does not guess.
- **Photos.** The source has a `Photo` column; it is empty in this dataset and is not read.
- **The price register.** `Sales.SpecialDeals` (date ranges per buying group) is not mapped - cmssy
  has no model for it, and a product carries one price.
- **Translations.** The source is English only; no field is translatable.
- **Scale.** Matching reads every record of a model first, 100 per call, because `record.import`
  does not return the ids it created and there is no upsert by key. Fine for thousands of rows, slow
  for hundreds of thousands.
- **Historical group membership.** `Warehouse.StockItemStockGroups` is not a temporal table, so
  the replay applies today's groups to every old version. Colours are read as of each version.
- **Concurrent writers to the same field.** Two patches to one field are last-write-wins.
