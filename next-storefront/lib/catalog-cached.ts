import { cache } from "react";
import {
  loadCategories as loadCategoriesOnce,
  loadProductBySlug as loadProductBySlugOnce,
} from "./catalog";

export const loadCategories = cache(loadCategoriesOnce);
export const loadProductBySlug = cache(loadProductBySlugOnce);
