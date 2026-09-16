import sql from "mssql";
import type { StockGroupRow, StockItemRow, SupplierRow } from "./mapping.js";

const ITEM_COLUMNS = `
  si.StockItemID, si.StockItemName, si.SupplierID, c.ColorName, si.Size, si.Brand,
  si.Barcode, si.UnitPrice, si.RecommendedRetailPrice, si.TaxRate, si.LeadTimeDays,
  si.QuantityPerOuter, si.IsChillerStock, si.TypicalWeightPerUnit,
  si.MarketingComments, si.CustomFields,
  (SELECT STRING_AGG(CAST(g.StockGroupID AS varchar(10)), ',')
     FROM Warehouse.StockItemStockGroups g WHERE g.StockItemID = si.StockItemID) AS StockGroupIDs`;

export interface HistoryRow extends StockItemRow {
  ValidFrom: Date;
}

export async function openSource(connectionString: string) {
  const pool = await sql.connect(connectionString);

  return {
    async stockGroups(): Promise<StockGroupRow[]> {
      const result = await pool.query<StockGroupRow>(
        "SELECT StockGroupID, StockGroupName FROM Warehouse.StockGroups ORDER BY StockGroupID",
      );
      return result.recordset;
    },

    async suppliers(): Promise<SupplierRow[]> {
      const result = await pool.query<SupplierRow>(`
        SELECT s.SupplierID, s.SupplierName, sc.SupplierCategoryName, s.WebsiteURL
        FROM Purchasing.Suppliers s
        JOIN Purchasing.SupplierCategories sc ON sc.SupplierCategoryID = s.SupplierCategoryID
        ORDER BY s.SupplierID`);
      return result.recordset;
    },

    async stockItems(): Promise<StockItemRow[]> {
      const result = await pool.query<StockItemRow>(`
        SELECT ${ITEM_COLUMNS}
        FROM Warehouse.StockItems si
        LEFT JOIN Warehouse.Colors c ON c.ColorID = si.ColorID
        ORDER BY si.StockItemID`);
      return result.recordset;
    },

    async history(): Promise<HistoryRow[]> {
      const result = await pool.query<HistoryRow>(`
        SELECT ${ITEM_COLUMNS}, si.ValidFrom
        FROM Warehouse.StockItems FOR SYSTEM_TIME ALL si
        LEFT JOIN Warehouse.Colors c ON c.ColorID = si.ColorID
        ORDER BY si.ValidFrom, si.StockItemID`);
      return result.recordset;
    },

    close: () => pool.close(),
  };
}
